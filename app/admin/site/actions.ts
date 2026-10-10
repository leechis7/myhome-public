"use server";

import { revalidatePath } from "next/cache";
import { getDb, siteSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/security/auth";
import { invalidateSite } from "@/lib/site/info";
import type { ActionState } from "@/app/admin/actions";

/** 칸 하나. 비우면 null — 비운 칸은 보기 값이 채운다(lib/site/index.ts 의 mergeSite) */
function field(formData: FormData, name: string, max: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

/** 사이트 정보를 저장한다(MYH-169). 모든 화면이 읽으니 캐시를 비운다 */
export async function saveSite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const email = field(formData, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "대표 메일이 메일 주소 모양이 아닙니다." };
  }

  const values = {
    name: field(formData, "name", 60),
    title: field(formData, "title", 120),
    tagline: field(formData, "tagline", 120),
    description: field(formData, "description", 300),
    email,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  invalidateSite();
  // 제목과 메타데이터는 모든 쪽에 있다. 레이아웃부터 다시 그린다
  revalidatePath("/", "layout");
  return { ok: "저장했습니다." };
}

