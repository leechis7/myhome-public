import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import AiChat from "@/components/admin/AiChat";
import { chatEngines } from "@/app/admin/chat/actions";
import { isAdmin } from "@/lib/security/auth";

export const metadata: Metadata = {
  title: "AI",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * AI 화면(MYH-274)의 첫 탭: 대화창을 화면 전체로. 떠 있는 「+」 창의 AI 탭과
 * 같은 것이다 - 그림 · 음성 · 비서 카드가 다 있고, 대화도 같은 탭 저장소라 이어진다.
 * 회의 · 음성 · 설정은 위의 탭(app/admin/ai/layout.tsx).
 */
export default async function AiPage() {
  if (!(await isAdmin())) redirect("/admin");
  const engines = await chatEngines().catch(() => []);
  return (
    <Container>
      <h1 className="sr-only">AI 대화</h1>
      {engines.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          쓸 AI 엔진이 없습니다.{" "}
          <Link href="/admin/settings#ai" className="underline underline-offset-4">
            환경설정 › AI 사용
          </Link>
          에서 오픈클로나 Gemini 를 켜 주세요.
        </p>
      ) : (
        <div>
          {/* 텔레그램처럼: 화면에 꽉 차고 대화만 스크롤(MYH-274) */}
          <AiChat fill engines={engines} />
        </div>
      )}
    </Container>
  );
}
