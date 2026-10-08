import { describe, expect, it } from "vitest";
import { changelogSection } from "../../scripts/changelog-section.mjs";

const MD = `# 변경 이력

머리말이다.

## v0.8.0 — 2026-09-07

### 추가

- 세 번째 것

## v0.7.0 — 2026-09-06

### 추가

- 두 번째 것

## v0.1.0 — 2026-09-05

첫 버전.
`;

describe("changelogSection", () => {
  it("그 버전 내용만 꺼낸다", () => {
    expect(changelogSection(MD, "v0.7.0")).toBe("### 추가\n\n- 두 번째 것");
  });

  it("맨 위 버전도 꺼낸다", () => {
    expect(changelogSection(MD, "v0.8.0")).toBe("### 추가\n\n- 세 번째 것");
  });

  it("맨 아래 버전은 끝까지 가져온다", () => {
    expect(changelogSection(MD, "v0.1.0")).toBe("첫 버전.");
  });

  it("v 를 붙이지 않아도 찾는다", () => {
    expect(changelogSection(MD, "0.7.0")).toBe("### 추가\n\n- 두 번째 것");
  });

  it("없는 버전은 null", () => {
    expect(changelogSection(MD, "v9.9.9")).toBeNull();
  });

  it("비슷한 번호를 잘못 잡지 않는다", () => {
    // v0.1.0 을 찾을 때 v0.1.0-rc 같은 것에 걸리면 안 된다
    const md = MD + "\n## v0.1.0-rc — 2026-09-01\n\n시험판.\n";
    expect(changelogSection(md, "v0.1.0")).toBe("첫 버전.");
  });

  it("머리말은 가져오지 않는다", () => {
    expect(changelogSection(MD, "v0.8.0")).not.toContain("머리말");
  });
});
