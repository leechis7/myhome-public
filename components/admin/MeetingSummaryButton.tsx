"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { handOffMeetingAction, summarizeMeetingAction } from "@/app/admin/ai/meetings/actions";

const ACTIONS = { summary: summarizeMeetingAction, handoff: handOffMeetingAction };

/**
 * 회의 화면의 단추: 요약 (다시) 만들기(MYH-266) · 오픈클로에 맡기기(MYH-268).
 * 몇십 초 ~ 몇 분 걸린다
 */
export default function MeetingSummaryButton({
  id,
  again,
  kind = "summary",
}: {
  id: number;
  again: boolean;
  kind?: keyof typeof ACTIONS;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await ACTIONS[kind](id);
            setError(r.error ?? null);
            if (r.ok) router.refresh();
          })
        }
        className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {kind === "handoff"
          ? pending
            ? "오픈클로가 처리하는 중…(몇 분 걸릴 수 있어요)"
            : again
              ? "오픈클로에 다시 맡기기"
              : "🦞 오픈클로에 맡기기"
          : pending
            ? "요약하는 중…"
            : again
              ? "요약 다시 만들기"
              : "요약 만들기"}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </span>
  );
}
