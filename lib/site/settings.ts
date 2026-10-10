import { cache } from "react";
import { getDb, siteSettings } from "@/lib/db";
import { decryptText, encryptText, hasSecretKey } from "@/lib/security/secret-crypto";
import { getCachedSiteRow, invalidateSite } from "@/lib/site/info";

/**
 * .env 와 화면(관리 › 설정 › 환경설정) 양쪽에서 정하는 환경설정 설정(MYH-231 ·
 * MYH-232). **.env 에 값이 있으면 그것이 먼저**, 없으면 화면에서 넣은 것.
 *
 * DB 를 열고 푸는 열쇠(DATABASE_URL · SESSION_SECRET · SECRETS_KEY)와 서버마다
 * 다른 값(SITE_URL · PORT · TELEGRAM_INBOX)은 여기 없다 - .env 에만 둔다.
 *
 * 토큰 · 키처럼 남이 알면 안 되는 것은 암호화해 두고(SECRETS_KEY 가 있어야
 * 넣을 수 있다) 화면에 다시 보여 주지 않는다.
 */

export const CONFIG_FIELDS = {
  telegramBotToken: { env: "TELEGRAM_BOT_TOKEN", secret: true },
  telegramChatId: { env: "TELEGRAM_CHAT_ID", secret: false },
  umamiWebsiteId: { env: "UMAMI_WEBSITE_ID", secret: false },
  googleSiteVerification: { env: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", secret: false },
  monitoringDashboard: { env: "MONITORING_DASHBOARD", secret: false },
  kakaoRestKey: { env: "KAKAO_REST_API_KEY", secret: true },
  geminiApiKey: { env: "GEMINI_API_KEY", secret: true },
} as const;

export type ConfigName = keyof typeof CONFIG_FIELDS;
export type SiteConfig = Record<ConfigName, string | null>;
export type ConfigSource = "env" | "db" | null;

const NAMES = Object.keys(CONFIG_FIELDS) as ConfigName[];

function fromEnv(name: ConfigName) {
  return process.env[CONFIG_FIELDS[name].env]?.trim() || null;
}

/**
 * 저장된 값(풀어서). 사이트 정보와 같은 캐시(lib/site/info.ts)를 쓴다 - 레이아웃 ·
 * 통계가 모든 화면에서 부르므로 매번 DB 에 가지 않는다. 저장하면 saveConfig 가
 * 캐시를 비운다. 한 화면 안에서는 cache() 로 한 번만 푼다.
 */
const readStored = cache(async (): Promise<SiteConfig> => {
  const empty = Object.fromEntries(NAMES.map((n) => [n, null])) as SiteConfig;
  // DB 가 아직 없을 때(빌드 · 첫 설치)는 null - .env 만 본다
  const row = await getCachedSiteRow();
  if (!row) return empty;
  for (const name of NAMES) {
    const value = row[name] ?? null;
    if (!value) continue;
    if (!CONFIG_FIELDS[name].secret) {
      empty[name] = value;
    } else if (hasSecretKey()) {
      try {
        empty[name] = decryptText(value);
      } catch {
        // 열쇠가 바뀌어 풀 수 없으면 없는 것으로 본다
      }
    }
  }
  return empty;
});

/** 쓸 값들. .env 가 먼저 */
export async function siteConfig(): Promise<SiteConfig> {
  const stored = await readStored();
  return Object.fromEntries(
    NAMES.map((n) => [n, fromEnv(n) ?? stored[n]]),
  ) as SiteConfig;
}

/** 값마다 어디서 왔나. 화면이 「.env 의 것을 씁니다」 를 가른다 */
export async function configSources(): Promise<Record<ConfigName, ConfigSource>> {
  const stored = await readStored();
  return Object.fromEntries(
    NAMES.map((n) => [n, fromEnv(n) ? "env" : stored[n] ? "db" : null]),
  ) as Record<ConfigName, ConfigSource>;
}

/**
 * 화면에서 넣은 값을 저장한다. undefined 는 그대로 두고 null 은 지운다.
 * 비밀인 값은 암호화한다 - 열쇠가 없으면 넣지 못한다(던진다).
 */
export async function saveConfig(values: Partial<SiteConfig>) {
  const set: Partial<Record<ConfigName, string | null>> = {};
  for (const name of NAMES) {
    const value = values[name];
    if (value === undefined) continue;
    if (value && CONFIG_FIELDS[name].secret) {
      if (!hasSecretKey()) throw new Error("SECRETS_KEY 가 없어 암호화할 수 없다");
      set[name] = encryptText(value);
    } else {
      set[name] = value || null;
    }
  }
  if (Object.keys(set).length === 0) return;
  await getDb()
    .insert(siteSettings)
    .values({ id: 1, ...set })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { ...set, updatedAt: new Date() },
    });
  invalidateSite();
}
