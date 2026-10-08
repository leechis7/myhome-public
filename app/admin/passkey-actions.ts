"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  clearFailures,
  clientKey,
  recordFailure,
  rememberChallenge,
  requireAdmin,
  signIn,
  takeChallenge,
  tooManyAttempts,
} from "@/lib/auth";
import { MAX_PASSKEY_LABEL } from "@/lib/passkey-limits";
import {
  authenticationOptions,
  deletePasskey,
  hasPasskey,
  registrationOptions,
  renamePasskey,
  saveRegistration,
  verifyLogin,
} from "@/lib/passkeys";

/** 브라우저에 물어볼 내용을 받아 오거나, 안 되는 사정을 받는다 */
export type Started<T> = { error: string } | { options: T };

export type PasskeyResult = { error?: string; ok?: string };

// --- 등록 -----------------------------------------------------------------
// 등록은 이미 들어와 있는 사람만 한다. 비밀번호로 한 번 들어온 뒤에
// 이 기기를 등록해 두는 흐름이다.

export async function startPasskeyRegistration(): Promise<
  Started<PublicKeyCredentialCreationOptionsJSON>
> {
  await requireAdmin();
  const options = await registrationOptions();
  await rememberChallenge(options.challenge);
  return { options };
}

export async function finishPasskeyRegistration(
  label: string,
  response: RegistrationResponseJSON,
): Promise<PasskeyResult> {
  await requireAdmin();

  const name = label.trim();
  if (!name) return { error: "기기 이름을 적어 주세요." };
  if (name.length > MAX_PASSKEY_LABEL) {
    return { error: `기기 이름은 ${MAX_PASSKEY_LABEL}자 이하로 적어 주세요.` };
  }

  const challenge = await takeChallenge();
  if (!challenge) return { error: "등록이 끊겼습니다. 다시 해주세요." };

  if (!(await saveRegistration(name, response, challenge))) {
    return { error: "이 기기를 확인하지 못했습니다." };
  }

  revalidatePath("/admin/security");
  return { ok: `'${name}' 을 등록했습니다.` };
}

// --- 로그인 ---------------------------------------------------------------
// 비밀번호와 같은 자리에서 같은 제한을 받는다. 패스키라고 무한정
// 시도하게 두면 제한을 우회하는 샛길이 된다.

export async function startPasskeyLogin(): Promise<
  Started<PublicKeyCredentialRequestOptionsJSON>
> {
  if (await tooManyAttempts(await clientKey())) {
    return { error: "시도가 너무 많습니다. 10분 후에 다시 해주세요." };
  }

  if (!(await hasPasskey())) {
    return { error: "등록된 기기가 없습니다. 비밀번호로 들어오세요." };
  }

  const options = await authenticationOptions();
  await rememberChallenge(options.challenge);
  return { options };
}

/** 확인되면 돌아오지 않는다 — 곧장 관리 화면으로 보낸다 */
export async function finishPasskeyLogin(
  response: AuthenticationResponseJSON,
): Promise<PasskeyResult> {
  const key = await clientKey();
  if (await tooManyAttempts(key)) {
    return { error: "시도가 너무 많습니다. 10분 후에 다시 해주세요." };
  }

  const challenge = await takeChallenge();
  if (!challenge) return { error: "로그인이 끊겼습니다. 다시 해주세요." };

  if (!(await verifyLogin(response, challenge))) {
    await recordFailure(key);
    return { error: "이 기기로는 들어올 수 없습니다." };
  }

  await clearFailures(key);
  await signIn();
  // 비밀번호로 들어올 때와 같은 자리로 보낸다
  redirect("/admin/messages");
}

// --- 관리 -----------------------------------------------------------------
// 폼으로 보낸다. 자바스크립트가 없어도 이름을 고치고 지울 수 있다.

export async function renamePasskeyAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  // 빈 이름으로 덮어쓰면 목록에서 어느 기기인지 알아볼 수 없게 된다
  if (!id || !label || label.length > MAX_PASSKEY_LABEL) return;

  await renamePasskey(id, label);
  revalidatePath("/admin/security");
}

export async function deletePasskeyAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deletePasskey(id);
  revalidatePath("/admin/security");
}
