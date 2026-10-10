import { site } from "@/lib/site";
import { siteConfig } from "@/lib/site/settings";

/**
 * 알림을 받을 봇. .env 나 관리 › 설정 › 환경설정(MYH-232). 토큰과 대화방 번호가
 * 다 있어야 보낸다. 두 번째 봇(TELEGRAM_BOT_TOKEN_2)은 쓰지 않아 뺐다(MYH-234).
 */
async function target() {
  const config = await siteConfig();
  return config.telegramBotToken && config.telegramChatId
    ? ([config.telegramBotToken, config.telegramChatId] as const)
    : null;
}

async function send(token: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      // 알림 때문에 응답이 늦어지지 않게 한다
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 알림은 부가 기능이다. 실패해도 흐름을 막지 않는다.
  }
}

/**
 * 텔레그램으로 알린다. 설정된 봇이 없으면 조용히 넘어간다.
 * 알림이 실패해도 원래 하던 일(댓글 저장 등)은 성공으로 둔다.
 */
export async function notifyTelegram(text: string) {
  const bot = await target();
  if (bot) await send(bot[0], bot[1], text);
}

export function commentMessage({
  author,
  body,
  postTitle,
  postId,
}: {
  author: string;
  body: string;
  postTitle: string;
  postId: number;
}) {
  const preview = body.length > 200 ? `${body.slice(0, 200)}…` : body;
  return [
    "💬 새 댓글",
    `글: ${postTitle}`,
    `이름: ${author}`,
    "",
    preview,
    "",
    `${site.url}/blog/${postId}#comments`,
  ].join("\n");
}

/** 방명록에 새 글이 왔을 때(MYH-191) */
export function guestbookMessage({
  author,
  body,
}: {
  author: string;
  body: string;
}) {
  const preview = body.length > 200 ? `${body.slice(0, 200)}…` : body;
  return [
    "📒 새 방명록",
    `이름: ${author}`,
    "",
    preview,
    "",
    `${site.url}/guestbook`,
  ].join("\n");
}
