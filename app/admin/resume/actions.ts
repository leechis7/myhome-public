"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import {
  getDb,
  resumeLicenses,
  resumeProfile,
  resumeSchools,
  resumeTrainings,
} from "@/lib/db";
import { isResumeSection, RESUME_SECTIONS } from "@/lib/resume-sections";

/**
 * 이력서 관리(MYH-198). 관리 › 설정 › 이력서. 고치면 /resume 을 다시 그린다.
 * 실패는 쿼리스트링으로 알린다(?re=…).
 */

const BACK = "/admin/resume";
const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value === "" ? null : value;
}

function match(formData: FormData, name: string, pattern: RegExp) {
  const value = text(formData, name);
  return value && pattern.test(value) ? value : null;
}

function rowId(formData: FormData) {
  const id = Number(formData.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function done(anchor: string) {
  revalidatePath("/resume");
  revalidatePath(BACK);
  redirect(`${BACK}#${anchor}`);
}

/** 방문자에게 보일 항목 */
export async function saveVisibility(formData: FormData) {
  await requireAdmin();
  const chosen = formData.getAll("section").filter(isResumeSection);
  // 화면의 순서대로 담는다
  const ordered = RESUME_SECTIONS.filter((s) => chosen.includes(s));
  await getDb()
    .insert(resumeProfile)
    .values({ id: 1, publicSections: ordered, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: resumeProfile.id,
      set: { publicSections: ordered, updatedAt: new Date() },
    });
  done("visibility");
}

/** 기본 인적 사항 */
export async function savePersonal(formData: FormData) {
  await requireAdmin();
  const values = {
    birthDate: match(formData, "birthDate", DAY),
    company: text(formData, "company"),
    gender: text(formData, "gender"),
    finalSchool: text(formData, "finalSchool"),
    major: text(formData, "major"),
    degree: text(formData, "degree"),
    updatedAt: new Date(),
  };
  await getDb()
    .insert(resumeProfile)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: resumeProfile.id, set: values });
  done("personal");
}

export async function saveSchool(formData: FormData) {
  await requireAdmin();
  const school = text(formData, "school");
  if (!school) redirect(`${BACK}?re=school#schools`);
  const values = {
    startedOn: match(formData, "startedOn", MONTH),
    endedOn: match(formData, "endedOn", MONTH),
    school,
    major: text(formData, "major"),
    note: text(formData, "note"),
  };
  const id = rowId(formData);
  const db = getDb();
  if (id) await db.update(resumeSchools).set(values).where(eq(resumeSchools.id, id));
  else await db.insert(resumeSchools).values(values);
  done("schools");
}

export async function deleteSchool(formData: FormData) {
  await requireAdmin();
  const id = rowId(formData);
  if (id) await getDb().delete(resumeSchools).where(eq(resumeSchools.id, id));
  done("schools");
}

export async function saveTraining(formData: FormData) {
  await requireAdmin();
  const course = text(formData, "course");
  if (!course) redirect(`${BACK}?re=training#trainings`);
  const values = {
    takenOn: match(formData, "takenOn", MONTH),
    course,
    institution: text(formData, "institution"),
    note: text(formData, "note"),
  };
  const id = rowId(formData);
  const db = getDb();
  if (id) await db.update(resumeTrainings).set(values).where(eq(resumeTrainings.id, id));
  else await db.insert(resumeTrainings).values(values);
  done("trainings");
}

export async function deleteTraining(formData: FormData) {
  await requireAdmin();
  const id = rowId(formData);
  if (id) await getDb().delete(resumeTrainings).where(eq(resumeTrainings.id, id));
  done("trainings");
}

export async function saveLicense(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  if (!name) redirect(`${BACK}?re=license#licenses`);
  const values = {
    acquiredOn: match(formData, "acquiredOn", DAY),
    name,
    number: text(formData, "number"),
    issuer: text(formData, "issuer"),
  };
  const id = rowId(formData);
  const db = getDb();
  if (id) await db.update(resumeLicenses).set(values).where(eq(resumeLicenses.id, id));
  else await db.insert(resumeLicenses).values(values);
  done("licenses");
}

export async function deleteLicense(formData: FormData) {
  await requireAdmin();
  const id = rowId(formData);
  if (id) await getDb().delete(resumeLicenses).where(eq(resumeLicenses.id, id));
  done("licenses");
}
