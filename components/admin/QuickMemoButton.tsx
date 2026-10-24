"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { quickMemoAction, type QuickMemoState } from "@/app/admin/memos/actions";
import { quickTodoAction } from "@/app/admin/todos/actions";

type Tab = "memo" | "todo";

const TABS: Record<Tab, string> = { memo: "📝 메모", todo: "✅ 할 일" };

/**
 * 어느 화면에서나 바로 메모 · 할 일을 적는 떠 있는 단추(MYH-223). 관리자에게만
 * 그린다(components/QuickMemo.tsx 가 거른다). 저장해도 보던 화면에 그대로 있다.
 *
 * 단추는 하나, 창 위의 탭으로 메모와 할 일을 가른다 — 둘이면 구석이 붐빈다.
 * 열면 늘 메모 탭부터다. Ctrl(⌘)+Enter 로 저장, Esc 나 창 밖을 누르면 닫는다.
 * 닫아도 창을 지우지 않고 숨긴다 - 적던 글이 그대로 남는다.
 * AI 는 팝업에 두지 않고 「🤖 AI」 가 AI 화면(/admin/ai)으로 바로 보낸다(MYH-275).
 * AI 화면 자체에서는 이 단추를 숨긴다 - 대화 입력줄의 「보내기」 와 겹친다(MYH-275).
 */
export default function QuickMemoButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** 한 번이라도 열었나. 그 뒤로는 닫아도 창을 숨기기만 한다 */
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState<Tab | null>(null);
  const [tab, setTab] = useState<Tab>("memo");
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // 열면 늘 메모부터
    setTab("memo");
    setShown(true);
    setOpen(true);
  };
  const root = useRef<HTMLDivElement>(null);
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

  // AI 화면(/admin/ai)에서는 떠 있는 「+」 를 숨긴다 - 대화 입력줄의 「보내기」 와 겹친다(MYH-275)
  if (pathname === "/admin/ai") return null;

  return (
    <div ref={root} className="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-2 print:hidden">
      {shown ? (
        <form
          action={action}
          aria-label="빠른 메모"
          hidden={!open}
          className="relative w-[min(22rem,calc(100vw-2.5rem))] rounded-xl border border-border bg-background p-3 shadow-lg"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.requestSubmit();
          }}
        >
          <div role="tablist" aria-label="무엇을 적나" className="mb-2 flex gap-1 text-sm">
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
            {/* AI 는 팝업 대신 AI 화면으로(MYH-275) */}
            <Link
              href="/admin/ai"
              className="ml-auto rounded-md px-2.5 py-1 text-muted transition-colors hover:text-foreground"
            >
              🤖 AI →
            </Link>
          </div>
          {tab === "memo" ? (
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
          {state.error ? (
            <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
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
        title="메모 · 할 일"
        aria-expanded={open}
        className="grid size-12 place-items-center rounded-full bg-foreground text-xl text-background shadow-lg transition-transform hover:scale-105"
      >
        {open ? "×" : "＋"}
      </button>
    </div>
  );
}
