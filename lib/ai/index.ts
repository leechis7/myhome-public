import { askGemini, chatGemini, GeminiError } from "@/lib/ai/gemini";
import { askOpenClaw, chatOpenClaw, type ChatTurn, type OpenClawAccess } from "@/lib/ai/openclaw";

export type { ChatTurn };

/**
 * AI 엔진 부르기(MYH-246). 환경설정 › AI 사용 에서 켠 엔진을 정한 차례대로
 * 묻는다(lib/ai/engines.ts). 앞의 것이 안 되면 다음 것으로. 쓸 것이 하나도
 * 없으면 null - 부르는 쪽이 규칙 · 줄이기로 간다.
 */

export type AiEngineAccess =
  | ({ engine: "openclaw" } & OpenClawAccess)
  | { engine: "gemini"; key: string };

/** 쓸 엔진들(차례대로) */
export type AiAccess = AiEngineAccess[];

/** 문자열은 Gemini 키(예전 꼴). 쓸 엔진이 하나도 없으면 null */
export function aiAccess(value: AiAccess | string | null | undefined): AiAccess | null {
  if (!value) return null;
  const list: AiAccess = typeof value === "string" ? [{ engine: "gemini", key: value }] : value;
  return list.length > 0 ? list : null;
}

type AskOptions = { timeoutMs: number; temperature?: number; schema?: Record<string, unknown> };

/** 차례대로 묻고 처음 받은 답을 돌려준다. 다 실패하면 마지막 까닭을 던진다 */
export async function askAi(prompt: string, access: AiAccess, options: AskOptions) {
  let last: unknown = new GeminiError("error");
  for (const one of access) {
    try {
      return one.engine === "openclaw"
        ? await askOpenClaw(prompt, one, options)
        : await askGemini(prompt, one.key, options);
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

/**
 * 대화(MYH-248). 대화를 통째로 차례대로 엔진에 넘기고, 처음 받은 답과 답한
 * 엔진을 돌려준다. 다 실패하면 마지막 까닭을 던진다.
 */
export async function chatAi(messages: ChatTurn[], access: AiAccess, options: { timeoutMs: number }) {
  let last: unknown = new GeminiError("error");
  for (const one of access) {
    try {
      const text =
        one.engine === "openclaw"
          ? await chatOpenClaw(messages, one, options)
          : await chatGemini(messages, one.key, options);
      if (text.trim()) return { text: text.trim(), engine: one.engine };
      last = new GeminiError("error");
    } catch (error) {
      last = error;
    }
  }
  throw last;
}
