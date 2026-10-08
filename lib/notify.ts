import { site } from "@/lib/site";

/**
 * 알림을 받을 봇 목록. 봇이 여럿이면 같은 내용을 각각 보낸다.
 *
 * 두 번째 봇은 선택이다. 값이 없으면 첫 번째로만 보낸다.
 * 봇마다 토큰과 대화방 번호가 따로다 — 같은 사람이라도 봇이 다르면
 * 대화방 번호가 다르다.
 */
function targets() {
  const pairs = [
    [process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID],
    [process.env.TELEGRAM_BOT_TOKEN_2, process.env.TELEGRAM_CHAT_ID_2],
  ];
  return pairs.filter((p): p is [string, string] => Boolean(p[0] && p[1]));
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
 *
 * 한 봇이 실패해도 나머지는 보낸다. allSettled 를 쓰는 이유다.
 */
export async function notifyTelegram(text: string) {
  const list = targets();
  if (list.length === 0) return;
  await Promise.allSettled(list.map(([t, c]) => send(t, c, text)));
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
