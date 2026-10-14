/**
 * AI 로 하루 메모를 모아 일기 초안(MYH-250). DB 를 보지 않는 것만 두고 시험한다.
 *
 * 메모 · 일기는 암호화해 두는 나만 보는 글이라, AI 로 보내면 그 글이 바깥(Gemini ·
 * OpenAI …)으로 나간다. 그래서 환경설정의 스위치(DIARY_AI, 처음은 끔)를 켰을 때만 쓴다.
 */

export const DEFAULT_DIARY_PROMPT = [
  "아래는 {날짜} 하루 동안 내가 적어 둔 메모들이다(적은 시각 순).",
  "이 메모로 그날의 일기 초안을 써라.",
  "- 1인칭, 담담한 말투(~했다). 메모에 없는 일을 지어내지 않는다.",
  "- 시간 순서로 자연스럽게 잇고, 짧은 문단 두세 개. 마크다운 제목 · 목록은 쓰지 않는다.",
  "- 할 일 · 링크 같은 것은 꼭 필요할 때만 한 줄로 덧붙인다.",
  "",
  "메모:",
  "{메모}",
].join("\n");

/** 보내는 메모 글의 길이 끝(앞부분부터) */
const MAX_MEMOS = 8000;

/** 2026-10-13 → 2026년 10월 13일(화) */
function longDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = "일월화수목금토"[new Date(`${day}T00:00:00Z`).getUTCDay()];
  return `${y}년 ${m}월 ${d}일(${weekday})`;
}

export function renderDiaryPrompt(
  template: string,
  { day, memos }: { day: string; memos: { at: string; text: string }[] },
) {
  const lines = memos.map((m) => `- [${m.at}] ${m.text.replace(/\s*\n\s*/g, " ")}`).join("\n").slice(0, MAX_MEMOS);
  const filled = template.replaceAll("{날짜}", longDay(day)).replaceAll("{메모}", lines);
  return template.includes("{메모}") ? filled : `${filled}\n\n메모:\n${lines}`;
}

/** .env 의 켬 글자: on · true · 1 · yes */
export function isOn(value: string | null | undefined) {
  return /^(on|true|1|yes)$/i.test(value?.trim() ?? "");
}
