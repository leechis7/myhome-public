import { asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb, todos } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/secret-crypto";

/**
 * 할 일(MYH-217). 글은 암호화하고, 기한 · 끝낸 때는 평문이다(줄 세우기 · 넘김
 * 표시). 암호화 · 복호화는 여기 한 곳에서 한다.
 */

export type TodoSource = "telegram" | "web";

function open(envelope: string) {
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

/**
 * 안 끝낸 것은 기한이 이른 것부터(기한 없는 것은 뒤, 그 안에서는 먼저 적은
 * 것부터). 끝낸 것은 최근에 끝낸 것부터 30개까지.
 */
export async function listTodos() {
  const db = getDb();
  const [open_, done] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(isNull(todos.doneAt))
      .orderBy(sql`${todos.dueOn} asc nulls last`, asc(todos.createdAt), asc(todos.id)),
    db
      .select()
      .from(todos)
      .where(isNotNull(todos.doneAt))
      .orderBy(desc(todos.doneAt), desc(todos.id))
      .limit(30),
  ]);
  const opened = (rows: typeof open_) =>
    rows.map((row) => ({ ...row, title: open(row.title) }));
  return { open: opened(open_), done: opened(done) };
}

export async function addTodo(
  title: string,
  { dueOn = null, source = "web" }: { dueOn?: string | null; source?: TodoSource } = {},
) {
  const [row] = await getDb()
    .insert(todos)
    .values({ title: encryptText(title), dueOn, source })
    .returning({ id: todos.id });
  return row.id;
}

export async function updateTodo(id: number, input: { title: string; dueOn: string | null }) {
  await getDb()
    .update(todos)
    .set({ title: encryptText(input.title), dueOn: input.dueOn })
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
