import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";

/**
 * 없는 주소에는 제 이름을 준다.
 *
 * 전에는 루트 것을 그대로 써서 제목이 홈 제목(사이트 제목) 이었다. 지워진
 * 글 주소가 구글에 남아 있으면 검색 결과에 홈 제목을 단 404 가 뜬다
 * (MYH-162). 색인에 담기지도 않게 해 둔다.
 */
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container className="text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-3 text-foreground/60">
        주소가 바뀌었거나 삭제된 페이지일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-foreground/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/5"
      >
        홈으로 돌아가기
      </Link>
    </Container>
  );
}
