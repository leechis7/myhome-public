"use client";

import { useState, useTransition } from "react";
import { proofreadAction } from "@/app/admin/posts/ai-actions";
import { fillField } from "@/components/admin/fill-field";
import { applyEdit, type ProofEdit } from "@/lib/posts/proofread";

/**
 * 「맞춤법 · 문장 보기」(MYH-253). 본문 칸(fieldId)의 글을 AI 에게 보여 고칠 곳을
 * 받고, 「원문 → 제안 · 까닭」 을 늘어놓아 하나씩 받아들인다. 통째로 바꾸지 않는다.
 * 그 사이 본문을 고쳐 원문이 없어졌으면 그 줄은 받아들일 수 없다고 알린다.
 */
export default function ProofreadPanel({ fieldId, kind }: { fieldId: string; kind: "post" | "note" }) {
  const [pending, start] = useTransition();
  const [edits, setEdits] = useState<(ProofEdit & { state?: "done" | "skip" | "gone" })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const box = () => document.getElementById(fieldId) as HTMLTextAreaElement | null;

  const run = () => {
    setError(null);
    setEdits(null);
    start(async () => {
      const reply = await proofreadAction({ kind, content: box()?.value ?? "" });
      if (reply.error) setError(reply.error);
      else setEdits(reply.edits ?? []);
    });
  };

  const mark = (i: number, state: "done" | "skip" | "gone") =>
    setEdits((list) => list?.map((e, j) => (j === i ? { ...e, state } : e)) ?? null);

  const accept = (i: number) => {
    const el = box();
    if (!el || !edits) return;
    const next = applyEdit(el.value, edits[i]);
    if (next === null) return mark(i, "gone");
    fillField(el, next);
    mark(i, "done");
  };

  const open = edits?.filter((e) => !e.state).length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {pending ? "AI 가 읽는 중…" : "✨ 맞춤법 · 문장 보기"}
        </button>
        {edits ? (
          <span role="status" className="text-xs text-muted">
            {edits.length === 0 ? "고칠 곳을 찾지 못했습니다." : `고칠 곳 ${edits.length}개 · 남은 것 ${open}개`}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
      </div>
      {edits && edits.length > 0 ? (
        <ul aria-label="고칠 곳" className="divide-y divide-border rounded-lg border border-border text-sm">
          {edits.map((e, i) => (
            <li key={`${i}-${e.from}`} className={`flex flex-wrap items-start gap-3 px-3 py-2 ${e.state ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p>
                  <del className="text-red-700 dark:text-red-300">{e.from}</del>
                  <span className="mx-1.5 text-muted">→</span>
                  <ins className="text-emerald-700 no-underline dark:text-emerald-300">{e.to}</ins>
                </p>
                {e.why ? <p className="mt-0.5 text-xs text-muted">{e.why}</p> : null}
              </div>
              {e.state ? (
                <span className="text-xs text-muted">
                  {e.state === "done" ? "받아들임" : e.state === "skip" ? "넘김" : "본문에서 사라짐"}
                </span>
              ) : (
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => accept(i)}
                    className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-foreground/5"
                  >
                    받아들이기
                  </button>
                  <button
                    type="button"
                    onClick={() => mark(i, "skip")}
                    className="rounded-md px-2 py-0.5 text-xs text-muted hover:text-foreground"
                  >
                    넘기기
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
