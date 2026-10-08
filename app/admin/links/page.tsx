import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import LinkEditor from "@/components/admin/LinkEditor";
import LinkFilter from "@/components/admin/LinkFilter";
import LinkList from "@/components/admin/LinkList";
import { isAdmin } from "@/lib/auth";
import { LINK_CATEGORY, listCodes } from "@/lib/codes";
import { checkLinks, listLinks } from "@/lib/links";

export const metadata: Metadata = {
  title: "내 서비스",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const linkStyle =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

export default async function AdminLinksPage({
  searchParams,
}: PageProps<"/admin/links">) {
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  // 고치는 화면은 눌러서 들어간다. 평소에는 주소를 눌러 나가려고 여는 곳이다.
  const manage = params.manage === "1";
  const category =
    typeof params.category === "string"
      ? params.category.trim() || undefined
      : undefined;

  const [rows, codes] = await Promise.all([
    listLinks(),
    listCodes(LINK_CATEGORY, { all: true }),
  ]);
  const categories = [
    ...new Set(rows.map((r) => r.category?.trim()).filter(Boolean)),
  ] as string[];
  const shown = category
    ? rows.filter((r) => (r.category?.trim() || "") === category)
    : rows;
  // 주소에는 분류 이름을 남긴다(읽을 수 있게). 추가 칸을 미리 채우려고 번호로 푼다
  const categoryCode = codes.find((c) => c.label === category)?.code;
  // 보여줄 것만 물어본다. 좁혀 놓고 나머지까지 찔러 볼 이유가 없다.
  const status = await checkLinks(shown);

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (!manage) query.set("manage", "1");
  const toggleHref = query.size
    ? `/admin/links?${query}`
    : "/admin/links";

  return (
    <Container>
      <div className="flex items-center justify-between gap-4">
        {/* 위쪽 메뉴로 들어오는 화면이다. 소개·블로그·연락처와 제목 크기를
            맞춘다 (components/PageHeader.tsx 와 같은 값) */}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          내 서비스
        </h1>
        <Link href={toggleHref} className={linkStyle}>
          {manage ? "보기로" : "서비스 관리"}
        </Link>
      </div>

      <p className="mt-3 text-sm text-muted">
        관리자에게만 보입니다. 화면을 열 때마다 살아 있는지 한 번씩 물어봅니다.
        물어보는 쪽은 이 서버라, 집 공유기 주소처럼 바깥에서만 닿는 것은
        브라우저에서 열려도 &ldquo;닿지 않음&rdquo;으로 나올 수 있습니다.
      </p>

      {categories.length > 0 ? <LinkFilter categories={categories} /> : null}

      {manage ? (
        <LinkEditor
          rows={shown}
          status={status}
          codes={codes}
          categoryCode={categoryCode}
        />
      ) : (
        <LinkList rows={shown} status={status} />
      )}
    </Container>
  );
}
