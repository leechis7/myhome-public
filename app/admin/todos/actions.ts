"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { parseDay } from "@/lib/my-space/diary-calendar";
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

/** 기간(MYH-228). 거꾸로 적은 것은 lib/my-space/todos.ts 가 바로잡는다 */
function range(formData: FormData) {
  return {
    startOn: parseDay(formData.get("startOn")),
    dueOn: parseDay(formData.get("dueOn")),
  };
}

export async function addTodoAction(formData: FormData) {
  await requireAdmin();
  const text = title(formData);
  if (text) await addTodo(text, range(formData));
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
  await addTodo(text.slice(0, 8000), range(formData));
  revalidatePath(BACK);
  return { ok: true };
}
