/**
 * 책에 AI(MYH-251): 독서 노트로 한 줄 평 초안, 소개로 분류 제안. DB 를 보지 않는
 * 것만 두고 시험한다. 프롬프트는 환경설정 › AI 프롬프트(.env BOOK_REVIEW_PROMPT ·
 * BOOK_CATEGORY_PROMPT).
 */

export const DEFAULT_REVIEW_PROMPT = [
  "책 「{제목}」({지은이}) 을 읽고 내가 적은 독서 노트다{별점}.",
  "이 노트를 바탕으로 책 목록에 붙일 한 줄 평을 써라.",
  "- 한두 문장(80자 안팎), 내 말투(~다)로. 노트에 없는 감상을 지어내지 않는다.",
  "- 「이 책은」 · 책 제목으로 시작하지 않는다. 한 줄 평만 답하라.",
  "",
  "{노트}",
].join("\n");

export const DEFAULT_CATEGORY_PROMPT = [
  "책 「{제목}」({지은이}) 을 아래 분류 가운데 하나로 나눠라. 목록에 있는 이름만 그대로 답한다.",
  "맞는 것이 없으면 빈 글자로 답한다.",
  "분류: {분류}",
  "",
  "소개: {소개}",
].join("\n");

/** 고를 분류를 받는 꼴 */
export const CATEGORY_SCHEMA = {
  type: "OBJECT",
  properties: { category: { type: "STRING" } },
  required: ["category"],
};

const MAX_TEXT = 6000;

function fill(template: string, values: Record<string, string>, tail: string) {
  let out = template;
  for (const [k, v] of Object.entries(values)) out = out.replaceAll(`{${k}}`, v);
  return template.includes(`{${tail}}`) ? out : `${out}\n\n${values[tail]}`;
}

export function renderReviewPrompt(
  template: string,
  { title, author, note, rating }: { title: string; author: string; note: string; rating: number | null },
) {
  return fill(
    template,
    {
      제목: title,
      지은이: author || "지은이 모름",
      별점: rating ? ` (별점 ${rating}/5)` : "",
      노트: note.slice(0, MAX_TEXT),
    },
    "노트",
  );
}

export function renderCategoryPrompt(
  template: string,
  {
    title,
    author,
    intro,
    labels,
  }: { title: string; author: string; intro: string; labels: string[] },
) {
  return fill(
    template,
    {
      제목: title,
      지은이: author || "지은이 모름",
      분류: labels.join(", "),
      소개: intro.slice(0, MAX_TEXT) || "(없음)",
    },
    "소개",
  );
}

/** 한 줄 평 답을 다듬는다: 따옴표 · 머리말을 떼고 한 줄로 */
export function cleanReview(text: string) {
  return text
    .trim()
    .replace(/^(한 줄 평|한줄평)\s*[:：]\s*/, "")
    .replace(/^["'「『]+|["'」』]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** 답한 이름을 목록의 분류로. 대소문자 · 앞뒤 빈칸은 따지지 않고, 없으면 null */
export function pickCategory<T extends { code: string; label: string }>(raw: string, codes: T[]) {
  let name = raw;
  try {
    const data = JSON.parse(raw) as { category?: unknown };
    if (typeof data.category === "string") name = data.category;
  } catch {
    // 이름만 답했으면 그대로
  }
  const key = name.trim().replace(/^["'「]+|["'」]+$/g, "").toLowerCase();
  if (!key) return null;
  return codes.find((c) => c.label.toLowerCase() === key) ?? null;
}
