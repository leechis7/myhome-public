"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickMemoAction, type QuickMemoState } from "@/app/admin/memos/actions";
import { quickTodoAction } from "@/app/admin/todos/actions";
import AiChat from "@/components/admin/AiChat";

type Tab = "memo" | "todo" | "ai";

const TABS: Record<Tab, string> = { memo: "📝 메모", todo: "✅ 할 일", ai: "🤖 AI" };
const SIZE_KEY = "myhome:ai-size";

/** AI 탭 창의 폭 · 대화 칸 높이(px). 없으면 처음 크기 */
type Size = { w: number; h: number };

function loadSize(): Size | null {
  try {
    const v = JSON.parse(localStorage.getItem(SIZE_KEY) ?? "null");
    return v && typeof v.w === "number" && typeof v.h === "number" ? v : null;
  } catch {
    return null;
  }
}

/** 화면 안에 들게. maxH 는 창 위가 화면 위에 닿기 전까지 */
function clampSize({ w, h }: Size, maxH: number): Size {
  return {
    w: Math.round(Math.min(Math.max(w, 320), window.innerWidth - 40)),
    h: Math.round(Math.min(Math.max(h, 160), maxH)),
  };
}

/**
 * 어느 화면에서나 바로 메모 · 할 일을 적는 떠 있는 단추(MYH-223). 관리자에게만
 * 그린다(components/QuickMemo.tsx 가 거른다). 저장해도 보던 화면에 그대로 있다.
 *
 * 단추는 하나, 창 위의 탭으로 메모와 할 일을 가른다 — 둘이면 구석이 붐빈다.
 * 열면 늘 메모 탭부터다. Ctrl(⌘)+Enter 로 저장, Esc 나 창 밖을 누르면 닫는다.
 * 닫아도 창을 지우지 않고 숨긴다 - 적던 글 · 기다리던 AI 답이 그대로 남는다.
 * AI 탭은 오픈클로 · Gemini 와 대화한다(MYH-248, components/admin/AiChat.tsx).
 * AI 탭 창은 왼쪽 위 손잡이로 크기를 바꾼다(창이 오른쪽 아래에 붙어 있어서).
 * 정한 크기는 이 브라우저에 기억하고, 손잡이를 두 번 누르면 처음 크기로.
 * 오른쪽 위 ⛶ 로 전체 화면(Esc 나 다시 누르면 돌아온다).
 */
