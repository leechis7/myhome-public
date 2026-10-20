import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { getDb, meetingChunks, meetings } from "@/lib/db";
import { decryptText, encryptText } from "@/lib/security/secret-crypto";

/**
 * 회의(MYH-265). 녹음하며 30초씩 받아쓴 조각을 쌓는다. 제목 · 조각 글 · 요약은
 * 암호화한다 - 참석자의 말이 들어 있다. 암호화 · 복호화는 여기 한 곳에서 한다.
 */

function open(envelope: string | null) {
  if (envelope === null) return null;
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

const titleFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export async function createMeeting(title?: string, source: "live" | "file" = "live") {
  const name = title?.trim() || `${titleFmt.format(new Date())} 회의`;
  const [row] = await getDb()
    .insert(meetings)
    .values({ title: encryptText(name.slice(0, 200)), source })
    .returning({ id: meetings.id });
  return row.id;
}

/** 조각 하나를 남긴다. 같은 번호가 이미 있으면 버린다(다시 보낸 것) */
export async function addMeetingChunk(meetingId: number, seq: number, text: string) {
  await getDb()
    .insert(meetingChunks)
    .values({ meetingId, seq, text: encryptText(text) })
    .onConflictDoNothing();
}

/** 이 조각 바로 앞 조각의 글(비서를 불렀을 때 앞뒤를 보려고, MYH-267). 없으면 "" */
export async function previousChunkText(meetingId: number, seq: number) {
  const [row] = await getDb()
    .select({ text: meetingChunks.text })
    .from(meetingChunks)
    .where(and(eq(meetingChunks.meetingId, meetingId), lt(meetingChunks.seq, seq)))
    .orderBy(desc(meetingChunks.seq))
    .limit(1);
  return open(row?.text ?? null) ?? "";
}

export async function endMeeting(id: number) {
  await getDb()
    .update(meetings)
    .set({ endedAt: new Date() })
    .where(eq(meetings.id, id));
}

/** 회의 끝 요약(MYH-266)을 남긴다(암호화). null 이면 지운다 */
export async function saveMeetingSummary(id: number, summary: string | null) {
  await getDb()
    .update(meetings)
    .set({ summary: summary === null ? null : encryptText(summary) })
    .where(eq(meetings.id, id));
}

/** 오픈클로에 맡긴 결과(MYH-268)를 남긴다(암호화) */
export async function saveMeetingHandoff(id: number, reply: string) {
  await getDb()
    .update(meetings)
    .set({ handoff: encryptText(reply) })
    .where(eq(meetings.id, id));
}

export async function renameMeeting(id: number, title: string) {
  await getDb()
    .update(meetings)
    .set({ title: encryptText(title.trim().slice(0, 200)) })
    .where(eq(meetings.id, id));
}

export async function removeMeeting(id: number) {
  await getDb().delete(meetings).where(eq(meetings.id, id));
}

/** 최근 회의부터. 조각 수도 함께 */
export async function listMeetings() {
  const rows = await getDb()
    .select({
      id: meetings.id,
      title: meetings.title,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      source: meetings.source,
      chunks: sql<number>`(select count(*)::int from ${meetingChunks} where ${meetingChunks.meetingId} = ${meetings.id})`,
    })
    .from(meetings)
    .orderBy(desc(meetings.startedAt))
    .limit(100);
  return rows.map((r) => ({ ...r, title: open(r.title) ?? "열 수 없음" }));
}

/** 회의 하나와 대본(조각 차례대로). 없으면 null */
export async function getMeeting(id: number) {
  const db = getDb();
  const [row] = await db.select().from(meetings).where(eq(meetings.id, id)).limit(1);
  if (!row) return null;
  const chunks = await db
    .select()
    .from(meetingChunks)
    .where(eq(meetingChunks.meetingId, id))
    .orderBy(asc(meetingChunks.seq));
  return {
    ...row,
    title: open(row.title) ?? "열 수 없음",
    summary: open(row.summary),
    handoff: open(row.handoff),
    chunks: chunks.map((c) => ({ seq: c.seq, text: open(c.text) ?? "", at: c.createdAt })),
  };
}
