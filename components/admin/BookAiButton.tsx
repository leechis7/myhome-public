"use client";

import { useRef, useState, useTransition } from "react";
import { suggestCategoryAction, suggestReviewAction } from "@/app/admin/books/ai-actions";
import { fillField } from "@/components/admin/fill-field";

/**
 * 책에 AI(MYH-251). 둘 중 하나:
 * - category: 같은 폼의 제목 · 지은이 · 소개(note)로 분류를 골라 categoryCode 칸을 바꾼다
 * - review: 같은 폼의 독서 노트(readingNote) · 별점으로 한 줄 평 초안을 note 칸에 넣는다
 * 저장은 사람이 한다. AI 엔진이 없으면 부르는 쪽이 그리지 않는다.
 */
export default function BookAiButton({ mode, bookId }: { mode: "category" | "review"; bookId?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const get = (name: string) =>
      form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    setNote(null);
    start(async () => {
      if (mode === "category") {
        const reply = await suggestCategoryAction({
          title: get("title")?.value ?? "",
          author: get("author")?.value ?? "",
          intro: get("note")?.value ?? "",
        });
        const select = get("categoryCode") as HTMLSelectElement | null;
        if (!reply.code || !select) {
          setNote({ ok: false, text: reply.error ?? "분류를 고르지 못했습니다." });
          return;
        }
        select.value = reply.code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        setNote({ ok: true, text: `「${reply.label}」 을 골랐습니다.` });
        return;
      }
      const reply = await suggestReviewAction({
        id: bookId ?? 0,
        note: get("readingNote")?.value ?? "",
        rating: Number(get("rating")?.value) || null,
      });
      const box = get("note") as HTMLTextAreaElement | HTMLInputElement | null;
      if (!reply.text || !box) {
        setNote({ ok: false, text: reply.error ?? "한 줄 평을 만들지 못했습니다." });
        return;
      }
      fillField(box, reply.text);
      setNote({ ok: true, text: "초안을 넣었습니다. 고쳐서 저장하세요." });
    });
  };

  return (
    <span ref={ref} className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? "AI 가 읽는 중…" : mode === "category" ? "✨ 분류 제안" : "✨ 노트로 한 줄 평"}
      </button>
      {note ? (
        <span
          role={note.ok ? "status" : "alert"}
          className={`text-xs ${note.ok ? "text-muted" : "text-red-600 dark:text-red-400"}`}
        >
          {note.text}
        </span>
      ) : null}
    </span>
  );
}
