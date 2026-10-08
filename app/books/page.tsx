import type { Metadata } from "next";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import BookCard from "@/components/BookCard";
import AdminLinkButton from "@/components/admin/AdminLinkButton";
import { groupByYear, listShelf } from "@/lib/books";
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
 */
export default async function BooksPage() {
  const { reading, read } = await listShelf();

  return (
    <Container>
      <PageHeader
        title="읽는 책"
        description="요즘 읽는 책과 다 읽은 책입니다. 종이책 · 이북 · 오디오북을 가리지 않습니다."
        action={<AdminLinkButton href="/admin/books" label="고치기" />}
      />

      <section aria-labelledby="reading-heading">
        <h2 id="reading-heading" className="mb-5 text-lg font-semibold">
          지금 읽는 책
        </h2>
        {reading.length === 0 ? (
          <p className="text-sm text-muted">지금은 읽는 책이 없습니다.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {reading.map((book) => (
              <li key={book.id}>
                <BookCard book={book} large />
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
                      <BookCard book={book} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Container>
  );
}
