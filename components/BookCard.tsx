import { coverUrl, type BookRow } from "@/lib/books";

/**
 * 책 한 권(MYH-190). 표지가 없으면 제목 첫 글자로 자리를 채운다.
 * large 는 지금 읽는 책 - 표지를 크게, 소개를 다 보인다.
 */
export default function BookCard({
  book,
  large = false,
}: {
  book: BookRow;
  large?: boolean;
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
          {book.kind ? ` · ${book.kind}` : ""}
          {book.status === "read" && book.finishedOn
            ? ` · ${book.finishedOn.slice(0, 7).replace("-", ".")}`
            : book.status === "reading" && book.startedOn
              ? ` · ${book.startedOn.slice(0, 7).replace("-", ".")} 부터`
              : ""}
        </p>
        {book.note ? (
          <p
            className={`mt-1 text-sm leading-relaxed text-foreground/70 ${
              large ? "" : "line-clamp-2"
            }`}
          >
            {book.note}
          </p>
        ) : null}
      </div>
    </div>
  );
}
