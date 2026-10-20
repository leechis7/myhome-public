import { and, gt, inArray, isNull, lt, lte, sql } from "drizzle-orm";
import { getDb, reminderItems, remindersSent, todos } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/security/secret-crypto";
import { getCalendars, upcomingEvents } from "@/lib/my-space/calendar";
import {
  againMessage,
  dueReminders,
  eventReminders,
  GRACE_MS,
  reminderKeyboard,
  reminderLine,
  reminderMessage,
  todoReminders,
  type Reminder,
} from "@/lib/my-space/reminders";
import { inboxDisabled } from "@/lib/telegram/bot";
import { notifyTelegram } from "@/lib/telegram/notify";
import { remindersOn } from "@/lib/site/settings";

/**
 * 미리 알림을 5분마다 보낸다(MYH-258). 앱이 뜰 때 instrumentation.ts 가 건다.
 * 알림 때는 거의 정각 · 30분이라 시계의 5분 눈금에 맞춰 돈다. 구글 캘린더는
 * 캘린더 화면과 같은 5분 캐시를 쓰므로 구글에는 많아야 5분에 한 번 간다
 *
 * - 텔레그램 받기를 끈 서버(TELEGRAM_INBOX=off, 같은 봇을 쓰는 개발기)는 보내지
 *   않는다 - 운영과 둘이 같은 알림을 보내게 된다
 * - 열쇠를 reminders_sent 에 먼저 넣고, 넣어졌을 때만 보낸다. 보내지 못하면
 *   열쇠를 빼서 다음 번에 다시 한다(GRACE_MS 안에서)
 */

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function seoulDay(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

function open(envelope: string) {
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

/** 지금 쯤 알릴 수 있는 것들(어제 ~ 내일에 걸친 안 끝낸 할 일, 오늘 0시 ~ 2시간 뒤의 일정) */
async function candidates(now: Date): Promise<Reminder[]> {
  const today = seoulDay(now);
  const yesterday = seoulDay(new Date(now.getTime() - DAY));
  const tomorrow = seoulDay(new Date(now.getTime() + DAY));
  const rows = await getDb()
    .select()
    .from(todos)
    .where(
      and(
        isNull(todos.doneAt),
        sql`coalesce(${todos.startOn}, ${todos.dueOn}) <= ${tomorrow}`,
        sql`coalesce(${todos.dueOn}, ${todos.startOn}) >= ${yesterday}`,
      ),
    );
  const list = rows.flatMap((row) =>
    todoReminders({ ...row, title: open(row.title) }),
  );
  if ((await getCalendars()).length > 0) {
    const from = new Date(`${today}T00:00:00+09:00`);
    const { events } = await upcomingEvents(from, new Date(now.getTime() + 2 * 60 * MINUTE));
    list.push(...events.flatMap(eventReminders));
  }
  return list;
}

/** 항목을 남기고 그 번호들로 단추를 만든다(MYH-259) */
async function itemsFor(order: Reminder[]) {
  const rows = await getDb()
    .insert(reminderItems)
    .values(
      order.map((r) => ({
        todoId: r.kind === "todo" ? Number(r.key.split(":")[1]) : null,
        text: encryptText(reminderLine(r)),
      })),
    )
    .returning({ id: reminderItems.id, todoId: reminderItems.todoId });
  return rows;
}

/** [30분 뒤] 로 미뤄 둔 것 가운데 때가 된 것을 다시 보낸다 */
async function runAgain(now: Date) {
  const db = getDb();
  const rows = await db
    .update(reminderItems)
    .set({ remindAt: null })
    .where(
      and(
        lte(reminderItems.remindAt, now),
        gt(reminderItems.remindAt, new Date(now.getTime() - GRACE_MS)),
      ),
    )
    .returning();
  if (rows.length === 0) return 0;
  const lines = rows.map((r) => open(r.text) ?? "열 수 없음");
  const ok = await notifyTelegram(
    againMessage(lines),
    reminderKeyboard(rows.map((r) => ({ id: r.id, todo: r.todoId !== null }))),
  );
  if (!ok) {
    // 다음 번에 다시
    await db
      .update(reminderItems)
      .set({ remindAt: now })
      .where(inArray(reminderItems.id, rows.map((r) => r.id)));
    return 0;
  }
  return rows.length;
}

/** 한 번 돌기. 보낸 수를 돌려준다 */
export async function runReminders(now = new Date()) {
  if (inboxDisabled() || !(await remindersOn())) return 0;
  const again = await runAgain(now);
  const due = dueReminders(await candidates(now), now);
  if (due.length === 0) return again;

  const db = getDb();
  const taken = await db
    .insert(remindersSent)
    .values(due.map((r) => ({ key: r.key })))
    .onConflictDoNothing()
    .returning({ key: remindersSent.key });
  const mine = new Set(taken.map((t) => t.key));
  const send = due.filter((r) => mine.has(r.key));
  if (send.length === 0) return again;

  const { text, order } = reminderMessage(send);
  const items = await itemsFor(order);
  const keyboard = reminderKeyboard(items.map((it) => ({ id: it.id, todo: it.todoId !== null })));
  if (!(await notifyTelegram(text, keyboard))) {
    await db.delete(remindersSent).where(inArray(remindersSent.key, [...mine]));
    await db.delete(reminderItems).where(inArray(reminderItems.id, items.map((it) => it.id)));
    return again;
  }
  return again + send.length;
}

/** 30일 지난 기록을 지운다 */
async function prune(now: Date) {
  const before = new Date(now.getTime() - 30 * DAY);
  const db = getDb();
  await db.delete(remindersSent).where(lt(remindersSent.sentAt, before));
  await db.delete(reminderItems).where(lt(reminderItems.createdAt, before));
}

const STARTED = Symbol.for("myhome.reminders");
/** 도는 간격. 시계의 5분(:00 · :05 …)에 맞춰 돌아 정각 · 30분 알림이 늦지 않는다 */
const EVERY = 5 * MINUTE;

/** 5분마다 돌린다. 한 프로세스에 한 번만 건다(개발기의 다시 불러오기에도) */
export function startReminderTicker() {
  const g = globalThis as Record<symbol, unknown>;
  if (g[STARTED]) return;
  g[STARTED] = true;
  let last = 0;
  const tick = async () => {
    const now = new Date();
    try {
      const sent = await runReminders(now);
      if (sent) console.info(`[reminders] ${sent}개 보냄`);
      if (now.getTime() - last > DAY) {
        last = now.getTime();
        await prune(now);
      }
    } catch (error) {
      console.warn("[reminders] 건너뜀:", error);
    }
  };
  // 다음 5분 눈금(+5초)에 처음 돌고 그 뒤로 5분마다
  const wait = EVERY - (Date.now() % EVERY) + 5_000;
  setTimeout(() => {
    void tick();
    setInterval(tick, EVERY).unref?.();
  }, wait).unref?.();
}
