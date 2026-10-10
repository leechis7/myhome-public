import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import ActionForm from "@/components/admin/ActionForm";
import { saveSite } from "@/app/admin/site/actions";
import { isAdmin } from "@/lib/security/auth";
import { DEFAULT_SITE, mergeSite, site } from "@/lib/site";
import { getStoredSite } from "@/lib/site/info";

export const metadata: Metadata = {
  title: "사이트",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const input =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";

/** 이름을 위에 적은 칸 하나. 아래에 어디에 쓰이는지 작게 적는다 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      <span className="mt-1 block text-xs text-muted">{hint}</span>
    </label>
  );
}

/**
 * 사이트 정보를 고치는 화면(MYH-169). 관리 › 설정 › 사이트.
 *
 * 칸을 비워 두면 그 자리는 보기 값(placeholder 로 보이는 것)이 채운다.
 * 사이트 주소는 여기 없다 — 배포와 묶인 값이라 환경변수다. 텔레그램 · 카카오 같은
 * 바깥 서비스는 관리 › 설정 › 환경설정(/admin/settings)에 있다.
 */
export default async function AdminSitePage() {
  if (!(await isAdmin())) redirect("/admin");

  const stored = await getStoredSite();
  const shown = mergeSite(stored);
  const host = new URL(site.url).host;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">사이트</h1>
      <p className="mt-3 text-sm text-muted">
        모든 화면의 제목 · 검색 결과 · 공유 카드 · RSS 에 쓰이는 정보입니다.
        비워 둔 칸은 흐리게 보이는 보기 값으로 채워집니다.
      </p>

      <ActionForm
        action={saveSite}
        submit="저장"
        className="mt-10 max-w-xl space-y-6"
        buttonClassName="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <Field
          label="이름"
          hint="머리글 왼쪽, 저작권 줄, 아이콘 글자(첫 글자), 글쓴이"
        >
          <input
            name="name"
            defaultValue={stored?.name ?? ""}
            placeholder={DEFAULT_SITE.name}
            maxLength={60}
            className={input}
          />
        </Field>
        <Field
          label="사이트 제목"
          hint="브라우저 탭과 검색 결과. 비우면 이름을 씁니다"
        >
          <input
            name="title"
            defaultValue={stored?.title ?? ""}
            placeholder={shown.name}
            maxLength={120}
            className={input}
          />
        </Field>
        <Field label="한 줄 소개" hint="공유 카드 아래 줄">
          <input
            name="tagline"
            defaultValue={stored?.tagline ?? ""}
            placeholder={DEFAULT_SITE.tagline}
            maxLength={120}
            className={input}
          />
        </Field>
        <Field label="설명" hint="검색 결과 설명과 RSS">
          <textarea
            name="description"
            defaultValue={stored?.description ?? ""}
            placeholder={DEFAULT_SITE.description}
            maxLength={300}
            rows={3}
            className={input}
          />
        </Field>
        <Field
          label="대표 메일"
          hint="구조화 데이터(JSON-LD). 비우면 싣지 않습니다"
        >
          <input
            name="email"
            type="email"
            defaultValue={stored?.email ?? ""}
            maxLength={200}
            className={input}
          />
        </Field>

        {/* 저장한 값으로 그린다. 고친 뒤 「저장」 하면 여기도 바뀐다 */}
        <section
          aria-label="검색 결과 미리보기"
          className="rounded-xl border border-border p-4"
        >
          <p className="mb-2 text-xs text-muted">
            검색 결과에는 이렇게 보입니다
          </p>
          <p className="text-base font-medium">{shown.title}</p>
          <p className="text-xs text-faint">{host}</p>
          <p className="mt-1 text-sm text-muted">{shown.description}</p>
        </section>
      </ActionForm>

    </Container>
  );
}
