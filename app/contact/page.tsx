import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import Link from "next/link";
import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";
import ContactRows from "@/components/ContactRows";
import PageHeader from "@/components/PageHeader";
import { eq } from "drizzle-orm";
import { getDb, profile } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
  title: "연락처",
  description: "연락은 아래 폼이나 이메일로 주세요.",
  path: "/contact",
});
}

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  required: "이름과 내용을 모두 적어주세요.",
  length: "글자 수 제한을 넘었습니다.",
  rate: "잠시 후에 다시 보내주세요.",
};

export default async function ContactPage({
  searchParams,
}: PageProps<"/contact">) {
  const params = await searchParams;
  // 연락 수단은 DB 에 있다. 소개 화면과 같은 값을 보여준다.
  const [me] = await getDb()
    .select({
      email: profile.email,
      workEmail: profile.workEmail,
      phone: profile.phone,
      homepageUrl: profile.homepageUrl,
      githubUrl: profile.githubUrl,
    })
    .from(profile)
    .where(eq(profile.id, 1))
    .limit(1);
  const code = typeof params.e === "string" ? params.e : undefined;
  const sent = params.sent === "1";

  return (
    <Container>
      <PageHeader
        title="연락처"
        description="아래로 보내주시면 확인하는 대로 답장드립니다."
      />

      {/* 소개는 위쪽 메뉴에서 뺐다. 방문자가 늘 누르는 것이 아니고, 누가
          보냈는지 궁금할 때 여기서 들어가는 편이 자연스럽다. */}
      <Link
        href="/about"
        className="mb-10 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm transition-colors hover:bg-foreground/5"
      >
        소개 보기
        <span aria-hidden="true">→</span>
      </Link>

      {sent ? (
        <p className="mb-8 rounded-lg border border-border px-4 py-3 text-sm text-foreground/70">
          보냈습니다. 읽고 답장드리겠습니다.
        </p>
      ) : null}

      <ContactForm error={code ? errors[code] : undefined} />

      <ContactRows
        me={me}
        className="mt-14 space-y-5 border-t border-border pt-8"
      />
    </Container>
  );
}
