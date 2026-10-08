import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb, adminPassword, loginAttempts } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { site } from "@/lib/site";

export type Session = {
  admin?: true;
  /**
   * 패스키 절차가 오가는 동안만 잠깐 담긴다.
   *
   * 브라우저에 물어보고 답을 받기까지 두 번 오가는데, 그 사이에 우리가 던진
   * challenge 를 들고 있어야 한다. DB 에 테이블을 하나 더 만들 일은 아니다 —
   * 쿠키는 이미 암호화돼 있고, 절차가 끝나면 지운다.
   */
  challenge?: string;
};

function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET이 없거나 32자 미만입니다. openssl rand -base64 32 로 만들어 .env.local에 넣으세요.",
    );
  }
  return {
    password,
    cookieName: "myhome_admin",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      // https 로 여는 사이트에서만 켠다(MYH-178). 전에는 「운영 빌드면 켬」
      // 이라, 받아 띄운 사람이 http://192.168… 처럼 IP 로 열면 쿠키가 붙지
      // 않아 로그인이 조용히 안 됐다. localhost 는 http 라도 브라우저가 받는다
      secure: site.url.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getSession() {
  return getIronSession<Session>(await cookies(), sessionOptions());
}

export async function isAdmin() {
  const session = await getSession();
  return session.admin === true;
}

/** 서버 액션에서 호출한다. 관리자가 아니면 던진다. */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("권한이 없습니다.");
  }
}

/** 패스키 절차를 시작하며 우리가 던진 challenge 를 적어 둔다 */
export async function rememberChallenge(challenge: string) {
  const session = await getSession();
  session.challenge = challenge;
  await session.save();
}

/**
 * 적어 둔 challenge 를 꺼내며 지운다.
 *
 * 꺼낼 때 지우는 것이 요점이다. 남겨 두면 한 번 가로챈 답을 다시 보내
 * 들어올 수 있다.
 */
export async function takeChallenge() {
  const session = await getSession();
  const challenge = session.challenge;
  if (challenge) {
    delete session.challenge;
    await session.save();
  }
  return challenge;
}

/** 패스키로 확인됐다. 로그인 상태로 바꾼다. */
export async function signIn() {
  const session = await getSession();
  session.admin = true;
  delete session.challenge;
  await session.save();
}

/**
 * 저장된 비밀번호를 가져온다. 없으면 환경변수 값으로 한 번 만들어 넣는다.
 *
 * 이 사이트는 환경변수에 적어 둔 비밀번호로 돌고 있었다. 테이블을 만들자마자
 * 못 들어가면 곤란하므로, 처음 한 번은 그 값을 옮겨 심는다.
 * 한 번 옮기고 나면 환경변수는 더 보지 않는다 — 화면에서 바꾼 비밀번호가
 * 배포할 때마다 옛 값으로 되돌아가면 안 된다.
 */
async function storedHash() {
  const db = getDb();
  const [row] = await db
    .select({ hash: adminPassword.hash })
    .from(adminPassword)
    .where(eq(adminPassword.id, 1))
    .limit(1);
  if (row) return row.hash;

  const seed = process.env.ADMIN_PASSWORD;
  if (!seed) return null;

  const hash = await hashPassword(seed);
  // 동시에 두 번 들어와도 한 줄만 남는다
  await db.insert(adminPassword).values({ id: 1, hash }).onConflictDoNothing();

  const [saved] = await db
    .select({ hash: adminPassword.hash })
    .from(adminPassword)
    .where(eq(adminPassword.id, 1))
    .limit(1);
  return saved?.hash ?? hash;
}

/**
 * 관리자 비밀번호를 아직 정하지 않았는가(MYH-172). DB 에도 없고 ADMIN_PASSWORD
 * 도 없을 때다 - 남이 받아 빈 DB 로 처음 띄운 때. 그러면 /admin 이 로그인
 * 대신 「비밀번호 정하기」 를 보인다.
 */
export async function needsSetup() {
  return (await storedHash()) === null;
}

export async function checkPassword(input: string) {
  const hash = await storedHash();
  if (!hash) return false;
  return verifyPassword(input, hash);
}

/** 처음 비밀번호를 넣는다. 이미 있으면 넣지 않고 false (MYH-172) */
export async function setFirstPassword(plain: string) {
  const hash = await hashPassword(plain);
  const inserted = await getDb()
    .insert(adminPassword)
    .values({ id: 1, hash })
    .onConflictDoNothing()
    .returning({ id: adminPassword.id });
  return inserted.length > 0;
}

/** 새 비밀번호로 바꾼다. 부르기 전에 지금 비밀번호를 확인해야 한다. */
export async function setPassword(plain: string) {
  const hash = await hashPassword(plain);
  await getDb()
    .insert(adminPassword)
    .values({ id: 1, hash })
    .onConflictDoUpdate({
      target: adminPassword.id,
      set: { hash, updatedAt: new Date() },
    });
}

// --- 로그인 시도 제한 -----------------------------------------------------
// 기록을 DB에 남긴다. 프로세스 메모리에 두면 배포할 때마다 초기화돼서
// 배포를 반복하는 것만으로 제한을 우회할 수 있다.

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/**
 * 누구의 것이든 합쳐서 이만큼 틀리면 모두 잠시 막는다(MYH-178).
 *
 * 사람을 가르는 값(clientKey)은 X-Forwarded-For 에서 온다. 앞에 프록시가
 * 없으면(최소 구성) 그 머리글은 보내는 쪽이 마음대로 적을 수 있고, Next 도
 * 이미 있으면 덮어쓰지 않는다. 요청마다 값을 바꾸면 사람마다의 제한(5번)은
 * 피해 간다. 합친 제한은 그래도 걸린다 - 비밀번호 · 설치 코드를 마구 두드리는
 * 것을 막는다. 대신 남이 일부러 틀려서 나를 10분 막을 수는 있다(패스키
 * 로그인은 따로라 막히지 않는다).
 */
const MAX_ATTEMPTS_ALL = 30;

/** 원본 IP는 저장하지 않는다. 도배 판단에만 쓰므로 해시로 충분하다. */
export async function clientKey() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.SESSION_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

function since() {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

export async function tooManyAttempts(key: string) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.ipHash, key), gt(loginAttempts.createdAt, since())),
    );

  if ((row?.count ?? 0) >= MAX_ATTEMPTS) return true;

  const [all] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(gt(loginAttempts.createdAt, since()));
  return (all?.count ?? 0) >= MAX_ATTEMPTS_ALL;
}

export async function recordFailure(key: string) {
  const db = getDb();
  await db.insert(loginAttempts).values({ ipHash: key });
  // 오래된 기록은 쓸모가 없으니 이 참에 치운다
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, since()));
}

export async function clearFailures(key: string) {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.ipHash, key));
}
