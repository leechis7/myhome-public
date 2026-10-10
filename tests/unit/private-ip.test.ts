import { describe, expect, it } from "vitest";
import { isFromOurSide, isPrivateAddress } from "@/lib/security/private-ip";

describe("사설 대역 판별", () => {
  it("도커 대역은 사설이다", () => {
    expect(isPrivateAddress("172.17.0.5")).toBe(true);
    expect(isPrivateAddress("172.31.255.254")).toBe(true);
    expect(isPrivateAddress("10.0.0.7")).toBe(true);
    expect(isPrivateAddress("192.168.1.9")).toBe(true);
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
  });

  it("172.16~31 만 사설이다", () => {
    expect(isPrivateAddress("172.15.0.1")).toBe(false);
    expect(isPrivateAddress("172.32.0.1")).toBe(false);
  });

  it("공인 주소는 아니다", () => {
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("1.2.3.4")).toBe(false);
  });

  it("여러 개가 오면 주소 하나만 넘겨야 한다", () => {
    expect(isPrivateAddress("172.17.0.5")).toBe(true);
  });

  it("포트가 붙어 와도 본다", () => {
    expect(isPrivateAddress("127.0.0.1:40000")).toBe(true);
    expect(isPrivateAddress("[::1]:40000")).toBe(true);
    expect(isPrivateAddress("1.2.3.4:80")).toBe(false);
  });

  // Node 가 IPv4 를 IPv6 로 감싸 넘기는 일이 있다
  it("IPv6 로 감싼 IPv4 도 본다", () => {
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:172.17.0.5")).toBe(true);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  it("IPv6 로컬과 사설도 본다", () => {
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("fd00::1")).toBe(true);
    expect(isPrivateAddress("2001:db8::1")).toBe(false);
  });

  it("없으면 아니다", () => {
    expect(isPrivateAddress(null)).toBe(false);
    expect(isPrivateAddress("")).toBe(false);
    expect(isPrivateAddress("   ")).toBe(false);
  });
});

describe("우리 쪽에서 온 요청인가", () => {
  // Caddy 는 들어온 헤더 뒤에 실제 상대 주소를 덧붙인다. 마지막이 Caddy 가
  // 직접 본 주소다.
  it("마지막 값이 사설이면 우리 쪽이다", () => {
    expect(isFromOurSide("172.17.0.5")).toBe(true);
    expect(isFromOurSide("10.0.0.9, 172.17.0.5")).toBe(true);
  });

  it("마지막 값이 공인이면 남이다", () => {
    expect(isFromOurSide("1.2.3.4")).toBe(false);
    expect(isFromOurSide("172.17.0.5, 1.2.3.4")).toBe(false);
  });

  // 첫 값을 보면 이것만으로 통과한다. 그래서 마지막을 본다.
  it("사설 주소를 적어 보내도 통과하지 않는다", () => {
    expect(isFromOurSide("127.0.0.1, 8.8.8.8")).toBe(false);
    expect(isFromOurSide("10.0.0.1, 203.0.113.9")).toBe(false);
  });

  // 앱 포트는 127.0.0.1 에만 묶여 있어 곧바로 오는 요청은 이 서버 안뿐이다.
  it("헤더가 없으면 곧바로 온 것이라 허용한다", () => {
    expect(isFromOurSide(null)).toBe(true);
    expect(isFromOurSide("")).toBe(true);
    expect(isFromOurSide("   ")).toBe(true);
  });
});
