import { describe, expect, it } from "vitest";
import { moveSource, readSources, writeSources } from "@/lib/books/sources";

describe("책 찾기 출처의 순서 · 사용(MYH-226)", () => {
  it("비었으면 처음 값: 카카오 → 내 서재 → Open Library, 다 켬", () => {
    expect(readSources(null)).toEqual([
      { source: "kakao", on: true },
      { source: "calibre", on: true },
      { source: "openlibrary", on: true },
    ]);
  });

  it("저장된 차례 · 끔을 읽고, 모르는 것은 버리고, 빠진 출처는 맨 뒤에 켠 채로", () => {
    expect(readSources("calibre,-kakao,없는것")).toEqual([
      { source: "calibre", on: true },
      { source: "kakao", on: false },
      { source: "openlibrary", on: true },
    ]);
  });

  it("쓰고 다시 읽으면 같다", () => {
    const list = readSources("openlibrary,-calibre,kakao");
    expect(writeSources(list)).toBe("openlibrary,-calibre,kakao");
  });

  it("한 칸 위 · 아래로, 끝에서는 그대로", () => {
    const list = readSources(null);
    expect(moveSource(list, "calibre", "up").map((s) => s.source)).toEqual(["calibre", "kakao", "openlibrary"]);
    expect(moveSource(list, "kakao", "up")).toEqual(list);
    expect(moveSource(list, "openlibrary", "down")).toEqual(list);
  });
});
