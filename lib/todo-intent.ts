import { readTodoDates } from "@/lib/todo-dates";

/**
 * 「할일」 · 「메모」 말 없이 온 텔레그램 글이 할 일인가(MYH-230).
 *
 * 「내일 우유 사기」 는 할 일이고 「오늘 날씨 좋다」 는 아니다. 둘 다 날짜가
 * 있으니 날짜만으로는 가를 수 없어 말끝도 본다. AI 에게 묻는 길은 일단
 * 두지 않는다(사용자) - 규칙으로 놓치는 것이 많으면 그때 붙인다.
 *
 * 글은 이미 내 대화방에서 온 것만 여기 온다(lib/telegram-inbox.ts).
 */

export type TodoGuess = { title: string; startOn: string | null; dueOn: string | null };

/** 이야기로 끝나는 말. 「좋다」 · 「했네」 · 「맞죠」 · 「ㅋㅋ」 · 물음 */
const CHAT_END = /(?:[다네요군죠]|구나|ㅋ+|ㅎ+|ㅠ+|ㅜ+|[?？!~.…])$/;
/** 그래도 할 일인 말. 「가야 한다」 · 「내야 함」 · 「할 것」 · 「사기」 · 「마감」 */
const TASK_HINT =
  /(?:해야|야\s?(?:해|함|돼|된다|한다|하네|겠다)|할\s?것|기$|함$|마감|제출|예약|약속|회의|미팅|면접|병원|결제|납부|신청)/;

/** 할 일처럼 생긴 글인가. 날짜와 상관없이 말끝만 본다 */
export function looksLikeTask(text: string) {
  const t = text.trim();
  if (/[?？]$/.test(t)) return false;
  return TASK_HINT.test(t) || !CHAT_END.test(t);
}

/**
 * 규칙으로 가르기. 날짜가 있고 할 일처럼 생겼으면 할 일이다.
 * 「오늘 날씨 좋다」(이야기) · 「내일 비 오네」 는 아니다.
 */
export function guessTodo(text: string, today: string): TodoGuess | null {
  const read = readTodoDates(text, today);
  if (!read.startOn && !read.dueOn) return null;
  return looksLikeTask(read.title) ? read : null;
}
