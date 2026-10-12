import { summarize } from "@/lib/books/lookup";
import { askGemini, missOf, type GeminiMiss } from "@/lib/ai/gemini";

/**
 * 책 소개를 한두 줄로(MYH-233). Gemini 키가 있으면 Gemini 가 요약하고, 없거나
 * 실패하면 앞부분 줄이기(lib/books/lookup.ts 의 summarize)로 돌아간다.
 *
 * 보내는 것은 서점에 공개된 책 소개다. 부르는 것은 lib/ai/gemini.ts.
 */

/** AI 요약을 받지 못한 까닭. 화면이 알린다 */
export type SummaryMiss = "nokey" | "empty" | GeminiMiss;

export type BookSummary =
  | { summary: string; how: "ai" }
  | { summary: string | null; how: "trim"; miss: SummaryMiss };

export async function summarizeBook(
  title: string,
  description: string,
  key: string | null,
  author = "",
  template: string = DEFAULT_SUMMARY_PROMPT,
): Promise<BookSummary> {
  const trimmed = summarize(description);
  if (!description.trim()) return { summary: trimmed, how: "trim", miss: "empty" };
  if (!key) return { summary: trimmed, how: "trim", miss: "nokey" };
  try {
    const summary = await summarizeWithGemini(title, author, description, key, template);
    return summary
      ? { summary, how: "ai" }
      : { summary: trimmed, how: "trim", miss: "error" };
  } catch (error) {
    return { summary: trimmed, how: "trim", miss: missOf(error) };
  }
}

/**
 * 책 소개 요약 프롬프트의 처음 값. 환경설정 › Gemini(.env 의 BOOK_SUMMARY_PROMPT)
 * 에서 바꿀 수 있다. {제목} · {지은이} · {소개글} 자리에 그 책의 것이 들어간다.
 * {소개글} 을 빼면 맨 끝에 붙인다.
 *
 * 「이 책이 무엇을 다루는지」 처럼 물으면 AI 가 「이 책은 …」 으로 받는다 -
 * 다루는 내용으로 바로 시작하라고 적는다.
 */
export const DEFAULT_SUMMARY_PROMPT = [
  "책 「{제목}」({지은이}) 의 서점 소개글이다. 책이 다루는 내용을 한국어 한두 문장(120자 안)으로 요약하라.",
  "「이 책은」 · 「본서는」 · 책 제목으로 시작하지 말고, 다루는 내용으로 바로 시작한다.",
  "예: 「소프트웨어 프로젝트에 사람을 더 넣으면 오히려 늦어지는 까닭과 그 관리법을 다룬다.」",
  "소개글이 짧거나 광고 문구뿐이면 이 책에 대해 확실히 아는 내용으로 채운다. 확실하지 않은 것은 쓰지 않는다.",
  "광고 문구 · 수상 경력 · 판매 부수 · 따옴표는 빼고, 「~다」 로 끝나는 평서문으로. 요약만 답하라.",
  "",
  "{소개글}",
].join("\n");

/** 프롬프트에 그 책의 것을 넣는다 */
export function renderSummaryPrompt(
  template: string,
  { title, author, description }: { title: string; author: string; description: string },
) {
  const body = description.slice(0, 4000);
  const filled = template
    .replaceAll("{제목}", title)
    .replaceAll("{지은이}", author || "지은이 모름")
    .replaceAll("{소개글}", body);
  return template.includes("{소개글}") ? filled : `${filled}\n\n${body}`;
}

async function summarizeWithGemini(
  title: string,
  author: string,
  description: string,
  key: string,
  template: string,
) {
  const prompt = renderSummaryPrompt(template, { title, author, description });
  // 무료 등급은 빠르면 1초, 붐비면 20초를 넘기도 한다. 화면은 그동안 「요약하는
  // 중」 을 보이고 줄인 앞부분을 먼저 넣어 두므로 넉넉히 기다린다
  return cleanSummary(await askGemini(prompt, key, { timeoutMs: 45000 }));
}

/** 받은 요약을 다듬는다. 따옴표 · 줄바꿈을 걷고, 너무 길면 줄이기로 자른다 */
export function cleanSummary(text?: string | null) {
  const t = (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["'“”‘’「」『』\s]+|["'“”‘’「」『』\s]+$/g, "")
    .trim();
  // 그래도 「이 책은 …」 으로 시작하면 떼어 낸다(안전장치)
  const u = t.replace(/^(이 책은|이 책에서는|이 책에서|본서는|본 책은)\s*/, "").trim();
  if (!u) return null;
  return u.length > 160 ? summarize(u) : u;
}
