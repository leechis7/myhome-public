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
): Promise<BookSummary> {
  const trimmed = summarize(description);
  if (!description.trim()) return { summary: trimmed, how: "trim", miss: "empty" };
  if (!key) return { summary: trimmed, how: "trim", miss: "nokey" };
  try {
    const summary = await summarizeWithGemini(title, author, description, key);
    return summary
      ? { summary, how: "ai" }
      : { summary: trimmed, how: "trim", miss: "error" };
  } catch (error) {
    return { summary: trimmed, how: "trim", miss: missOf(error) };
  }
}

async function summarizeWithGemini(
  title: string,
  author: string,
  description: string,
  key: string,
) {
  // 서점 소개는 앞부분이 잘려 오고 수상 경력 · 광고 문구뿐인 때가 많다. 그때는
  // 그 책에 대해 아는 것으로 채우게 하되, 확실하지 않으면 소개글 안에서만
  const prompt = [
    `책 「${title}」${author ? `(${author})` : ""} 의 서점 소개글이다. 이 책이 무엇을 다루는지 한국어 한두 문장(120자 안)으로 요약하라.`,
    "소개글이 짧거나 광고 문구뿐이면 이 책에 대해 확실히 아는 내용으로 채운다. 확실하지 않은 것은 쓰지 않는다.",
    "광고 문구 · 수상 경력 · 판매 부수 · 따옴표는 빼고, 「~다」 로 끝나는 평서문으로. 요약만 답하라.",
    "",
    description.slice(0, 4000),
  ].join("\n");
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
  if (!t) return null;
  return t.length > 160 ? summarize(t) : t;
}
