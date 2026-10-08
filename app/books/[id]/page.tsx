import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import Markdown from "@/components/blog/Markdown";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import {
  BOOK_STATUS_LABELS,
  coverUrl,
  findBook,
  stars,
  type BookStatus,
} from "@/lib/books";
import { pageMetadata } from "@/lib/page-metadata";
import { formatDate } from "@/lib/posts";

export const dynamic = "force-dynamic";

/** 2026-09-20 → 2026.09.20 */
function day(value: string | null) {
  return value ? value.replaceAll("-", ".") : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/books/[id]">): Promise<Metadata> {
  const { id } = await params;
  const book = await findBook(Number(id));
  if (!book) return { title: "책" };
  return pageMetadata({
    title: book.title,
    description: book.note ?? `${book.author} 「${book.title}」 의 독서 노트`,
    path: `/books/${book.id}`,
  });
}

/**
 * 책 한 권(MYH-211). 표지 · 지은이 · 읽은 기간 · 소개와 독서 노트.
 * 목록(/books)의 카드는 노트가 있을 때만 여기로 잇는다.
 */
export default async function BookPage({ params }: PageProps<"/books/[id]">) {
  const { id } = await params;
  const book = await findBook(Number(id));
  if (!book) notFound();

  const cover = coverUrl(book);
  const started = day(book.startedOn);
  const finished = day(book.finishedOn);
  const period =
    started && finished
      ? `${started} ~ ${finished}`
      : started
        ? `${started} 부터`
        : finished
          ? `${finished} 다 읽음`
          : null;

  return (
    <Container>
      <article>
        <div className="flex flex-col gap-6 sm:flex-row">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={`${book.title} 표지`}
              className="h-48 w-32 shrink-0 rounded border border-border object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-48 w-32 shrink-0 items-center justify-center rounded border border-border bg-foreground/[0.04] text-3xl text-faint"
            >
              {book.title.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
              <AdminLinkButton href={`/admin/books/${book.id}`} label="고치기" />
            </div>
            <p className="mt-2 text-muted">
              {book.author}
              {book.kind ? ` · ${book.kind}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              {BOOK_STATUS_LABELS[book.status as BookStatus]}
              {period ? ` · ${period}` : ""}
            </p>
            {book.rating ? (
              <p
                className="mt-2 text-amber-500"
                aria-label={`별점 5점 만점에 ${book.rating}점`}
              >
                {stars(book.rating)}
              </p>
            ) : null}
            {book.note ? (
              <p className="mt-3 leading-relaxed text-foreground/80">
                {book.note}
              </p>
            ) : null}
            {book.url ? (
              <p className="mt-3 text-sm">
                <a
                  href={book.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  서점 · 출판사 ↗
                </a>
              </p>
            ) : null}
          </div>
        </div>

        {book.readingNote ? (
          <section aria-labelledby="note-heading" className="mt-12">
            <h2 id="note-heading" className="text-lg font-semibold">
              독서 노트
            </h2>
            {book.noteUpdatedAt ? (
              <p className="mt-1 text-sm text-muted">
                <time dateTime={book.noteUpdatedAt.toISOString()}>
                  {formatDate(book.noteUpdatedAt)}
                </time>
              </p>
            ) : null}
            <div className="mt-6">
              <Markdown>{book.readingNote}</Markdown>
            </div>
          </section>
        ) : null}
      </article>

      <p className="mt-16 border-t border-border pt-6 text-sm">
        <Link
          href="/books"
          className="text-muted transition-colors hover:text-foreground"
        >
          ← 읽는 책
        </Link>
      </p>
    </Container>
  );
}
