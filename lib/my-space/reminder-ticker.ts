import { and, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb, remindersSent, todos } from "@/lib/db";
import { decryptText } from "@/lib/security/secret-crypto";
import { getCalendars, upcomingEvents } from "@/lib/my-space/calendar";
import {
  dueReminders,
  eventReminders,
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

/** 한 번 돌기. 보낸 수를 돌려준다 */
export async function runReminders(now = new Date()) {
  if (inboxDisabled() || !(await remindersOn())) return 0;
  const due = dueReminders(await candidates(now), now);
  if (due.length === 0) return 0;

  const db = getDb();
  const taken = await db
    .insert(remindersSent)
    .values(due.map((r) => ({ key: r.key })))
    .onConflictDoNothing()
    .returning({ key: remindersSent.key });
  const mine = new Set(taken.map((t) => t.key));
  const send = due.filter((r) => mine.has(r.key));
  if (send.length === 0) return 0;

  if (!(await notifyTelegram(reminderMessage(send)))) {
    await db.delete(remindersSent).where(inArray(remindersSent.key, [...mine]));
    return 0;
  }
  return send.length;
}

/** 30일 지난 기록을 지운다 */
async function prune(now: Date) {
  await getDb()
    .delete(remindersSent)
    .where(lt(remindersSent.sentAt, new Date(now.getTime() - 30 * DAY)));
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
