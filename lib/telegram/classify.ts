import { aiAccess, askAi, type AiAccess } from "@/lib/ai";
import { parseDay } from "@/lib/my-space/diary-calendar";
import { orderRange, parseTime, readTodo, withTimeDay } from "@/lib/my-space/todo-dates";
import { guessTodo } from "@/lib/my-space/todo-intent";

/**
 * 텔레그램으로 온 글을 가른다(MYH-233). 할 일 화면 · 떠 있는 창도 같이 쓴다(MYH-245).
 * Gemini 키가 있으면 AI 가 먼저, 실패하면(늦음 · 한도 · 이상한 답) 지금 규칙.
 *
 *   kind 를 정해 보낸 글(「할일 …」 · 「메모 …」)  그 말을 따른다. 할 일이면 AI 는
 *                                                  제목 · 날짜만 다듬는다
 *   말 없이 온 글                                   AI 가 할 일 · 메모 · 저장 안 함을 정한다
 *
 * 메모는 보낸 글 그대로 둔다 - AI 가 내 메모를 고쳐 쓰지 않게.
 */

export type Decision =
  | {
      kind: "todo";
      title: string;
      startOn: string | null;
      dueOn: string | null;
      startTime: string | null;
      endTime: string | null;
      how: "ai" | "rule";
    }
  | { kind: "memo"; text: string; how: "ai" | "rule" }
  | { kind: "skip"; how: "ai" | "rule" };

/** AI 에게 받을 꼴 */
const SCHEMA = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: ["todo", "memo", "skip"] },
    title: { type: "STRING" },
    start_on: { type: "STRING" },
    due_on: { type: "STRING" },
    start_time: { type: "STRING" },
    end_time: { type: "STRING" },
  },
  required: ["kind", "title", "start_on", "due_on", "start_time", "end_time"],
};

/**
 * 판정 프롬프트의 처음 값(MYH-245). 환경설정 › 텔레그램(.env 의 TODO_AI_PROMPT)
 * 에서 바꿀 수 있다. 자리 표시:
 *   {오늘}  2026-10-12(월요일)
 *   {지금}  17:05
 *   {종류}  말을 붙여 보낸 글이면 「이 글은 할 일이다」, 아니면 kind 를 고르는 안내
 *   {글}    받은 글. 빼면 맨 끝에 붙인다
 * 받는 꼴(kind · title · 날짜 · 시각)은 SCHEMA 가 정하므로 프롬프트를 고쳐도
 * 답의 모양은 같다.
 */
export const DEFAULT_TODO_PROMPT = [
  "글쓴이가 자기 메모 봇이나 할 일 화면에 적은 한국어 글이다.",
  "오늘은 {오늘}, 지금은 {지금}, 서울 시각이다. 주는 월요일에 시작한다.",
  "{종류}",
  "title: 할 일이면 날짜 · 시각을 가리키는 말(내일 · 10/15 · 다음 주 · 월요일 같은 요일 · 까지 · 3시 · 오후 2시 반)을 뺀 짧은 제목, 글쓴이의 말과 순서 그대로. 할 일이 아니면 빈 글자.",
  "start_on · due_on: 글에 적힌 날만 YYYY-MM-DD 로. 날이 하나면 due_on 만. 글에 날이 없으면 둘 다 빈 글자 - 오늘이나 짐작한 날을 넣지 않는다.",
  "start_time · end_time: 글에 적힌 시각을 24시간 HH:MM 으로(오후 7시 → 19:00). 「오후 7시~9시」 처럼 범위면 둘 다, 시각이 하나면 start_time 만(「6시까지」 처럼 끝만 말하면 end_time 만). 오전 · 오후 없이 쓴 1 ~ 11시는, 그날이 오늘이고 그 시각이 이미 지났으면 오후로. 글에 시각이 없으면 둘 다 빈 글자.",
  "",
  "글: {글}",
].join("\n");

const KIND_FIXED = "이 글은 할 일이다(kind 는 todo).";
const KIND_CHOOSE = [
  "kind 를 정한다:",
  "- todo: 글쓴이가 해야 할 일 · 가야 할 약속 · 챙길 것(「내일 우유 사기」, 「금요일까지 보고서」)",
  "- memo: 나중에 다시 볼 생각 · 정보 · 기록(「좋은 책 제목 …」, 「와이파이 비번 …」)",
  "- skip: 인사 · 잡담 · 느낌 · 물음(「오늘 날씨 좋다」, 「뭐 하지?」)",
].join("\n");

