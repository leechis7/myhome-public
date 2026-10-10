import {
  connectTelegramAction,
  disconnectTelegramAction,
} from "@/app/admin/memos/actions";
import { currentWebhook, inboxDisabled, inboxReady, webhookUrl } from "@/lib/telegram/bot";

const button =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

const notices: Record<string, string> = {
  connected: "텔레그램을 연결했습니다. 봇에게 글을 보내 보세요.",
  disconnected: "텔레그램 연결을 풀었습니다.",
  failed: "텔레그램에 연결하지 못했습니다. 봇 토큰을 확인하세요.",
  elsewhere:
    "봇이 다른 주소에 연결돼 있습니다. 여기로 옮기려면 「다른 곳에서 옮겨 오기」 를 체크하세요.",
};

/**
 * 텔레그램으로 메모 · 할 일 받기(MYH-215 · MYH-217). 관리 › 설정 › 환경설정 ›
 * 텔레그램 안에 둔다 — 설정은 설정 자리에서 고친다. 메모 화면은 상태만 보여 준다.
 */
export default async function TelegramSettings({ notice }: { notice?: string }) {
  const ready = await inboxReady();
  const hook = ready ? await currentWebhook() : null;
  const here = webhookUrl();
  const connected = hook?.url === here;
  const message = notice ? notices[notice] : undefined;
  return (
    <div>
      <h4 className="text-sm font-medium">메모 · 할 일 받기</h4>
      {message ? (
        <p role="status" className="mt-3 text-sm text-foreground/80">
          {message}
        </p>
      ) : null}
      {inboxDisabled() ? (
        <p className="mt-3 text-sm text-muted">
          이 서버에서는 텔레그램을 받지 않습니다(TELEGRAM_INBOX=off). 같은 봇을 쓰는
          운영 서버에서 연결하세요 — 봇 하나에는 받는 곳이 하나뿐입니다.
        </p>
      ) : !ready ? (
        <p className="mt-3 text-sm text-muted">
          위의 봇 토큰 · 대화방 번호와 https 주소(SITE_URL)가
          있어야 받을 수 있습니다.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            알림이 오는 봇에게 「메모 …」 · 「… 메모해줘」 로 보내면 메모가, 「할일 …」 · 「… 할일에 추가」 · 「리마인드 …」 로 보내면 할 일이 됩니다. 「내일 우유 사기」 처럼 할 일로 보이는 글은 말 없이도 할 일입니다(「오늘 날씨 좋다」 는 아닙니다 - 날짜가 있고 말끝이 할 일 같을 때만). 그 밖의 글은 저장하지 않습니다.
            내 대화방에서 보낸 글만 받습니다.
          </p>
          <p className="mt-3 text-sm">
            {connected ? (
              <span className="text-emerald-700 dark:text-emerald-400">● 연결됨</span>
            ) : hook?.url ? (
              <span className="text-amber-700 dark:text-amber-400">
                ● 다른 곳에 연결됨: <code className="text-xs">{hook.url}</code>
              </span>
            ) : (
              <span className="text-muted">○ 연결 안 됨</span>
            )}
            {connected && hook?.lastError ? (
              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                마지막 오류: {hook.lastError}
              </span>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {connected ? (
              <form action={disconnectTelegramAction}>
                <button type="submit" className={button}>
                  연결 풀기
                </button>
              </form>
            ) : (
              <form action={connectTelegramAction} className="flex flex-wrap items-center gap-3">
                {hook?.url ? (
                  <label className="flex items-center gap-1.5 text-sm text-muted">
                    <input type="checkbox" name="takeOver" value="1" />
                    다른 곳에서 옮겨 오기
                  </label>
                ) : null}
                <button type="submit" className={primary}>
                  텔레그램 연결
                </button>
              </form>
            )}
            <span className="text-xs text-faint">받는 주소: {here}</span>
          </div>
        </>
      )}
    </div>
  );
}
