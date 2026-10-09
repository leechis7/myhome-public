import type { Metadata } from "next";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BookCard from "@/components/BookCard";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import Link from "next/link";
import { categoriesOf, groupByYear, listShelf } from "@/lib/books";
import { isAdmin } from "@/lib/auth";
import { pageMetadata } from "@/lib/page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "읽는 책",
    description: "요즘 읽는 책과 다 읽은 책입니다.",
    path: "/books",
  });
}

export const dynamic = "force-dynamic";

/**
 * 읽는 책(MYH-190). 직접 적은 책 목록이다. 지금 읽는 책은 위에 크게,
 * 다 읽은 책은 아래에 끝낸 해로 묶는다. 고치는 곳은 관리 › 글 › 책.
 * ?category=코드 로 한 분류만 걸러 본다(MYH-225). 맨 아래는 읽고 싶은 책(MYH-227).
 */
export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const params = await searchParams;
  const [shelf, admin] = await Promise.all([listShelf(), isAdmin()]);
  const categories = categoriesOf([...shelf.reading, ...shelf.read, ...shelf.want]);
  // 없는 분류는 거르지 않는다 - 지운 분류의 옛 주소로 와도 빈 화면이 아니다
  const active = categories.find((c) => c.code === params.category);
  const only = <T extends { categoryCode: string | null }>(rows: T[]) =>
    active ? rows.filter((b) => b.categoryCode === active.code) : rows;
  const reading = only(shelf.reading);
  const read = only(shelf.read);
  const want = only(shelf.want);

  return (
    <Container>
      <PageHeader
        title="읽는 책"
        description="요즘 읽는 책과 다 읽은 책입니다. 종이책 · 이북 · 오디오북을 가리지 않습니다."
        action={<AdminLinkButton href="/admin/books" label="고치기" />}
      />

      {categories.length > 0 ? (
        <nav aria-label="분류" className="mb-10">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href="/books"
                aria-current={active ? undefined : "page"}
                className={
                  active
                    ? "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
                    : "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium"
                }
              >
                전체
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/books?category=${encodeURIComponent(c.code)}`}
                  aria-current={active?.code === c.code ? "page" : undefined}
                  className={
                    active?.code === c.code
                      ? "rounded-md border border-foreground/40 px-3 py-1 text-sm font-medium"
                      : "rounded-md border border-border px-3 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
                  }
                >
                  {c.label}
                  <span className="ml-1.5 text-xs text-faint tabular-nums">
                    {c.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <section aria-labelledby="reading-heading">
        <h2 id="reading-heading" className="mb-5 text-lg font-semibold">
          지금 읽는 책
        </h2>
        {reading.length === 0 ? (
          <p className="text-sm text-muted">
            {active
              ? `「${active.label}」 가운데 지금 읽는 책은 없습니다.`
              : "지금은 읽는 책이 없습니다."}
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {reading.map((book) => (
              <li key={book.id}>
                <BookCard book={book} large admin={admin} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {read.length > 0 ? (
        <section aria-labelledby="read-heading" className="mt-16">
          <h2 id="read-heading" className="mb-5 text-lg font-semibold">
            다 읽은 책
            <span className="ml-2 text-sm font-normal text-muted tabular-nums">
              {read.length}
            </span>
          </h2>
          <div className="space-y-8">
            {groupByYear(read).map(([year, rows]) => (
              <div key={year}>
                <h3 className="mb-3 text-sm text-muted tabular-nums">{year}</h3>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {rows.map((book) => (
                    <li key={book.id}>
                      <BookCard book={book} admin={admin} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {want.length > 0 ? (
        <section aria-labelledby="want-heading" className="mt-16">
          <h2 id="want-heading" className="mb-5 text-lg font-semibold">
            읽고 싶은 책
            <span className="ml-2 text-sm font-normal text-muted tabular-nums">
              {want.length}
            </span>
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {want.map((book) => (
              <li key={book.id}>
                <BookCard book={book} admin={admin} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
