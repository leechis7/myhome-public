import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { mermaidSource } from "@/lib/posts/mermaid-block";

/** `pre` 가 받는 모양 그대로 만든다 */
function code(className: string | undefined, ...children: ReactNode[]) {
  return createElement("code", { className }, ...children);
}

describe("mermaid 블록 가려내기", () => {
  it("language-mermaid 블록의 글자를 꺼낸다", () => {
    expect(mermaidSource(code("language-mermaid", "graph TD\n  A-->B\n"))).toBe(
      "graph TD\n  A-->B",
    );
  });

  it("다른 언어는 넘기지 않는다", () => {
    expect(mermaidSource(code("language-ts", "const x = 1;"))).toBeNull();
    // 언어를 안 적은 블록에는 클래스가 아예 없다
    expect(mermaidSource(code(undefined, "그냥 글자"))).toBeNull();
  });

  // hljs 가 클래스를 하나 더 붙여도 알아봐야 한다
  it("클래스가 여럿이어도 알아본다", () => {
    expect(mermaidSource(code("hljs language-mermaid", "graph TD"))).toBe(
      "graph TD",
    );
  });

  // "language-mermaidjs" 같은 것에 걸리면 안 된다
  it("이름이 비슷한 언어에는 걸리지 않는다", () => {
    expect(mermaidSource(code("language-mermaidjs", "graph TD"))).toBeNull();
  });

  it("쪼개진 글자도 이어 붙인다", () => {
    const 쪼갠것 = code(
      "language-mermaid",
      createElement("span", { className: "hljs-keyword" }, "graph"),
      " TD\n",
      ["  A", "-->B"],
    );
    expect(mermaidSource(쪼갠것)).toBe("graph TD\n  A-->B");
  });

  it("빈 블록은 그리지 않는다", () => {
    expect(mermaidSource(code("language-mermaid", "   \n  "))).toBeNull();
  });

  it("요소가 아니면 넘기지 않는다", () => {
    expect(mermaidSource("그냥 글자")).toBeNull();
    expect(mermaidSource(null)).toBeNull();
  });
});
