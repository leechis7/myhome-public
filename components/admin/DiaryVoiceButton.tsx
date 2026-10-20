"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { voiceDiaryAction } from "@/app/admin/diary/actions";
import { fillField } from "@/components/admin/fill-field";
import { WavRecorder } from "@/lib/ai/record-wav";

/** 한 번에 말할 수 있는 길이 */
const MAX_SECONDS = 5 * 60;

/**
 * 일기를 말로(MYH-270). 🎙 를 누르고 오늘 있었던 일을 말한 뒤 다시 누르면, 받아써서
 * AI 가 일기 문장으로 다듬어 일기 칸에 넣는다(쓰던 글이 있으면 그 아래). 저장은
 * 사람이 한다. 소리는 남기지 않는다.
 */
export default function DiaryVoiceButton({ day, fieldId }: { day: string; fieldId: string }) {
  const rec = useRef<WavRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();


  const begin = async () => {
    setNote(null);
    const r = new WavRecorder();
    try {
      await r.start();
    } catch {
      setNote({ ok: false, text: "마이크를 쓸 수 없습니다. 브라우저에서 마이크를 허용해 주세요." });
      return;
    }
    rec.current = r;
    setSeconds(0);
    setRecording(true);
  };

  const finish = async () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    setRecording(false);
    const wav = await r.stop();
    start(async () => {
      const form = new FormData();
      form.set("day", day);
      form.set("audio", new File([wav], "diary.wav", { type: "audio/wav" }));
      const reply = await voiceDiaryAction(form);
      const box = document.getElementById(fieldId) as HTMLTextAreaElement | null;
      if (!reply.text || !box) {
        setNote({ ok: false, text: reply.error ?? "일기로 만들지 못했습니다." });
        return;
      }
      const now = box.value.trim();
      fillField(box, now ? `${now}\n\n${reply.text}` : reply.text);
      setNote({ ok: true, text: "말한 것을 일기로 넣었습니다. 고쳐서 저장하세요." });
    });
  };

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = Math.floor(rec.current?.seconds() ?? 0);
      setSeconds(s);
      if (s >= MAX_SECONDS) void finish();
    }, 500);
    return () => clearInterval(t);
    // 5분이 되면 저절로 끝낸다. finish 는 매번 새로 만들어지지만 녹음 중인지만 보면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={recording ? finish : begin}
        disabled={pending}
        aria-pressed={recording}
        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
          recording ? "animate-pulse border-red-500 text-red-600" : "border-border hover:bg-foreground/5"
        }`}
      >
        {pending ? "받아써서 다듬는 중…" : recording ? `■ 다 말했어요 (${mmss})` : "🎙 말로 쓰기"}
      </button>
      {note ? (
        <span
          role={note.ok ? "status" : "alert"}
          className={`text-xs ${note.ok ? "text-muted" : "text-red-600 dark:text-red-400"}`}
        >
          {note.text}
        </span>
      ) : null}
    </div>
  );
}
