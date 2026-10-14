import type { ChatImage, ChatTurn } from "@/lib/ai/openclaw";

/**
 * AI 대화창(MYH-248)이 보낸 대화를 엔진에 넘길 꼴로 고른다. 브라우저에서 온
 * 값이라 하나하나 본다.
 */

/** 넘겨받을 대화의 크기. 오래된 마디부터 버린다 */
const MAX_TURNS = 20;
const MAX_CHARS = 4000;

/**
 * 붙인 그림(MYH-248). 브라우저가 줄여 보내므로 한 장이 이보다 클 일은 없다.
 * 대화는 매번 통째로 가므로 그림은 최근 것만 남기고 앞의 것은 「그림 n장」 으로 바꾼다
 */
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const MAX_IMAGE_CHARS = 3_000_000;
export const MAX_IMAGES_PER_TURN = 4;
const MAX_IMAGES = 8;

/** 꼴이 맞는 그림만. 사람의 말에만 붙는다 */
function images(value: unknown): ChatImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (i): i is ChatImage =>
        typeof i === "object" &&
        i !== null &&
        IMAGE_TYPES.has(i.type) &&
        typeof i.data === "string" &&
        i.data.length > 0 &&
        i.data.length <= MAX_IMAGE_CHARS &&
        /^[A-Za-z0-9+/]+=*$/.test(i.data),
    )
    .slice(0, MAX_IMAGES_PER_TURN)
    .map(({ type, data }) => ({ type, data }));
}

/**
 * 받은 값을 대화로. 꼴이 틀린 마디는 버리고, 마지막은 사람이 한 말이어야 한다.
 * 그림만 보낸 말도 받는다
 */
export function turns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  const list: ChatTurn[] = value
    .filter(
      (t): t is ChatTurn =>
        typeof t === "object" &&
        t !== null &&
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string",
    )
    .map((t) => {
      const pics = t.role === "user" ? images(t.images) : [];
      const content = t.content.slice(0, MAX_CHARS);
      return pics.length ? { role: t.role, content, images: pics } : { role: t.role, content };
    })
    .filter((t) => t.content.trim() !== "" || t.images?.length)
    .slice(-MAX_TURNS);
  // 그림은 뒤에서부터 MAX_IMAGES 장만 넘긴다. 앞의 것은 보냈다는 말만 남긴다
  let room = MAX_IMAGES;
  for (let i = list.length - 1; i >= 0; i--) {
    const pics = list[i].images;
    if (!pics) continue;
    const keep = pics.slice(0, Math.max(room, 0));
    room -= pics.length;
    const dropped = pics.length - keep.length;
    if (dropped === 0) continue;
    const note = `(그림 ${dropped}장을 보냈다)`;
    list[i] = {
      role: list[i].role,
      content: list[i].content ? `${list[i].content}\n${note}` : note,
      ...(keep.length ? { images: keep } : {}),
    };
  }
  // 앞이 AI 의 말이면 떼어 낸다(엔진에 따라 사람 말로 시작해야 한다)
  while (list[0]?.role === "assistant") list.shift();
  return list.at(-1)?.role === "user" ? list : [];
}
