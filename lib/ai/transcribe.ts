import { chatGemini } from "@/lib/ai/gemini";

/**
 * 회의 녹음 조각을 받아쓴다(MYH-265). Gemini 가 소리를 받는다(inline_data). 오픈클로
 * 게이트웨이는 소리를 받는지 아직 모른다(MYH-268) - 받아쓰기는 Gemini 만 쓴다.
 * 말이 없으면 빈 글자.
 */
const PROMPT = `이 회의 녹음 조각을 한국어로 들리는 그대로 받아써라. 다른 말은 붙이지 마라.
말하는 사람이 바뀌면 줄을 바꿔라. 말이 없거나 알아들을 수 없으면 빈 글자로 답하라.`;

export async function transcribeAudio(audio: { type: string; data: string }, key: string) {
  const text = await chatGemini(
    [{ role: "user", content: PROMPT, images: [audio] }],
    key,
    { timeoutMs: 60_000, temperature: 0 },
  );
  return text.trim();
}
