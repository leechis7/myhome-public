"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { parseDay } from "@/lib/my-space/diary-calendar";
import { parseTime, seoulTime, withTimeDay } from "@/lib/my-space/todo-dates";
import { todayInSeoul } from "@/lib/profile/resume-sections";
import { classify } from "@/lib/telegram/classify";
import { siteConfig, todoAiPrompt } from "@/lib/site/settings";
import {
  addTodo,
  clearDoneTodos,
  removeTodo,
  setTodoDone,
  updateTodo,
} from "@/lib/my-space/todos";

/** 할 일(MYH-217) 화면의 일. 암호화는 lib/my-space/todos.ts 가 한다 */

const BACK = "/admin/todos";

function id(formData: FormData) {
  const n = Number(formData.get("id"));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function title(formData: FormData) {
  return String(formData.get("title") ?? "").trim();
}

/**
 * 기간(MYH-228)과 시각(MYH-245). 거꾸로 적은 것은 lib/my-space/todos.ts 가
 * 바로잡는다. 시각만 있고 날이 없으면 오늘이다
 */
function range(formData: FormData) {
  const read = withTimeDay(
    {
      startOn: parseDay(formData.get("startOn")),
      dueOn: parseDay(formData.get("dueOn")),
      startTime: parseTime(formData.get("startTime")),
      endTime: parseTime(formData.get("endTime")),
    },
    todayInSeoul(),
  );
  return {
    startOn: read.startOn,
    dueOn: read.dueOn,
    startTime: read.startTime ?? null,
    endTime: read.endTime ?? null,
  };
}

/**
 * 새 할 일(화면 · 떠 있는 창). 날짜 · 시각 칸을 하나도 고르지 않았으면 글에서
 * 읽는다 - 「내일 오후 7시 운동」 → 운동 · 내일 19:00. 텔레그램과 같은 길이라
 * Gemini 키가 있으면 Gemini 가 먼저, 없거나 실패하면 규칙(lib/telegram/classify.ts).
 * 칸을 골랐으면 그것을 쓰고 글은 그대로 둔다.
 */
async function readNew(text: string, formData: FormData) {
  const picked = range(formData);
  if (picked.startOn || picked.dueOn || picked.startTime || picked.endTime) {
    return { title: text, ...picked };
  }
  const key = (await siteConfig()).geminiApiKey;
  const template = (await todoAiPrompt()) ?? undefined;
  const read = await classify(text, todayInSeoul(), "todo", key, seoulTime(), template);
  if (read.kind !== "todo") return { title: text, ...picked };
  return {
    title: read.title || text,
    startOn: read.startOn,
    dueOn: read.dueOn,
    startTime: read.startTime,
    endTime: read.endTime,
  };
}

export async function addTodoAction(formData: FormData) {
  await requireAdmin();
  const text = title(formData);
  if (text) {
    const { title: name, ...when } = await readNew(text.slice(0, 8000), formData);
    await addTodo(name, when);
  }
  revalidatePath(BACK);
  redirect(BACK);
}

export async function saveTodoAction(formData: FormData) {
  await requireAdmin();
  const todo = id(formData);
  const text = title(formData);
  if (todo && text) {
    await updateTodo(todo, { title: text, ...range(formData) });
  }
  revalidatePath(BACK);
  redirect(BACK);
}

export async function toggleTodoAction(formData: FormData) {
  await requireAdmin();
  const todo = id(formData);
  if (todo) await setTodoDone(todo, formData.get("done") === "1");
  revalidatePath(BACK);
}

export async function deleteTodoAction(formData: FormData) {
  await requireAdmin();
  const todo = id(formData);
  if (todo) await removeTodo(todo);
  revalidatePath(BACK);
}

export async function clearDoneAction() {
  await requireAdmin();
  await clearDoneTodos();
  revalidatePath(BACK);
}

/**
 * 어느 화면에서나 띄우는 창의 「할 일」 탭(MYH-223). 화면을 옮기지 않는다.
 */
export async function quickTodoAction(
  _prev: { ok?: boolean; error?: string; todo?: boolean },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; todo?: boolean }> {
  await requireAdmin();
  const text = title(formData);
  if (!text) return { error: "할 일을 적어 주세요." };
  const { title: name, ...when } = await readNew(text.slice(0, 8000), formData);
  await addTodo(name, when);
  revalidatePath(BACK);
  return { ok: true };
}
