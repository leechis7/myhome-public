import { asc, desc, eq } from "drizzle-orm";
import { getDb, projects } from "@/lib/db";

/**
 * 한 테이블에 두 가지가 있다.
 *
 *   project  지금 만들고 있는 것 (/projects)
 *   work     지나온 업무 (소개 화면의 "수행 업무")
 *
 * 담을 칸이 같아서 테이블을 나누지 않았다. 옮기는 것도 한 줄 update 다.
 */
export type ProjectKind = "project" | "work";

/** 정렬 순서대로, 같으면 최근 시작한 것부터 */
export async function listProjects(kind: ProjectKind) {
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.kind, kind))
    .orderBy(asc(projects.sortOrder), desc(projects.startedOn));
}

/** 2026-09 → 2026.09 */
function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return `${year}.${month}`;
}

/** 시작일만 있으면 "2026.09 —", 둘 다 없으면 빈 문자열 */
export function formatPeriod(
  startedOn: string | null,
  endedOn: string | null,
) {
  if (!startedOn && !endedOn) return "";
  if (!startedOn) return formatMonth(endedOn!);
  return `${formatMonth(startedOn)} — ${endedOn ? formatMonth(endedOn) : "진행 중"}`;
}
