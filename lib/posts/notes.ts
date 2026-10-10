/**
 * 짧은 글. 제목 없이 본문만 쌓는다.
 *
 * 담는 곳은 블로그 글과 같은 테이블(posts)이다. 딸린 것(댓글·태그·조회수)이 같고,
 * 목록·검색·개정을 다시 만들 이유가 없어서다. kind 로만 갈라 본다.
 */

/** 목록과 브라우저 제목에 쓸 한 줄. 본문 첫 줄에서 만든다 */
export function noteTitle(content: string, max = 60) {
  const first =
    content
      .split("\n")
      .map((line) => line.replace(/^[#>\-*\s]+/, "").trim())
      .find(Boolean) ?? "";
  if (first.length <= max) return first;
  return `${first.slice(0, max).trimEnd()}…`;
}
