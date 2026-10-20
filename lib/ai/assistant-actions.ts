/**
 * AI 비서가 답 끝에 붙이는 일(MYH-260). AI 는 직접 넣지 못하고, 답에
 * ```myhome 블록으로 「이렇게 넣으면 된다」 를 적는다. 대화창이 그것을 단추로
 * 보여 주고, 사람이 누르면 그때 서버가 넣는다. 브라우저 · 서버가 함께 쓰므로
 * DB · 네트워크를 보지 않는다.
 */

export type AssistantAction =
  | {
      action: "todo";
      title: string;
      startOn: string | null;
      dueOn: string | null;
      startTime: string | null;
      endTime: string | null;
    }
  | { action: "memo"; text: string }
  | { action: "done"; id: number; title: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

function day(v: unknown) {
  return typeof v === "string" && DAY.test(v.trim()) ? v.trim() : null;
}

function time(v: unknown) {
  if (typeof v !== "string" || !TIME.test(v.trim())) return null;
  const [h, m] = v.trim().split(":");
  return `${h.padStart(2, "0")}:${m}`;
}

function text(v: unknown, max: number) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

/** 블록 하나를 읽는다. 꼴이 틀리면 null */
export function readAction(value: unknown): AssistantAction | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.action === "todo") {
    const title = text(v.title, 300);
    if (!title) return null;
    return {
      action: "todo",
      title,
      startOn: day(v.startOn),
      dueOn: day(v.dueOn),
      startTime: time(v.startTime),
      endTime: time(v.endTime),
    };
  }
  if (v.action === "memo") {
    const body = text(v.text, 4000);
    return body ? { action: "memo", text: body } : null;
  }
  if (v.action === "done") {
    const id = Number(v.id);
    return Number.isInteger(id) && id > 0
      ? { action: "done", id, title: text(v.title, 300) ?? `할 일 ${id}` }
      : null;
  }
  return null;
}

const BLOCK = /```myhome\s*\n([\s\S]*?)```/g;

/**
 * 답에서 ```myhome 블록을 떼어 낸다. 블록 하나에 JSON 하나, 또는 JSON 배열.
 * 읽을 수 없는 블록은 버린다(글에서는 뺀다)
 */
export function splitActions(reply: string) {
  const actions: AssistantAction[] = [];
  const rest = reply.replace(BLOCK, (_, body: string) => {
    try {
      const parsed: unknown = JSON.parse(body.trim());
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        const a = readAction(item);
        if (a) actions.push(a);
      }
    } catch {
      // 읽을 수 없는 블록은 버린다
    }
    return "";
  });
  return { text: rest.trim(), actions: actions.slice(0, 10) };
}

/** 단추 위에 보일 한 줄 */
export function actionLabel(a: AssistantAction) {
  if (a.action === "memo") return `📝 메모 · ${a.text.length > 60 ? `${a.text.slice(0, 60)}…` : a.text}`;
  if (a.action === "done") return `☑ 끝냄 · ${a.title}`;
  const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8))}`;
  const days = [a.startOn, a.dueOn].filter((d): d is string => d !== null);
  const when = [
    days.length === 2 && days[0] !== days[1] ? `${md(days[0])} ~ ${md(days[1])}` : days[0] ? md(days[0]) : "",
    a.startTime ? (a.endTime ? `${a.startTime}~${a.endTime}` : a.startTime) : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `✅ 할 일 · ${a.title}${when ? ` · ${when}` : ""}`;
}
