"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { configSources, saveConfig, type SettingName } from "@/lib/site/settings";
import { isEditorKind } from "@/lib/posts/editor-kinds";
import { isBookSource, moveSource, readSources, writeSources } from "@/lib/books/sources";
import { isKakaoKey } from "@/lib/books/lookup-key";
import { DEFAULT_SUMMARY_PROMPT } from "@/lib/books/summary";
import { hashToken, newToken } from "@/lib/api/auth";
import { isAiEngine, moveEngine, readEngines, writeEngines } from "@/lib/ai/engines";
import { DEFAULT_TODO_PROMPT } from "@/lib/telegram/classify";
import { DEFAULT_POST_PROMPT } from "@/lib/posts/ai-meta";
import { DEFAULT_DIARY_PROMPT } from "@/lib/my-space/diary-ai";
import { MORE_PROMPTS } from "@/lib/site/more-prompts";

/**
 * 환경설정(MYH-232). .env 에 값이 있는 칸은 화면에 없으니 보내지도 않는다.
 * 봇 토큰 · Gemini 키는 비워 보내면 그대로 두고, 「지우기」 를 체크해야 지운다 -
 * 다시 보여 주지 않는 값이라 빈 칸이 「지우기」 로 읽히면 안 된다.
 */
export async function saveOutsideAction(formData: FormData) {
  await requireAdmin();
  // 돌아갈 서비스 칸. 정해 둔 것만
  const at = String(formData.get("anchor") ?? "");
  const anchor = ["telegram", "google", "gemini", "openclaw", "ai", "stats", "calibre", "kakao", "book-search"].includes(at) ? at : "settings";
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
  const openclawUrl = take("openclawUrl", 300);
  if (openclawUrl && !/^https?:\/\/\S+$/.test(openclawUrl)) redirect(back("openclaw"));
  const openclawAgent = take("openclawAgent", 64);
  if (openclawAgent && !/^[\w-]+$/.test(openclawAgent)) redirect(back("openclaw"));
  const openclawChatAgent = take("openclawChatAgent", 64);
  if (openclawChatAgent && !/^[\w-]+$/.test(openclawChatAgent)) redirect(back("openclaw"));

  await saveConfig({
    telegramBotToken: token,
    telegramChatId: chatId,
    umamiWebsiteId: take("umamiWebsiteId", 80),
    googleSiteVerification: take("googleSiteVerification", 200),
    monitoringDashboard: dashboard,
    geminiApiKey: gemini,
    openclawUrl,
    openclawToken: secret("openclawToken", 500),
    openclawAgent,
    openclawChatAgent,
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
 * AI 엔진의 차례 · 사용(MYH-246). 책 찾기 출처와 같은 꼴 - 폼이 보낸 차례(order)와
 * 켠 것(on)을 저장하고, ↑ · ↓(move=엔진:up)로 한 칸씩 옮긴다.
 */
export async function saveAiEnginesAction(formData: FormData) {
  await requireAdmin();
  const on = new Set(formData.getAll("on").map(String));
  let list = readEngines(
    formData
      .getAll("order")
      .map(String)
      .map((e) => (on.has(e) ? e : `-${e}`))
      .join(","),
  );
  const [engine, dir] = String(formData.get("move") ?? "").split(":");
  if (isAiEngine(engine) && (dir === "up" || dir === "down")) list = moveEngine(list, engine, dir);
  await saveConfig({ aiEngines: writeEngines(list) });
  redirect("/admin/settings?out=saved&at=ai#ai");
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

/**
 * 글 요약 · 태그 프롬프트(MYH-249). 비우거나 「처음 값으로」 면 지운다 - 코드의
 * 처음 값(DEFAULT_POST_PROMPT)을 쓴다.
 */
export async function savePostPromptAction(formData: FormData) {
  await requireAdmin();
  const reset = formData.get("reset") === "1";
  const value = reset ? "" : String(formData.get("prompt") ?? "").trim().slice(0, 4000);
  const prompt = value && value !== DEFAULT_POST_PROMPT ? value : null;
  await saveConfig({ postAiPrompt: prompt });
  redirect("/admin/settings?out=saved&at=post-prompt#post-prompt");
}

/**
 * 일기 초안 프롬프트(MYH-250). 비우거나 「처음 값으로」 면 지운다 - 코드의
 * 처음 값(DEFAULT_DIARY_PROMPT)을 쓴다.
 */
export async function saveDiaryPromptAction(formData: FormData) {
  await requireAdmin();
  const reset = formData.get("reset") === "1";
  const value = reset ? "" : String(formData.get("prompt") ?? "").trim().slice(0, 4000);
  const prompt = value && value !== DEFAULT_DIARY_PROMPT ? value : null;
  await saveConfig({ diaryAiPrompt: prompt });
  redirect("/admin/settings?out=saved&at=diary-prompt#diary-prompt");
}

/** 그 밖의 프롬프트(책 MYH-251 · 스팸 MYH-252). 처음 값과 같거나 비우면 지운다 */
export async function saveMorePromptAction(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("name"));
  const name = key in MORE_PROMPTS ? (key as keyof typeof MORE_PROMPTS) : null;
  if (!name) redirect("/admin/settings");
  const { fallback, id: anchor } = MORE_PROMPTS[name];
  const reset = formData.get("reset") === "1";
  const value = reset ? "" : String(formData.get("prompt") ?? "").trim().slice(0, 4000);
  await saveConfig({ [name]: value && value !== fallback ? value : null });
  redirect(`/admin/settings?out=saved&at=${anchor}#${anchor}`);
}

/** 나만 보는 글을 AI 로 보내기(MYH-250). 끄면 지운다 - 처음 값이 끔이다 */
export async function saveDiaryAiAction(formData: FormData) {
  await requireAdmin();
  await saveConfig({ diaryAi: formData.get("on") === "1" ? "on" : null });
  redirect("/admin/settings?out=saved&at=diary-ai#diary-ai");
}

/**
 * 홈페이지 API 토큰(MYH-247). 새로 만들면 예전 것은 못 쓴다. 토큰은 돌려주어
 * 화면에 한 번만 보이고, 저장은 sha256 만 한다.
 */
export async function createApiTokenAction(
  _prev: { token: string | null },
): Promise<{ token: string | null }> {
  await requireAdmin();
  const token = newToken();
  await saveConfig({ apiTokenHash: hashToken(token) });
  return { token };
}

export async function deleteApiTokenAction() {
  await requireAdmin();
  await saveConfig({ apiTokenHash: null });
  redirect("/admin/settings?out=deleted&at=api#api");
}
