import { describe, expect, it } from "vitest";
import { cleanTags, DEFAULT_POST_PROMPT, readPostMeta, renderPostPrompt } from "@/lib/posts/ai-meta";

/** AI 로 글 요약 · 태그 제안(MYH-249) */
describe("글 요약 · 태그 제안(MYH-249)", () => {
  it("프롬프트에 종류 · 제목 · 쓰던 태그 · 본문을 넣는다", () => {
    const out = renderPostPrompt(DEFAULT_POST_PROMPT, {
      kind: "post",
      title: "Caddy 로 옮기기",
      content: "본문",
      knownTags: ["caddy", "인프라"],
    });
    expect(out).toContain("블로그 글");
    expect(out).toContain("제목: Caddy 로 옮기기");
    expect(out).toContain("caddy, 인프라");
    expect(out).toContain("본문");
    expect(renderPostPrompt("{종류} 요약", { kind: "note", title: "", content: "끝" })).toBe(
      "짧은 글 요약\n\n본문:\n끝",
    );
  });

  it("본문은 앞부분만 보낸다", () => {
    const out = renderPostPrompt("{글}", { kind: "post", title: "", content: "가".repeat(10_000) });
    expect(out.length).toBe(6000);
  });

  it("태그를 고른다: # · 따옴표 떼기, 같은 것 하나, 다섯 개까지", () => {
    expect(cleanTags("#Caddy, 인프라, caddy, 「배포」, , a,b,c,d")).toEqual(["Caddy", "인프라", "배포", "a", "b"]);
    expect(cleanTags(["x", "#y"])).toEqual(["x", "y"]);
    expect(cleanTags(undefined)).toEqual([]);
  });

  it("답을 요약 · 태그로 읽는다", () => {
    expect(readPostMeta('{"summary":"  한 줄\\n 요약 ", "tags":"a, #b"}')).toEqual({
      summary: "한 줄 요약",
      tags: ["a", "b"],
    });
    expect(() => readPostMeta("아님")).toThrow();
  });
});
