import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, todos } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/security/secret-crypto";
import { hhmm, orderRange, todoEvent, type TodoEvent } from "@/lib/my-space/todo-dates";

/**
 * 할 일(MYH-217). 글은 암호화하고, 기간(시작일 ~ 마감일, MYH-228) · 끝낸 때는
 * 평문이다(줄 세우기 · 넘김 표시). 암호화 · 복호화는 여기 한 곳에서 한다.
 */

export type TodoSource = "telegram" | "web" | "api";

function open(envelope: string) {
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

/**
 * 안 끝낸 것은 마감이 이른 것부터(같은 날은 시각 차례, 마감 없는 것은 시작일
 * 차례로 그 뒤, 날이 없는 것은 맨 뒤. 그 안에서는 먼저 적은 것부터). 끝낸 것은
 * 최근에 끝낸 것부터 30개까지.
 */
export async function listTodos() {
  const db = getDb();
  const [open_, done] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(isNull(todos.doneAt))
      .orderBy(
        sql`${todos.dueOn} asc nulls last`,
        sql`${todos.startOn} asc nulls last`,
        sql`${todos.startTime} asc nulls last`,
        sql`${todos.endTime} asc nulls last`,
        asc(todos.createdAt),
        asc(todos.id),
      ),
    db
      .select()
      .from(todos)
      .where(isNotNull(todos.doneAt))
      .orderBy(desc(todos.doneAt), desc(todos.id))
      .limit(30),
  ]);
  const opened = (rows: typeof open_) =>
    rows.map((row) => ({
      ...row,
      title: open(row.title),
      startTime: row.startTime ? hhmm(row.startTime) : null,
      endTime: row.endTime ? hhmm(row.endTime) : null,
    }));
  return { open: opened(open_), done: opened(done) };
}

/**
 * 일정 달력에 보일 할 일(MYH-254). 기간(시작일 ~ 마감일, 하나만 있으면 그 날)이
 * [from, to] 날에 걸치는 것을 끝낸 것까지 일정 꼴로.
 */
export async function todoEventsBetween(from: string, to: string): Promise<TodoEvent[]> {
  const rows = await getDb()
    .select()
    .from(todos)
    .where(
      and(
        sql`coalesce(${todos.startOn}, ${todos.dueOn}) <= ${to}`,
        sql`coalesce(${todos.dueOn}, ${todos.startOn}) >= ${from}`,
      ),
    )
    .orderBy(asc(todos.id));
  return rows
    .map((row) => todoEvent({ ...row, title: open(row.title) }))
    .filter((e): e is TodoEvent => e !== null);
}

export async function addTodo(
  title: string,
  {
    startOn = null,
    dueOn = null,
    startTime = null,
    endTime = null,
    source = "web",
  }: {
    startOn?: string | null;
    dueOn?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    source?: TodoSource;
  } = {},
) {
  const [row] = await getDb()
    .insert(todos)
    .values({ title: encryptText(title), ...orderRange({ startOn, dueOn }), startTime, endTime, source })
    .returning({ id: todos.id });
  return row.id;
}

export async function updateTodo(
  id: number,
  input: {
    title: string;
    startOn: string | null;
    dueOn: string | null;
    startTime: string | null;
    endTime: string | null;
  },
) {
  await getDb()
    .update(todos)
    .set({
      title: encryptText(input.title),
      ...orderRange({ startOn: input.startOn, dueOn: input.dueOn }),
      startTime: input.startTime,
      endTime: input.endTime,
    })
    .where(eq(todos.id, id));
}

/** 끝냄 ↔ 안 끝냄 */
export async function setTodoDone(id: number, done: boolean) {
  await getDb()
    .update(todos)
    .set({ doneAt: done ? new Date() : null })
    .where(eq(todos.id, id));
}

export async function removeTodo(id: number) {
  await getDb().delete(todos).where(eq(todos.id, id));
}

/** 끝낸 것을 모두 지운다 */
export async function clearDoneTodos() {
  await getDb().delete(todos).where(isNotNull(todos.doneAt));
}