export default function QuickMemoButton({
  engines = [],
}: {
  /** AI 탭에서 고를 엔진들. 맨 앞이 처음 값(환경설정의 1순위, MYH-248) */
  engines?: { key: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  /** 한 번이라도 열었나. 그 뒤로는 닫아도 창을 숨기기만 한다 */
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState<Tab | null>(null);
  const [tab, setTab] = useState<Tab>("memo");
  /** AI 탭 전체 화면 */
  const [full, setFull] = useState(false);
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // 열면 늘 메모부터
    setTab("memo");
    setFull(false);
    setShown(true);
    setOpen(true);
  };
  const root = useRef<HTMLDivElement>(null);
  const wide = full && tab === "ai";
  const [state, action, pending] = useActionState<QuickMemoState, FormData>(
    async (prev, formData) => {
      const result =
        tab === "todo" ? await quickTodoAction(prev, formData) : await quickMemoAction(prev, formData);
      if (result.ok) {
        setOpen(false);
        setDone(tab === "todo" || result.todo ? "todo" : "memo");
      }
      return result;
    },
    {},
  );
  const box = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLFormElement>(null);
  const [size, setSize] = useState<Size | null>(loadSize);
  const saveSize = (next: Size | null) => {
    try {
      if (next) localStorage.setItem(SIZE_KEY, JSON.stringify(next));
      else localStorage.removeItem(SIZE_KEY);
    } catch {
      // 기억하지 못해도 된다
    }
  };
  /** 손잡이를 끈다. 왼쪽 · 위로 끌수록 커진다 */
  const startResize = (e: React.PointerEvent<HTMLButtonElement>) => {
    const log = panel.current?.querySelector<HTMLElement>('[role="log"]');
    if (!panel.current || !log) return;
    e.preventDefault();
    const from = { x: e.clientX, y: e.clientY, w: panel.current.offsetWidth, h: log.offsetHeight };
    const maxH = from.h + panel.current.getBoundingClientRect().top - 16;
    let last: Size = { w: from.w, h: from.h };
    const move = (ev: PointerEvent) => {
      last = clampSize({ w: from.w + from.x - ev.clientX, h: from.h + from.y - ev.clientY }, maxH);
      setSize(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      saveSize(last);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    if (open) box.current?.focus();
  }, [open, tab]);

  // 창 밖을 누르면 닫는다(떠 있는 단추도 창의 일부로 본다)
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 2500);
    return () => clearTimeout(t);
  }, [done]);

  return (
    <div ref={root} className="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-2 print:hidden">
      {shown ? (
        <form
          ref={panel}
          action={action}
          aria-label="빠른 메모"
          hidden={!open}
          style={tab === "ai" && size && !wide ? { width: `min(${size.w}px, calc(100vw - 2.5rem))` } : undefined}
          className={`${
            wide
              ? "fixed inset-3 z-50 sm:inset-6"
              : `relative ${tab === "ai" ? "w-[min(40rem,calc(100vw-2.5rem))]" : "w-[min(22rem,calc(100vw-2.5rem))]"}`
          } rounded-xl border border-border bg-background p-3 shadow-lg`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (wide) setFull(false);
              else setOpen(false);
            }
            if (tab !== "ai" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.requestSubmit();
          }}
        >
          {tab === "ai" ? (
            <button
              type="button"
              onClick={() => setFull((v) => !v)}
              aria-label={wide ? "전체 화면 끝내기" : "전체 화면"}
              aria-pressed={wide}
              title={wide ? "원래 크기로 (Esc)" : "전체 화면"}
              className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded border border-border text-xs leading-none text-muted hover:bg-foreground/5 hover:text-foreground"
            >
              {wide ? "🗗" : "⛶"}
            </button>
          ) : null}
          {tab === "ai" && !wide ? (
            <button
              type="button"
              aria-label="창 크기 바꾸기"
              title="끌어서 크기 바꾸기 · 두 번 누르면 처음 크기"
              onPointerDown={startResize}
              onDoubleClick={() => {
                setSize(null);
                saveSize(null);
              }}
              className="absolute top-1.5 left-1.5 grid size-6 cursor-nwse-resize touch-none place-items-center rounded border border-border text-xs leading-none text-muted hover:bg-foreground/5 hover:text-foreground"
            >
              ⤡
            </button>
          ) : null}
          <div role="tablist" aria-label="무엇을 적나" className={`mb-2 flex gap-1 text-sm ${tab === "ai" ? (wide ? "pr-7" : "px-7") : ""}`}>
            {(Object.keys(TABS) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  tab === t ? "bg-foreground/[0.08] font-medium" : "text-muted hover:text-foreground"
                }`}
              >
                {TABS[t]}
              </button>
            ))}
          </div>
          {tab === "ai" ? (
            // 전체 화면이면 대화 칸을 화면 높이만큼(AiChat 이 화면 안으로 줄인다)
            <AiChat height={wide ? 100_000 : size?.h} engines={engines} />
          ) : tab === "memo" ? (
            <textarea
              ref={box}
              name="content"
              required
              rows={4}
              aria-label="메모"
              placeholder="떠오른 것 한 줄 (Ctrl+Enter 로 저장)"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
          ) : (
            <div className="space-y-2">
              <textarea
                ref={box}
                name="title"
                required
                rows={2}
                aria-label="할 일"
                placeholder="할 일 (「내일 오후 7시 운동」 처럼 쓰면 날짜 · 시각을 읽습니다. Ctrl+Enter 로 저장)"
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              {/* 기간(MYH-228). 다 비워도 된다 */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <input
                  type="date"
                  name="startOn"
                  aria-label="시작일"
                  title="시작일"
                  className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
                />
                ~
                <input
                  type="date"
                  name="dueOn"
                  aria-label="마감일"
                  title="마감일"
                  className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
                />
                {/* 시각(MYH-245). 날을 비우면 오늘 */}
                <input
                  type="time"
                  name="startTime"
                  aria-label="시작 시각"
                  title="시작 시각. 날을 비우면 오늘"
                  className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
                />
                ~
                <input
                  type="time"
                  name="endTime"
                  aria-label="끝 시각"
                  title="끝 시각"
                  className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm outline-none focus:border-foreground/40"
                />
              </div>
            </div>
          )}
          {tab !== "ai" && state.error ? (
            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          {tab === "ai" ? null : (
          <div className="mt-2 flex items-center justify-between gap-2">
            <Link
              href={tab === "todo" ? "/admin/todos" : "/admin/memos"}
              className="text-xs text-muted hover:text-foreground"
            >
              {tab === "todo" ? "할 일 보기 →" : "메모 보기 →"}
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "저장 중…" : tab === "todo" ? "더하기" : "메모하기"}
            </button>
          </div>
          )}
        </form>
      ) : null}
      {done ? (
        <p role="status" className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-background shadow">
          {done === "todo" ? "✅ 할 일에 넣었습니다" : "📝 메모했습니다"}
        </p>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "빠른 메모 닫기" : "빠른 메모"}
        title="메모 · 할 일 · AI"
        aria-expanded={open}
        className="grid size-12 place-items-center rounded-full bg-foreground text-xl text-background shadow-lg transition-transform hover:scale-105"
      >
        {open ? "×" : "＋"}
      </button>
    </div>
  );
}
