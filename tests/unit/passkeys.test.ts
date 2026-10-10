import { afterEach, describe, expect, it } from "vitest";
import { relyingParty } from "@/lib/security/passkeys";

afterEach(() => {
  // 없애야 한다. undefined 를 넣으면 "undefined" 라는 글자가 들어간다.
  delete process.env.PASSKEY_RP_ID;
  delete process.env.PASSKEY_ORIGIN;
});

describe("relyingParty", () => {
  it("주소에서 도메인만 떼어 rpID 로 쓴다", () => {
    expect(relyingParty("example.com", "https")).toEqual({
      rpID: "example.com",
      origin: "https://example.com",
    });
  });

  it("포트는 rpID 에 들어가지 않는다. origin 에는 남는다", () => {
    expect(relyingParty("localhost:40002", "http")).toEqual({
      rpID: "localhost",
      origin: "http://localhost:40002",
    });
  });

  it("운영과 개발은 서로 다른 rpID 다 — 한쪽 패스키가 다른 쪽에서 안 통한다", () => {
    const prod = relyingParty("example.com", "https");
    const dev = relyingParty("dev.example.com", "https");
    expect(prod.rpID).not.toBe(dev.rpID);
  });

  it("환경변수가 있으면 그것을 쓴다", () => {
    process.env.PASSKEY_RP_ID = "example.com";
    process.env.PASSKEY_ORIGIN = "https://example.com";
    expect(relyingParty("무엇이든", "http")).toEqual({
      rpID: "example.com",
      origin: "https://example.com",
    });
  });
});
