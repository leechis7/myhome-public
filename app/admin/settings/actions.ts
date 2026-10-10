"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { configSources, saveConfig, type ConfigName } from "@/lib/site/settings";
import { getDb, siteSettings } from "@/lib/db";
import { isEditorKind } from "@/lib/posts/editor-kinds";
import { invalidateSite } from "@/lib/site/info";

/**
 * 환경설정(MYH-232). .env 에 값이 있는 칸은 화면에 없으니 보내지도 않는다.
 * 봇 토큰 · Gemini 키는 비워 보내면 그대로 두고, 「지우기」 를 체크해야 지운다 -
 * 다시 보여 주지 않는 값이라 빈 칸이 「지우기」 로 읽히면 안 된다.
 */
export async function saveOutsideAction(formData: FormData) {
  await requireAdmin();
  // 돌아갈 서비스 칸. 정해 둔 것만
  const at = String(formData.get("anchor") ?? "");
  const anchor = ["telegram", "google", "gemini", "stats"].includes(at) ? at : "settings";
  const back = (out: string) => `/admin/settings?out=${out}&at=${anchor}#${anchor}`;
  const sources = await configSources();
  const take = (name: ConfigName, max: number) => {
    if (sources[name] === "env" || !formData.has(name)) return undefined;
    const value = String(formData.get(name) ?? "").trim();
    return value ? value.slice(0, max) : null;
  };

  const chatId = take("telegramChatId", 40);
  if (chatId && !/^-?\d{1,20}$/.test(chatId)) redirect(back("chat"));
  const dashboard = take("monitoringDashboard", 300);
  if (dashboard && !dashboard.startsWith("/")) redirect(back("dashboard"));

  // 다시 보여 주지 않는 값: 빈 칸은 「그대로」, 「지우기」 를 체크해야 지운다
  const secret = (name: ConfigName, max: number) => {
    const value = take(name, max);
    if (value !== null) return value;
    return formData.get(`clear-${name}`) === "1" ? null : undefined;
  };
  const token = secret("telegramBotToken", 200);
  if (token && !/^\d{5,15}:[\w-]{20,}$/.test(token)) redirect(back("token"));
  const gemini = secret("geminiApiKey", 200);
  // 「AIza…」 꼴과 새 꼴(「AQ.…」, 점이 든다)이 다 있다
  if (gemini && !/^[\w.-]{20,200}$/.test(gemini)) redirect(back("gemini"));

  await saveConfig({
    telegramBotToken: token,
    telegramChatId: chatId,
    umamiWebsiteId: take("umamiWebsiteId", 80),
    googleSiteVerification: take("googleSiteVerification", 200),
    monitoringDashboard: dashboard,
    geminiApiKey: gemini,
  });
  revalidatePath("/", "layout");
  redirect(back("saved"));
}

/**
 * 기본 편집기(MYH-118). 사이트 정보 화면에 있다가 환경설정으로 옮겼다 - 방문자에게
 * 보이는 사이트 정보가 아니라 이 사이트를 어떻게 쓰는지의 설정이다.
 */
export async function saveEditorAction(formData: FormData) {
  await requireAdmin();
  // 모르는 값이면 비운다 - 비우면 기본 편집기다
  const value = formData.get("editor");
  const editor = isEditorKind(value) ? String(value) : null;
  await getDb()
    .insert(siteSettings)
    .values({ id: 1, editor, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { editor, updatedAt: new Date() } });
  invalidateSite();
  revalidatePath("/admin", "layout");
  redirect("/admin/settings?out=saved&at=writing#writing");
}
