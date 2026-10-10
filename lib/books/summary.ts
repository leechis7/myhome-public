import { summarize } from "@/lib/books/lookup";

/**
 * 책 소개를 한두 줄로(MYH-233). Gemini 키가 있으면 Gemini 가 요약하고, 없거나
 * 실패하면 앞부분 줄이기(lib/books/lookup.ts 의 summarize)로 돌아간다.
 *
 * 보내는 것은 서점에 공개된 책 소개뿐이다. Gemini 무료 등급은 보낸 글을
 * Google 이 제품 개선에 쓸 수 있다 - 그래서 내 글(메모 · 할 일)은 보내지 않는다.
 */

/**
 * 쓸 모델들. 앞의 것이 한도를 넘었거나(429) 없으면(404) 다음 것으로 간다. 무료
 * 등급은 모델마다 한도가 따로다. 한두 줄 요약에는 가벼운 flash-lite 로 충분하고
 * 빠르다(1초 안팎). GEMINI_MODEL 을 적으면 그것 하나만 쓴다.
 */
const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-flash-lite-latest", "gemini-flash-latest"];

/** AI 요약을 받지 못한 까닭. 화면이 알린다 */
export type SummaryMiss = "nokey" | "empty" | "quota" | "slow" | "error";

export type BookSummary =
  | { summary: string; how: "ai" }
  | { summary: string | null; how: "trim"; miss: SummaryMiss };

class GeminiError extends Error {
  constructor(readonly miss: SummaryMiss) {
    super(miss);
  }
}

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
    const summary = await askGemini(title, author, description, key);
    return summary
      ? { summary, how: "ai" }
      : { summary: trimmed, how: "trim", miss: "error" };
  } catch (error) {
    const miss =
      error instanceof GeminiError
        ? error.miss
        : error instanceof Error && error.name === "TimeoutError"
          ? "slow"
          : "error";
    return { summary: trimmed, how: "trim", miss };
  }
}

async function askGemini(title: string, author: string, description: string, key: string) {
  // 서점 소개는 앞부분이 잘려 오고 수상 경력 · 광고 문구뿐인 때가 많다. 그때는
  // 그 책에 대해 아는 것으로 채우게 하되, 확실하지 않으면 소개글 안에서만
  const prompt = [
    `책 「${title}」${author ? `(${author})` : ""} 의 서점 소개글이다. 이 책이 무엇을 다루는지 한국어 한두 문장(120자 안)으로 요약하라.`,
    "소개글이 짧거나 광고 문구뿐이면 이 책에 대해 확실히 아는 내용으로 채운다. 확실하지 않은 것은 쓰지 않는다.",
    "광고 문구 · 수상 경력 · 판매 부수 · 따옴표는 빼고, 「~다」 로 끝나는 평서문으로. 요약만 답하라.",
    "",
    description.slice(0, 4000),
  ].join("\n");
  let res: Response | null = null;
  for (const model of MODELS) {
    // 생각(thinking)은 끈다 - 한두 줄 요약에는 필요 없고, 켜 두면 몇 배 느리고
    // 생각에 토큰을 다 써 답이 비기도 한다. 끌 수 없는 모델(400)이면 켠 채로 다시
    res = await callGemini(model, prompt, key, { thinkingConfig: { thinkingBudget: 0 } });
    if (res.status === 400) res = await callGemini(model, prompt, key, {});
    // 한도 · 없는 모델 · 저쪽 탈이면 다음 모델로
    if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
    break;
  }
  if (!res?.ok) throw new GeminiError(res?.status === 429 ? "quota" : "error");
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return cleanSummary(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""));
}

/**
 * 무료 등급은 빠르면 3초, 붐비면 20초를 넘기도 한다. 화면은 그동안 「요약하는
 * 중」 을 보이고 줄인 앞부분을 먼저 넣어 두므로 넉넉히 기다린다.
 */
function callGemini(
  model: string,
  prompt: string,
  key: string,
  extra: Record<string, unknown>,
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, ...extra },
      }),
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    },
  );
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
