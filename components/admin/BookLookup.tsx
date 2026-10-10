"use client";

import { useRef, useState, useTransition } from "react";
import { lookupBooks, summarizeBookAction } from "@/app/admin/books/actions";
import type { FoundBook } from "@/lib/books/lookup";
import type { SummaryMiss } from "@/lib/books/summary";

/** AI 요약을 못 받았을 때의 말. nokey 는 키를 안 넣은 것이라 알리지 않는다 */
const MISS_TEXT: Partial<Record<SummaryMiss, string>> = {
  empty: "이 책은 받아 온 소개글이 없어 요약할 것이 없습니다.",
  quota: "AI 요약을 받지 못했습니다 — Gemini 무료 한도를 넘었습니다(잠시 뒤나 내일 다시). 소개 앞부분을 대신 썼습니다.",
  slow: "AI 요약을 받지 못했습니다 — Gemini 가 너무 늦게 답했습니다. 소개 앞부분을 대신 썼습니다.",
  error: "AI 요약을 받지 못했습니다 — Gemini 가 답하지 않았습니다. 소개 앞부분을 대신 썼습니다.",
};

const field =
  "min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
/** 바깥 표지는 우리 서버를 거쳐 보여 준다(app/admin/books/cover) */
function coverSrc(url: string) {
  return `/admin/books/cover?u=${encodeURIComponent(url)}`;
}

const button =
  "shrink-0 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50";

/**
 * 책 찾기(MYH-226). 「책 추가」 와 등록된 책 고치기 폼 안에 둔다. 고르면 같은 폼의 제목 ·
 * 지은이 · 링크 칸을 채우고, 표지 주소는 숨은 칸(coverUrl)에 넣어 저장할 때
 * 서버가 받는다. 폼 안이라 <form> 을 또 두지 않고 Enter 를 직접 받는다.
 */
