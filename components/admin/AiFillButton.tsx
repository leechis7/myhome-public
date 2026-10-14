"use client";

import { useState, useTransition } from "react";
import { suggestPostMetaAction } from "@/app/admin/posts/ai-actions";
import { fillField } from "@/components/admin/fill-field";

/**
 * 「AI 로 채우기」(MYH-249). 폼의 제목 · 본문을 읽어 AI 에게 요약 · 태그를 묻고,
 * 받은 것을 그 폼의 칸(summary · tags)에 넣는다. 저장은 사람이 한다.
 * summary 칸이 없는 폼(짧은 글)은 태그만 넣는다.
 *
 * 보이는지는 부르는 쪽이 정한다 - AI 엔진이 하나도 없으면 그리지 않는다.
 */
export default function AiFillButton({
  formId,
  kind,
  label = "✨ AI 로 채우기",
}: {
  formId: string;
  kind: "post" | "note";
  label?: string;
}) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const get = (name: string) =>
      form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    setNote(null);
    start(async () => {
      const reply = await suggestPostMetaAction({
        kind,
        title: get("title")?.value ?? "",
        content: get("content")?.value ?? "",
      });
      if (reply.error) {
        setNote({ ok: false, text: reply.error });
        return;
      }
      const summary = get("summary");
      const tags = get("tags");
      if (summary && reply.summary) fillField(summary, reply.summary);
      if (tags && reply.tags?.length) fillField(tags, reply.tags.join(", "));
      setNote({ ok: true, text: "AI 가 채웠습니다. 고쳐서 저장하세요." });
    });
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? "AI 가 읽는 중…" : label}
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
