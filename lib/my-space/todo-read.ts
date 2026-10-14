import { classify } from "@/lib/telegram/classify";
import { seoulTime, type TodoRange } from "@/lib/my-space/todo-dates";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { siteAi, todoAiPrompt } from "@/lib/site/settings";

/**
 * 새 할 일의 제목 · 날짜 · 시각(MYH-245 · 247). 날짜 · 시각을 하나도 고르지
 * 않았으면 글에서 읽는다 - 「내일 오후 7시 운동」 → 운동 · 내일 19:00. 텔레그램과
 * 같은 길이라 AI 엔진(오픈클로 · Gemini)이 있으면 AI 가 먼저, 없거나 실패하면
 * 규칙(lib/telegram/classify.ts). 골랐으면 그것을 쓰고 글은 그대로 둔다.
 * 할 일 화면 · 떠 있는 창 · 홈페이지 API 가 함께 쓴다.
 */
export async function readNewTodo(
  text: string,
  picked: Required<TodoRange>,
): Promise<{ title: string } & Required<TodoRange>> {
  if (picked.startOn || picked.dueOn || picked.startTime || picked.endTime) {
    return { title: text, ...picked };
  }
  const ai = await siteAi();
  const template = (await todoAiPrompt()) ?? undefined;
  const read = await classify(text, todayInSeoul(), "todo", ai, seoulTime(), template);
  if (read.kind !== "todo") return { title: text, ...picked };
  return {
    title: read.title || text,
    startOn: read.startOn,
    dueOn: read.dueOn,
    startTime: read.startTime,
    endTime: read.endTime,
  };
}
