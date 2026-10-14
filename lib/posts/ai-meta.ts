/**
 * AI 로 글 요약 · 태그 제안(MYH-249). 블로그 쓰기 화면의 「AI 로 채우기」 와 짧은 글의
 * 「태그 제안」 이 쓴다. 프롬프트는 환경설정 › AI 프롬프트(.env POST_AI_PROMPT).
 * DB 를 보지 않는 것만 여기 두고 시험한다.
 */

export const DEFAULT_POST_PROMPT = [
  "아래 {종류}을 읽고 요약과 태그를 제안하라.",
  "- summary: 목록 · 검색 결과에 나갈 한두 문장(80자 안팎). 글쓴이의 말투(~다)로, 「이 글은」 으로 시작하지 않는다.",
  "- tags: 글의 주제를 나타내는 태그 3 ~ 5개를 쉼표로. 짧은 명사로, # 없이. 이미 쓰던 태그가 있으면 맞는 것을 먼저 고른다: {태그}",
  "",
  "제목: {제목}",
  "본문:",
  "{글}",
].join("\n");

/** 요약 · 태그를 받는 꼴(Gemini responseSchema. 오픈클로는 이 꼴을 말로 붙인다) */
export const POST_META_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    tags: { type: "STRING" },
  },
  required: ["summary", "tags"],
};

/** 본문은 앞부분만 보낸다 - 긴 글도 요약 · 태그에는 이만하면 된다 */
const MAX_BODY = 6000;

export function renderPostPrompt(
  template: string,
  {
    kind,
    title,
    content,
    knownTags = [],
  }: { kind: "post" | "note"; title: string; content: string; knownTags?: string[] },
) {
  const body = content.slice(0, MAX_BODY);
  const filled = template
    .replaceAll("{종류}", kind === "post" ? "블로그 글" : "짧은 글")
    .replaceAll("{제목}", title.trim() || "(없음)")
    .replaceAll("{태그}", knownTags.length > 0 ? knownTags.slice(0, 60).join(", ") : "(없음)")
    .replaceAll("{글}", body);
  return template.includes("{글}") ? filled : `${filled}\n\n본문:\n${body}`;
}

/** 태그 글을 고른다: # · 따옴표를 떼고, 같은 것은 하나만, 다섯 개까지 */
export function cleanTags(value: unknown, max = 5) {
  const list = Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,，\n]/);
  const out: string[] = [];
  for (const raw of list) {
    const tag = raw.trim().replace(/^#+/, "").replace(/^["'「]+|["'」]+$/g, "").trim();
    if (tag && tag.length <= 30 && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** AI 의 답(JSON 글)을 요약 · 태그로 */
export function readPostMeta(raw: string) {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const summary = typeof data.summary === "string" ? data.summary.trim().replace(/\s+/g, " ").slice(0, 300) : "";
  return { summary, tags: cleanTags(data.tags) };
}
