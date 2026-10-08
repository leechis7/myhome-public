import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import BookEditor from "@/components/admin/BookEditor";
import { isAdmin } from "@/lib/auth";
import { listBooks } from "@/lib/books";
import { BOOK_KIND, listCodes } from "@/lib/codes";

export const metadata: Metadata = {
  title: "책 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  required: "책 제목과 지은이를 적어 주세요.",
  kind: "고른 종류가 없습니다. 코드 화면에서 지웠는지 확인하세요.",
  url: "링크는 http:// 나 https:// 로 시작해야 합니다.",
  cover: "표지는 그림 파일(90MB 까지)만 올릴 수 있습니다.",
};

/** 읽는 책 관리(MYH-190). 공개 화면은 /books 다 */
export default async function AdminBooksPage({
  searchParams,
}: PageProps<"/admin/books">) {
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  const error = typeof params.be === "string" ? errors[params.be] : undefined;
  const [rows, kinds] = await Promise.all([
    listBooks(),
    listCodes(BOOK_KIND, { all: true }),
  ]);

  return (
    <Container>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="text-2xl font-semibold tracking-tight">책 관리</h1>
        <Link
          href="/books"
          className="text-sm text-muted transition-colors hover:text-foreground"
        >
          공개 화면에서 보기 ↗
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted">
        읽는 중인 책은 위에 크게, 다 읽은 책은 아래에 연도별로 나옵니다.
      </p>
      {error ? (
        <p role="alert" className="mt-6 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div id="books" className="mt-8">
        <BookEditor rows={rows} kinds={kinds} />
      </div>
    </Container>
  );
}
