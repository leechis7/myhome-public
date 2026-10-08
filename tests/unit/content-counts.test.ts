import { describe, expect, it } from "vitest";
import { CONTENT_CELLS, mergeContentCounts } from "@/lib/content-counts";

describe("쌓인 것 세기", () => {
  it("아무것도 없으면 모든 칸이 0 이다", () => {
    const merged = mergeContentCounts([]);
    expect(merged).toHaveLength(CONTENT_CELLS.length);
    expect(merged.every((row) => row.count === 0)).toBe(true);
  });

  it("센 값이 그 칸을 덮는다", () => {
    const merged = mergeContentCounts([
      { kind: "post", state: "public", count: 4 },
      { kind: "message", state: "unread", count: 2 },
    ]);
    const find = (kind: string, state: string) =>
      merged.find((r) => r.kind === kind && r.state === state)?.count;

    expect(find("post", "public")).toBe(4);
    expect(find("message", "unread")).toBe(2);
    // 나머지는 그대로 0 이다
    expect(find("post", "draft")).toBe(0);
    expect(find("message", "read")).toBe(0);
    expect(find("comment", "all")).toBe(0);
  });

  it("칸에는 글·짧은 글의 세 상태와 댓글·메시지가 있다", () => {
    const names = CONTENT_CELLS.map((c) => `${c.kind}/${c.state}`);
    expect(names).toContain("post/public");
    expect(names).toContain("post/private");
    expect(names).toContain("post/draft");
    expect(names).toContain("note/private");
    expect(names).toContain("comment/all");
    expect(names).toContain("message/unread");
    expect(names).toContain("message/read");
  });

  // 상태가 하나 늘었는데 칸을 안 고쳤을 때 그 값이 사라지면 안 된다
  it("깔아 둔 칸에 없는 것도 버리지 않는다", () => {
    const merged = mergeContentCounts([
      { kind: "post", state: "새것", count: 3 },
    ]);
    expect(merged).toHaveLength(CONTENT_CELLS.length + 1);
    expect(merged.find((r) => r.state === "새것")?.count).toBe(3);
  });

  // DB 가 문자열로 주는 경우가 있다(count::int 가 아닌 경로)
  it("문자열로 온 수도 숫자로 낸다", () => {
    const merged = mergeContentCounts([
      { kind: "comment", state: "all", count: "7" as unknown as number },
    ]);
    expect(merged.find((r) => r.kind === "comment")?.count).toBe(7);
  });
});
