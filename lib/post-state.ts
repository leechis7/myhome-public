/**
 * 글이 지금 어떤 상태인가. published · private · 발행 시각을 사람 말로 옮긴다.
 *
 * 화면과 관리 목록이 같은 말을 쓰게 하려고 한곳에 둔다. DB 에 상태 컬럼을
 * 따로 두지 않은 이유는 lib/db/schema.ts 의 private 주석에 적어 뒀다.
 *
 * 「예약」 은 냈지만 발행 시각이 아직 오지 않은 글이다(MYH-194). 방문자에게는
 * 없는 글이고 그 시각이 지나면 저절로 공개가 된다. 공개 화면의 조건은
 * lib/posts.ts 의 isDue 가 DB 시계로 정하고, 여기는 화면에 적을 말만 정한다.
 */
export type PostState = "공개" | "나만 보기" | "임시저장" | "예약";

type StateInput = {
  published: boolean;
  private: boolean;
  publishedAt?: Date | null;
};

export function isScheduled(
  post: { published: boolean; publishedAt?: Date | null },
  now = new Date(),
) {
  return (
    post.published &&
    post.publishedAt != null &&
    post.publishedAt.getTime() > now.getTime()
  );
}

export function postState(post: StateInput, now = new Date()): PostState {
  if (!post.published) return "임시저장";
  // 예약해 둔 나만 보기 글도 예약으로 말한다. 그 시각까지는 나에게만 보인다
  if (isScheduled(post, now)) return "예약";
  return post.private ? "나만 보기" : "공개";
}

/** 공개 화면에서 딱지를 붙일 것인가. 공개된 글에는 붙이지 않는다 */
export function needsBadge(post: StateInput, now = new Date()) {
  return postState(post, now) !== "공개";
}

/** 10월 3일 09:00 */
export function formatSchedule(at: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }).format(at);
}

/** 딱지에 적을 말. 예약이면 언제 공개되는지까지 */
export function stateLabel(post: StateInput, now = new Date()) {
  const state = postState(post, now);
  return state === "예약" && post.publishedAt
    ? `예약 · ${formatSchedule(post.publishedAt)}`
    : state;
}
