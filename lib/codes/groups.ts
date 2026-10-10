/**
 * 코드 그룹 번호(MYH-131). DB 를 부르지 않는 곳(클라이언트 화면)에서도 쓰려고
 * lib/codes/index.ts 와 떼어 둔다.
 *
 * 그룹 번호는 뜻이 없는 다섯 자리 글자라 프로그램 안에서는 이 이름으로 부른다.
 * 그룹을 더하려면 code_groups 에 한 줄(마이그레이션), 여기 한 줄, 그리고 그
 * 칸을 쓰는 테이블에 category_group · category_code 같은 외래 키 컬럼을 둔다.
 * 쓰는 곳 수를 세는 것(lib/codes/index.ts 의 countUsage)도 함께 늘린다.
 */
export const LINK_CATEGORY = "00001";
export const SKILL_CATEGORY = "00002";
/** 글의 연재(MYH-187) */
export const SERIES = "00003";
/** 책 종류(MYH-190): 종이책 · 이북 · 오디오북 */
export const BOOK_KIND = "00004";
/** 책 분류(MYH-225): 컴퓨터 · 교양 · 소설 … */
export const BOOK_CATEGORY = "00005";

export const CODE_GROUPS = [
  LINK_CATEGORY,
  SKILL_CATEGORY,
  SERIES,
  BOOK_KIND,
  BOOK_CATEGORY,
] as const;
export type CodeGroup = (typeof CODE_GROUPS)[number];

/** 코드 번호의 자릿수. 00001 */
export const CODE_DIGITS = 5;

export function isCodeGroup(value: string): value is CodeGroup {
  return (CODE_GROUPS as readonly string[]).includes(value);
}

/** 코드에 쓸 수 있는 글자. 영문 · 숫자 · _ · - 로 20자까지(컬럼이 varchar(20)) */
export const CODE_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;

/**
 * 비워 두고 더할 때 붙는 번호. 숫자로만 된 코드 가운데 가장 큰 것 다음을
 * 다섯 자리로 채운다(00001 …). 글자로 적어 넣은 코드는 세지 않는다.
 * 지운 번호는 다시 쓰지 않는다.
 */
export function nextCode(existing: readonly string[]) {
  const max = existing
    .filter((c) => /^\d+$/.test(c))
    .reduce((m, c) => Math.max(m, Number(c)), 0);
  return String(max + 1).padStart(CODE_DIGITS, "0");
}

/** 코드 화면에서 그 그룹이 있는 자리. 고르는 칸 밑의 「고치기」 가 여기로 간다 */
export function codesHref(group: CodeGroup) {
  return `/admin/codes#g${group}`;
}
