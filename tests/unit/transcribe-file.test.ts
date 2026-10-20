import { describe, expect, it } from "vitest";
import { splitTranscript } from "@/lib/ai/transcribe-file";

describe("splitTranscript (MYH-271)", () => {
  it("빈 줄마다 조각으로, 긴 문단은 다시 자른다", () => {
    expect(splitTranscript("가\n\n나\n다\n\n\n  ")).toEqual(["가", "나\n다"]);
    expect(splitTranscript("가".repeat(5), 2)).toEqual(["가가", "가가", "가"]);
    expect(splitTranscript("")).toEqual([]);
  });
});
