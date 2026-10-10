import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/** promisify 는 설정을 넘기는 형태를 못 잡아 준다. 직접 감싼다. */
function scryptAsync(
  plain: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(plain, salt, keyLength, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/**
 * 비밀번호는 되돌릴 수 있게 저장하지 않는다.
 *
 * 암호화해서 넣으면 열쇠만 있으면 원래 값이 나온다. 그 열쇠도 같은 서버에
 * 있으니 DB 가 새어 나가면 사실상 평문과 다르지 않다. 우리가 비밀번호를
 * 다시 읽을 일은 없으므로 되돌릴 수 없는 해시로 넣는다.
 *
 * scrypt 를 쓴다. Node 에 들어 있어 따로 붙일 것이 없고, arm64 컨테이너에서
 * 빌드가 깨질 일도 없다.
 */
const N = 16384; // 2^14. 한 번 계산에 0.1초쯤 걸리게 잡는다
const r = 8;
const p = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/** `scrypt$N$r$p$소금$해시` — 나중에 값을 바꿔도 옛 것을 읽을 수 있게 함께 적는다 */
export async function hashPassword(plain: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(plain, salt, KEY_LENGTH, {
    N,
    r,
    p,
    // 기본 메모리 상한(32MB)으로는 N=16384 를 못 돌린다
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    N,
    r,
    p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * 저장된 값과 맞는지 본다. 형식이 깨져 있으면 조용히 false 를 준다 —
 * 로그인 화면에서 내부 사정을 알려 줄 이유가 없다.
 */
export async function verifyPassword(plain: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const cost = { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw) };
  if (!Number.isInteger(cost.N) || !Number.isInteger(cost.r)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltRaw, "base64");
    expected = Buffer.from(hashRaw, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let key: Buffer;
  try {
    key = await scryptAsync(plain, salt, expected.length, {
      ...cost,
      maxmem: 256 * 1024 * 1024,
    });
  } catch {
    // 적힌 설정이 터무니없으면 계산 자체가 실패한다
    return false;
  }

  return timingSafeEqual(key, expected);
}
