/**
 * Gemini 부르기(MYH-233). 책 소개 요약과 텔레그램 판정이 같이 쓴다.
 *
 * 무료 등급이다(사용자가 정했다 - 보낸 글을 Google 이 제품 개선에 쓸 수 있다).
 * 모델마다 한도가 따로라, 앞의 것이 한도를 넘었거나(429) 없으면(404) · 저쪽
 * 탈(5xx)이면 다음 모델로 간다. 가벼운 flash-lite 가 빠르다(1초 안팎).
 * GEMINI_MODEL 을 적으면 그것 하나만 쓴다.
 */

export const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-flash-lite-latest", "gemini-flash-latest"];

/** 받지 못한 까닭 */
export type GeminiMiss = "quota" | "slow" | "error";

export class GeminiError extends Error {
  constructor(readonly miss: GeminiMiss) {
    super(miss);
  }
}

/** 던진 것을 까닭으로 */
export function missOf(error: unknown): GeminiMiss {
  if (error instanceof GeminiError) return error.miss;
  if (error instanceof Error && error.name === "TimeoutError") return "slow";
  return "error";
}

/**
 * 글 하나를 묻고 답한 글을 돌려준다. 생각(thinking)은 끈다 - 짧은 일에는 필요
 * 없고, 켜 두면 몇 배 느리고 생각에 토큰을 다 써 답이 비기도 한다. 끌 수 없는
 * 모델(400)이면 켠 채로 다시. json 이면 JSON 으로만 답하게 한다(schema 꼴).
 */
export async function askGemini(
  prompt: string,
  key: string,
  {
    timeoutMs,
    temperature = 0.3,
    schema,
  }: { timeoutMs: number; temperature?: number; schema?: Record<string, unknown> },
) {
  const config: Record<string, unknown> = { temperature, maxOutputTokens: 4096 };
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }
  let res: Response | null = null;
  for (const model of MODELS) {
    res = await call(model, prompt, key, { ...config, thinkingConfig: { thinkingBudget: 0 } }, timeoutMs);
    if (res.status === 400) res = await call(model, prompt, key, config, timeoutMs);
    if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
    break;
  }
  if (!res?.ok) throw new GeminiError(res?.status === 429 ? "quota" : "error");
  const body = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

function call(
  model: string,
  prompt: string,
  key: string,
  generationConfig: Record<string, unknown>,
  timeoutMs: number,
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    },
  );
}
