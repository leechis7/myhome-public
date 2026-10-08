import { getSite } from "@/lib/site-info";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { getDb, passkeys } from "@/lib/db";

/**
 * 패스키는 도메인에 묶인다.
 *
 * 이 사이트는 운영(example.com)과 개발(dev.example.com)이
 * 다른 주소로 뜬다. 주소를 하나로 박아 두면 다른 쪽에서 안 통한다.
 * 그래서 들어온 요청에서 뽑는다.
 *
 * 손에서 돌릴 때는 http://localhost:40002 로 열어야 한다. WebAuthn 은
 * rpID 로 도메인만 받는다 — 127.0.0.1 로 열면 브라우저가 거절한다.
 *
 * 앞에 프록시를 한 겹 더 두는 날이 오면 PASSKEY_RP_ID·PASSKEY_ORIGIN 으로
 * 덮어쓸 수 있게 열어 둔다.
 *
 * Host 를 꾸며서 보내도 얻을 것은 없다. 브라우저는 자기가 실제로 떠 있는
 * 주소의 패스키만 내어 주므로, 엉뚱한 rpID 로 물어보면 아무 것도 안 나온다.
 */
export function relyingParty(host: string, proto: string) {
  return {
    // 비어 있는 채로 넘어온 환경변수는 없는 것으로 친다
    rpID: process.env.PASSKEY_RP_ID || host.split(":")[0],
    origin: process.env.PASSKEY_ORIGIN || `${proto}://${host}`,
  };
}

async function relyingPartyFromRequest() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return relyingParty(host, proto);
}

/** 관리자는 한 명뿐이라 사용자 식별자도 하나로 고정한다 */
const USER_NAME = "admin";

/**
 * 관리자 한 명을 가리키는 값. 바뀌지 않아야 한다.
 *
 * 적어 주지 않으면 등록할 때마다 새 값이 만들어진다. 그러면 기기의 패스키
 * 목록에 같은 사이트가 여러 줄로 쌓이고, 두 번째 기기를 등록할 때 앞의
 * 것과 남남이 된다. 여기는 관리자가 한 명뿐이니 하나로 박아 둔다.
 *
 * 이미 등록된 패스키에는 영향이 없다. 들어올 때는 식별자가 아니라 패스키
 * 자체를 보고 찾기 때문이다.
 */
const USER_ID = new TextEncoder().encode("myhome-admin");

export type StoredPasskey = {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export async function listPasskeys(): Promise<StoredPasskey[]> {
  return getDb()
    .select({
      id: passkeys.id,
      label: passkeys.label,
      createdAt: passkeys.createdAt,
      lastUsedAt: passkeys.lastUsedAt,
    })
    .from(passkeys)
    .orderBy(desc(passkeys.createdAt));
}

async function registered() {
  return getDb()
    .select({ id: passkeys.id, transports: passkeys.transports })
    .from(passkeys);
}

// --- 등록 -----------------------------------------------------------------

export async function registrationOptions() {
  const { rpID } = await relyingPartyFromRequest();
  return generateRegistrationOptions({
    // 사람에게 보여 줄 이름. 인증기 목록에 이 이름으로 남는다. 사이트 이름을
    // 쓴다(MYH-170). 이름을 바꿔도 이미 등록한 패스키는 그대로 통한다 —
    // 패스키가 묶이는 것은 이름이 아니라 도메인(rpID)이다
    rpName: (await getSite()).name,
    rpID,
    userName: USER_NAME,
    userID: USER_ID,
    // 이미 등록한 기기로 또 등록하면 같은 기기가 두 줄로 남는다
    excludeCredentials: await registered(),
    authenticatorSelection: {
      // 기기에 남는 패스키여야 아이디 없이 곧장 들어올 수 있다
      residentKey: "required",
      userVerification: "preferred",
    },
  });
}

/** 확인한 뒤 DB 에 넣는다. 맞지 않으면 false 를 준다. */
export async function saveRegistration(
  label: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  const { rpID, origin } = await relyingPartyFromRequest();

  let result;
  try {
    result = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    // 서명이 깨졌거나 형식이 안 맞는다. 자세한 사정은 화면에 알리지 않는다.
    return false;
  }

  if (!result.verified) return false;

  const { credential } = result.registrationInfo;
  await getDb()
    .insert(passkeys)
    .values({
      id: credential.id,
      label,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      transports: credential.transports ?? [],
    })
    .onConflictDoNothing();

  return true;
}

// --- 로그인 ---------------------------------------------------------------

export async function authenticationOptions() {
  const { rpID } = await relyingPartyFromRequest();
  return generateAuthenticationOptions({
    rpID,
    /**
     * 어느 패스키를 쓸지 우리가 지목하지 않는다.
     *
     * 등록할 때 기기에 남는 패스키(residentKey)로 만들었으므로 브라우저가
     * 이 사이트 것을 알아서 찾아낸다. 목록을 적어 주면 로그인 화면이
     * 등록된 기기의 수와 식별자를 아무에게나 알려 주는 셈이 된다 —
     * 들어오기 전에도 볼 수 있는 자리다.
     *
     * 적지 않는다고 헐거워지지 않는다. 답으로 온 것이 우리 DB 에 있는
     * 패스키인지는 verifyLogin 이 다시 본다.
     */
    allowCredentials: [],
    userVerification: "preferred",
  });
}

/** 확인되면 true. 쓴 자국(counter·마지막 쓴 때)을 남긴다. */
export async function verifyLogin(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(passkeys)
    .where(eq(passkeys.id, response.id))
    .limit(1);
  if (!row) return false;

  const { rpID, origin } = await relyingPartyFromRequest();

  let result;
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: row.id,
        publicKey: new Uint8Array(Buffer.from(row.publicKey, "base64")),
        counter: row.counter,
        transports: row.transports,
      },
    });
  } catch {
    return false;
  }

  if (!result.verified) return false;

  await db
    .update(passkeys)
    .set({
      counter: result.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(passkeys.id, row.id));

  return true;
}

// --- 관리 ---------------------------------------------------------------

/** 이름을 바꾼다. 없는 기기면 아무 일도 하지 않는다. */
export async function renamePasskey(id: string, label: string) {
  await getDb().update(passkeys).set({ label }).where(eq(passkeys.id, id));
}

/**
 * 등록을 지운다.
 *
 * 마지막 하나라도 막지 않는다. 비밀번호가 남아 있어서 못 들어오게 되지는
 * 않고, 잃어버린 기기를 떼어 내는 것이 이 단추의 본래 쓸모다.
 */
export async function deletePasskey(id: string) {
  await getDb().delete(passkeys).where(eq(passkeys.id, id));
}

/** 패스키가 하나라도 있어야 로그인 화면에 단추를 낼 수 있다 */
export async function hasPasskey() {
  const rows = await getDb()
    .select({ id: passkeys.id })
    .from(passkeys)
    .limit(1);
  return rows.length > 0;
}
