/**
 * 댓글 입력 제한. 클라이언트 컴포넌트에서도 쓰기 때문에 별도 파일로 둔다.
 * lib/posts/comments.ts 는 DB에 접근하므로 클라이언트에서 불러오면
 * postgres 드라이버까지 브라우저 번들로 끌려 들어간다.
 */
export const AUTHOR_MAX = 20;
export const BODY_MAX = 1000;
