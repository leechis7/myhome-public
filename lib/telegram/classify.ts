import { askGemini } from "@/lib/ai/gemini";
import { parseDay } from "@/lib/my-space/diary-calendar";
import { orderRange, readTodoDates } from "@/lib/my-space/todo-dates";
import { guessTodo } from "@/lib/my-space/todo-intent";

/**
 * 텔레그램으로 온 글을 가른다(MYH-233). 환경설정에서 「AI 로 판정」 을 켜고
 * Gemini 키가 있으면 AI 가 먼저, 실패하면(늦음 · 한도 · 이상한 답) 지금 규칙.
 *
 *   kind 를 정해 보낸 글(「할일 …」 · 「메모 …」)  그 말을 따른다. 할 일이면 AI 는
 *                                                  제목 · 날짜만 다듬는다
 *   말 없이 온 글                                   AI 가 할 일 · 메모 · 저장 안 함을 정한다
 *
 * 메모는 보낸 글 그대로 둔다 - AI 가 내 메모를 고쳐 쓰지 않게.
 */

export type Decision =
  | { kind: "todo"; title: string; startOn: string | null; dueOn: string | null; how: "ai" | "rule" }
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
  },
  required: ["kind", "title", "start_on", "due_on"],
};

/** 요일까지 적어 준다. 「다음 주 화요일」 을 셈하려면 오늘이 무슨 요일인지 알아야 한다 */
function todayLine(today: string) {
  const weekday = "일월화수목금토"[new Date(`${today}T00:00:00Z`).getUTCDay()];
  return `오늘은 ${today}(${weekday}요일), 서울 시각이다. 주는 월요일에 시작한다.`;
}

function prompt(text: string, today: string, fixed: "todo" | null) {
  return [
    "글쓴이가 자기 메모 봇에게 텔레그램으로 보낸 한국어 글이다.",
    todayLine(today),
    fixed
      ? "이 글은 할 일이다(kind 는 todo)."
      : [
          "kind 를 정한다:",
          "- todo: 글쓴이가 해야 할 일 · 가야 할 약속 · 챙길 것(「내일 우유 사기」, 「금요일까지 보고서」)",
          "- memo: 나중에 다시 볼 생각 · 정보 · 기록(「좋은 책 제목 …」, 「와이파이 비번 …」)",
          "- skip: 인사 · 잡담 · 느낌 · 물음(「오늘 날씨 좋다」, 「뭐 하지?」)",
        ].join("\n"),
    "title: 할 일이면 날짜를 가리키는 말(내일 · 10/15 · 다음 주 · 월요일 같은 요일 · 까지)을 뺀 짧은 제목, 글쓴이의 말과 순서 그대로. 시각(3시 · 오후 2시 반)은 제목에 남긴다. 할 일이 아니면 빈 글자.",
    "start_on · due_on: 글에 적힌 날만 YYYY-MM-DD 로. 날이 하나면 due_on 만. 글에 날이 없으면 둘 다 빈 글자 - 오늘이나 짐작한 날을 넣지 않는다.",
    "",
    `글: ${text.slice(0, 2000)}`,
  ].join("\n");
}

/** AI 의 답을 믿을 만한 것만 받는다. 날짜가 이상하면 규칙으로 읽은 날을 쓴다 */
export function fromAi(raw: string, text: string, today: string, fixed: "todo" | null): Decision {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const kind = fixed ?? data.kind;
  if (kind === "skip") return { kind: "skip", how: "ai" };
  if (kind === "memo") return { kind: "memo", text, how: "ai" };
  if (kind !== "todo") throw new Error("모르는 kind");
  const read = readTodoDates(text, today);
  const title = typeof data.title === "string" && data.title.trim() ? data.title.trim() : read.title;
  const startOn = parseDay(data.start_on);
  const dueOn = parseDay(data.due_on);
  const range =
    startOn || dueOn ? orderRange({ startOn, dueOn }) : { startOn: read.startOn, dueOn: read.dueOn };
  return { kind: "todo", title: title.slice(0, 200), ...range, how: "ai" };
}

/** 규칙으로(AI 를 끄거나 실패했을 때) */
export function byRule(text: string, today: string, fixed: "todo" | "memo" | null): Decision {
  if (fixed === "memo") return { kind: "memo", text, how: "rule" };
  if (fixed === "todo") return { kind: "todo", ...readTodoDates(text, today), how: "rule" };
  const todo = guessTodo(text, today);
  return todo ? { kind: "todo", ...todo, how: "rule" } : { kind: "skip", how: "rule" };
}

/**
 * 판정. fixed 는 말을 붙여 보낸 글의 종류(없으면 null). key 가 없으면 규칙.
 * 무료 등급은 보통 1초 안팎이지만 가끔 10초를 넘긴다. Telegram 은 답을 넉넉히
 * 기다리므로 15초까지 기다리고, 넘으면 규칙으로.
 */
export async function classify(
  text: string,
  today: string,
  fixed: "todo" | "memo" | null,
  key: string | null,
): Promise<Decision> {
  // 메모라고 말했으면 AI 가 할 것이 없다
  if (!key || fixed === "memo") return byRule(text, today, fixed);
  try {
    const raw = await askGemini(prompt(text, today, fixed), key, {
      timeoutMs: 15000,
      temperature: 0,
      schema: SCHEMA,
    });
    return fromAi(raw, text, today, fixed);
  } catch {
    return byRule(text, today, fixed);
  }
}
