/**
 * 이력서 항목(MYH-198). /resume 에 나오는 순서이기도 하다. 방문자에게 보일
 * 것은 resume_profile.public_sections 에 담고, 관리자에게는 늘 전부 보인다.
 *
 * DB 를 부르지 않는다 - 클라이언트 화면도 쓴다.
 */
export const RESUME_SECTIONS = [
  "personal",
  "schools",
  "career",
  "trainings",
  "licenses",
  "skills",
  "work",
] as const;

export type ResumeSection = (typeof RESUME_SECTIONS)[number];

export const RESUME_SECTION_LABELS: Record<ResumeSection, string> = {
  personal: "기본 인적 사항",
  schools: "학력",
  career: "경력",
  trainings: "교육",
  licenses: "자격증",
  skills: "기술",
  work: "수행 업무",
};

/** 처음 값. 이 기능 전부터 방문자에게 보이던 것 */
export const DEFAULT_PUBLIC_SECTIONS: ResumeSection[] = [
  "career",
  "skills",
  "work",
];

export function isResumeSection(value: unknown): value is ResumeSection {
  return (RESUME_SECTIONS as readonly unknown[]).includes(value);
}

/** 만 나이. 생년월일(YYYY-MM-DD) 기준, 한국 날짜로 오늘 */
export function ageOn(birth: string, today: string) {
  const [by, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/**
 * 전산 경력 햇수. 처음 일을 시작한 달(YYYY-MM…)부터 오늘까지 꽉 찬 해.
 * 2005-09 에 시작했으면 2026-08 까지 20년, 2026-09 부터 21년이다.
 */
export function careerYears(firstStart: string, today: string) {
  const [sy, sm] = firstStart.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  return Math.floor((ty * 12 + tm - (sy * 12 + sm)) / 12);
}

/** 2026-10-03 (한국 날짜) */
export function todayInSeoul(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 1997-03 → 1997.03, 1997-10-04 → 1997.10.04 */
export function dotted(value: string | null | undefined) {
  return value ? value.replaceAll("-", ".") : "";
}
