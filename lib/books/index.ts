import { aliasedTable, and, desc, eq, sql } from "drizzle-orm";
import { books, codes, getDb, uploads } from "@/lib/db";
import { BOOK_CATEGORY, BOOK_KIND } from "@/lib/codes/groups";
import { extensionFor } from "@/lib/uploads";

/**
 * 읽는 책(MYH-190). 직접 적고 소개 화면에 보인다.
 *
 *   want     읽고 싶은 책(MYH-227). 아직 시작하지 않았다
 *   reading  읽는 중
 *   read     다 읽음
 */
export type BookStatus = "want" | "reading" | "read";

/** 고르는 칸의 순서이기도 하다 */
export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  reading: "읽는 중",
  read: "다 읽음",
  want: "읽고 싶은 책",
};

export function isBookStatus(value: unknown): value is BookStatus {
  return value === "want" || value === "reading" || value === "read";
}

/** 분류(MYH-225)도 codes 에서 이름을 가져온다. 종류와 같은 테이블이라 별칭을 둔다 */
const categories = aliasedTable(codes, "categories");

const columns = {
  id: books.id,
  title: books.title,
  author: books.author,
  kindCode: books.kindCode,
  kind: codes.label,
  categoryCode: books.categoryCode,
  category: categories.label,
  categorySort: categories.sortOrder,
  status: books.status,
  note: books.note,
  coverId: books.coverId,
  coverType: uploads.mimeType,
  url: books.url,
  startedOn: books.startedOn,
  finishedOn: books.finishedOn,
  rating: books.rating,
  /** 독서 노트가 있는가. 목록에는 본문을 싣지 않는다 */
  hasNote: sql<boolean>`coalesce(${books.readingNote}, '') <> ''`,
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
    .leftJoin(
      categories,
      and(
        eq(categories.groupCode, BOOK_CATEGORY),
        eq(categories.code, books.categoryCode),
      ),
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
 * 관리 화면의 목록. 읽는 중 · 읽고 싶은 책 · 다 읽음 차례로, 그 안에서는
 * 최근에 시작한 것부터. 다 읽은 것은 최근에 끝낸 것부터.
 */
export async function listBooks() {
  return query().orderBy(
    sql`case ${books.status} when 'reading' then 0 when 'want' then 1 else 2 end`,
    desc(sql`coalesce(${books.finishedOn}, ${books.startedOn})`),
    desc(books.id),
  );
}

/**
 * 공개 화면(/books). 읽는 중은 최근에 시작한 것부터, 다 읽은 것은 최근에
 * 끝낸 것부터(끝낸 날을 안 적었으면 뒤로). 읽고 싶은 책은 최근에 적은 것부터.
 */
export async function listShelf() {
  const [reading, read, want] = await Promise.all([
    query()
      .where(eq(books.status, "reading"))
      .orderBy(desc(books.startedOn), desc(books.id)),
    query()
      .where(eq(books.status, "read"))
      .orderBy(sql`${books.finishedOn} desc nulls last`, desc(books.id)),
    query().where(eq(books.status, "want")).orderBy(desc(books.id)),
  ]);
  return { reading, read, want };
}

/** 읽는 중인 책 수. 소개의 링크 한 줄에 쓴다 */
export async function countReading() {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(books)
    .where(eq(books.status, "reading"));
  return row?.n ?? 0;
}

/** 관리 › 책 의 거르기(MYH-226). 상태 · 분류 · 제목이나 지은이의 낱말 */
export type BookFilter = {
  status: BookStatus | null;
  category: string | null;
  q: string;
};

/** 주소(?status=…&category=…&q=…)에서 거르기를 읽는다. 모르는 값은 버린다 */
export function readBookFilter(params: Record<string, string | string[] | undefined>): BookFilter {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const status = one(params.status);
  return {
    status: isBookStatus(status) ? status : null,
    category: one(params.category) || null,
    q: one(params.q).trim().slice(0, 100),
  };
}

export function filterBooks<
  T extends { status: string; categoryCode: string | null; title: string; author: string },
>(rows: T[], { status, category, q }: BookFilter) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(
    (b) =>
      (!status || b.status === status) &&
      (!category || b.categoryCode === category) &&
      words.every((w) => `${b.title} ${b.author}`.toLowerCase().includes(w)),
  );
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

/**
 * 책장에 있는 분류와 그 책 수(MYH-225). /books 의 거르기 단추에 쓴다.
 * 코드 화면의 순서대로. 분류가 없는 책은 세지 않는다.
 */
export function categoriesOf(
  rows: {
    categoryCode: string | null;
    category: string | null;
    categorySort: number | null;
  }[],
) {
  const found = new Map<
    string,
    { code: string; label: string; sort: number; count: number }
  >();
  for (const row of rows) {
    if (!row.categoryCode || !row.category) continue;
    const seen = found.get(row.categoryCode);
    if (seen) seen.count += 1;
    else
      found.set(row.categoryCode, {
        code: row.categoryCode,
        label: row.category,
        sort: row.categorySort ?? 0,
        count: 1,
      });
  }
  return [...found.values()]
    .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
    .map(({ code, label, count }) => ({ code, label, count }));
}

/** 별점은 1~5 정수. 그 밖(비움 · 잘못된 값)은 null */
export function parseRating(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** 별 다섯 개 글자. 4 → ★★★★☆ */
export function stars(rating: number) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/** 책 한 권과 독서 노트(MYH-211). 상세 화면 · 노트 쓰기 화면 */
export async function findBook(id: number) {
  if (!Number.isInteger(id) || id < 1) return null;
  const [row] = await getDb()
    .select({
      ...columns,
      readingNote: books.readingNote,
      noteUpdatedAt: books.noteUpdatedAt,
    })
    .from(books)
    .leftJoin(
      codes,
      and(eq(codes.groupCode, BOOK_KIND), eq(codes.code, books.kindCode)),
    )
    .leftJoin(
      categories,
      and(
        eq(categories.groupCode, BOOK_CATEGORY),
        eq(categories.code, books.categoryCode),
      ),
    )
    .leftJoin(uploads, eq(uploads.id, books.coverId))
    .where(eq(books.id, id))
    .limit(1);
  return row ?? null;
}

/** 독서 노트가 있는 책. 사이트맵이 쓴다 */
export async function listBooksWithNotes() {
  return getDb()
    .select({ id: books.id, noteUpdatedAt: books.noteUpdatedAt })
    .from(books)
    .where(sql`coalesce(${books.readingNote}, '') <> ''`);
}
