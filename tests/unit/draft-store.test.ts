import { describe, expect, it } from "vitest";
import {
  DRAFT_TTL_MS,
  draftKey,
  formatDraftTime,
  isDraftKey,
  parseDraft,
  sameFields,
} from "@/lib/posts/draft-store";

describe("쓰던 글 보관(MYH-193)", () => {
  it("글마다 이름이 따로고, 새 글은 하나다", () => {
    expect(draftKey("post", 12)).toBe("myhome:draft:post:12");
    expect(draftKey("post", null)).toBe("myhome:draft:post:new");
    expect(draftKey("note", 3)).toBe("myhome:draft:note:3");
    expect(isDraftKey(draftKey("note", 3))).toBe(true);
    expect(isDraftKey("myhome:markdown-tab")).toBe(false);
  });

  it("서버가 저장하는 모양으로 견준다", () => {
    // 앞뒤 빈칸은 서버가 뗀다
    expect(sameFields({ content: "본문\n" }, { content: "본문" })).toBe(true);
    // 낸 본문은 \r\n 으로 담기고 칸에서는 \n 으로 읽힌다
    expect(sameFields({ content: "가\n나" }, { content: "가\r\n나" })).toBe(
      true,
    );
    // "a,b" 로 저장하면 "a, b" 로 돌아온다
    expect(sameFields({ tags: "a,b, " }, { tags: "a, b" })).toBe(true);
    expect(sameFields({ title: "가" }, { title: "나" })).toBe(false);
    // 한쪽에만 있는 칸은 빈 것으로 본다
    expect(sameFields({ title: "" }, {})).toBe(true);
    expect(sameFields({ title: "가" }, {})).toBe(false);
  });

  it("모양이 틀리거나 오래된 보관본은 없는 것으로 본다", () => {
    const now = 1_000_000_000_000;
    const good = JSON.stringify({
      savedAt: now,
      fields: { content: "x", junk: 1 },
      id: 7,
    });
    expect(parseDraft(good, now)).toEqual({
      savedAt: now,
      fields: { content: "x" },
      id: 7,
    });
    expect(parseDraft(null, now)).toBeNull();
    expect(parseDraft("{", now)).toBeNull();
    expect(parseDraft(JSON.stringify({ fields: {} }), now)).toBeNull();
    expect(parseDraft(good, now + DRAFT_TTL_MS + 1)).toBeNull();
  });

  it("시각은 서울 시각으로 짧게", () => {
    // 2026-09-30 09:12 UTC = 18:12 KST
    expect(formatDraftTime(Date.UTC(2026, 8, 30, 9, 12))).toBe("9/30 18:12");
    expect(formatDraftTime(Date.UTC(2026, 8, 30, 15, 5))).toBe("10/1 00:05");
  });
});
