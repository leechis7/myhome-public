"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { chatAction } from "@/app/admin/chat/actions";
import ChatMarkdown from "@/components/admin/ChatMarkdown";

type Turn = { role: "user" | "assistant"; content: string; engine?: string };

const KEY = "myhome:ai-chat";

function load(): Turn[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/**
 * 떠 있는 「+」 창의 AI 탭(MYH-248). 대화를 통째로 홈페이지 서버에 보내고
 * (app/admin/chat/actions.ts), 서버가 환경설정의 차례대로 오픈클로 · Gemini 에
 * 묻는다. 대화는 이 탭(sessionStorage)에만 잠깐 둔다 - 닫으면 사라진다.
 * 물을 엔진을 고를 수 있다(처음 값은 환경설정 차례의 1순위).
 *
 * AI 의 답은 마크다운으로 그린다(코드 · 표 · 목록).
 * 바깥 「빠른 메모」 form 안에 놓이므로 form 을 따로 두지 않는다.
 * Enter 로 보내고 Shift+Enter 는 줄바꿈.
 */
export default function AiChat({
  height,
  engines = [],
}: {
  height?: number;
  /** 고를 수 있는 엔진들. 맨 앞이 처음 값 */
  engines?: { key: string; label: string }[];
}) {
  const [engine, setEngine] = useState(engines[0]?.key ?? "");
  const [turns, setTurns] = useState<Turn[]>(load);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(turns));
    } catch {
      // 기억하지 못해도 된다
    }
    end.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  useEffect(() => box.current?.focus(), []);

  const send = () => {
    const content = draft.trim();
    if (!content || pending) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setDraft("");
    setError(null);
    start(async () => {
      const reply = await chatAction(
        next.map(({ role, content }) => ({ role, content })),
        engine || undefined,
      );
      if (reply.text) {
        setTurns((now) => [...now, { role: "assistant", content: reply.text!, engine: reply.engine }]);
      } else {
        setError(reply.error ?? "답을 받지 못했습니다.");
      }
    });
  };

  return (
    <div>
      <div
        role="log"
        aria-label="AI 대화"
        aria-live="polite"
        style={height ? { height: `min(${height}px, calc(100vh - 17rem))` } : undefined}
        className="h-[min(60vh,36rem)] space-y-2 overflow-y-auto pr-1 text-sm"
      >
        {turns.length === 0 ? (
          <p className="text-xs text-muted">
            무엇이든 물어보세요. 환경설정 › AI 사용 의 차례대로 오픈클로 · Gemini 가 답합니다.
          </p>
        ) : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <p
              key={i}
              className="ml-8 rounded-lg bg-foreground px-3 py-2 whitespace-pre-wrap text-background"
            >
              {t.content}
            </p>
          ) : (
            <div key={i} className="mr-8">
              <div className="rounded-lg bg-foreground/[0.06] px-3 py-2">
                <ChatMarkdown>{t.content}</ChatMarkdown>
              </div>
              {t.engine ? <p className="mt-0.5 text-[11px] text-muted">{t.engine}</p> : null}
            </div>
          ),
        )}
        {pending ? <p className="mr-8 text-xs text-muted">생각하는 중…</p> : null}
        <div ref={end} />
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <textarea
        ref={box}
        rows={3}
        aria-label="AI 에게 물을 말"
        placeholder="물을 말 (Enter 로 보내기, Shift+Enter 줄바꿈)"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.stopPropagation();
            send();
          }
        }}
        className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setTurns([]);
            setError(null);
          }}
          disabled={turns.length === 0 || pending}
          className="text-xs text-muted hover:text-foreground disabled:opacity-40"
        >
          대화 지우기
        </button>
        <span className="ml-auto" />
        {/* 물을 엔진(MYH-248). 처음 값은 환경설정 차례의 1순위. 하나뿐이면 이름만 */}
        {engines.length > 1 ? (
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            aria-label="AI 엔진"
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            {engines.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
        ) : engines.length === 1 ? (
          <span className="text-xs text-muted">{engines[0].label}</span>
        ) : null}
        <button
          type="button"
          onClick={send}
          disabled={pending || !draft.trim()}
          className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "기다리는 중…" : "보내기"}
        </button>
      </div>
    </div>
  );
}
