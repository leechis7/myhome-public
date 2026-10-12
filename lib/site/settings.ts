import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import { inArray } from "drizzle-orm";
import { getDb, settings } from "@/lib/db";
import { decryptText, encryptText, hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 환경설정(MYH-231 · MYH-232). .env 와 화면(관리 › 설정 › 환경설정) 양쪽에서
 * 정한다. **.env 에 값이 있으면 그것이 먼저**(화면은 잠근다), 없으면 화면에서
 * 넣은 것(settings 테이블, 키 하나에 줄 하나).
 *
 * 설정을 더할 때는 아래 SETTINGS 에 한 줄을 더한다 - 마이그레이션이 없다.
 * .env 이름을 더했으면 compose · .env.example · README 에도 적는다
 * (tests/unit/compose-env.test.ts 가 본다).
 *
 * 종류
 *   text    글 그대로
 *   secret  토큰 · 키처럼 남이 알면 안 되는 것. 암호화해 두고(SECRETS_KEY 가
 *           있어야 넣을 수 있다) 화면에 다시 보여 주지 않는다
 *   onoff   켜기/끄기. 'on' · 'off'(.env 는 on · true · 1 · yes 를 켬으로)
 *   list    쉼표로 이은 목록
 *
 * 처음 값은 읽는 쪽이 정한다(편집기는 editorOf, 출처는 readSources, 요약
 * 프롬프트는 DEFAULT_SUMMARY_PROMPT). 여기서는 값이 없으면 null 이다.
 *
 * DB 를 열고 푸는 열쇠(DATABASE_URL · SESSION_SECRET · SECRETS_KEY)와 서버마다
 * 다른 값(SITE_URL · PORT · TELEGRAM_INBOX)은 여기 없다 - .env 에만 둔다.
 */
export const SETTINGS = {
  /** 기본 글 편집기: milkdown · tiptap · toast */
  editor: { env: "DEFAULT_EDITOR", kind: "text" },
  telegramBotToken: { env: "TELEGRAM_BOT_TOKEN", kind: "secret" },
  telegramChatId: { env: "TELEGRAM_CHAT_ID", kind: "text" },
  /** 텔레그램 글을 AI 로 먼저 가르나(MYH-233). 처음은 끔 */
  telegramAi: { env: "TELEGRAM_AI", kind: "onoff" },
  /** 구글 캘린더 iCal 비공개 주소들. DB 에는 JSON, .env 는 「이름 https://…」 을 ; 로 */
  calendarIcal: { env: "GOOGLE_CALENDAR_ICAL", kind: "secret" },
  googleSiteVerification: { env: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", kind: "text" },
  umamiWebsiteId: { env: "UMAMI_WEBSITE_ID", kind: "text" },
  monitoringDashboard: { env: "MONITORING_DASHBOARD", kind: "text" },
  /** 책 찾기 출처의 차례 · 사용: kakao,-calibre,openlibrary (앞이 먼저, - 는 끔) */
  bookSources: { env: "BOOK_SOURCES", kind: "list" },
  kakaoRestKey: { env: "KAKAO_REST_API_KEY", kind: "secret" },
  calibreUrl: { env: "CALIBRE_URL", kind: "text" },
  calibreUser: { env: "CALIBRE_USER", kind: "text" },
  calibrePassword: { env: "CALIBRE_PASSWORD", kind: "secret" },
  geminiApiKey: { env: "GEMINI_API_KEY", kind: "secret" },
  /** 책 소개 요약 프롬프트. .env 는 줄바꿈을 \n 으로 */
  bookSummaryPrompt: { env: "BOOK_SUMMARY_PROMPT", kind: "text" },
} as const satisfies Record<string, { env: string; kind: "text" | "secret" | "onoff" | "list" }>;

export type SettingName = keyof typeof SETTINGS;
export type Settings = Record<SettingName, string | null>;
export type SettingSource = "env" | "db" | null;

const NAMES = Object.keys(SETTINGS) as SettingName[];

/** DB 의 키. 이름을 snake_case 로(옛 site_settings 컬럼 이름과 같다) */
export function settingKey(name: SettingName) {
  return name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

const BY_KEY = new Map(NAMES.map((n) => [settingKey(n), n]));

/** .env 에 적힌 값. 없으면 null */
export function envSetting(name: SettingName) {
  return process.env[SETTINGS[name].env]?.trim() || null;
}

/** 캐시 이름. 저장하면 비운다 */
const SETTINGS_TAG = "settings";

/**
 * 저장된 줄들(암호문 그대로). 레이아웃 · 통계가 모든 화면에서 부르므로 캐시를
 * 씌운다. psql 로 손댄 것은 한 시간이 지나면 새로 읽는다.
 */
const readRows = unstable_cache(
  async () => {
    const rows = await getDb().select({ key: settings.key, value: settings.value }).from(settings);
    return rows;
  },
  ["settings"],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

/**
 * 저장된 값(풀어서). 한 화면 안에서는 cache() 로 한 번만 푼다.
 * DB 에 닿지 못하면(빌드 · 첫 설치) 다 null - .env 만 본다.
 */
const readStored = cache(async (): Promise<Settings> => {
  const out = Object.fromEntries(NAMES.map((n) => [n, null])) as Settings;
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await readRows();
  } catch {
    return out;
  }
  for (const { key, value } of rows) {
    const name = BY_KEY.get(key);
    if (!name || !value) continue;
    if (SETTINGS[name].kind !== "secret") {
      out[name] = value;
    } else if (hasSecretKey()) {
      try {
        out[name] = decryptText(value);
      } catch {
        // 열쇠가 바뀌어 풀 수 없으면 없는 것으로 본다
      }
    }
  }
  return out;
});

/** 쓸 값들. .env 가 먼저 */
export async function siteConfig(): Promise<Settings> {
  const stored = await readStored();
  return Object.fromEntries(NAMES.map((n) => [n, envSetting(n) ?? stored[n]])) as Settings;
}

/** 화면에서 넣어 둔 값(.env 를 보지 않는다). 고치는 화면이 처음 값으로 쓴다 */
export async function storedSetting(name: SettingName) {
  return (await readStored())[name];
}

/** 값마다 어디서 왔나. 화면이 「.env 의 것을 씁니다」 를 가른다 */
export async function configSources(): Promise<Record<SettingName, SettingSource>> {
  const stored = await readStored();
  return Object.fromEntries(
    NAMES.map((n) => [n, envSetting(n) ? "env" : stored[n] ? "db" : null]),
  ) as Record<SettingName, SettingSource>;
}

/**
 * 화면에서 넣은 값을 저장한다. undefined 는 그대로 두고 null · 빈 글은 지운다.
 * 비밀인 값은 암호화한다 - 열쇠가 없으면 넣지 못한다(던진다). 서버 액션에서
 * 부른다(캐시를 비운다).
 */
export async function saveConfig(values: Partial<Settings>) {
  const put: { key: string; value: string }[] = [];
  const drop: string[] = [];
  for (const name of NAMES) {
    const value = values[name];
    if (value === undefined) continue;
    if (!value) {
      drop.push(settingKey(name));
    } else if (SETTINGS[name].kind === "secret") {
      if (!hasSecretKey()) throw new Error("SECRETS_KEY 가 없어 암호화할 수 없다");
      put.push({ key: settingKey(name), value: encryptText(value) });
    } else {
      put.push({ key: settingKey(name), value });
    }
  }
  if (put.length === 0 && drop.length === 0) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const row of put) {
      await tx
        .insert(settings)
        .values(row)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: row.value, updatedAt: new Date() },
        });
    }
    if (drop.length > 0) await tx.delete(settings).where(inArray(settings.key, drop));
  });
  updateTag(SETTINGS_TAG);
}

/** 켜기/끄기 값을 읽는다 */
export function isOn(value: string | null) {
  return value !== null && /^(on|true|1|yes)$/i.test(value);
}

/** 텔레그램 글을 AI 로 먼저 가르나(MYH-233). .env 의 TELEGRAM_AI 가 먼저 */
export async function telegramAiOn() {
  return isOn((await siteConfig()).telegramAi);
}

/**
 * 책 소개 요약 프롬프트(MYH-233). .env 의 BOOK_SUMMARY_PROMPT(줄바꿈은 \n) →
 * 화면에서 넣은 것 → 없으면 null(코드의 처음 값을 쓴다).
 */
export async function summaryPrompt() {
  const env = envSetting("bookSummaryPrompt");
  if (env) return env.replaceAll("\\n", "\n");
  return (await storedSetting("bookSummaryPrompt"))?.trim() || null;
}
