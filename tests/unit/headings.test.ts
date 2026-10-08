import { describe, expect, it } from "vitest";
import { extractHeadings, slugifyHeading } from "@/lib/headings";

describe("extractHeadings", () => {
  it("## 과 ### 을 뽑는다", () => {
    const md = ["# 제목1은 무시", "## 둘", "본문", "### 셋"].join("\n");
    expect(extractHeadings(md)).toEqual([
      { level: 2, text: "둘" },
      { level: 3, text: "셋" },
    ]);
  });

  it("코드 블록 안의 # 은 제목이 아니다", () => {
    const md = ["## 진짜 제목", "```sh", "## 가짜 제목", "```", "## 또 진짜"].join(
      "\n",
    );
    expect(extractHeadings(md).map((h) => h.text)).toEqual([
      "진짜 제목",
      "또 진짜",
    ]);
  });

  it("강조와 링크 표시를 뗀다", () => {
    const md = "## **굵게** 와 [링크](https://example.com) 와 `코드`";
    expect(extractHeadings(md)[0].text).toBe("굵게 와 링크 와 코드");
  });

  it("제목이 없으면 빈 배열", () => {
    expect(extractHeadings("그냥 본문")).toEqual([]);
  });
});

describe("slugifyHeading", () => {
  it("목차 링크와 제목 id가 같은 규칙을 쓴다", () => {
    expect(slugifyHeading("첫 번째 제목")).toBe("첫-번째-제목");
    expect(slugifyHeading("Hello World!")).toBe("hello-world");
  });
});