export default function BookLookup({
  source,
  initial = "",
}: {
  source: string;
  /** 처음 찾기 칸에 넣어 둘 말. 등록된 책을 고칠 때는 그 제목 */
  initial?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initial);
  const [found, setFound] = useState<FoundBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoundBook | null>(null);
  // 크게 보는 표지. 섬네일을 누르면 연다
  const [zoom, setZoom] = useState<FoundBook | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  // AI 요약이 왔는데 소개 칸에 이미 글이 있을 때 - 바꿀지 묻는다
  const [proposal, setProposal] = useState<{
    current: string;
    summary: string;
    /** AI 요약인가, 앞부분 줄인 것인가 */
    ai: boolean;
  } | null>(null);
  // AI 요약을 못 받은 까닭
  const [miss, setMiss] = useState<SummaryMiss | null>(null);

  function noteField() {
    const el = root.current?.closest("form")?.elements.namedItem("note");
    return el instanceof HTMLTextAreaElement ? el : null;
  }
  const dialog = useRef<HTMLDialogElement>(null);

  function open(book: FoundBook) {
    setZoom(book);
    dialog.current?.showModal();
  }
  const [pending, start] = useTransition();

  function search() {
    if (!query.trim()) return;
    start(async () => {
      const result = await lookupBooks(query);
      if ("error" in result) {
        setError(result.error);
        setFound(null);
      } else {
        setError(null);
        setFound(result.books);
      }
    });
  }

  function pick(book: FoundBook) {
    const form = root.current?.closest("form");
    const set = (name: string, value: string | null) => {
      const el = form?.elements.namedItem(name);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = value ?? "";
      }
    };
    set("title", book.title);
    set("author", book.author);
    set("url", book.url);
    // 소개(MYH-233). 비어 있으면 줄인 앞부분을 먼저 넣고, AI 요약이 오면 그사이
    // 손대지 않았을 때 바꾼다. 이미 적어 둔 소개가 있으면 덮지 않고 둘을 나란히
    // 보여 주고 바꿀지 묻는다 - 내 말로 쓰는 칸이다
    const note = form?.elements.namedItem("note");
    if (note instanceof HTMLTextAreaElement) {
      const draft = note.value.trim() ? null : (book.summary ?? "");
      if (draft !== null) note.value = draft;
      setProposal(null);
      setMiss(book.description ? null : "empty");
      if (book.description) {
        setSummarizing(true);
        summarizeBookAction(book.title, book.description, book.author)
          .then((result) => {
            // AI 요약을 못 받았으면 왜인지 알린다 - 조용히 끝나면 안 된 줄 모른다
            if (result.how === "trim") setMiss(result.miss);
            const { summary, how } = result;
            if (!summary) return;
            if (draft !== null && note.value === draft) {
              note.value = summary;
              return;
            }
            // 소개가 이미 있으면 덮지 않고 견줘 보인다. AI 를 못 썼으면 앞부분 줄인 것과
            if (note.value.trim() !== summary) {
              setProposal({ current: note.value, summary, ai: how === "ai" });
            }
          })
          .catch(() => {})
          .finally(() => setSummarizing(false));
      }
    }
    setPicked(book);
    setFound(null);
  }

  return (
    <div ref={root} className="mb-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // 폼의 「추가」 로 가지 않게 막고 찾기만 한다
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="제목이나 ISBN 으로 찾기"
          aria-label="책 찾기"
          className={field}
        />
        <button type="button" onClick={search} disabled={pending} className={button}>
          {pending ? "찾는 중…" : "찾기"}
        </button>
      </div>
      <p className="text-xs text-faint">
        {source} 에서 찾습니다. 고르면 제목 · 지은이 · 링크 · 표지와 소개 밑그림(카카오)을
        채웁니다. 소개는 비어 있을 때만 채우니 내 말로 고쳐 쓰세요. 저장해야 바뀝니다.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {found ? (
        found.length === 0 ? (
          <p className="text-sm text-muted">찾은 책이 없습니다.</p>
        ) : (
          <ul aria-label="찾은 책" className="divide-y divide-border rounded-lg border border-border">
            {found.map((book, i) => (
              <li key={`${book.isbn ?? book.title}-${i}`} className="flex items-center gap-3 px-3 py-2">
                {/* 섬네일을 누르면 크게, 나머지를 누르면 고른다 */}
                {book.cover ? (
                  <button
                    type="button"
                    onClick={() => open(book)}
                    aria-label={`${book.title} 표지 크게 보기`}
                    className="shrink-0 cursor-zoom-in rounded border border-border transition-opacity hover:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverSrc(book.cover)}
                      alt=""
                      loading="lazy"
                      className="h-20 w-14 rounded object-cover"
                    />
                  </button>
                ) : (
                  <span
                    aria-hidden
                    className="flex h-20 w-14 shrink-0 items-center justify-center rounded border border-border bg-foreground/[0.04] text-[10px] text-faint"
                  >
                    표지 없음
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => pick(book)}
                  className="min-w-0 flex-1 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-foreground/5"
                >
                  <span className="block truncate font-medium">{book.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {[book.author, book.publisher, book.isbn].filter(Boolean).join(" · ")}
                  </span>
                  <span className="mt-0.5 block text-xs text-faint">눌러서 고르기</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {picked ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          {picked.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc(picked.cover)}
              alt=""
              className="h-12 w-8 rounded border border-border object-cover"
            />
          ) : null}
          「{picked.title}」 를 채웠습니다.
          {picked.cover ? " 표지는 저장할 때 받아 옵니다." : ""}
        </p>
      ) : null}
      {summarizing ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-700 dark:text-violet-300"
        >
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500"
          />
          <span className="animate-pulse">✨ AI 가 책 소개를 요약하는 중… (몇 초에서 20초쯤 걸립니다)</span>
        </p>
      ) : null}
      {miss && MISS_TEXT[miss] && !summarizing ? (
        <p
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
        >
          {MISS_TEXT[miss]}
        </p>
      ) : null}
      {proposal ? (
        <div
          role="region"
          aria-label="AI 요약 견주기"
          className="space-y-3 rounded-lg border border-violet-500/40 bg-violet-500/5 p-3 text-sm"
        >
          <p className="font-medium text-violet-700 dark:text-violet-300">
            {proposal.ai
              ? "✨ AI 요약이 왔습니다. 지금 소개를 바꿀까요?"
              : "받아 온 소개의 앞부분입니다. 지금 소개를 바꿀까요?"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-background p-2">
              <p className="mb-1 text-xs text-muted">지금 소개</p>
              <p className="whitespace-pre-wrap">{proposal.current}</p>
            </div>
            <div className="rounded-md border border-violet-500/40 bg-background p-2">
              <p className="mb-1 text-xs text-violet-700 dark:text-violet-300">
                {proposal.ai ? "AI 요약" : "소개 앞부분"}
              </p>
              <p className="whitespace-pre-wrap">{proposal.summary}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const note = noteField();
                if (note) note.value = proposal.summary;
                setProposal(null);
              }}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {proposal.ai ? "AI 요약으로 바꾸기" : "앞부분으로 바꾸기"}
            </button>
            <button type="button" onClick={() => setProposal(null)} className={button}>
              지금 것 두기
            </button>
          </div>
        </div>
      ) : null}
      <input type="hidden" name="coverUrl" value={picked?.cover ?? ""} />
      {/* 표지 크게 보기. 바깥(뒤쪽)을 누르거나 Esc 로 닫는다 */}
      <dialog
        ref={dialog}
        aria-label={zoom ? `${zoom.title} 표지 크게` : "표지 크게 보기"}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onClose={() => setZoom(null)}
        className="m-auto max-h-[90vh] max-w-[90vw] rounded-lg bg-transparent p-0 backdrop:bg-black/70"
      >
        {zoom?.cover ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc(zoom.cover)}
              alt={`${zoom.title} 표지`}
              className="max-h-[80vh] max-w-[90vw] rounded object-contain shadow-2xl"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  pick(zoom);
                  dialog.current?.close();
                }}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
              >
                이 책 고르기
              </button>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="rounded-lg border border-white/60 px-4 py-2 text-sm text-white"
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
