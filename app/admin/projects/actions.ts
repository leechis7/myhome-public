"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, projects } from "@/lib/db";
import { requireAdmin } from "@/lib/security/auth";
import type { ActionState } from "@/app/admin/actions";

/** 어느 쪽에 담을지. 폼이 숨은 칸으로 알려 준다 */
function kindOf(formData: FormData) {
  return formData.get("kind") === "project" ? "project" : "work";
}

function parseForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    summary: emptyToNull(formData.get("summary")),
    url: emptyToNull(formData.get("url")),
    repoUrl: emptyToNull(formData.get("repoUrl")),
    // 체크박스는 꺼져 있으면 아예 안 실려 온다. 없으면 비공개다.
    repoPublic: formData.get("repoPublic") !== null,
    stack: String(formData.get("stack") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    startedOn: emptyToNull(formData.get("startedOn")),
    endedOn: emptyToNull(formData.get("endedOn")),
    sortOrder: Number(formData.get("sortOrder")) || 0,
  };
}

function refresh() {
  revalidatePath("/about");
  revalidatePath("/projects");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/projects");
}

export async function addProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const values = parseForm(formData);
  if (!values.name) return { error: "이름은 비울 수 없습니다." };

  await getDb()
    .insert(projects)
    .values({ ...values, kind: kindOf(formData) });
  refresh();
  return { ok: "추가했습니다." };
}

export async function updateProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const values = parseForm(formData);
  if (!Number.isInteger(id) || !values.name) {
    return { error: "이름은 비울 수 없습니다." };
  }

  await getDb()
    .update(projects)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(projects.id, id));
  refresh();
  return { ok: "수정했습니다." };
}

export async function deleteProject(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().delete(projects).where(eq(projects.id, id));
  refresh();
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}
