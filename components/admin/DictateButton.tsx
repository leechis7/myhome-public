"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fillField } from "@/components/admin/fill-field";
import { recognitionClass, type Recognition } from "@/lib/ai/speech-browser";

/**
 * 말한 것을 글 칸 끝에 붙이는 단추(독서 노트를 말로, MYH-273). 브라우저 음성 인식이라
 * 서버 · AI 로 보내지 않는다(크롬은 소리를 구글로 보낸다). 말이 한 마디 끝날 때마다
 * 칸 끝에 줄을 바꿔 붙이고, 다시 누를 때까지 듣는다. 저장은 사람이 한다.
 * 인식이 없는 브라우저(파이어폭스)에는 보이지 않는다.
 */
export default function DictateButton({ fieldId, label = "🎤 말로 적기" }: { fieldId: string; label?: string }) {
  const can = useSyncExternalStore(
    () => () => {},
    () => recognitionClass() !== null,
    () => false,
  );
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);
  const keep = useRef(false);

  useEffect(
    () => () => {
      keep.current = false;
      rec.current?.abort();
    },
    [],
  );

  const append = (text: string) => {
    const box = document.getElementById(fieldId) as HTMLTextAreaElement | null;
    if (!box || !text.trim()) return;
    const now = box.value.replace(/\s+$/, "");
    fillField(box, now ? `${now}\n${text.trim()}` : text.trim());
  };

  const listen = () => {
    const Klass = recognitionClass();
    if (!Klass || !keep.current) return;
    const r = new Klass();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.continuous = true;
    let done = 0;
    r.onresult = (e) => {
      const results = Array.from(e.results);
      // 끝난 마디는 칸에 붙이고, 아직 말하는 것은 아래에 회색으로
      for (let i = done; i < results.length; i++) {
        if (results[i].isFinal) {
          append(results[i][0]?.transcript ?? "");
          done = i + 1;
        }
      }
      setInterim(
        results
          .slice(done)
          .map((res) => res[0]?.transcript ?? "")
          .join(" "),
      );
    };
    r.onerror = () => {};
    r.onend = () => {
      setInterim("");
      if (keep.current) setTimeout(listen, 300);
    };
    rec.current = r;
    r.start();
  };

  const toggle = () => {
    if (on) {
      keep.current = false;
      rec.current?.stop();
      setOn(false);
      return;
    }
    keep.current = true;
    setOn(true);
    listen();
  };

  if (!can) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={on ? "듣는 중 · 누르면 멈춤" : "말하면 칸 끝에 붙입니다"}
        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          on ? "animate-pulse border-red-500 text-red-600" : "border-border hover:bg-foreground/5"
        }`}
      >
        {on ? "■ 그만 듣기" : label}
      </button>
      {on && interim ? <span className="text-xs text-muted italic">{interim}</span> : null}
    </span>
  );
}
