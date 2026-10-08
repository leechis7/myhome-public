import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Container from "@/components/Container";
import MarkdownField from "@/components/admin/markdown/MarkdownField";
import { saveReadingNote } from "@/app/admin/book-actions";
import { isAdmin } from "@/lib/auth";
import { BOOK_STATUS_LABELS, findBook, type BookStatus } from "@/lib/books";

export const metadata: Metadata = {
  title: "독서 노트",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

/**
 * 책 한 권의 독서 노트와 별점(MYH-211). 책 목록(/admin/books)은 줄마다
 * 펼쳐 고치는 짧은 칸뿐이라, 길게 쓰는 노트는 여기서 따로 쓴다.
 * 읽는 중인 책에도 쓴다 — 읽으며 적는 메모도 노트다.
 */
export default async function ReadingNotePage({
  params,
  searchParams,
}: PageProps<"/admin/books/[id]">) {
  if (!(await isAdmin())) redirect("/admin");

  const { id } = await params;
  const book = await findBook(Number(id));
  if (!book) notFound();
  const saved = (await searchParams).ok === "1";

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">독서 노트</h1>
        <div className="flex items-center gap-3">
          {book.hasNote ? (
            <Link href={`/books/${book.id}`} className={button}>
              공개 화면에서 보기 ↗
            </Link>
          ) : null}
          <Link href="/admin/books" className={button}>
            책 목록
          </Link>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        「{book.title}」 · {book.author} ·{" "}
        {BOOK_STATUS_LABELS[book.status as BookStatus]}
      </p>
      {saved ? (
        <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
          저장했습니다.
        </p>
      ) : null}

      <form
        action={saveReadingNote}
        aria-label="독서 노트"
        className="mt-8 space-y-5"
      >
        <input type="hidden" name="id" value={book.id} />
        <label className="block text-sm text-muted">
          별점
          <select
            name="rating"
            defaultValue={book.rating ?? ""}
            className={`${field} mt-1 max-w-48`}
          >
            <option value="">매기지 않음</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
                {"☆".repeat(5 - n)} ({n})
              </option>
            ))}
          </select>
        </label>
        <MarkdownField
          id="reading-note"
          name="readingNote"
          label="독서 노트"
          rows={18}
          defaultValue={book.readingNote ?? ""}
          placeholder="읽으며 적은 것, 다 읽고 남은 것. 마크다운으로 씁니다. 비우면 공개 화면에서 노트가 빠집니다."
          textareaClassName={`${field} font-mono leading-relaxed`}
        />
        <button type="submit" className={primary}>
          저장
        </button>
      </form>
    </Container>
  );
}
