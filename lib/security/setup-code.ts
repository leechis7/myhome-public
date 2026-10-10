import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 처음 설정 코드(MYH-172). 빈 DB 로 처음 띄웠을 때 관리자 비밀번호를 정하려면
 * 이 코드를 넣어야 한다 - 서버를 띄우고 내가 열기 전에 남이 먼저 열어
 * 관리자가 되는 것을 막는다.
 *
 * SESSION_SECRET 에서 만든다. 그래서 앱을 다시 띄워도 같고, 서버의 .env 를 볼
 * 수 있는 사람(= 띄운 사람)만 안다. 앱이 뜰 때 로그에도 찍는다
 * (instrumentation.ts). 비밀번호를 정한 뒤에는 쓸 데가 없다.
 *
 * DB 를 부르지 않는 셈만 둔다 - 단위 시험이 본다.
 */

/** 헷갈리는 글자(0 · O · 1 · I · L)를 뺀 32자 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function setupCode(secret: string) {
  const digest = createHmac("sha256", secret).update("myhome-setup-v1").digest();
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[digest[i] % ALPHABET.length];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** 사람이 적은 것을 맞춰 본다. 대소문자 · 빈칸 · 줄표는 가리지 않는다 */
export function matchesSetupCode(input: string, secret: string) {
  const clean = (s: string) => s.toUpperCase().replace(/[\s-]/g, "");
  const a = Buffer.from(clean(input));
  const b = Buffer.from(clean(setupCode(secret)));
  return a.length === b.length && timingSafeEqual(a, b);
}
