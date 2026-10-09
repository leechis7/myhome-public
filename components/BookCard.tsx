import Link from "next/link";
import { coverUrl, stars, type BookRow } from "@/lib/books";

/**
 * 책 한 권(MYH-190). 표지가 없으면 제목 첫 글자로 자리를 채운다.
 * large 는 지금 읽는 책 - 표지를 크게, 소개를 다 보인다.
 */
export default function BookCard({
  book,
  large = false,
  admin = false,
}: {
  book: BookRow;
  large?: boolean;
  /** 관리자면 노트가 없어도 「독서 노트 쓰기」 를 단다(MYH-211) */
  admin?: boolean;
}) {
  const cover = coverUrl(book);
  const size = large ? "h-36 w-24" : "h-20 w-14";
  const title = book.url ? (
    <a
      href={book.url}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {book.title}
    </a>
  ) : (
    book.title
  );
  return (
    <div className="flex gap-4">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={`${book.title} 표지`}
          loading="lazy"
          className={`${size} shrink-0 rounded border border-border object-cover`}
        />
      ) : (
        <div
          aria-hidden
          className={`${size} flex shrink-0 items-center justify-center rounded border border-border bg-foreground/[0.04] text-xl text-faint`}
        >
          {book.title.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0">
        <p className={large ? "text-lg font-medium" : "font-medium"}>{title}</p>
        <p className="text-sm text-muted">
          {book.author}
          {book.category ? ` · ${book.category}` : ""}
          {book.kind ? ` · ${book.kind}` : ""}
          {book.status === "read" && book.finishedOn
            ? ` · ${book.finishedOn.slice(0, 7).replace("-", ".")}`
            : book.status === "reading" && book.startedOn
              ? ` · ${book.startedOn.slice(0, 7).replace("-", ".")} 부터`
              : ""}
        </p>
        {book.rating ? (
          <p
            className="text-sm text-amber-500"
            aria-label={`별점 5점 만점에 ${book.rating}점`}
          >
            {stars(book.rating)}
          </p>
        ) : null}
        {book.note ? (
          <p
            className={`mt-1 text-sm leading-relaxed text-foreground/70 ${
              large ? "" : "line-clamp-2"
            }`}
          >
            {book.note}
          </p>
        ) : null}
        {/* 독서 노트가 있을 때만 상세로 잇는다(MYH-211) */}
        {book.hasNote ? (
          <Link
            href={`/books/${book.id}`}
            className="mt-1 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            독서 노트 읽기 →
          </Link>
        ) : admin ? (
          <Link
            href={`/admin/books/${book.id}`}
            className="mt-1 inline-block text-sm text-muted transition-colors hover:text-foreground"
          >
            ＋ 독서 노트 쓰기
          </Link>
        ) : null}
      </div>
    </div>
  );
}
