/**
 * AI 로 방명록 · 댓글 스팸 거르기(MYH-252). DB 를 보지 않는 것만 두고 시험한다.
 * 프롬프트는 환경설정 › AI 프롬프트(.env SPAM_AI_PROMPT).
 */

export const DEFAULT_SPAM_PROMPT = [
  "개인 홈페이지의 {자리}에 방문자가 남긴 글이다. 숨겨야 할 글인지 판정하라.",
  "- spam: 광고 · 홍보 링크 · 도박 · 성인 · 사기 · 욕설 · 혐오 · 아무 뜻 없는 도배",
  "- ok: 그 밖의 글. 짧은 인사 · 칭찬 · 비판 · 질문은 ok 다. 애매하면 ok.",
  "reason 에는 spam 이면 까닭을 한국어 한 줄(20자 안팎)로, ok 면 빈 글자.",
  "",
  "이름: {이름}",
  "글: {글}",
].join("\n");

export const SPAM_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["ok", "spam"] },
    reason: { type: "STRING" },
  },
  required: ["verdict", "reason"],
};

export function renderSpamPrompt(
  template: string,
  { where, author, body }: { where: "guestbook" | "comment"; author: string; body: string },
) {
  const text = body.slice(0, 3000);
  const filled = template
    .replaceAll("{자리}", where === "guestbook" ? "방명록" : "글 댓글")
    .replaceAll("{이름}", author.slice(0, 60))
    .replaceAll("{글}", text);
  return template.includes("{글}") ? filled : `${filled}\n\n글: ${text}`;
}

/** 판정을 읽는다. spam 이 아니면 null(숨기지 않는다) */
export function readSpam(raw: string): { reason: string } | null {
  const data = JSON.parse(raw) as { verdict?: unknown; reason?: unknown };
  if (data.verdict !== "spam") return null;
  const reason = typeof data.reason === "string" ? data.reason.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  return { reason: reason || "스팸" };
}
