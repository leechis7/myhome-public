import { site } from "@/lib/site";
import { siteConfig } from "@/lib/site/settings";
import { webhookSecret } from "@/lib/telegram/inbox";

/**
 * 사이트 알림 봇(TELEGRAM_BOT_TOKEN 이나 설정 › 환경설정 의 봇 토큰)에 웹훅을 걸고 풀고, 받은 글에 답한다
 * (MYH-215). 알림 보내기는 lib/telegram/notify.ts 가 따로 한다.
 *
 * 봇 하나에는 웹훅이 하나뿐이다. 같은 봇을 쓰는 다른 서버(예: 개발기)에서
 * 걸면 그쪽으로 옮겨 가고 여기는 받지 못한다 — 그래서 거는 화면이 지금 걸린
 * 주소를 보여 주고, 다른 곳에 걸려 있으면 한 번 더 묻는다.
 */

/** 텔레그램이 넘겨줄 이 사이트의 주소 */
export function webhookUrl() {
  return `${site.url}/telegram/webhook`;
}

async function call(method: string, body: Record<string, unknown> = {}) {
  const { telegramBotToken: token } = await siteConfig();
  if (!token) return { ok: false, description: "텔레그램 봇 토큰이 없습니다." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: unknown;
    };
  } catch {
    return { ok: false, description: "텔레그램에 닿지 않습니다." };
  }
}

/**
 * 이 서버에서는 받지 않기로 했는가(TELEGRAM_INBOX=off). 같은 봇을 쓰는 개발기에서
 * 웹훅을 걸면 운영이 받지 못하게 된다 — 봇 하나에 웹훅은 하나뿐이다.
 */
export function inboxDisabled() {
  return process.env.TELEGRAM_INBOX?.trim().toLowerCase() === "off";
}

/** 받을 준비가 됐는가: 봇 토큰 · 내 대화방 번호 · https 주소, 끄지 않았을 때 */
export async function inboxReady() {
  if (inboxDisabled()) return false;
  const config = await siteConfig();
  return Boolean(
    config.telegramBotToken && config.telegramChatId && site.url.startsWith("https://"),
  );
}

/** 지금 걸린 웹훅 주소. 없으면 "" */
export async function currentWebhook() {
  const r = await call("getWebhookInfo");
  const info = (r.result ?? {}) as { url?: string; last_error_message?: string };
  return { ok: r.ok, url: info.url ?? "", lastError: info.last_error_message };
}

const UPDATES = ["message", "callback_query"];

/**
 * 이 사이트에 걸린 웹훅이 단추 누름까지 받는지 보고, 아니면 받게 다시 건다(MYH-259).
 * 예전 판(글만 받음)에서 건 웹훅을 앱이 뜰 때 고친다. 쌓인 글은 버리지 않는다
 */
export async function ensureWebhookUpdates() {
  if (!(await inboxReady())) return;
  const r = await call("getWebhookInfo");
  const info = (r.result ?? {}) as { url?: string; allowed_updates?: string[] };
  if (!r.ok || info.url !== webhookUrl()) return;
  if (UPDATES.every((u) => info.allowed_updates?.includes(u))) return;
  await call("setWebhook", {
    url: webhookUrl(),
    secret_token: webhookSecret(),
    allowed_updates: UPDATES,
  });
}

export async function connectWebhook() {
  return call("setWebhook", {
    url: webhookUrl(),
    secret_token: webhookSecret(),
    // 글과 단추 누름(미리 알림의 [완료] · [30분 뒤], MYH-259)
    allowed_updates: UPDATES,
    // 걸기 전에 쌓여 있던 글은 버린다 - 오래된 것이 한꺼번에 메모로 들어오지 않게
    drop_pending_updates: true,
  });
}

export async function disconnectWebhook() {
  return call("deleteWebhook");
}

/** 받은 글에 답한다. 실패해도 메모는 이미 저장됐다 */
export async function reply(chatId: string, text: string) {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

/** 단추를 누른 사람에게 잠깐 뜨는 말(MYH-259) */
export async function answerPress(id: string, text: string) {
  await call("answerCallbackQuery", { callback_query_id: id, text });
}

/** 보낸 알림의 단추를 바꾼다(누른 항목의 단추를 뺀다) */
export async function editButtons(chatId: string, messageId: number, replyMarkup: unknown) {
  await call("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

/** 텔레그램에 올라온 파일을 받는다(음성 메시지, MYH-269). 봇 API 는 20MB 까지 */
export async function downloadFile(fileId: string) {
  const r = await call("getFile", { file_id: fileId });
  const path = (r.result as { file_path?: string } | undefined)?.file_path;
  const { telegramBotToken: token } = await siteConfig();
  if (!r.ok || !path || !token) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${path}`, {
    signal: AbortSignal.timeout(30_000),
  });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