/** 프롬프트에 오늘 · 지금 · 종류 · 글을 넣는다 */
export function renderTodoPrompt(
  template: string,
  { text, today, now, fixed }: { text: string; today: string; now: string; fixed: "todo" | null },
) {
  // 요일까지 적어 준다. 「다음 주 화요일」 을 셈하려면 오늘이 무슨 요일인지 알아야 한다
  const weekday = "일월화수목금토"[new Date(`${today}T00:00:00Z`).getUTCDay()];
  const body = text.slice(0, 2000);
  const filled = template
    .replaceAll("{오늘}", `${today}(${weekday}요일)`)
    .replaceAll("{지금}", now)
    .replaceAll("{종류}", fixed ? KIND_FIXED : KIND_CHOOSE)
    .replaceAll("{글}", body);
  return template.includes("{글}") ? filled : `${filled}\n\n글: ${body}`;
}

/** AI 의 답을 믿을 만한 것만 받는다. 날짜가 이상하면 규칙으로 읽은 날을 쓴다 */
export function fromAi(
  raw: string,
  text: string,
  today: string,
  fixed: "todo" | null,
  now = "00:00",
): Decision {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const kind = fixed ?? data.kind;
  if (kind === "skip") return { kind: "skip", how: "ai" };
  if (kind === "memo") return { kind: "memo", text, how: "ai" };
  if (kind !== "todo") throw new Error("모르는 kind");
  const read = readTodo(text, today, now);
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : read.title;
  const startOn = parseDay(data.start_on);
  const dueOn = parseDay(data.due_on);
  const range =
    startOn || dueOn ? orderRange({ startOn, dueOn }) : { startOn: read.startOn, dueOn: read.dueOn };
  // 시각은 규칙으로 읽은 것이 먼저(오전 · 오후 가르기가 정해져 있다), 못 읽었으면 AI 의 것
  const ruled = read.startTime || read.endTime;
  const times = {
    startTime: ruled ? read.startTime : parseTime(data.start_time),
    endTime: ruled ? read.endTime : parseTime(data.end_time),
  };
  return {
    kind: "todo",
    title: title.slice(0, 200),
    ...withTimeDay({ ...range, ...times }, today),
    how: "ai",
  };
}

/** 규칙으로(AI 를 끄거나 실패했을 때) */
export function byRule(
  text: string,
  today: string,
  fixed: "todo" | "memo" | null,
  now = "00:00",
): Decision {
  if (fixed === "memo") return { kind: "memo", text, how: "rule" };
  if (fixed === "todo") return { kind: "todo", ...readTodo(text, today, now), how: "rule" };
  const todo = guessTodo(text, today, now);
  return todo ? { kind: "todo", ...todo, how: "rule" } : { kind: "skip", how: "rule" };
}

/**
 * 판정. fixed 는 말을 붙여 보낸 글의 종류(없으면 null). key 가 없으면 규칙.
 * template 은 환경설정의 판정 프롬프트(없으면 처음 값).
 * 무료 등급은 보통 1초 안팎이지만 가끔 10초를 넘긴다. Telegram 은 답을 넉넉히
 * 기다리므로 15초까지 기다리고, 넘으면 규칙으로.
 */
export async function classify(
  text: string,
  today: string,
  fixed: "todo" | "memo" | null,
  /** 쓸 AI 엔진(문자열이면 Gemini 키). 없으면 규칙 */
  key: AiAccess | string | null,
  now = "00:00",
  template: string = DEFAULT_TODO_PROMPT,
): Promise<Decision> {
  const ai = aiAccess(key);
  // 메모라고 말했으면 AI 가 할 것이 없다
  if (!ai || fixed === "memo") return byRule(text, today, fixed, now);
  try {
    const raw = await askAi(renderTodoPrompt(template, { text, today, now, fixed }), ai, {
      timeoutMs: 15000,
      temperature: 0,
      schema: SCHEMA,
    });
    return fromAi(raw, text, today, fixed, now);
  } catch {
    return byRule(text, today, fixed, now);
  }
}
