import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { getDb, memos } from "@/lib/db";
import { findDiary, saveDiary } from "@/lib/my-space/diary";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { decryptText, encryptText } from "@/lib/security/secret-crypto";

/**
 * 빠른 메모(MYH-215). 글은 암호화해서 둔다 — 암호화 · 복호화는 여기 한 곳에서 한다.
 */

export type MemoSource = "telegram" | "web" | "api";

function open(envelope: string) {
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

/** 최신순. 열 수 없는 글은 content 가 null */
export async function listMemos() {
  const rows = await getDb()
    .select()
    .from(memos)
    .orderBy(desc(memos.createdAt), desc(memos.id));
  return rows.map((row) => ({ ...row, content: open(row.content) }));
}

/**
 * 그 날(서울 0 ~ 24시)에 적은 메모, 적은 차례로(MYH-250). 열 수 없는 글은 뺀다.
 * 일기 초안을 만들 때 쓴다.
 */
export async function memosOfDay(day: string) {
  const from = new Date(`${day}T00:00:00+09:00`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const rows = await getDb()
    .select()
    .from(memos)
    .where(and(gte(memos.createdAt, from), lt(memos.createdAt, to)))
    .orderBy(asc(memos.createdAt), asc(memos.id));
  return rows
    .map((row) => ({ ...row, content: open(row.content) }))
    .filter((row): row is typeof row & { content: string } => row.content !== null);
}

export async function addMemo(content: string, source: MemoSource) {
  const [row] = await getDb()
    .insert(memos)
    .values({ content: encryptText(content), source })
    .returning({ id: memos.id });
  return row.id;
}

export async function updateMemo(id: number, content: string) {
  await getDb()
    .update(memos)
    .set({ content: encryptText(content) })
    .where(eq(memos.id, id));
}

export async function removeMemo(id: number) {
  await getDb().delete(memos).where(eq(memos.id, id));
}

/**
 * 메모를 쓴 날의 일기 끝에 붙인다. 그 날 일기가 없으면 메모로 시작한다.
 * 기분은 건드리지 않는다. 옮긴 메모는 지우지 않고 옮긴 때만 적는다.
 * 옮긴 날(YYYY-MM-DD)을 준다. 없는 메모 · 열 수 없는 메모면 null.
 */
export async function moveMemoToDiary(id: number) {
  const db = getDb();
  const [row] = await db.select().from(memos).where(eq(memos.id, id)).limit(1);
  const text = row ? open(row.content) : null;
  if (!row || text === null) return null;

  const day = todayInSeoul(row.createdAt);
  const diary = await findDiary(day);
  const before = diary?.content?.trim() ?? "";
  await saveDiary(day, {
    content: before ? `${before}\n\n${text}` : text,
    mood: diary?.mood ?? null,
  });
  await db.update(memos).set({ movedAt: new Date() }).where(eq(memos.id, id));
  return day;
}
