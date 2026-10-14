"use server";

import { chatAi } from "@/lib/ai";
import { turns } from "@/lib/ai/chat-turns";
import { missOf } from "@/lib/ai/gemini";
import { AI_ENGINES } from "@/lib/ai/engines";
import { requireAdmin } from "@/lib/security/auth";
import { siteAi } from "@/lib/site/settings";

/**
 * AI 대화창(MYH-248). 떠 있는 「+」 창의 AI 탭이 대화를 통째로 보내면 환경설정 ›
 * AI 사용 의 차례대로 엔진에 묻고 답을 돌려준다. 오픈클로는 대화창 에이전트
 * (처음 값 main - 평소 대화하는 에이전트)를 부른다. 오픈클로 토큰 · Gemini 키는
 * 서버에서만 쓴다. 대화는 남기지 않는다(브라우저에만 잠깐 있다).
 */

export type ChatReply = { text?: string; engine?: string; error?: string };

/** 오픈클로 에이전트는 몇십 초 걸리기도 한다 */
const TIMEOUT_MS = 90_000;

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤에 다시 해 주세요.",
  slow: "AI 가 너무 오래 답하지 않습니다. 다시 해 주세요.",
  error: "AI 에게 묻지 못했습니다. 환경설정 › AI 사용 을 확인하세요.",
} as const;

/** 대화창에서 고를 수 있는 엔진들(환경설정의 차례, 쓸 수 있는 것만). 맨 앞이 처음 값 */
export async function chatEngines() {
  await requireAdmin();
  const access = await siteAi({ chat: true });
  return (access ?? []).map((a) => ({ key: a.engine, label: AI_ENGINES[a.engine].label }));
}

/**
 * engine 을 주면 그 엔진에만 묻는다(고른 것을 존중 - 안 되면 다른 엔진으로 넘어가지
 * 않고 안 된다고 알린다). 없으면 환경설정의 차례대로.
 */
export async function chatAction(messages: unknown, engine?: string): Promise<ChatReply> {
  await requireAdmin();
  const list = turns(messages);
  if (list.length === 0) return { error: "물을 말을 적거나 그림을 붙여 주세요." };
  const all = await siteAi({ chat: true });
  if (!all) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  const access = engine ? all.filter((a) => a.engine === engine) : all;
  if (access.length === 0) return { error: "고른 엔진을 쓸 수 없습니다. 환경설정 › AI 사용 을 확인하세요." };
  try {
    const { text, engine } = await chatAi(list, access, { timeoutMs: TIMEOUT_MS });
    return { text, engine: AI_ENGINES[engine].label };
  } catch (error) {
    const miss = MISS[missOf(error)];
    return { error: engine ? `${AI_ENGINES[access[0].engine].label}: ${miss}` : miss };
  }
}
