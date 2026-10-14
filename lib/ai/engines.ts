/**
 * AI 엔진의 차례 · 사용(MYH-246). 책 찾기 출처(lib/books/sources.ts)와 같은 꼴 -
 * 「openclaw,-gemini」(앞이 먼저, - 는 끔). 새 엔진을 붙이려면 여기 한 줄과
 * lib/ai/index.ts 에서 그 엔진을 부르는 길을 더한다. 환경설정 › AI 사용 의 차례
 * 칸에는 저절로 나온다.
 *
 * DB 를 보지 않는다 - 화면에서도 쓴다.
 */

export const AI_ENGINES = {
  openclaw: { label: "오픈클로", needs: "주소 · 토큰" },
  gemini: { label: "Gemini", needs: "API 키" },
} as const;

export type AiEngine = keyof typeof AI_ENGINES;

export const ENGINE_NAMES = Object.keys(AI_ENGINES) as AiEngine[];

export function isAiEngine(value: unknown): value is AiEngine {
  return typeof value === "string" && Object.hasOwn(AI_ENGINES, value);
}

export type EngineSetting = { engine: AiEngine; on: boolean };

/** 저장된 글을 읽는다. 비었으면 처음 값(다 켬, 위의 차례) */
export function readEngines(stored: string | null | undefined): EngineSetting[] {
  const out: EngineSetting[] = [];
  for (const part of (stored ?? "").split(",")) {
    const off = part.trim().startsWith("-");
    const name = part.trim().replace(/^-/, "");
    if (isAiEngine(name) && !out.some((e) => e.engine === name)) out.push({ engine: name, on: !off });
  }
  for (const name of ENGINE_NAMES) {
    if (!out.some((e) => e.engine === name)) out.push({ engine: name, on: true });
  }
  return out;
}

export function writeEngines(list: EngineSetting[]) {
  return list.map((e) => (e.on ? e.engine : `-${e.engine}`)).join(",");
}

/** 한 칸 위 · 아래로 */
export function moveEngine(list: EngineSetting[], engine: AiEngine, dir: "up" | "down") {
  const i = list.findIndex((e) => e.engine === engine);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
