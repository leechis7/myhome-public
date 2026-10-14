import { revalidatePath } from "next/cache";
import { apiAuthorized, logApi, unauthorized } from "@/lib/api/auth";
import { parseDay } from "@/lib/my-space/diary-calendar";
import { parseTime, withTimeDay } from "@/lib/my-space/todo-dates";
import { readNewTodo } from "@/lib/my-space/todo-read";
import { addTodo, listTodos } from "@/lib/my-space/todos";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { hasSecretKey } from "@/lib/security/secret-crypto";

/**
 * 홈페이지 API · 할 일(MYH-247). 토큰(Authorization: Bearer …)이 있어야 한다.
 *
 *   GET   남은 할 일(마감이 이른 것부터)과 끝낸 것 최근 30개
 *   POST  { text } 또는 { title, startOn?, dueOn?, startTime?, endTime? }
 *         text 만 주면 날짜 · 시각을 글에서 읽는다(할 일 화면과 같다)
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  logApi(request, "list");
  const { open, done } = await listTodos();
  const view = (t: (typeof open)[number]) => ({
    id: t.id,
    title: t.title,
    startOn: t.startOn,
    dueOn: t.dueOn,
    startTime: t.startTime,
    endTime: t.endTime,
    source: t.source,
    doneAt: t.doneAt,
  });
  return Response.json({ open: open.map(view), done: done.map(view) });
}

export async function POST(request: Request) {
  if (!(await apiAuthorized(request))) return unauthorized();
  if (!hasSecretKey()) return Response.json({ error: "no SECRETS_KEY" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = String(body?.title ?? body?.text ?? "").trim().slice(0, 8000);
  if (!text) return Response.json({ error: "title 이나 text 가 필요합니다" }, { status: 400 });
  const picked = withTimeDay(
    {
      startOn: parseDay(body?.startOn),
      dueOn: parseDay(body?.dueOn),
      startTime: parseTime(body?.startTime),
      endTime: parseTime(body?.endTime),
    },
    todayInSeoul(),
  );
  const fields = {
    startOn: picked.startOn,
    dueOn: picked.dueOn,
    startTime: picked.startTime ?? null,
    endTime: picked.endTime ?? null,
  };
  // title 을 주면 그대로, text 만 주면 글에서 날짜 · 시각을 읽는다
  const read = body?.title ? { title: text, ...fields } : await readNewTodo(text, fields);
  const { title, ...when } = read;
  const id = await addTodo(title, { ...when, source: "api" });
  revalidatePath("/admin/todos");
  logApi(request, `add #${id}`);
  return Response.json({ id, title, ...when }, { status: 201 });
}
