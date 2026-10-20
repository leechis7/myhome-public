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
  options: { timeoutMs: number; temperature?: number; schema?: Record<string, unknown> },
) {
  return chatGemini([{ role: "user", content: prompt }], key, options);
}

/**
 * 대화를 통째로 넘기고 다음 답을 받는다(MYH-248). Gemini 는 assistant 를
 * model 이라 부른다. 그림은 inline_data 로 붙인다.
 */
export async function chatGemini(
  messages: {
    role: "user" | "assistant";
    content: string;
    images?: { type: string; data: string }[];
  }[],
  key: string,
  {
    timeoutMs,
    temperature = 0.3,
    schema,
    system,
  }: {
    timeoutMs: number;
    temperature?: number;
    schema?: Record<string, unknown>;
    /** 시스템 글(AI 비서, MYH-260). systemInstruction 으로 */
    system?: string;
  },
) {
  const config: Record<string, unknown> = { temperature, maxOutputTokens: 4096 };
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      ...(m.content || !m.images?.length ? [{ text: m.content }] : []),
      ...(m.images ?? []).map((i) => ({ inline_data: { mime_type: i.type, data: i.data } })),
    ],
  }));
  let res: Response | null = null;
  for (const model of MODELS) {
    res = await call(model, contents, key, { ...config, thinkingConfig: { thinkingBudget: 0 } }, timeoutMs, system);
    if (res.status === 400) res = await call(model, contents, key, config, timeoutMs, system);
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
  contents: { role: string; parts: unknown[] }[],
  key: string,
  generationConfig: Record<string, unknown>,
  timeoutMs: number,
  system?: string,
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents,
        generationConfig,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    },
  );
}
