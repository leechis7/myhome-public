import { splitActions } from "@/lib/ai/assistant-actions";
import { speakableText } from "@/lib/ai/speech";

/**
 * 브라우저의 소리 기능(MYH-263): 음성 인식(말 → 글)과 읽기(글 → 말). 화면 쪽에서만
 * 부른다(서버에는 window 가 없다).
 */

/** 브라우저 음성 인식(MYH-263). 크롬 · 엣지 · 사파리에 있고 파이어폭스에는 없다 */
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null;
}

/** 답을 소리로 읽는다. 한국어 목소리가 있으면 그것으로. 읽던 것은 멈춘다 */
export function speak(markdown: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const text = speakableText(splitActions(markdown).text);
  if (!text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ko"));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
