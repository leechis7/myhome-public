"use client";

import { useState, useTransition } from "react";
import { draftDiaryAction } from "@/app/admin/diary/actions";
import { fillField } from "@/components/admin/fill-field";

/**
 * 「그날 메모로 초안」(MYH-250). AI 가 쓴 초안을 일기 칸에 넣는다 - 쓰던 글이
 * 있으면 덮지 않고 그 아래에 붙인다. 저장은 사람이 한다.
 */
export default function DiaryDraftButton({
  day,
  memoCount,
  fieldId,
}: {
  day: string;
  memoCount: number;
  /** 일기 칸(textarea)의 id */
  fieldId: string;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    setNote(null);
    start(async () => {
      const reply = await draftDiaryAction(day);
      const box = document.getElementById(fieldId) as HTMLTextAreaElement | null;
      if (!reply.text || !box) {
        setNote({ ok: false, text: reply.error ?? "초안을 만들지 못했습니다." });
        return;
      }
      const now = box.value.trim();
      fillField(box, now ? `${now}\n\n${reply.text}` : reply.text);
      setNote({ ok: true, text: now ? "쓰던 글 아래에 초안을 붙였습니다." : "초안을 넣었습니다. 고쳐서 저장하세요." });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending || memoCount === 0}
        className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? "AI 가 쓰는 중…" : `✨ 그날 메모로 초안 (메모 ${memoCount}개)`}
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
