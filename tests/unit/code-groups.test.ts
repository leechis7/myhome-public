import { describe, expect, it } from "vitest";
import { CODE_PATTERN, nextCode } from "@/lib/code-groups";

describe("nextCode", () => {
  it("비었으면 00001", () => {
    expect(nextCode([])).toBe("00001");
  });

  it("가장 큰 번호 다음을 다섯 자리로 채운다", () => {
    expect(nextCode(["00001", "00007", "00003"])).toBe("00008");
  });

  // 지운 번호를 다시 주면 옛 기록과 헷갈린다
  it("빈 번호를 메우지 않는다", () => {
    expect(nextCode(["00001", "00005"])).toBe("00006");
  });

  it("글자로 적은 코드는 세지 않는다", () => {
    expect(nextCode(["server", "00002", "A10"])).toBe("00003");
    expect(nextCode(["server"])).toBe("00001");
  });

  it("다섯 자리를 넘으면 그대로 늘어난다", () => {
    expect(nextCode(["99999"])).toBe("100000");
  });
});

describe("CODE_PATTERN", () => {
  it("영문 · 숫자 · _ · - 로 20자까지", () => {
    for (const ok of ["00001", "server", "my_server", "a-b", "x".repeat(20)]) {
      expect(CODE_PATTERN.test(ok), ok).toBe(true);
    }
    for (const bad of ["", "내 서버", "a b", "a/b", "x".repeat(21)]) {
      expect(CODE_PATTERN.test(bad), bad).toBe(false);
    }
  });
});
