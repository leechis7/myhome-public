import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import KakaoSettings from "@/components/admin/settings/KakaoSettings";
import CalendarSettings from "@/components/admin/settings/CalendarSettings";
import ConfigFields from "@/components/admin/settings/ConfigFields";
import TelegramSettings from "@/components/admin/settings/TelegramSettings";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { getStoredSite } from "@/lib/site/info";
import { saveEditorAction } from "@/app/admin/settings/actions";
import { DEFAULT_EDITOR, EDITORS, EDITOR_LABELS, editorOf } from "@/lib/posts/editor-kinds";

export const metadata: Metadata = {
  title: "환경설정",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 환경설정(MYH-232). 관리 › 설정 › 환경설정. 글쓰기(기본 편집기)와 바깥 서비스.
 * 사이트 화면 안에 있다가 사이트 정보보다 길어져 따로 뺐다. .env 값을 화면에서도
 * 정하는 곳이다. 칸을 나눠 따로 저장한다.
 * 캘린더 · 메모 받기 · 카카오 키는 받은 것을 암호화해 두므로 열쇠가 있을 때만.
 */
export default async function AdminIntegrationsPage({
  searchParams,
}: PageProps<"/admin/settings">) {
  if (!(await isAdmin())) redirect("/admin");

  const [{ cal, tg, kk, out, at }, site] = await Promise.all([searchParams, getStoredSite()]);
  // 값 칸의 알림은 저장한 서비스 칸에만
  const outNotice = (anchor: string) =>
    at === anchor && typeof out === "string" ? out : undefined;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">환경설정</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        이 사이트를 어떻게 쓰는지와 바깥 서비스 연결입니다. 칸마다 따로 저장합니다.
        .env 에 값이 있으면 그것이 먼저이고, 여기서 넣은 뒤 .env 에서 빼면 여기 값을
        씁니다. 토큰 · 키는 암호화해서 두고 다시 보여 주지 않습니다.
      </p>
      <div className="max-w-xl">
        <Integration id="writing" title="글쓰기">
          {outNotice("writing") ? (
            <p role="status" className="mb-3 text-sm text-foreground/80">
              저장했습니다.
            </p>
          ) : null}
          <form action={saveEditorAction} aria-label="글쓰기" className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">기본 편집기</span>
              <select
                name="editor"
                defaultValue={editorOf(site?.editor)}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              >
                {EDITORS.map((e) => (
                  <option key={e} value={e}>
                    {EDITOR_LABELS[e]}
                    {e === DEFAULT_EDITOR ? " (기본)" : ""}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                블로그 · 짧은 글 · 비밀글 본문 칸의 「편집기」 탭에 처음 나오는 것. 탭의 ▾ 로
                그때그때 바꿀 수 있고, 바꾼 것은 그 브라우저가 기억합니다. 저장되는 것은 늘
                마크다운입니다
              </span>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              편집기 저장
            </button>
          </form>
        </Integration>

        <Integration id="telegram" title="텔레그램">
          <ConfigFields
            names={["telegramBotToken", "telegramChatId"]}
            anchor="telegram"
            label="텔레그램"
            notice={outNotice("telegram")}
          />
          {hasSecretKey() ? (
            <TelegramSettings notice={typeof tg === "string" ? tg : undefined} />
          ) : null}
        </Integration>

        <Integration id="google" title="구글">
          {hasSecretKey() ? (
            <CalendarSettings notice={typeof cal === "string" ? cal : undefined} />
          ) : null}
          <ConfigFields
            names={["googleSiteVerification"]}
            anchor="google"
            label="Search Console"
            notice={outNotice("google")}
          />
        </Integration>

        <Integration id="book-search" title="카카오">
          {hasSecretKey() ? (
            <KakaoSettings notice={typeof kk === "string" ? kk : undefined} />
          ) : (
            <p className="text-sm text-muted">
              키를 암호화할 열쇠(SECRETS_KEY)가 없어 화면에서 넣을 수 없습니다. .env 의
              KAKAO_REST_API_KEY 에 넣으세요.
            </p>
          )}
        </Integration>

        <Integration id="gemini" title="Gemini">
          <ConfigFields
            names={["geminiApiKey"]}
            anchor="gemini"
            label="Gemini"
            notice={outNotice("gemini")}
          />
        </Integration>

        <Integration id="stats" title="통계 · 감시">
          <ConfigFields
            names={["umamiWebsiteId", "monitoringDashboard"]}
            anchor="stats"
            label="통계 · 감시"
            notice={outNotice("stats")}
          />
        </Integration>
      </div>
    </Container>
  );
}

/** 환경설정의 서비스 칸 하나 */
function Integration({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="mt-6 scroll-mt-24 space-y-6 rounded-xl border border-border p-5"
    >
      <h3 id={`${id}-heading`} className="text-base font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
