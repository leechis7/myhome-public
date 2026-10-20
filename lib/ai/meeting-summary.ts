import { askAi, type AiAccess } from "@/lib/ai";

/**
 * 회의가 끝나면 대본으로 요약 · 결정 · 할 일을 쓴다(MYH-266). 할 일 · 일정은 AI 비서와
 * 같은 ```myhome 블록으로 적게 해 회의 화면이 카드로 보인다 - 누를 때만 넣는다.
 */

/** 대본이 이보다 길면 앞뒤를 남기고 가운데를 줄인다(엔진의 한도) */
const MAX_CHARS = 60_000;

function clip(text: string) {
  if (text.length <= MAX_CHARS) return text;
  const half = MAX_CHARS / 2;
  return `${text.slice(0, half)}\n…(가운데 줄임)…\n${text.slice(-half)}`;
}

export function meetingPrompt(transcript: string, day: string, title: string) {
  return `다음은 「${title}」 회의(${day}, 한국)를 받아쓴 대본이다. 받아쓰기라 틀린 글자가 있을 수 있다.
한국어 마크다운으로 아래 세 절만 쓴다. 대본에 없는 것은 지어내지 않는다.

## 요약
세 줄 안팎.
## 결정한 것
목록. 없으면 「없음」.
## 할 일
목록(누가 · 무엇을 · 언제까지, 아는 것만). 없으면 「없음」.

그리고 할 일 · 날이 정해진 일정마다 맨 끝에 아래 꼴의 블록을 붙인다(여러 개면 JSON 배열 하나).
날짜는 YYYY-MM-DD(「금요일」 같은 말은 회의 날 기준으로 바꾼다), 시각은 HH:MM, 모르면 null.
\`\`\`myhome
[{"action":"todo","title":"견적서 보내기","startOn":null,"dueOn":"2026-10-23","startTime":null,"endTime":null}]
\`\`\`

대본:
${clip(transcript)}`;
}

export async function summarizeMeeting(
  transcript: string,
  { day, title }: { day: string; title: string },
  access: AiAccess,
) {
  return (await askAi(meetingPrompt(transcript, day, title), access, { timeoutMs: 120_000 })).trim();
}

/** 호출어(MYH-267)의 처음 값 */
export const DEFAULT_WAKE_WORDS = ["비서"];

/**
 * 환경설정의 호출어 「푸딩, 비서」 → ["푸딩", "비서"]. 끝의 「아 · 야 · 님」 은
 * 뗀다(「푸딩아」 라고 적어도 「푸딩님」 까지 알아듣게). 비면 처음 값
 */
export function readWakeWords(value: string | null | undefined) {
  const words = (value ?? "")
    .split(/[,，\n]/)
    .map((w) => w.trim().replace(/(아|야|님)$/, "").trim())
    .filter((w) => w.length > 0)
    .slice(0, 10);
  return words.length ? words : DEFAULT_WAKE_WORDS;
}

/** 회의 중 비서를 부른 말인가(MYH-267). 「푸딩아」 · 「푸딩님」 · 「AI 비서」 */
export function callsAssistant(text: string, words: string[] = DEFAULT_WAKE_WORDS) {
  return words.some((w) => text.includes(w));
}

export function commandPrompt(said: string, before: string, day: string, name = DEFAULT_WAKE_WORDS[0]) {
  return `회의(${day}, 한국)를 받아쓰는 중에 누군가 비서(「${name}」)를 불러 일을 시켰다. 받아쓰기라 틀린 글자가 있을 수 있다.
비서에게 시킨 일만 골라 짧게 한 줄로 확인하고, 할 일 · 메모마다 아래 꼴의 블록을 붙인다. 시킨 일이 없으면 「시킨 일 없음」 한 줄만 쓴다.
날짜는 YYYY-MM-DD(회의 날 기준), 시각은 HH:MM, 모르면 null.
\`\`\`myhome
{"action":"todo","title":"…","startOn":null,"dueOn":null,"startTime":null,"endTime":null}
\`\`\`
\`\`\`myhome
{"action":"memo","text":"…"}
\`\`\`

바로 앞 30초:
${before || "(없음)"}

비서를 부른 30초:
${said}`;
}

export async function meetingCommand(
  said: string,
  before: string,
  day: string,
  access: AiAccess,
  name?: string,
) {
  return (await askAi(commandPrompt(said, before, day, name), access, { timeoutMs: 60_000 })).trim();
}

/** 오픈클로에 맡길 글(MYH-268). 밖으로 나가는 일은 하기 전에 묻게 한다 */
export function handoffPrompt(transcript: string, summary: string | null, day: string, title: string) {
  return `「${title}」 회의(${day}, 한국)의 기록이다. 회의에서 나온 일 가운데 네가 가진 도구로 처리할 수 있는 것을 처리해 줘.
- 할 일 · 메모는 홈페이지(myhome 스킬)에 넣어도 된다
- 메일 · 메시지 보내기, 일정 초대처럼 다른 사람에게 닿는 일은 하지 말고 「이렇게 하면 된다」 고 초안만 보여 줘
- 끝나면 한 일 · 못 한 일 · 사람이 해야 할 일을 한국어로 짧게 알려 줘

${summary ? `요약:\n${summary}\n\n` : ""}대본:
${clip(transcript)}`;
}

