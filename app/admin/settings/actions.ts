"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { configSources, saveConfig, type SettingName } from "@/lib/site/settings";
import { isEditorKind } from "@/lib/posts/editor-kinds";
import { isBookSource, moveSource, readSources, writeSources } from "@/lib/books/sources";
import { isKakaoKey } from "@/lib/books/lookup-key";
import { DEFAULT_SUMMARY_PROMPT } from "@/lib/books/summary";
import { DEFAULT_TODO_PROMPT } from "@/lib/telegram/classify";

/**
 * 환경설정(MYH-232). .env 에 값이 있는 칸은 화면에 없으니 보내지도 않는다.
 * 봇 토큰 · Gemini 키는 비워 보내면 그대로 두고, 「지우기」 를 체크해야 지운다 -
 * 다시 보여 주지 않는 값이라 빈 칸이 「지우기」 로 읽히면 안 된다.
 */
export async function saveOutsideAction(formData: FormData) {
  await requireAdmin();
  // 돌아갈 서비스 칸. 정해 둔 것만
  const at = String(formData.get("anchor") ?? "");
  const anchor = ["telegram", "google", "gemini", "stats", "calibre", "kakao", "book-search"].includes(at) ? at : "settings";
  const back = (out: string) => `/admin/settings?out=${out}&at=${anchor}#${anchor}`;
  const sources = await configSources();
  const take = (name: SettingName, max: number) => {
    if (sources[name] === "env" || !formData.has(name)) return undefined;
    const value = String(formData.get(name) ?? "").trim();
    return value ? value.slice(0, max) : null;
  };

  const chatId = take("telegramChatId", 40);
  if (chatId && !/^-?\d{1,20}$/.test(chatId)) redirect(back("chat"));
  const dashboard = take("monitoringDashboard", 300);
  if (dashboard && !dashboard.startsWith("/")) redirect(back("dashboard"));

  // 다시 보여 주지 않는 값: 빈 칸은 「그대로」, 「지우기」 를 체크해야 지운다
  const secret = (name: SettingName, max: number) => {
    const value = take(name, max);
    if (value !== null) return value;
    return formData.get(`clear-${name}`) === "1" ? null : undefined;
  };
  const token = secret("telegramBotToken", 200);
  if (token && !/^\d{5,15}:[\w-]{20,}$/.test(token)) redirect(back("token"));
  const kakao = secret("kakaoRestKey", 100);
  if (kakao && !isKakaoKey(kakao)) redirect(back("kakao"));
  const calibreUrl = take("calibreUrl", 300);
  if (calibreUrl && !/^https?:\/\/\S+$/.test(calibreUrl)) redirect(back("calibre"));
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
    kakaoRestKey: kakao,
    calibreUrl,
    calibreUser: take("calibreUser", 100),
    calibrePassword: secret("calibrePassword", 200),
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/books");
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
  await saveConfig({ editor });
  revalidatePath("/admin", "layout");
  redirect("/admin/settings?out=saved&at=writing#writing");
}

/**
 * 책 찾기 출처의 차례 · 사용(MYH-226). 폼이 보낸 차례(order)와 켠 것(on)을
 * 저장한다. ↑ · ↓ 단추(move=출처:up)로 한 칸씩 옮긴다 - 옮기면서 켜고 끈 것도
 * 함께 저장된다.
 */
export async function saveBookSourcesAction(formData: FormData) {
  await requireAdmin();
  const on = new Set(formData.getAll("on").map(String));
  let list = readSources(
    formData
      .getAll("order")
      .map(String)
      .map((s) => (on.has(s) ? s : `-${s}`))
      .join(","),
  );
  const [source, dir] = String(formData.get("move") ?? "").split(":");
  if (isBookSource(source) && (dir === "up" || dir === "down")) list = moveSource(list, source, dir);
  await saveConfig({ bookSources: writeSources(list) });
  revalidatePath("/admin/books");
  redirect("/admin/settings?out=saved&at=book-search#book-search");
}

/**
 * 책 소개 요약 프롬프트(MYH-233). 비우거나 「처음 값으로」 면 지운다 - 코드의
 * 처음 값(DEFAULT_SUMMARY_PROMPT)을 쓴다.
 */
export async function saveSummaryPromptAction(formData: FormData) {
  await requireAdmin();
  const reset = formData.get("reset") === "1";
  const value = reset ? "" : String(formData.get("prompt") ?? "").trim().slice(0, 4000);
  const prompt = value && value !== DEFAULT_SUMMARY_PROMPT ? value : null;
  await saveConfig({ bookSummaryPrompt: prompt });
  redirect("/admin/settings?out=saved&at=summary#summary");
}

/**
 * 할 일 · 메모 판정 프롬프트(MYH-245). 비우거나 「처음 값으로」 면 지운다 - 코드의
 * 처음 값(DEFAULT_TODO_PROMPT)을 쓴다.
 */
export async function saveTodoPromptAction(formData: FormData) {
  await requireAdmin();
  const reset = formData.get("reset") === "1";
  const value = reset ? "" : String(formData.get("prompt") ?? "").trim().slice(0, 4000);
  const prompt = value && value !== DEFAULT_TODO_PROMPT ? value : null;
  await saveConfig({ todoAiPrompt: prompt });
  redirect("/admin/settings?out=saved&at=todo-prompt#todo-prompt");
}
