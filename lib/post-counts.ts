/**
 * 홈에서 보여줄 최근 글 개수. 고를 수 있는 것과 기본값.
 *
 * 이 값들은 화면(클라이언트 컴포넌트)과 서버 렌더 양쪽에서 쓴다. "use client"
 * 모듈에서 내보내면 서버 쪽에서는 배열이 아니라 클라이언트 참조가 와서
 * `POST_COUNTS.find is not a function` 으로 터진다. 그래서 여기 따로 둔다.
 */
export const POST_COUNTS = [3, 5, 10, 20] as const;

/**
 * 기본은 셋이다(MYH-184). 짧은 글도 같은 개수를 따른다 - 칸은 하나만 둔다.
 * 칸을 둘로 늘리면 첫 화면이 설정 화면처럼 보인다.
 */
export const DEFAULT_POST_COUNT = 3;

/** 주소로 아무 숫자나 들어올 수 있다. 고를 수 있는 것만 받는다 */
export function postCountOf(value: unknown) {
  const asked = Number(value);
  return POST_COUNTS.find((n) => n === asked) ?? DEFAULT_POST_COUNT;
}
