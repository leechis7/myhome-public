import { describe, expect, it } from "vitest";
import { escapeLike } from "@/lib/posts";

describe("escapeLike", () => {
  it("보통 글자는 그대로 둔다", () => {
    expect(escapeLike("caddy")).toBe("caddy");
    expect(escapeLike("리버스 프록시")).toBe("리버스 프록시");
  });

  it("% 를 이스케이프한다", () => {
    // 그대로 두면 아무 문자열과 맞아 전체 글이 나온다
    expect(escapeLike("100%")).toBe("100\\%");
  });

  it("_ 를 이스케이프한다", () => {
    // 그대로 두면 아무 한 글자와 맞는다
    expect(escapeLike("pg_dump")).toBe("pg\\_dump");
  });

  it("역슬래시도 이스케이프한다", () => {
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
})
