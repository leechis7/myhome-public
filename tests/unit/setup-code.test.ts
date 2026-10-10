import { describe, expect, it } from "vitest";
import { matchesSetupCode, setupCode } from "@/lib/security/setup-code";

const SECRET = "보기-비밀값-보기-비밀값-보기-비밀값-32자-넘게";

describe("처음 설정 코드(MYH-172)", () => {
  it("비밀값이 같으면 늘 같은 코드다. 다르면 다르다", () => {
    expect(setupCode(SECRET)).toBe(setupCode(SECRET));
    expect(setupCode(SECRET)).not.toBe(setupCode(`${SECRET}!`));
    expect(setupCode(SECRET)).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it("대소문자 · 빈칸 · 줄표는 가리지 않고, 틀리면 아니다", () => {
    const code = setupCode(SECRET);
    expect(matchesSetupCode(code, SECRET)).toBe(true);
    expect(matchesSetupCode(code.toLowerCase().replace("-", " "), SECRET)).toBe(true);
    expect(matchesSetupCode("", SECRET)).toBe(false);
    expect(matchesSetupCode("AAAA-AAAA", SECRET)).toBe(code === "AAAA-AAAA");
    expect(matchesSetupCode(code, `${SECRET}!`)).toBe(false);
  });
});
