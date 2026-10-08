import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";
import CodePicker from "@/components/admin/CodePicker";
import CoverInput from "@/components/admin/CoverInput";
import { deleteBook, saveBook } from "@/app/admin/book-actions";
import {
  BOOK_STATUS_LABELS,
  coverUrl,
  type BookRow,
  type BookStatus,
} from "@/lib/books";
import { BOOK_KIND, codesHref } from "@/lib/code-groups";
import type { Code } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/** 책 한 권의 칸. 더하기와 고치기가 같이 쓴다 */
function Fields({ book, kinds }: { book?: BookRow; kinds: Code[] }) {
  const cover = book ? coverUrl(book) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input
        name="title"
        defaultValue={book?.title}
        placeholder="제목"
        aria-label="제목"
        required
        className={field}
      />
      <input
        name="author"
        defaultValue={book?.author}
        placeholder="지은이"
        aria-label="지은이"
        required
        className={field}
      />
      <CodePicker
        codes={kinds}
        value={book?.kindCode}
        name="kindCode"
        label="종류"
        editHref={codesHref(BOOK_KIND)}
        className={field}
      />
      <select
        name="status"
        defaultValue={book?.status ?? "reading"}
        aria-label="상태"
        className={`${field} self-start`}
      >
        {(Object.keys(BOOK_STATUS_LABELS) as BookStatus[]).map((s) => (
          <option key={s} value={s}>
            {BOOK_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        defaultValue={book?.note ?? ""}
        placeholder="한두 줄 소개"
        aria-label="소개"
        rows={2}
        className={`${field} sm:col-span-2`}
      />
      <input
        name="url"
        type="url"
        defaultValue={book?.url ?? ""}
        placeholder="링크 (서점 · 출판사, 선택)"
        aria-label="링크"
        className={`${field} sm:col-span-2`}
      />
      <label className="text-xs text-muted">
        읽기 시작한 날
        <input
          name="startedOn"
          type="date"
          defaultValue={book?.startedOn ?? ""}
          className={`${field} mt-1`}
        />
      </label>
      <label className="text-xs text-muted">
        다 읽은 날
        <input
          name="finishedOn"
          type="date"
          defaultValue={book?.finishedOn ?? ""}
          className={`${field} mt-1`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        {/* 붙여넣기 · 끌어놓기도 받는다(MYH-199) */}
        <CoverInput current={cover} />
        {cover ? (
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" name="removeCover" value="1" />
            표지 빼기
          </label>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 읽는 책(MYH-190). 줄마다 펼쳐 고친다. 소개 화면에 읽는 중인 책과 최근에
 * 다 읽은 책 몇 권이 나온다.
 */
export default function BookEditor({
  rows,
  kinds,
}: {
  rows: BookRow[];
  /** 책 종류 코드 전부(꺼 둔 것까지) */
  kinds: Code[];
}) {
  return (
    <>
      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((book) => (
            <li key={book.id} className="rounded-lg border border-border">
              <details>
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                  <span className="font-medium">{book.title}</span>
                  <span className="text-muted">{book.author}</span>
                  {book.kind ? (
                    <span className="text-xs text-faint">{book.kind}</span>
                  ) : null}
                  {/* 펼치지 않아도 바로 노트로 간다(MYH-211) */}
                  <Link
                    href={`/admin/books/${book.id}`}
                    className="ml-auto rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:bg-foreground/5"
                  >
                    {book.hasNote ? "📖 독서 노트" : "＋ 독서 노트"}
                  </Link>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      book.status === "reading"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-foreground/[0.06] text-foreground/60"
                    }`}
                  >
                    {BOOK_STATUS_LABELS[book.status as BookStatus]}
                  </span>
                </summary>
                <div className="border-t border-border p-4">
                  <form action={saveBook} aria-label={`${book.title} 고치기`}>
                    <input type="hidden" name="id" value={book.id} />
                    <Fields book={book} kinds={kinds} />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="submit" className={primary}>
                        저장
                      </button>
                      {/* 노트는 길어서 따로 쓴다(MYH-211) */}
                      <Link href={`/admin/books/${book.id}`} className={button}>
                        {book.hasNote ? "독서 노트 고치기 →" : "독서 노트 쓰기 →"}
                      </Link>
                    </div>
                  </form>
                  <form action={deleteBook} className="mt-2">
                    <input type="hidden" name="id" value={book.id} />
                    <DeleteButton
                      aria-label={`${book.title} 삭제`}
                      className={`${button} text-red-600 dark:text-red-400`}
                      confirmMessage={`「${book.title}」 을 지울까요?`}
                    />
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">아직 적은 책이 없습니다.</p>
      )}

      <form
        action={saveBook}
        aria-label="책 추가"
        className="mt-4 rounded-xl border border-dashed border-border p-4"
      >
        <p className="mb-3 text-sm font-medium text-foreground/70">책 추가</p>
        <Fields kinds={kinds} />
        <button type="submit" className={`${primary} mt-3`}>
          추가
        </button>
      </form>
    </>
  );
}
