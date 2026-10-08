import { and, asc, eq, gte, lt } from "drizzle-orm";
import { getDb, secrets } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/secret-crypto";
import { isMood, monthRange, type Mood } from "@/lib/diary-calendar";

/**
 * 일기장(MYH-213). 비밀글과 같은 테이블(secrets)에 diary_day 를 달아 둔다.
 * 암호화, 본문 그림, 지우기가 비밀글과 같은 길로 간다. 하루 한 편이다.
 *
 * 제목은 쓰지 않는다 — 날짜가 제목이다. 칸은 비밀글과 같이 암호화해서 둔다.
 */

function open(envelope: string | null) {
  if (envelope === null) return null;
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

function openMood(envelope: string | null): Mood | null {
  const plain = open(envelope);
  return isMood(plain) ? plain : null;
}

/** 그 달에 쓴 날과 기분. 달력이 쓴다. 본문은 복호화하지 않는다 */
export async function listDiaryMonth(month: string) {
  const { from, to } = monthRange(month);
  const rows = await getDb()
    .select({ day: secrets.diaryDay, mood: secrets.mood })
    .from(secrets)
    .where(and(gte(secrets.diaryDay, from), lt(secrets.diaryDay, to)))
    .orderBy(asc(secrets.diaryDay));
  return new Map(rows.map((r) => [r.day!, openMood(r.mood)]));
}

/** 그 날의 일기. 없으면 null. 열 수 없으면 content 가 null */
export async function findDiary(day: string) {
  const [row] = await getDb()
    .select({
      id: secrets.id,
      day: secrets.diaryDay,
      content: secrets.content,
      mood: secrets.mood,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .where(eq(secrets.diaryDay, day))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    day: row.day!,
    content: open(row.content),
    mood: openMood(row.mood),
    updatedAt: row.updatedAt,
  };
}

/**
 * 그 날의 줄을 만들어 두고 번호를 준다. 이미 있으면 그 번호.
 *
 * 저장하기 전에 그림부터 올리면 그림이 딸릴 줄이 있어야 한다(비밀글의 빈
 * 초안과 같은 까닭). 날짜가 겹치지 않으니 둘이 동시에 와도 한 줄이다.
 */
export async function ensureDiary(day: string) {
  const db = getDb();
  await db
    .insert(secrets)
    .values({
      title: encryptText(""),
      content: encryptText(""),
      writtenAt: new Date(`${day}T12:00:00+09:00`),
      diaryDay: day,
    })
    .onConflictDoNothing({ target: secrets.diaryDay });
  const [row] = await db
    .select({ id: secrets.id })
    .from(secrets)
    .where(eq(secrets.diaryDay, day))
    .limit(1);
  return row.id;
}

/** 일기를 쓴다. 그 날에 있으면 고치고 없으면 만든다 */
export async function saveDiary(
  day: string,
  input: { content: string; mood: Mood | null },
) {
  const id = await ensureDiary(day);
  await getDb()
    .update(secrets)
    .set({
      content: encryptText(input.content),
      mood: input.mood ? encryptText(input.mood) : null,
      updatedAt: new Date(),
    })
    .where(eq(secrets.id, id));
  return id;
}
