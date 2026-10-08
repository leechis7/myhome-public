import { and, desc, eq, sql } from "drizzle-orm";
import { books, codes, getDb, uploads } from "@/lib/db";
import { BOOK_KIND } from "@/lib/code-groups";
import { extensionFor } from "@/lib/uploads";

/**
 * 읽는 책(MYH-190). 직접 적고 소개 화면에 보인다.
 *
 *   reading  읽는 중
 *   read     다 읽음
 */
export type BookStatus = "reading" | "read";

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  reading: "읽는 중",
  read: "다 읽음",
};

export function isBookStatus(value: unknown): value is BookStatus {
  return value === "reading" || value === "read";
}


const columns = {
  id: books.id,
  title: books.title,
  author: books.author,
  kindCode: books.kindCode,
  kind: codes.label,
  status: books.status,
  note: books.note,
  coverId: books.coverId,
  coverType: uploads.mimeType,
  url: books.url,
  startedOn: books.startedOn,
  finishedOn: books.finishedOn,
};

export type BookRow = Awaited<ReturnType<typeof listBooks>>[number];

function query() {
  return getDb()
    .select(columns)
    .from(books)
    .leftJoin(
      codes,
      and(eq(codes.groupCode, BOOK_KIND), eq(codes.code, books.kindCode)),
    )
    .leftJoin(uploads, eq(uploads.id, books.coverId))
    .$dynamic();
}

/** 표지 주소. 올린 그림과 같은 길(/uploads)이다 */
export function coverUrl(row: { coverId: string | null; coverType: string | null }) {
  return row.coverId && row.coverType
    ? `/uploads/${row.coverId}.${extensionFor(row.coverType)}`
    : null;
}

/**
 * 관리 화면의 목록. 읽는 중이 먼저, 그 안에서는 최근에 시작한 것부터.
 * 다 읽은 것은 최근에 끝낸 것부터.
 */
export async function listBooks() {
  return query().orderBy(
    sql`${books.status} = 'read'`,
    desc(sql`coalesce(${books.finishedOn}, ${books.startedOn})`),
    desc(books.id),
  );
}

/**
 * 공개 화면(/books). 읽는 중은 최근에 시작한 것부터, 다 읽은 것은 최근에
 * 끝낸 것부터(끝낸 날을 안 적었으면 뒤로).
 */
export async function listShelf() {
  const [reading, read] = await Promise.all([
    query()
      .where(eq(books.status, "reading"))
      .orderBy(desc(books.startedOn), desc(books.id)),
    query()
      .where(eq(books.status, "read"))
      .orderBy(sql`${books.finishedOn} desc nulls last`, desc(books.id)),
  ]);
  return { reading, read };
}

/** 읽는 중인 책 수. 소개의 링크 한 줄에 쓴다 */
export async function countReading() {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(books)
    .where(eq(books.status, "reading"));
  return row?.n ?? 0;
}

/** 다 읽은 책을 끝낸 해로 묶는다. 날을 안 적은 것은 맨 뒤 「날짜 없음」 */
export function groupByYear<T extends { finishedOn: string | null }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const year = row.finishedOn ? row.finishedOn.slice(0, 4) : "날짜 없음";
    groups.set(year, [...(groups.get(year) ?? []), row]);
  }
  return [...groups.entries()];
}
