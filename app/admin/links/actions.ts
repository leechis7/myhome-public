"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, links } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LINK_CATEGORY, readCode } from "@/lib/codes";
import type { ActionState } from "@/app/admin/actions";

function parseForm(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    // 주소만 적어도 되게 한다. https 를 붙이는 건 사람이 할 일이 아니다
    url: url && !/^https?:\/\//i.test(url) ? `https://${url}` : url,
    note: String(formData.get("note") ?? "").trim() || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
  };
}

/**
 * 폼 전부를 읽는다. 분류는 코드 번호다(MYH-131) - 비우면 null 이고, 분류
 * 없는 것은 목록 맨 뒤에 하나로 모인다.
 */
async function readForm(formData: FormData) {
  const categoryCode = await readCode(
    formData.get("categoryCode"),
    LINK_CATEGORY,
  );
  if (categoryCode === "invalid") return null;
  return { ...parseForm(formData), categoryCode };
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/admin/links");
}

export async function addLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const values = await readForm(formData);
  if (!values) return { error: "없는 분류입니다. 화면을 새로 고쳐 주세요." };
  if (!values.name || !values.url) {
    return { error: "이름과 주소는 비울 수 없습니다." };
  }

  await getDb().insert(links).values(values);
  refresh();
  return { ok: "추가했습니다." };
}

export async function updateLink(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const values = await readForm(formData);
  if (!values) return { error: "없는 분류입니다. 화면을 새로 고쳐 주세요." };
  if (!Number.isInteger(id) || !values.name || !values.url) {
    return { error: "이름과 주소는 비울 수 없습니다." };
  }

  await getDb().update(links).set(values).where(eq(links.id, id));
  refresh();
  return { ok: "수정했습니다." };
}

export async function deleteLink(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().delete(links).where(eq(links.id, id));
  refresh();
}
