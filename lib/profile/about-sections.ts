/**
 * 소개(/about)에서 방문자에게 보일 항목(MYH-220). 이력서의 보일 항목
 * (lib/profile/resume-sections.ts)과 같은 방식이다 — 관리자에게는 늘 전부 보이고,
 * 끈 항목은 방문자에게 보내는 화면에 넣지 않는다. 이름은 늘 보인다.
 *
 * DB 를 부르지 않는다 - 클라이언트 화면도 쓴다.
 */
export const ABOUT_SECTIONS = ["profile", "contacts", "career", "skills", "work"] as const;

export type AboutSection = (typeof ABOUT_SECTIONS)[number];

export const ABOUT_SECTION_LABELS: Record<AboutSection, string> = {
  profile: "소개글",
  contacts: "연락 수단",
  career: "경력",
  skills: "기술",
  work: "수행 업무",
};

export function isAboutSection(value: unknown): value is AboutSection {
  return (ABOUT_SECTIONS as readonly unknown[]).includes(value);
}
