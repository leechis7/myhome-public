"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, profile, careers, skills } from "@/lib/db";
import { readCode, SKILL_CATEGORY } from "@/lib/codes";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-limits";
import {
  checkPassword,
  setPassword,
  clearFailures,
  clientKey,
  getSession,
  needsSetup,
  recordFailure,
  setFirstPassword,
  requireAdmin,
  signIn,
  tooManyAttempts,
} from "@/lib/auth";
import { matchesSetupCode } from "@/lib/setup-code";

export type ActionState = { error?: string; ok?: string };

/** 소개 화면은 DB에서 바로 읽지만, 나중에 캐시를 켜더라도 안전하도록 갱신해 둔다 */
function refreshPublicPages() {
  revalidatePath("/about");
  // 연락 수단은 방명록에도 나온다(MYH-216)
  revalidatePath("/guestbook");
  revalidatePath("/resume");
}

/**
 * 실패는 상태 반환 대신 쿼리스트링으로 알린다.
 * 그래야 자바스크립트가 없는 환경에서도 오류가 화면에 보인다.
 */
export async function login(formData: FormData) {
  const key = await clientKey();
  if (await tooManyAttempts(key)) {
    redirect("/admin?e=rate");
  }

  const password = String(formData.get("password") ?? "");
  if (!(await checkPassword(password))) {
    await recordFailure(key);
    redirect("/admin?e=bad");
  }

  await clearFailures(key);
  await signIn();
  // 들어오면 메시지부터 본다. 남이 보낸 것이라 늦게 보면 곤란하다.
  redirect("/admin/messages");
}

/**
 * 처음 관리자 비밀번호를 정한다(MYH-172). 아직 정한 적이 없을 때만 되고,
 * 앱이 뜰 때 로그에 찍은 설치 코드를 맞혀야 한다 - 먼저 연 사람이 관리자가
 * 되면 안 된다. 틀린 코드는 로그인과 같은 시도 제한에 센다.
 */
export async function setupAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await needsSetup())) redirect("/admin");

  const key = await clientKey();
  if (await tooManyAttempts(key)) {
    return { error: "시도가 너무 많습니다. 10분 후에 다시 해주세요." };
  }

  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "");
  const again = String(formData.get("again") ?? "");

  if (!matchesSetupCode(code, process.env.SESSION_SECRET ?? "")) {
    await recordFailure(key);
    return { error: "설치 코드가 맞지 않습니다. 앱을 띄운 로그에서 확인하세요." };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  if (next !== again) {
    return { error: "비밀번호가 서로 다릅니다." };
  }

  // 그 사이에 누가 먼저 정했으면 덮어쓰지 않는다
  if (!(await setFirstPassword(next))) redirect("/admin");

  await clearFailures(key);
  await signIn();
  redirect("/admin");
}

/** 비밀번호를 바꾼다. 지금 것을 확인한 뒤에만 바꾼다. */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const again = String(formData.get("again") ?? "");

  if (!(await checkPassword(current))) {
    return { error: "지금 비밀번호가 맞지 않습니다." };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`,
    };
  }
  if (next !== again) {
    return { error: "새 비밀번호가 서로 다릅니다." };
  }
  if (next === current) {
    return { error: "지금 쓰는 것과 같습니다." };
  }

  await setPassword(next);
  return { ok: "비밀번호를 바꿨습니다." };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/admin");
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
