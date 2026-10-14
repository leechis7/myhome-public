import { GeminiError } from "@/lib/ai/gemini";

/**
 * 오픈클로 게이트웨이에 묻기(MYH-246). 게이트웨이의 OpenAI 호환 주소
 * (/v1/chat/completions)로 글 하나를 보내고 답한 글을 받는다. 모델 자리에는
 * 에이전트를 적는다(openclaw/<에이전트>) - 홈페이지 전용 에이전트는 도구가 없어
 * 글만 답한다.
 *
 * 토큰은 게이트웨이 전체를 쥐는 주인 열쇠다. 서버에서만 쓰고 브라우저로
 * 보내지 않는다.
 */

export type OpenClawAccess = { url: string; token: string; agent: string };

/** 대화에 붙인 그림(MYH-248). data 는 base64(data: 머리 없이) */
export type ChatImage = { type: string; data: string };

/** 대화의 한 마디(MYH-248). 사람의 말에는 그림이 붙을 수 있다 */
export type ChatTurn = { role: "user" | "assistant"; content: string; images?: ChatImage[] };

/** OpenAI 꼴 메시지로. 그림이 있으면 content 가 글 · image_url(data: 주소) 배열이 된다 */
function toOpenAi({ role, content, images }: ChatTurn) {
  if (!images?.length) return { role, content };
  return {
    role,
    content: [
      ...(content ? [{ type: "text", text: content }] : []),
      ...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.type};base64,${i.data}` } })),
    ],
  };
}

/**
 * json 이면 그 꼴의 JSON 으로만 답하라고 덧붙이고, 답에서 { … } 만 떼어 낸다.
 * 에이전트 길에서는 응답 꼴을 강제할 수 없다.
 */
export async function askOpenClaw(
  prompt: string,
  { url, token, agent }: OpenClawAccess,
  {
    timeoutMs,
    temperature = 0.3,
    schema,
  }: { timeoutMs: number; temperature?: number; schema?: Record<string, unknown> },
) {
  const content = schema
    ? `${prompt}\n\n다른 말 없이 이 JSON 꼴로만 답하라(값이 없으면 빈 글자): ${JSON.stringify(
        shapeOf(schema),
      )}`
    : prompt;
  const text = await chatOpenClaw([{ role: "user", content }], { url, token, agent }, { timeoutMs, temperature });
  if (!schema) return text;
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new GeminiError("error");
  return json[0];
}

/** 대화를 통째로 넘기고 다음 답을 받는다(MYH-248) */
export async function chatOpenClaw(
  messages: ChatTurn[],
  { url, token, agent }: OpenClawAccess,
  { timeoutMs, temperature = 0.3 }: { timeoutMs: number; temperature?: number },
) {
  const res = await fetch(`${url.replace(/\/+$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ model: `openclaw/${agent}`, messages: messages.map(toOpenAi), temperature }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new GeminiError(res.status === 429 ? "quota" : "error");
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? "";
}

/** {type:OBJECT, properties:{kind:{…}, title:{…}}} → {"kind":"", "title":""} */
function shapeOf(schema: Record<string, unknown>) {
  const props = (schema.properties ?? {}) as Record<string, { enum?: string[] }>;
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, v.enum ? v.enum.join(" | ") : ""]),
  );
}
