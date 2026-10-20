import { chatAi } from "@/lib/ai";
import { assistantSystem } from "@/lib/ai/assistant";
import { turns } from "@/lib/ai/chat-turns";
import { AI_ENGINES } from "@/lib/ai/engines";
import { missOf } from "@/lib/ai/gemini";
import { assistantOn, siteAi } from "@/lib/site/settings";

/**
 * AI 대화창의 한 번 묻기(MYH-248). 관리자 확인은 부르는 쪽(/admin/ai/chat)이 한다.
 * 환경설정 › AI 사용 의 차례대로 엔진에 묻고 답을 돌려준다. engine 을 주면 그
 * 엔진에만 묻는다(안 되면 다른 엔진으로 넘어가지 않고 안 된다고 알린다).
 * AI 비서(MYH-260)를 켰으면 할 일 · 일정을 시스템 글로 붙인다
 */

export type ChatReply = { text?: string; engine?: string; error?: string };

/** 오픈클로 에이전트는 몇십 초 걸리기도 한다 */
const TIMEOUT_MS = 90_000;

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤에 다시 해 주세요.",
  slow: "AI 가 너무 오래 답하지 않습니다. 다시 해 주세요.",
  error: "AI 에게 묻지 못했습니다. 환경설정 › AI 사용 을 확인하세요.",
} as const;

export async function runChat(messages: unknown, engine?: string): Promise<ChatReply> {
  const list = turns(messages);
  if (list.length === 0) return { error: "물을 말을 적거나 그림을 붙여 주세요." };
  const all = await siteAi({ chat: true });
  if (!all) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  const access = engine ? all.filter((a) => a.engine === engine) : all;
  if (access.length === 0) return { error: "고른 엔진을 쓸 수 없습니다. 환경설정 › AI 사용 을 확인하세요." };
  const system = (await assistantOn()) ? await assistantSystem().catch(() => undefined) : undefined;
  try {
    const { text, engine: used } = await chatAi(list, access, { timeoutMs: TIMEOUT_MS, system });
    return { text, engine: AI_ENGINES[used].label };
  } catch (error) {
    const miss = MISS[missOf(error)];
    return { error: engine ? `${AI_ENGINES[access[0].engine].label}: ${miss}` : miss };
  }
}
