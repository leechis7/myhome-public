import { describe, expect, it } from "vitest";
import { speakableText } from "@/lib/ai/speech";

describe("speakableText (MYH-263)", () => {
  it("마크다운 · 코드 · 주소 · 비서 블록을 뺀다", () => {
    const md = [
      "## 이번 주",
      "- **독감주사** 10.17",
      "- [블로그](https://leechis.dev/blog) 보기",
      "`npm run dev` 는 쓰지 마세요",
      "```myhome",
      '{"action":"todo","title":"운동"}',
      "```",
      "> 끝",
    ].join("\n");
    expect(speakableText(md)).toBe("이번 주\n독감주사 10.17\n블로그 보기\nnpm run dev 는 쓰지 마세요\n끝");
  });

  it("너무 길면 자른다", () => {
    expect(speakableText("가".repeat(20), 10)).toBe(`${"가".repeat(10)}…`);
  });
});
