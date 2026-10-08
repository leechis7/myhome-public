import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decryptBytes,
  decryptText,
  encryptBytes,
  encryptText,
  hasSecretKey,
} from "@/lib/secret-crypto";

const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");

describe("비밀글 자물쇠", () => {
  beforeEach(() => {
    process.env.SECRETS_KEY = KEY;
  });
  afterEach(() => {
    delete process.env.SECRETS_KEY;
  });

  it("암호화한 글자를 그대로 복호화한다", () => {
    const plain = "오늘 있었던 일\n\n줄이 여럿인 마크다운 🌱";
    expect(decryptText(encryptText(plain))).toBe(plain);
  });

  it("같은 글을 암호화해도 매번 다르게 나온다", () => {
    // IV 를 매번 새로 뽑기 때문이다. 같으면 "이 두 글은 내용이 같다" 가 샌다.
    expect(encryptText("같은 글")).not.toBe(encryptText("같은 글"));
  });

  it("열쇠가 다르면 복호화하지 못한다", () => {
    const sealed = encryptText("남이 보면 안 되는 것");
    process.env.SECRETS_KEY = OTHER_KEY;
    expect(() => decryptText(sealed)).toThrow();
  });

  it("암호문을 한 글자라도 손대면 복호화하지 못한다", () => {
    // GCM 의 인증 태그가 하는 일이다. 조용히 다른 평문이 나오지 않는다.
    const sealed = encryptText("원래 글");
    const [version, iv, tag, body] = sealed.split(".");
    const broken = Buffer.from(body, "base64url");
    broken[0] ^= 0xff;
    expect(() =>
      decryptText([version, iv, tag, broken.toString("base64url")].join(".")),
    ).toThrow();
  });

  // MYH-196. 비밀글 초안은 제목 · 본문을 빈 글자로 암호화한다. 복호화하지 못하면 초안이
  // 「열 수 없음」 이 되어 고치지도 지우지도 못했다
  it("빈 글자도 암호화했다 복호화한다", () => {
    const sealed = encryptText("");
    expect(sealed.endsWith(".")).toBe(true);
    expect(decryptText(sealed)).toBe("");
  });

  it("암호문 모양이 아니면 던진다", () => {
    expect(() => decryptText("그냥 평문")).toThrow();
    expect(() => decryptText("v2.a.b.c")).toThrow();
  });

  it("파일도 왕복한다", () => {
    const bytes = randomBytes(4096);
    const sealed = encryptBytes(bytes);
    // 디스크에 놓이는 것은 원본과 다른 바이트여야 한다
    expect(sealed.subarray(0, 5).toString()).toBe("MYHS1");
    expect(sealed.includes(bytes)).toBe(false);
    expect(decryptBytes(sealed).equals(bytes)).toBe(true);
  });

  it("암호화한 파일이 아니면 던진다", () => {
    expect(() => decryptBytes(randomBytes(64))).toThrow();
  });

  it("열쇠가 없거나 길이가 다르면 암호화하지 않는다", () => {
    delete process.env.SECRETS_KEY;
    expect(hasSecretKey()).toBe(false);
    expect(() => encryptText("아무 것도")).toThrow(/SECRETS_KEY/);

    process.env.SECRETS_KEY = randomBytes(16).toString("base64");
    expect(hasSecretKey()).toBe(false);
    expect(() => encryptText("아무 것도")).toThrow(/32바이트/);
  });
});
