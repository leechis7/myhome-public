import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * 비밀글을 담글 자물쇠.
 *
 * 요구는 하나다 — **DB 가 통째로 새어 나가도 내용을 알 수 없어야 한다.**
 * 그래서 열쇠를 DB 에 두지 않는다. 서버 환경변수(`SECRETS_KEY`)에 둔다.
 * DB 백업 파일, pg_dump, DBeaver 로 들여다보기 — 어느 쪽으로도 열쇠가 같이
 * 나가지 않는다.
 *
 * **막지 못하는 것도 적어 둔다.** 서버 자체가 털리면 환경변수도 같이 나간다.
 * 그때는 이 자물쇠가 아무 것도 못 한다. 더 세게 하려면 열쇠를 브라우저에
 * 두고(끝단 암호화) 서버는 암호문만 만지게 해야 하는데, 그러면 서버에서
 * 화면을 그릴 수 없다. 지금은 여기까지가 값을 치를 만한 선이라고 보고 골랐다.
 *
 * 나중에 방식을 바꿀 수 있게 암호문 앞에 판 번호를 적어 둔다. `v1.` 로 시작
 * 하지 않는 것이 나오면 그때 가서 갈래를 친다.
 */

/** 암호 방식. 인증 태그가 붙어 손댄 암호문을 알아챈다 */
const ALGORITHM = "aes-256-gcm";
/** GCM 이 권하는 길이 */
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** 글 한 편이 담기는 봉투의 판 번호 */
const VERSION = "v1";
/** 파일 앞에 붙는 표식. 열어 보면 무엇인지 알 수 있게 */
const FILE_MAGIC = Buffer.from("MYHS1\0", "utf8");

/**
 * 열쇠를 읽는다. 32바이트(base64)여야 한다.
 *
 * 만들기: `openssl rand -base64 32`
 *
 * 없으면 던진다. 조용히 평문으로 담는 길은 두지 않는다 — 그 길이 있으면
 * 언젠가 그 길로 저장된다.
 */
function secretKey() {
  const raw = process.env.SECRETS_KEY;
  if (!raw) {
    throw new Error(
      "SECRETS_KEY 가 없습니다. openssl rand -base64 32 로 만들어 환경 파일에 넣으세요.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.byteLength !== 32) {
    throw new Error(
      `SECRETS_KEY 는 32바이트(base64)여야 합니다. 지금은 ${key.byteLength}바이트입니다.`,
    );
  }
  return key;
}

/**
 * 열쇠가 있는가. 화면에서 "열쇠가 없어 열 수 없습니다" 를 보여주려고 쓴다.
 *
 * 열쇠가 없다고 앱 전체가 죽으면 안 된다 — 비밀글은 이 사이트의 곁가지다.
 */
export function hasSecretKey() {
  try {
    secretKey();
    return true;
  } catch {
    return false;
  }
}

/** 글자를 암호화한다. 돌려주는 것은 `v1.<iv>.<태그>.<암호문>` (base64url) */
export function encryptText(plain: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

/** 암호화한 글자를 복호화한다. 열쇠가 다르거나 누가 손댔으면 던진다 */
export function decryptText(envelope: string) {
  const parts = envelope.split(".");
  const [version, iv, tag, body] = parts;
  // 본문은 비어 있을 수 있다 - 빈 글자를 암호화하면 암호문도 0 바이트다(MYH-196).
  // 비밀글 초안(그림부터 올린 새 글)이 제목 · 본문을 빈 글자로 암호화한다.
  // 그래서 본문 칸은 「있는지」 만 보고, 비었는지는 보지 않는다
  if (
    parts.length !== 4 ||
    version !== VERSION ||
    !iv ||
    !tag ||
    body === undefined
  ) {
    throw new Error("암호문 모양이 아닙니다.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    secretKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * 파일을 암호화한다. 글자와 달리 바이트 그대로 이어 붙인다.
 *
 *   MYHS1\0 | iv(12) | 태그(16) | 암호문
 *
 * base64 로 부풀리지 않으려는 것이다 — 첨부는 수십 MB 가 될 수 있다.
 */
export function encryptBytes(plain: Buffer) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([FILE_MAGIC, iv, cipher.getAuthTag(), body]);
}

/** 암호화한 파일을 복호화한다 */
export function decryptBytes(stored: Buffer) {
  const magic = stored.subarray(0, FILE_MAGIC.byteLength);
  if (
    magic.byteLength !== FILE_MAGIC.byteLength ||
    !timingSafeEqual(magic, FILE_MAGIC)
  ) {
    throw new Error("암호화한 파일이 아닙니다.");
  }
  const ivAt = FILE_MAGIC.byteLength;
  const tagAt = ivAt + IV_BYTES;
  const bodyAt = tagAt + TAG_BYTES;
  const decipher = createDecipheriv(
    ALGORITHM,
    secretKey(),
    stored.subarray(ivAt, tagAt),
  );
  decipher.setAuthTag(stored.subarray(tagAt, bodyAt));
  return Buffer.concat([
    decipher.update(stored.subarray(bodyAt)),
    decipher.final(),
  ]);
}
