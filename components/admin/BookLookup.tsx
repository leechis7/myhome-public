"use client";

import { useRef, useState, useTransition } from "react";
import { lookupBooks } from "@/app/admin/book-actions";
import type { FoundBook } from "@/lib/book-lookup";

const field =
  "min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "shrink-0 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-50";

/**
 * 책 찾기(MYH-226). 「책 추가」 폼 안에 둔다. 고르면 같은 폼의 제목 ·
 * 지은이 · 링크 칸을 채우고, 표지 주소는 숨은 칸(coverUrl)에 넣어 저장할 때
 * 서버가 받는다. 폼 안이라 <form> 을 또 두지 않고 Enter 를 직접 받는다.
 */
export default function BookLookup({ source }: { source: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundBook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<FoundBook | null>(null);
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
        {source} 에서 찾습니다. 고르면 제목 · 지은이 · 링크 · 표지를 채웁니다.
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
              <li key={`${book.isbn ?? book.title}-${i}`}>
                <button
                  type="button"
                  onClick={() => pick(book)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/5"
                >
                  {book.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-12 w-8 shrink-0 rounded border border-border object-cover"
                    />
                  ) : (
                    <span className="h-12 w-8 shrink-0 rounded border border-border bg-foreground/[0.04]" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{book.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {[book.author, book.publisher, book.isbn].filter(Boolean).join(" · ")}
                    </span>
                  </span>
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
              src={picked.cover}
              alt=""
              referrerPolicy="no-referrer"
              className="h-9 w-6 rounded border border-border object-cover"
            />
          ) : null}
          「{picked.title}」 를 채웠습니다.
          {picked.cover ? " 표지는 저장할 때 받아 옵니다." : ""}
        </p>
      ) : null}
      <input type="hidden" name="coverUrl" value={picked?.cover ?? ""} />
    </div>
  );
}
