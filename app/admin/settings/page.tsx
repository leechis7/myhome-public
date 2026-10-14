import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import AiEngineSettings from "@/components/admin/settings/AiEngineSettings";
import ApiSettings from "@/components/admin/settings/ApiSettings";
import BookSourceSettings from "@/components/admin/settings/BookSourceSettings";
import SummaryPromptSettings from "@/components/admin/settings/SummaryPromptSettings";
import CalendarSettings from "@/components/admin/settings/CalendarSettings";
import ConfigFields from "@/components/admin/settings/ConfigFields";
import TelegramSettings from "@/components/admin/settings/TelegramSettings";
import TodoPromptSettings from "@/components/admin/settings/TodoPromptSettings";
import PostPromptSettings from "@/components/admin/settings/PostPromptSettings";
import DiaryPromptSettings from "@/components/admin/settings/DiaryPromptSettings";
import DiaryAiSettings from "@/components/admin/settings/DiaryAiSettings";
import MorePromptSettings from "@/components/admin/settings/MorePromptSettings";
import { isAdmin } from "@/lib/security/auth";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { envSetting, storedSetting } from "@/lib/site/settings";
import { saveEditorAction } from "@/app/admin/settings/actions";
import { DEFAULT_EDITOR, EDITORS, EDITOR_LABELS, editorOf } from "@/lib/posts/editor-kinds";
import OpenHashDetails from "@/components/admin/OpenHashDetails";

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

  const [{ cal, tg, out, at }, storedEditor] = await Promise.all([searchParams, storedSetting("editor")]);
  // 값 칸의 알림은 저장한 서비스 칸에만
  const outNotice = (anchor: string) =>
    at === anchor && typeof out === "string" ? out : undefined;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">환경설정</h1>
      <p className="mt-3 text-sm text-muted">
        이 사이트를 어떻게 쓰는지와 바깥 서비스 연결입니다. 칸마다 따로 저장합니다.
        .env 에 값이 있으면 그것이 먼저이고, 여기서 넣은 뒤 .env 에서 빼면 여기 값을
        씁니다. 토큰 · 키는 암호화해서 두고 다시 보여 주지 않습니다.
      </p>
      <OpenHashDetails />
      <div>
        <Integration id="writing" title="글쓰기">
          {outNotice("writing") ? (
            <p role="status" className="mb-3 text-sm text-foreground/80">
              저장했습니다.
            </p>
          ) : null}
          {envSetting("editor") ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              ● .env 의 DEFAULT_EDITOR 를 씁니다 · {EDITOR_LABELS[editorOf(envSetting("editor"))]}
            </p>
          ) : (
          <form action={saveEditorAction} aria-label="글쓰기" className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">기본 편집기</span>
              <select
                name="editor"
                defaultValue={editorOf(storedEditor)}
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
          )}
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

        {/* 책 찾기(MYH-226): 출처의 차례 · 사용, 카카오 키, 내 Calibre 서재 */}
        <Integration id="book-search" title="책 찾기">
          <BookSourceSettings notice={outNotice("book-search")} />
          <div id="kakao" className="scroll-mt-24">
            <h4 className="mb-2 text-sm font-medium">카카오</h4>
            <ConfigFields
              names={["kakaoRestKey"]}
              anchor="kakao"
              label="카카오 키"
              notice={outNotice("kakao")}
            />
          </div>
          <div id="calibre" className="scroll-mt-24">
            <h4 className="mb-2 text-sm font-medium">내 서재 (Calibre)</h4>
            <ConfigFields
              names={["calibreUrl", "calibreUser", "calibrePassword"]}
              anchor="calibre"
              label="Calibre"
              notice={outNotice("calibre")}
            />
          </div>
        </Integration>

        {/* AI 엔진(MYH-246): 쓰는 엔진의 차례 · 사용, 엔진마다 접속 값 */}
        <Integration id="ai" title="AI 사용">
          <AiEngineSettings notice={outNotice("ai")} />
          <div id="openclaw" className="scroll-mt-24">
            <h4 className="mb-2 text-sm font-medium">오픈클로</h4>
            <ConfigFields
              names={["openclawUrl", "openclawToken", "openclawAgent", "openclawChatAgent"]}
              anchor="openclaw"
              label="오픈클로"
              notice={outNotice("openclaw")}
            />
          </div>
          <div id="gemini" className="scroll-mt-24">
            <h4 className="mb-2 text-sm font-medium">Gemini</h4>
            <ConfigFields
              names={["geminiApiKey"]}
              anchor="gemini"
              label="Gemini"
              notice={outNotice("gemini")}
            />
          </div>
          <DiaryAiSettings notice={outNotice("diary-ai")} />
        </Integration>

        {/* AI 엔진에게 보내는 글들. 엔진은 위 「AI 사용」 칸에 */}
        <Integration id="prompts" title="AI 프롬프트">
          <TodoPromptSettings notice={outNotice("todo-prompt")} />
          <SummaryPromptSettings notice={outNotice("summary")} />
          <PostPromptSettings notice={outNotice("post-prompt")} />
          <DiaryPromptSettings notice={outNotice("diary-prompt")} />
          <MorePromptSettings notice={outNotice} />
        </Integration>

        <Integration id="api" title="홈페이지 API">
          <ApiSettings notice={outNotice("api")} />
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
      className="mt-6 scroll-mt-24 rounded-xl border border-border"
    >
      {/* 항목이 많아 화면이 길다. 접어 두고, #주소로 오면(저장 뒤 포함) 편다 */}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between gap-2 p-5">
          <h3 id={`${id}-heading`} className="text-base font-semibold">
            {title}
          </h3>
          <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="space-y-6 px-5 pb-5">{children}</div>
      </details>
    </section>
  );
}
