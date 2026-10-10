import { asc, desc, eq, sql } from "drizzle-orm";
import {
  careers,
  getDb,
  resumeLicenses,
  resumeProfile,
  resumeSchools,
  resumeTrainings,
} from "@/lib/db";
import {
  DEFAULT_PUBLIC_SECTIONS,
  isResumeSection,
  type ResumeSection,
} from "@/lib/profile/resume-sections";

export * from "@/lib/profile/resume-sections";

/**
 * 이력서에만 쓰는 것(MYH-198). 인적 사항 한 행과 학력 · 교육 · 자격증 줄.
 * 순서는 날짜가 최근인 것부터, 날짜가 없으면 뒤로.
 */
export async function readResume() {
  const db = getDb();
  const [[profile], schools, trainings, licenses, [first]] = await Promise.all([
    db.select().from(resumeProfile).where(eq(resumeProfile.id, 1)).limit(1),
    db
      .select()
      .from(resumeSchools)
      .orderBy(sql`${resumeSchools.startedOn} desc nulls last`, desc(resumeSchools.id)),
    db
      .select()
      .from(resumeTrainings)
      .orderBy(sql`${resumeTrainings.takenOn} desc nulls last`, desc(resumeTrainings.id)),
    db
      .select()
      .from(resumeLicenses)
      .orderBy(sql`${resumeLicenses.acquiredOn} desc nulls last`, desc(resumeLicenses.id)),
    // 전산 경력은 가장 이른 경력 시작부터 센다
    db
      .select({ startedOn: careers.startedOn })
      .from(careers)
      .orderBy(asc(careers.startedOn))
      .limit(1),
  ]);
  const publicSections: ResumeSection[] = (
    profile?.publicSections ?? DEFAULT_PUBLIC_SECTIONS
  ).filter(isResumeSection);
  return {
    profile: profile ?? null,
    publicSections,
    schools,
    trainings,
    licenses,
    careerStart: first?.startedOn ?? null,
  };
}
