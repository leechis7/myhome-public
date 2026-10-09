import { and, asc, count, eq, isNotNull } from "drizzle-orm";
import {
  books,
  codeGroups,
  codes,
  getDb,
  links,
  posts,
  skills,
  type Code,
  type CodeGroupRow,
} from "@/lib/db";

import {
  BOOK_CATEGORY,
  BOOK_KIND,
  LINK_CATEGORY,
  SERIES,
  type CodeGroup,
} from "@/lib/code-groups";

export * from "@/lib/code-groups";

/** 그룹들. 순서대로 */
export async function listCodeGroups(): Promise<CodeGroupRow[]> {
  return getDb()
    .select()
    .from(codeGroups)
    .orderBy(asc(codeGroups.sortOrder), asc(codeGroups.groupCode));
}

/** 그 그룹이 DB 에 있나. 화면에서 더한 그룹도 있으니 프로그램 목록이 아니라 DB 를 본다 */
export async function groupExists(group: string) {
  if (!group) return false;
  const [row] = await getDb()
    .select({ groupCode: codeGroups.groupCode })
    .from(codeGroups)
    .where(eq(codeGroups.groupCode, group))
    .limit(1);
  return Boolean(row);
}

/** 그룹마다 코드가 몇 개인가. 그룹 지우기를 보일지 가른다 */
export async function countCodesByGroup() {
  const rows = await getDb()
    .select({ group: codes.groupCode, n: count() })
    .from(codes)
    .groupBy(codes.groupCode);
  return new Map(rows.map((r) => [r.group, Number(r.n)]));
}

/** 한 그룹의 코드. 순서대로. 꺼 둔 것도 넣으려면 all */
export async function listCodes(
  group: string,
  { all = false }: { all?: boolean } = {},
): Promise<Code[]> {
  return getDb()
    .select()
    .from(codes)
    .where(
      all
        ? eq(codes.groupCode, group)
        : and(eq(codes.groupCode, group), eq(codes.active, true)),
    )
    .orderBy(asc(codes.sortOrder), asc(codes.code));
}

/** 코드마다 몇 줄이 쓰고 있나. 지우기를 보일지 가른다 */
export async function countUsage(group: CodeGroup) {
  // 책 종류는 책이 쓴다(MYH-190)
  if (group === BOOK_KIND) {
    const rows = await getDb()
      .select({ code: books.kindCode, n: count() })
      .from(books)
      .where(isNotNull(books.kindCode))
      .groupBy(books.kindCode);
    return new Map(rows.map((r) => [r.code!, Number(r.n)]));
  }
  // 책 분류도 책이 쓴다(MYH-225)
  if (group === BOOK_CATEGORY) {
    const rows = await getDb()
      .select({ code: books.categoryCode, n: count() })
      .from(books)
      .where(isNotNull(books.categoryCode))
      .groupBy(books.categoryCode);
    return new Map(rows.map((r) => [r.code!, Number(r.n)]));
  }
  // 연재는 글이 쓴다(MYH-187)
  if (group === SERIES) {
    const rows = await getDb()
      .select({ code: posts.seriesCode, n: count() })
      .from(posts)
      .where(isNotNull(posts.seriesCode))
      .groupBy(posts.seriesCode);
    return new Map(rows.map((r) => [r.code!, Number(r.n)]));
  }
  const table = group === LINK_CATEGORY ? links : skills;
  const rows = await getDb()
    .select({ code: table.categoryCode, n: count() })
    .from(table)
    .where(isNotNull(table.categoryCode))
    .groupBy(table.categoryCode);
  return new Map(rows.map((r) => [r.code!, Number(r.n)]));
}

/**
 * 폼이 보낸 코드 번호를 읽는다. 비었으면 null, 그 그룹에 없으면 "invalid".
 * 외래 키도 막지만, 막히기 전에 알아듣는 말로 돌려주려고 먼저 본다.
 */
export async function readCode(
  value: FormDataEntryValue | null,
  group: CodeGroup,
): Promise<string | null | "invalid"> {
  const code = String(value ?? "").trim();
  if (!code) return null;
  const [row] = await getDb()
    .select({ code: codes.code })
    .from(codes)
    .where(and(eq(codes.groupCode, group), eq(codes.code, code)))
    .limit(1);
  return row ? code : "invalid";
}
