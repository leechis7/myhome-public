import { saveOutsideAction } from "@/app/admin/settings/actions";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import {
  CONFIG_FIELDS,
  configSources,
  siteConfig,
  type ConfigName,
} from "@/lib/site/settings";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const primary =
  "rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";

const notices: Record<string, string> = {
  saved: "저장했습니다.",
  chat: "대화방 번호는 숫자입니다(그룹이면 앞에 - 가 붙습니다).",
  token: "봇 토큰은 「123456789:AA…」 처럼 생겼습니다. @BotFather 가 준 것을 그대로 붙여 넣어 주세요.",
  dashboard: "대시보드 경로는 / 로 시작합니다(예: /grafana/d/myhome/myhome).",
  gemini: "Gemini API 키는 「AIza…」 나 「AQ.…」 처럼 생겼습니다. AI Studio 에서 받은 것을 그대로 붙여 넣어 주세요.",
};

type Row = {
  name: ConfigName;
  label: string;
  hint: string;
  placeholder: string;
};

const ROWS: Row[] = [
  {
    name: "telegramBotToken",
    label: "텔레그램 봇 토큰",
    hint: "댓글 · 방명록 알림과 텔레그램 메모가 쓰는 봇. @BotFather 가 준 토큰. 암호화해서 두고 다시 보여 주지 않습니다.",
    placeholder: "123456789:AA…",
  },
  {
    name: "telegramChatId",
    label: "텔레그램 대화방 번호",
    hint: "알림을 받을 내 대화방. 이 대화방에서 보낸 글만 메모로 받습니다.",
    placeholder: "123456789",
  },
  {
    name: "umamiWebsiteId",
    label: "umami 사이트 ID",
    hint: "방문 통계. 비우면 추적 스크립트가 나가지 않습니다.",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  },
  {
    name: "googleSiteVerification",
    label: "Search Console 소유 확인",
    hint: "HTML 태그 방식의 content 값.",
    placeholder: "abc123…",
  },
  {
    name: "geminiApiKey",
    label: "Gemini API 키",
    hint: "책 찾기로 고른 책의 소개를 한두 줄로 요약합니다. aistudio.google.com 에서 무료로 받습니다. 비우면 소개 앞부분을 줄여 넣습니다.",
    placeholder: "AIza… / AQ.…",
  },
  {
    name: "monitoringDashboard",
    label: "감시 대시보드 경로",
    hint: "관리 › 감시 에 끼울 Grafana 대시보드. 비우면 메뉴에서 빠집니다.",
    placeholder: "/grafana/d/myhome/myhome",
  },
];

/**
 * 환경설정의 값 칸들(MYH-232). 서비스 칸(텔레그램 · 구글 …)마다 자기 것만
 * 보여 주고 따로 저장한다 - 한 서비스를 고칠 때 다른 것을 건드리지 않게.
 * .env 에 값이 있는 칸은 그것이 먼저라 잠가 두고 어디서 오는지만 알린다.
 */
export default async function ConfigFields({
  names,
  anchor,
  label,
  notice,
}: {
  names: ConfigName[];
  /** 저장한 뒤 돌아올 서비스 칸(#telegram …). 알림도 이 칸에만 뜬다 */
  anchor: string;
  /** 폼 · 저장 단추 이름. 「텔레그램」 → 「텔레그램 저장」 */
  label: string;
  notice?: string;
}) {
  const [sources, config] = await Promise.all([configSources(), siteConfig()]);
  const canEncrypt = hasSecretKey();
  const message = notice ? notices[notice] : undefined;
  const rows = ROWS.filter((r) => names.includes(r.name));
  // .env 에서 다 오면 고칠 것이 없다 - 저장 단추를 두지 않는다
  const editable = rows.some((r) => sources[r.name] !== "env");
  return (
    <div>
      {message ? (
        <p role="status" className="mb-3 text-sm text-foreground/80">
          {message}
        </p>
      ) : null}
      <form action={saveOutsideAction} aria-label={label} className="space-y-4">
        <input type="hidden" name="anchor" value={anchor} />
        {rows.map((row) => {          const source = sources[row.name];
          const secret = CONFIG_FIELDS[row.name].secret;
          const env = CONFIG_FIELDS[row.name].env;
          return (
            <div key={row.name}>
              <label htmlFor={`out-${row.name}`} className="text-sm font-medium">
                {row.label}
              </label>
              <p className="mt-0.5 text-xs text-muted">{row.hint}</p>
              {source === "env" ? (
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  ● .env 의 {env} 를 씁니다
                </p>
              ) : secret && !canEncrypt ? (
                <p className="mt-1 text-xs text-muted">
                  암호화 열쇠(SECRETS_KEY)가 없어 화면에서 넣을 수 없습니다. .env 의 {env} 에
                  넣으세요.
                </p>
              ) : secret ? (
                <>
                  <input
                    id={`out-${row.name}`}
                    name={row.name}
                    type="password"
                    autoComplete="off"
                    placeholder={source === "db" ? "● 설정됨 · 바꾸려면 새로 넣기" : row.placeholder}
                    className={`${field} mt-1 font-mono`}
                  />
                  {source === "db" ? (
                    <label className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" name={`clear-${row.name}`} value="1" />
                      지우기
                    </label>
                  ) : null}
                </>
              ) : (
                <input
                  id={`out-${row.name}`}
                  name={row.name}
                  defaultValue={source === "db" ? (config[row.name] ?? "") : ""}
                  placeholder={row.placeholder}
                  className={`${field} mt-1 font-mono`}
                />
              )}
            </div>
          );
        })}
        {/* 「저장」 만 쓰면 위 사이트 정보의 단추와 이름이 겹친다 */}
        {editable ? (
          <button type="submit" className={primary}>
            {label} 저장
          </button>
        ) : null}
      </form>
    </div>
  );
}
