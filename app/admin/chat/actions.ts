"use server";

import { AI_ENGINES } from "@/lib/ai/engines";
import { requireAdmin } from "@/lib/security/auth";
import { revalidatePath } from "next/cache";
import { readAction } from "@/lib/ai/assistant-actions";
import { addMemo } from "@/lib/my-space/memos";
import { addTodo, setTodoDone } from "@/lib/my-space/todos";
import { withTimeDay } from "@/lib/my-space/todo-dates";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { assistantOn, meetingAiOn, siteAi } from "@/lib/site/settings";

/**
 * AI 대화창(MYH-248)의 서버 액션: 고를 엔진 · 비서 카드 넣기. 묻기는 늘 같은 주소로
 * 가야 해서(그림이 크다) /admin/ai/chat 이 맡는다(lib/ai/chat-run.ts). 오픈클로
 * 토큰 · Gemini 키는 서버에서만 쓴다. 대화는 남기지 않는다(브라우저에만 잠깐 있다).
 */

/** 대화창에서 고를 수 있는 엔진들(환경설정의 차례, 쓸 수 있는 것만). 맨 앞이 처음 값 */
export async function chatEngines() {
  await requireAdmin();
  const access = await siteAi({ chat: true });
  return (access ?? []).map((a) => ({ key: a.engine, label: AI_ENGINES[a.engine].label }));
}

export type AssistantResult = { ok?: string; error?: string };

/**
 * AI 비서가 제안한 일을 사람이 누르면 넣는다(MYH-260). AI 의 말은 믿지 않고
 * 꼴을 다시 본다. 시각만 있고 날이 없으면 오늘 할 일이다
 */
export async function runAssistantAction(value: unknown): Promise<AssistantResult> {
  await requireAdmin();
  // 넣는 것은 사람이 누른 일이다. AI 비서나 회의 받아쓰기(MYH-266)를 켰을 때만
  if (!(await assistantOn()) && !(await meetingAiOn())) {
    return { error: "환경설정 › AI 사용 에서 AI 비서나 회의 받아쓰기를 켜 주세요." };
  }
  const action = readAction(value);
  if (!action) return { error: "넣을 수 없는 꼴입니다." };
  if (action.action === "memo") {
    await addMemo(action.text, "web");
    revalidatePath("/admin/memos");
    return { ok: "📝 메모했습니다." };
  }
  if (action.action === "done") {
    await setTodoDone(action.id, true);
    revalidatePath("/admin/todos");
    return { ok: "☑ 끝냈습니다." };
  }
  const range = withTimeDay(
    {
      startOn: action.startOn,
      dueOn: action.dueOn,
      startTime: action.startTime,
      endTime: action.endTime,
    },
    todayInSeoul(),
  );
  await addTodo(action.title, { ...range, source: "web" });
  revalidatePath("/admin/todos");
  return { ok: "✅ 할 일에 넣었습니다." };
}
