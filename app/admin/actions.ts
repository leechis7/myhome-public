"use server";

import { redirect } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/security/password-limits";
import {
  checkPassword,
  clearFailures,
  clientKey,
  getSession,
  needsSetup,
  recordFailure,
  setFirstPassword,
  signIn,
  tooManyAttempts,
} from "@/lib/security/auth";
import { matchesSetupCode } from "@/lib/security/setup-code";

/**
 * 관리 화면 들어가기 · 나오기: 로그인 · 처음 비밀번호 · 로그아웃.
 * 화면마다의 일은 그 화면 폴더의 actions.ts(프로필은 profile/, 보안은 security/).
 */

export type ActionState = { error?: string; ok?: string };

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
  // 들어오면 대시보드(MYH-234). 새 메시지가 맨 앞 칸이다 - 남이 보낸 것이라 늦게
  // 보면 곤란하다
  redirect("/admin");
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

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/admin");
}

