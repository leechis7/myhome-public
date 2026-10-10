import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("hashPassword", () => {
  it("무엇을 어떻게 돌렸는지 함께 적는다", async () => {
    const stored = await hashPassword("시험용-비밀번호-12");
    expect(stored.split("$")).toHaveLength(6);
    expect(stored.startsWith("scrypt$")).toBe(true);
  });

  it("같은 비밀번호라도 저장되는 값은 매번 다르다", async () => {
    const a = await hashPassword("같은비밀번호");
    const b = await hashPassword("같은비밀번호");
    expect(a).not.toBe(b);
  });

  it("저장된 값 어디에도 원래 비밀번호가 없다", async () => {
    const stored = await hashPassword("사람이-읽을-수-있는-값");
    expect(stored).not.toContain("사람이");
  });
});

describe("verifyPassword", () => {
  it("맞으면 통과한다", async () => {
    const stored = await hashPassword("시험용-비밀번호-12");
    expect(await verifyPassword("시험용-비밀번호-12", stored)).toBe(true);
  });

  it("틀리면 막는다", async () => {
    const stored = await hashPassword("시험용-비밀번호-12");
    expect(await verifyPassword("wlwl00a!", stored)).toBe(false);
  });

  it("한글과 이모지도 그대로 다룬다", async () => {
    const stored = await hashPassword("비밀번호🔒");
    expect(await verifyPassword("비밀번호🔒", stored)).toBe(true);
    expect(await verifyPassword("비밀번호", stored)).toBe(false);
  });

  it("빈 값은 통과하지 않는다", async () => {
    const stored = await hashPassword("시험용-비밀번호-12");
    expect(await verifyPassword("", stored)).toBe(false);
  });

  for (const broken of [
    "",
    "평문그대로",
    "scrypt$16384$8$1$소금만있고해시가없다",
    "bcrypt$16384$8$1$c2FsdA==$aGFzaA==",
    "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
    "scrypt$16384$8$1$$aGFzaA==",
  ]) {
    it(`형식이 깨져 있으면 막는다: ${broken.slice(0, 24) || "(빈 값)"}`, async () => {
      expect(await verifyPassword("시험용-비밀번호-12", broken)).toBe(false);
    });
  }

  it("옛 형식으로 저장된 것도 적힌 대로 읽는다", async () => {
    // 비용을 낮춰 저장한 값도 그 값에 적힌 설정으로 확인한다
    const stored = await hashPassword("시험용-비밀번호-12");
    const [, , , , salt, hash] = stored.split("$");
    expect(
      await verifyPassword("시험용-비밀번호-12", `scrypt$16384$8$1$${salt}$${hash}`),
    ).toBe(true);
  });
});
