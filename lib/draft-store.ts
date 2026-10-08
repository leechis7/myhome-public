/**
 * 쓰던 글을 이 브라우저에 보관한다(MYH-193). 서버에는 가지 않는다.
 *
 * 여기에는 저장소를 만지지 않는 셈만 둔다 - 무엇이 보관할 만한지, 보관본이
 * 저장된 글과 같은지. 읽고 쓰는 것은 DraftKeeper 가 한다.
 *
 * 비밀글은 넣지 않는다. 암호화해서 저장하는 글을 브라우저에 평문으로 남기면 안 된다.
 */

/** 보관하는 칸. 폼의 name 과 같다 */
export type DraftFields = Record<string, string>;

export type Draft = {
  /** 보관한 시각(ms) */
  savedAt: number;
  fields: DraftFields;
  /**
   * 새 글에서 그림을 올려 생긴 초안 번호. 되살릴 때 이어받아야 저장이 그
   * 초안을 채운다 - 안 그러면 그림이 딸린 빈 글이 따로 남는다(MYH-145)
   */
  id?: number;
};

const PREFIX = "myhome:draft:";

/** 이만큼 지난 보관본은 버린다. 지운 글의 보관본이 쌓이지 않게 */
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 보관 이름. 새 글은 종류마다 하나다 */
export function draftKey(kind: "post" | "note", id: number | null) {
  return `${PREFIX}${kind}:${id ?? "new"}`;
}

export function isDraftKey(key: string) {
  return key.startsWith(PREFIX);
}

/**
 * 서버가 저장하는 모양으로 맞춘다. 앞뒤 빈칸은 서버가 떼고, 태그는 쉼표로
 * 나눠 다시 붙인다 - "a,b" 로 저장하면 화면에는 "a, b" 로 돌아온다.
 *
 * 줄바꿈도 맞춘다. 브라우저는 <textarea> 를 낼 때 줄바꿈을 \r\n 으로 보내
 * DB 에는 그렇게 담기는데, 칸에서 읽으면 \n 이다.
 */
function normalize(name: string, value: string) {
  value = value.replace(/\r\n?/g, "\n");
  if (name === "tags") {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(", ");
  }
  return value.trim();
}

/** 두 칸 묶음이 저장했을 때 같은 글이 되는가 */
export function sameFields(a: DraftFields, b: DraftFields) {
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const name of names) {
    if (normalize(name, a[name] ?? "") !== normalize(name, b[name] ?? "")) {
      return false;
    }
  }
  return true;
}

/** 저장소에서 읽은 글자를 보관본으로. 모양이 틀리거나 오래됐으면 없는 것으로 */
export function parseDraft(raw: string | null, now = Date.now()): Draft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Draft>;
    if (typeof value.savedAt !== "number") return null;
    if (now - value.savedAt > DRAFT_TTL_MS) return null;
    if (!value.fields || typeof value.fields !== "object") return null;
    const fields: DraftFields = {};
    for (const [k, v] of Object.entries(value.fields)) {
      if (typeof v === "string") fields[k] = v;
    }
    const id =
      typeof value.id === "number" && Number.isInteger(value.id)
        ? value.id
        : undefined;
    return { savedAt: value.savedAt, fields, ...(id ? { id } : {}) };
  } catch {
    return null;
  }
}

/** 9/30 18:12 */
export function formatDraftTime(ms: number) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }).formatToParts(ms);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}
