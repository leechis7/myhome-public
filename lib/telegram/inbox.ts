import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 텔레그램 봇으로 들어오는 글(MYH-215). 「할일 …」 은 할 일(MYH-217)로. 사이트 알림 봇(TELEGRAM_BOT_TOKEN)에
 * 웹훅을 걸어, 텔레그램이 /telegram/webhook 으로 넘겨주는 것을 받는다.
 *
 * 문은 둘이다.
 *   1. 비밀 토큰 — 웹훅을 걸 때 정해 두면 텔레그램이 요청마다
 *      X-Telegram-Bot-Api-Secret-Token 머리글에 실어 보낸다. 주소를 안
 *      남이 가짜 글을 넣지 못한다. SESSION_SECRET 에서 만든다 — 따로 정할
 *      값이 늘지 않고, 앱을 다시 띄워도 같다.
 *   2. 대화방 — TELEGRAM_CHAT_ID(내 대화방)에서 온 것만 받는다. 봇을 찾아
 *      말을 건 남의 글은 버린다.
 *
 * DB · 네트워크를 보지 않는 것만 여기 두고 따로 시험한다.
 */

/** 웹훅 비밀 토큰. 텔레그램이 받는 글자(A-Z a-z 0-9 _ -, 256자까지)다 */
export function webhookSecret(sessionSecret = process.env.SESSION_SECRET ?? "") {
  return createHmac("sha256", sessionSecret)
    .update("myhome-telegram-webhook-v1")
    .digest("hex");
}

/** 머리글의 토큰이 맞는가. 길이가 달라도 시간 차이를 드러내지 않는다 */
export function matchesSecret(given: string | null, expected = webhookSecret()) {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type InboxMessage =
  | { kind: "memo"; chatId: string; text: string }
  | { kind: "todo"; chatId: string; text: string }
  | { kind: "free"; chatId: string; text: string }
  | { kind: "not-text"; chatId: string };

/**
 * 할 일(MYH-217)로 볼 말. 앞에 붙이든 뒤에 붙이든 받는다(느슨하게).
 *
 *   앞: 할일 · 할 일 · 할일: · 할일에 추가 · 할 일 추가 · 리마인드 · 리마인더 ·
 *       todo · 투두 · 해야 할 일   (뒤에 공백이나 : · ： · - 가 온다)
 *   뒤: 「우유 사기 할일에 추가」 · 「… 할 일 추가해줘」 · 「… 리마인드」
 *       (뒤에는 「추가」 · 「리마인드」 처럼 분명한 말만)
 *
 * 낱말 중간(「할일이 많다」)이나 말만 있고 내용이 비면 할 일이 아니라 메모다.
 */
const TODO_WORD = String.raw`(?:할\s?일(?:에)?(?:\s?추가(?:해\s?줘|해)?)?|리마인드|리마인더|todo|투두|해야\s?할\s?일)`;
const TODO_HEAD = new RegExp(String.raw`^${TODO_WORD}(?:\s*[:：\-]\s*|\s+)([\s\S]+)$`, "i");
// 뒤에 붙는 말은 「추가」 · 「리마인드」 처럼 분명한 것만 — 「오늘 할 일」 같은
// 메모를 할 일로 잘못 넣지 않게
const TODO_TAIL_WORD = String.raw`(?:할\s?일(?:에)?\s?추가(?:해\s?줘|해)?|리마인드|리마인더)`;
const TODO_TAIL = new RegExp(String.raw`^([\s\S]+?)\s+${TODO_TAIL_WORD}[.!]?$`, "i");

export function asTodo(text: string) {
  const t = text.trim();
  const m = t.match(TODO_HEAD) ?? t.match(TODO_TAIL);
  const body = m?.[1].trim();
  // 「할일에 추가」 처럼 말만 있으면 정규식이 「추가」 를 내용으로 잡는다
  if (!body || /^추가(?:해\s?줘|해)?[.!]?$/.test(body)) return null;
  return body;
}

/**
 * 메모로 볼 말(MYH-215). 할 일처럼 말이 있어야 저장한다 — 그냥 쓴 글까지 다
 * 쌓이면 지저분해진다(사용자).
 *
 *   앞: 메모 · 메모: · 메모해 · 메모해줘 · 저장 · 저장: · 기록 · memo · note
 *   뒤: 「… 메모해(줘)」 · 「… 저장해(줘)」 · 「… 기록해(줘)」
 */
const MEMO_HEAD = /^(?:메모(?:해\s?줘|해)?|저장(?:해\s?줘|해)?|기록(?:해\s?줘|해)?|memo|note)(?:\s*[:：\-]\s*|\s+)([\s\S]+)$/i;
const MEMO_TAIL = /^([\s\S]+?)\s+(?:메모|저장|기록)(?:해\s?줘|해)[.!]?$/;

export function asMemo(text: string) {
  const t = text.trim();
  const m = t.match(MEMO_HEAD) ?? t.match(MEMO_TAIL);
  const body = m?.[1].trim();
  return body ? body : null;
}

/**
 * 텔레그램이 넘긴 update 에서 받을 글을 꺼낸다. 받지 않을 것이면 null.
 *
 * - 새 글(message)만 본다. 고친 글 · 채널 글 · 버튼 누름은 버린다
 * - 내 대화방이 아니면 버린다(답도 하지 않는다 - 봇이 있다는 것도 알리지 않게)
 * - /start 같은 명령은 메모가 아니다
 * - 「할일 …」 · 「메모 …」 같은 말이 없으면 free. 할 일인지는 웹훅이
 *   lib/my-space/todo-intent.ts 로 가른다(MYH-230 - 날짜와 말끝을 보는 규칙)
 * - 글자가 없으면(사진 · 스티커) 「글만 받는다」 고 답할 수 있게 알린다
 */
export function readUpdate(update: unknown, ownChatId: string | undefined) {
  if (!ownChatId || typeof update !== "object" || update === null) return null;
  const message = (update as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return null;
  const m = message as { chat?: { id?: unknown }; text?: unknown };
  const chatId = String(m.chat?.id ?? "");
  if (chatId !== String(ownChatId).trim()) return null;

  if (typeof m.text !== "string") return { kind: "not-text", chatId } as const;
  const text = m.text.trim();
  if (!text || text.startsWith("/")) return null;
  const todo = asTodo(text);
  if (todo) return { kind: "todo", chatId, text: todo } as const;
  const memo = asMemo(text);
  if (memo) return { kind: "memo", chatId, text: memo } as const;
  // 말이 없다. 할 일인지는 웹훅이 가른다
  return { kind: "free", chatId, text } as const;
}
