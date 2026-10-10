import Link from "next/link";
import DeleteButton from "@/components/admin/DeleteButton";
import CodePicker from "@/components/admin/CodePicker";
import CoverInput from "@/components/admin/CoverInput";
import BookLookup from "@/components/admin/BookLookup";
import { deleteBook, saveBook } from "@/app/admin/books/actions";
import {
  BOOK_STATUS_LABELS,
  coverUrl,
  filterBooks,
  groupByYear,
  type BookFilter,
  type BookRow,
  type BookStatus,
} from "@/lib/books";
import { BOOK_CATEGORY, BOOK_KIND, codesHref } from "@/lib/codes/groups";
import type { Code } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

/** 책 한 권의 칸. 더하기와 고치기가 같이 쓴다 */
function Fields({
  book,
  kinds,
  categories,
}: {
  book?: BookRow;
  kinds: Code[];
  categories: Code[];
}) {
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
      {/* 분류(MYH-225). 컴퓨터 · 교양 · 소설 … */}
      <CodePicker
        codes={categories}
        value={book?.categoryCode}
        name="categoryCode"
        label="분류"
        editHref={codesHref(BOOK_CATEGORY)}
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

/** 목록의 책 한 권. 펼쳐 고친다 */
function BookItem({
  book,
  kinds,
  categories,
  lookupSource,
}: {
  book: BookRow;
  kinds: Code[];
  categories: Code[];
  lookupSource: string;
}) {
  return (
    <li className="rounded-lg border border-border">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium">{book.title}</span>
          <span className="text-muted">{book.author}</span>
          {book.category || book.kind ? (
            <span className="text-xs text-faint">
              {[book.category, book.kind].filter(Boolean).join(" · ")}
            </span>
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
                : book.status === "want"
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                  : "bg-foreground/[0.06] text-foreground/60"
            }`}
          >
            {BOOK_STATUS_LABELS[book.status as BookStatus]}
          </span>
        </summary>
        <div className="border-t border-border p-4">
          <form action={saveBook} aria-label={`${book.title} 고치기`}>
            <input type="hidden" name="id" value={book.id} />
            {/* 등록된 책도 찾아서 고친다 - 표지 · 지은이를 나중에 채울 때 */}
            <BookLookup source={lookupSource} initial={book.title} />
            <Fields book={book} kinds={kinds} categories={categories} />
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
  );
}

const chipOn = "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium";
const chipOff =
  "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground";

/** 주소의 거르기를 하나만 바꾼 링크 */
function filterHref(filter: BookFilter, change: Partial<BookFilter>) {
  const next = { ...filter, ...change };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.category) params.set("category", next.category);
  if (next.q) params.set("q", next.q);
  const query = params.toString();
  return query ? `/admin/books?${query}#books` : "/admin/books#books";
}

/**
 * 읽는 책(MYH-190) 관리. 책이 많아도 쓰기 좋게(MYH-226):
 *   - 「＋ 책 추가」 를 맨 위에 둔다. 평소에는 접혀 있다
 *   - 상태 단추 · 분류 · 제목이나 지은이로 거른다(주소에 남는다)
 *   - 읽는 중 · 읽고 싶은 책 · 다 읽음으로 나누고, 다 읽은 책은 해마다 접는다.
 *     가장 최근 해와 날짜 없는 것만 펼쳐 두고, 거르는 중이면 다 펼친다
 */
export default function BookEditor({
  rows,
  kinds,
  categories,
  lookupSource,
  filter,
  addOpen = false,
}: {
  rows: BookRow[];
  /** 책 종류 코드 전부(꺼 둔 것까지) */
  kinds: Code[];
  /** 책 분류 코드 전부(꺼 둔 것까지, MYH-225) */
  categories: Code[];
  /** 책 찾기가 쓰는 곳(카카오 · Open Library, MYH-226) */
  lookupSource: string;
  filter: BookFilter;
  /** 「책 추가」 를 펼쳐 둘까 - 책이 없거나 ?add=1 */
  addOpen?: boolean;
}) {
  const shown = filterBooks(rows, filter);
  const filtering = Boolean(filter.status || filter.category || filter.q);
  const count = (status: BookStatus) => rows.filter((b) => b.status === status).length;
  const item = (book: BookRow) => (
    <BookItem
      key={book.id}
      book={book}
      kinds={kinds}
      categories={categories}
      lookupSource={lookupSource}
    />
  );
  const sections: { status: BookStatus; title: string }[] = [
    { status: "reading", title: "읽는 중" },
    { status: "want", title: "읽고 싶은 책" },
    { status: "read", title: "다 읽음" },
  ];

  return (
    <>
      {/* 맨 위의 책 추가. 평소에는 접어 둔다 */}
      <details open={addOpen || rows.length === 0} className="group">
        <summary className={`${primary} inline-flex cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          ＋ 책 추가
        </summary>
        <form
          action={saveBook}
          aria-label="책 추가"
          className="mt-3 rounded-xl border border-dashed border-border p-4"
        >
          <BookLookup source={lookupSource} />
          <Fields kinds={kinds} categories={categories} />
          <button type="submit" className={`${primary} mt-3`}>
            추가
          </button>
        </form>
      </details>

      {rows.length > 0 ? (
        <div className="mt-6 space-y-3">
          <nav aria-label="상태별 보기" className="flex flex-wrap gap-2">
            <Link href={filterHref(filter, { status: null })} className={filter.status ? chipOff : chipOn}>
              전체 <span className="ml-1 text-xs text-faint tabular-nums">{rows.length}</span>
            </Link>
            {sections.map(({ status, title }) => (
              <Link
                key={status}
                href={filterHref(filter, { status })}
                aria-current={filter.status === status ? "page" : undefined}
                className={filter.status === status ? chipOn : chipOff}
              >
                {title} <span className="ml-1 text-xs text-faint tabular-nums">{count(status)}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/books" aria-label="책 검색" className="flex flex-wrap gap-2">
            {filter.status ? <input type="hidden" name="status" value={filter.status} /> : null}
            <select
              name="category"
              defaultValue={filter.category ?? ""}
              aria-label="분류"
              className={`${field} w-auto`}
            >
              <option value="">분류 전체</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              name="q"
              defaultValue={filter.q}
              placeholder="제목 · 지은이 검색"
              aria-label="목록 검색"
              className={`${field} min-w-0 flex-1`}
            />
            <button type="submit" className={button}>
              검색
            </button>
            {filtering ? (
              <Link href="/admin/books#books" className={button}>
                전체 보기
              </Link>
            ) : null}
          </form>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">아직 적은 책이 없습니다.</p>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted">조건에 맞는 책이 없습니다.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map(({ status, title }) => {
            const list = shown.filter((b) => b.status === status);
            if (list.length === 0) return null;
            if (status !== "read") {
              return (
                <section key={status} aria-label={title}>
                  <h2 className="mb-2 text-sm font-semibold text-muted">
                    {title} <span className="tabular-nums">{list.length}</span>
                  </h2>
                  <ul className="space-y-2">{list.map(item)}</ul>
                </section>
              );
            }
            // 다 읽은 책은 해마다 접는다. 해는 최근 것부터, 날짜 없음은 맨 뒤.
            // 가장 최근 해 · 날짜 없음은 펼쳐 둔다
            const years = groupByYear(list).toSorted(([a], [b]) =>
              a === "날짜 없음" ? 1 : b === "날짜 없음" ? -1 : b.localeCompare(a),
            );
            return (
              <section key={status} aria-label={title}>
                <h2 className="mb-2 text-sm font-semibold text-muted">
                  {title} <span className="tabular-nums">{list.length}</span>
                </h2>
                <div className="space-y-2">
                  {years.map(([year, books], i) => (
                    <details
                      key={year}
                      open={filtering || i === 0 || year === "날짜 없음"}
                      className="group/year"
                    >
                      <summary className="cursor-pointer py-1 text-sm text-muted">
                        {year} <span className="tabular-nums">· {books.length}권</span>
                      </summary>
                      <ul className="mt-2 space-y-2">{books.map(item)}</ul>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
