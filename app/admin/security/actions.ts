"use server";

import { MIN_PASSWORD_LENGTH } from "@/lib/security/password-limits";
import { checkPassword, requireAdmin, setPassword } from "@/lib/security/auth";
import type { ActionState } from "@/app/admin/actions";

/** 보안 화면(관리 › 설정 › 보안)의 일. 패스키는 passkey-actions.ts */

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
