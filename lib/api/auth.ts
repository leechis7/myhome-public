import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { siteConfig } from "@/lib/site/settings";

/**
 * 홈페이지 API(MYH-247)의 토큰. 오픈클로처럼 이 서버의 다른 프로그램이 할 일 ·
 * 메모를 넣고 읽을 때 쓴다. 토큰은 한 번만 보여 주고 sha256 만 둔다(환경설정
 * apiTokenHash) - DB 가 새도 토큰은 나가지 않는다.
 */

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** 새 토큰. 「mh_」 로 시작하는 43자 남짓 */
export function newToken() {
  return `mh_${randomBytes(32).toString("base64url")}`;
}

/** Authorization: Bearer … 가 맞는 토큰인가. 토큰을 만들지 않았으면 늘 아니다 */
export async function apiAuthorized(request: Request) {
  const stored = (await siteConfig()).apiTokenHash;
  if (!stored || !/^[0-9a-f]{64}$/.test(stored)) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(stored, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 막을 때의 답 */
export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/** 받은 요청을 한 줄 남긴다(무엇을 · 언제). 글 내용은 남기지 않는다 */
export function logApi(request: Request, what: string) {
  const path = new URL(request.url).pathname;
  console.info(`[api] ${new Date().toISOString()} ${request.method} ${path} ${what}`);
}
