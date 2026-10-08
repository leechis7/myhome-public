import { and, asc, eq, sql } from "drizzle-orm";
import { codes, getDb, skills, type Skill } from "@/lib/db";

/** 목록에 쓰는 줄. 분류는 코드 번호와 함께 이름(category)으로 풀어 둔다(MYH-131) */
export type SkillRow = Skill & {
  /** 분류 이름. 코드 테이블에서 풀었다. 없으면 null */
  category: string | null;
};

/**
 * 기술 목록. 분류의 순서(codes.sort_order)대로, 그 안에서는 줄 순서대로.
 * 분류가 없는 것은 맨 뒤다. 소개 화면에서 분류가 나오는 순서가 이것이다.
 */
export async function listSkills(): Promise<SkillRow[]> {
  return getDb()
    .select({
      id: skills.id,
      name: skills.name,
      categoryGroup: skills.categoryGroup,
      categoryCode: skills.categoryCode,
      category: codes.label,
      sortOrder: skills.sortOrder,
    })
    .from(skills)
    .leftJoin(
      codes,
      and(
        eq(codes.groupCode, skills.categoryGroup),
        eq(codes.code, skills.categoryCode),
      ),
    )
    .orderBy(
      sql`${codes.sortOrder} asc nulls last`,
      asc(skills.sortOrder),
      asc(skills.name),
    );
}
