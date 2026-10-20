"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { runAssistantAction } from "@/app/admin/chat/actions";
import ChatMarkdown from "@/components/admin/ChatMarkdown";
import { actionLabel, splitActions, type AssistantAction } from "@/lib/ai/assistant-actions";
import { speak } from "@/lib/ai/speech-browser";

/**
 * AI 비서가 제안한 일 하나(MYH-260). 누르기 전에는 아무것도 넣지 않는다.
 * 넣은 뒤에는 결과만 보인다(이 탭 안에서)
 */
function ActionCard({ action }: { action: AssistantAction }) {
  const [state, setState] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
      <span>{actionLabel(action)}</span>
      {state?.ok ? (
        <span role="status" className="text-emerald-700 dark:text-emerald-400">
          {state.ok}
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {state?.error ? (
            <span role="alert" className="text-red-600 dark:text-red-400">
              {state.error}
            </span>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => setState(await runAssistantAction(action)))}
            className="rounded-md bg-foreground px-2 py-0.5 font-medium text-background disabled:opacity-50"
          >
            {pending ? "넣는 중…" : action.action === "done" ? "끝내기" : "넣기"}
          </button>
        </span>
      )}
    </div>
  );
}

/** AI 의 답 한 마디: 글과, 비서가 붙인 일(MYH-260), 소리로 듣기(MYH-263) */
export default function AssistantReply({ content }: { content: string }) {
  const { text, actions } = splitActions(content);
  // 서버에서는 없다고 보고, 브라우저에서 다시 본다(하이드레이션이 어긋나지 않게)
  const canSpeak = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  return (
    <>
      {text ? <ChatMarkdown>{text}</ChatMarkdown> : null}
      {text && canSpeak ? (
        <button
          type="button"
          onClick={() => (window.speechSynthesis.speaking ? window.speechSynthesis.cancel() : speak(content))}
          aria-label="소리로 듣기"
          title="소리로 듣기 · 다시 누르면 멈춤"
          className="mt-1 text-xs text-muted hover:text-foreground"
        >
          🔊
        </button>
      ) : null}
      {actions.map((a, i) => (
        <ActionCard key={i} action={a} />
      ))}
    </>
  );
}
