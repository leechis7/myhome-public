import ApiTokenForm from "@/components/admin/settings/ApiTokenForm";
import { envSetting, siteConfig } from "@/lib/site/settings";

/**
 * 홈페이지 API(MYH-247). 오픈클로처럼 이 서버의 다른 프로그램이 토큰으로 할 일 ·
 * 메모를 넣고 읽는다. 토큰은 하나, 만들 때 한 번만 보인다.
 */
export default async function ApiSettings({ notice }: { notice?: string }) {
  const exists = Boolean((await siteConfig()).apiTokenHash);
  return (
    <div>
      <p className="text-xs text-muted">
        이 서버의 다른 프로그램(오픈클로 등)이 토큰을 들고 할 일 · 메모를 넣고 읽습니다. 요청에{" "}
        <code className="font-mono">Authorization: Bearer 토큰</code> 을 붙입니다. 할 수 있는 것:
      </p>
      <ul className="mt-2 space-y-0.5 font-mono text-xs text-muted">
        <li>GET · POST /api/v1/todos — 할 일 목록 · 넣기(text 만 주면 날짜 · 시각을 읽음)</li>
        <li>GET · POST /api/v1/memos — 메모 목록 · 넣기</li>
        <li>GET /api/v1/events — 일정 읽기(?from=날짜&days=7)</li>
        <li>POST /api/v1/drafts — 글 초안(임시저장만, 공개는 사람이)</li>
      </ul>
      <p className="mt-2 text-xs text-muted">지우기 · 공개는 할 수 없습니다. 받은 요청은 앱 기록에 한 줄씩 남습니다.</p>
      {notice === "deleted" ? (
        <p role="status" className="mt-2 text-sm text-foreground/80">
          토큰을 지웠습니다. 이제 API 는 모두 막힙니다.
        </p>
      ) : null}
      {envSetting("apiTokenHash") ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
          ● .env 의 MYHOME_API_TOKEN_SHA256 을 씁니다
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm">{exists ? "● 토큰이 있습니다" : "○ 토큰이 없습니다 - API 가 모두 막혀 있습니다"}</p>
          <ApiTokenForm exists={exists} />
        </>
      )}
    </div>
  );
}
