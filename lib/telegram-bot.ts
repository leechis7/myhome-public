import { site } from "@/lib/site";
import { webhookSecret } from "@/lib/telegram-inbox";

/**
 * 사이트 알림 봇(TELEGRAM_BOT_TOKEN)에 웹훅을 걸고 풀고, 받은 글에 답한다
 * (MYH-215). 알림 보내기는 lib/notify.ts 가 따로 한다.
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
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN 이 없습니다." };
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
export function inboxReady() {
  if (inboxDisabled()) return false;
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_CHAT_ID &&
      site.url.startsWith("https://"),
  );
}

/** 지금 걸린 웹훅 주소. 없으면 "" */
export async function currentWebhook() {
  const r = await call("getWebhookInfo");
  const info = (r.result ?? {}) as { url?: string; last_error_message?: string };
  return { ok: r.ok, url: info.url ?? "", lastError: info.last_error_message };
}

export async function connectWebhook() {
  return call("setWebhook", {
    url: webhookUrl(),
    secret_token: webhookSecret(),
    allowed_updates: ["message"],
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
