"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
import { parseCalendarLine, saveCalendars } from "@/lib/my-space/calendar";

/**
 * 구글 캘린더 주소를 넣고 뺀다(MYH-214). 줄마다 하나, 앞에 이름(개인 · 회사)을
 * 붙일 수 있다. 맞지 않는 줄이 있으면
 * 하나도 저장하지 않고 돌려보낸다 — 반만 저장되면 무엇이 들어갔는지 모른다.
 */
export async function saveCalendarAction(formData: FormData) {
  await requireAdmin();
  const lines = String(formData.get("urls") ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) redirect("/admin/settings?cal=empty#calendar");
  const list = lines.map(parseCalendarLine);
  if (list.some((c) => c === null)) redirect("/admin/settings?cal=invalid#calendar");
  const unique = new Map(list.map((c) => [c!.url, c!]));
  await saveCalendars([...unique.values()]);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?cal=saved#calendar");
}

export async function clearCalendarAction() {
  await requireAdmin();
  await saveCalendars([]);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?cal=cleared#calendar");
}
