"use client";

import { useSyncExternalStore } from "react";

/**
 * 글을 소리로 읽는 단추(오늘 듣기, MYH-272). 브라우저에 든 목소리로 읽는다 - 바깥으로
 * 보내지 않는다. 읽는 중에 다시 누르면 멈춘다. 읽기가 없는 브라우저에는 보이지 않는다.
 */
export default function SpeakButton({ text, label }: { text: string; label: string }) {
  const can = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  if (!can) return null;
  const speak = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("ko"));
    if (voice) u.voice = voice;
    synth.speak(u);
  };
  return (
    <button
      type="button"
      onClick={speak}
      title="소리로 듣기 · 다시 누르면 멈춤"
      className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5"
    >
      {label}
    </button>
  );
}
