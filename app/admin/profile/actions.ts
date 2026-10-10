"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, profile, careers, skills } from "@/lib/db";
import { readCode, SKILL_CATEGORY } from "@/lib/codes";
import { requireAdmin } from "@/lib/security/auth";
import type { ActionState } from "@/app/admin/actions";

/**
 * 프로필 화면(관리 › 설정 › 프로필)의 일: 소개 · 연락 수단 · 경력 · 기술.
 * 이력서 칸들은 resume-actions.ts. 로그인 · 로그아웃은 app/admin/actions.ts.
 */

/** 소개 화면은 DB에서 바로 읽지만, 나중에 캐시를 켜더라도 안전하도록 갱신해 둔다 */
function refreshPublicPages() {
  revalidatePath("/about");
  // 연락 수단은 방명록에도 나온다(MYH-216)
  revalidatePath("/guestbook");
  revalidatePath("/resume");
}

export async function saveProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  if (!name) return { error: "이름은 비울 수 없습니다." };
  if (!bio) return { error: "소개글은 비울 수 없습니다." };

  // 연락 수단은 따로 저장한다(saveContacts, MYH-222) - 여기서 건드리면 지워진다
  const values = {
    name,
    bio,
    headline: emptyToNull(formData.get("headline")),
    updatedAt: new Date(),
  };

  const db = getDb();
  const updated = await db
    .update(profile)
    .set(values)
    .where(eq(profile.id, 1))
    .returning({ id: profile.id });

  // 아직 한 행도 없으면 새로 만든다
  if (updated.length === 0) {
    await db.insert(profile).values({ id: 1, ...values });
  }

  refreshPublicPages();
  return { ok: "저장했습니다." };
}

/**
 * 연락 수단(MYH-222). 프로필 줄이 있어야 저장한다 — 이름 · 소개글이 비어서는
 * 줄을 만들 수 없다.
 */
export async function saveContacts(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const updated = await getDb()
    .update(profile)
    .set({
      email: emptyToNull(formData.get("email")),
      workEmail: emptyToNull(formData.get("workEmail")),
      phone: emptyToNull(formData.get("phone")),
      githubUrl: emptyToNull(formData.get("githubUrl")),
      homepageUrl: emptyToNull(formData.get("homepageUrl")),
      updatedAt: new Date(),
    })
    .where(eq(profile.id, 1))
    .returning({ id: profile.id });
  if (updated.length === 0) return { error: "프로필(이름 · 소개글)을 먼저 저장하세요." };
  refreshPublicPages();
  return { ok: "저장했습니다." };
}

export async function addCareer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const startedOn = String(formData.get("startedOn") ?? "").trim();
  if (!company || !role || !startedOn) {
    return { error: "회사·직무·시작일은 비울 수 없습니다." };
  }

  await getDb()
    .insert(careers)
    .values({
      company,
      role,
      detail: emptyToNull(formData.get("detail")),
      startedOn,
      endedOn: emptyToNull(formData.get("endedOn")),
    });

  refreshPublicPages();
  return { ok: "추가했습니다." };
}

export async function updateCareer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const startedOn = String(formData.get("startedOn") ?? "").trim();
  if (!Number.isInteger(id) || !company || !role || !startedOn) {
    return { error: "회사·직무·시작일은 비울 수 없습니다." };
  }

  await getDb()
    .update(careers)
    .set({
      company,
      role,
      detail: emptyToNull(formData.get("detail")),
      startedOn,
      endedOn: emptyToNull(formData.get("endedOn")),
    })
    .where(eq(careers.id, id));

  refreshPublicPages();
  return { ok: "수정했습니다." };
}

export async function deleteCareer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await getDb().delete(careers).where(eq(careers.id, id));
  refreshPublicPages();
}

export async function addSkill(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const categoryCode = await readCode(
    formData.get("categoryCode"),
    SKILL_CATEGORY,
  );
  if (categoryCode === "invalid") return;

  await getDb()
    .insert(skills)
    .values({
      name,
      categoryCode,
      sortOrder: Number(formData.get("sortOrder")) || 0,
    })
    .onConflictDoNothing({ target: skills.name });

  refreshPublicPages();
}

export async function deleteSkill(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await getDb().delete(skills).where(eq(skills.id, id));
  refreshPublicPages();
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}
