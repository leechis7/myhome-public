import { describe, expect, it } from "vitest";
import { DEFAULT_SITE, mergeSite } from "@/lib/site";

const empty = {
  name: null,
  title: null,
  tagline: null,
  description: null,
  email: null,
};

describe("mergeSite", () => {
  it("행이 없으면 보기 값을 쓴다", () => {
    const site = mergeSite(null);
    expect(site.name).toBe(DEFAULT_SITE.name);
    expect(site.title).toBe(DEFAULT_SITE.title);
    expect(site.email).toBeNull();
  });

  it("적은 칸은 그 값을 쓴다", () => {
    const site = mergeSite({ ...empty, name: "홍길동", title: "홍길동의 집" });
    expect(site.name).toBe("홍길동");
    expect(site.title).toBe("홍길동의 집");
    expect(site.description).toBe(DEFAULT_SITE.description);
  });

  // 이름만 적은 사람의 탭에 「내 홈페이지」 가 뜨면 이상하다
  it("제목을 비우면 이름을 제목으로 쓴다", () => {
    expect(mergeSite({ ...empty, name: "홍길동" }).title).toBe("홍길동");
  });

  it("빈 글자와 빈칸뿐인 값은 비운 것으로 본다", () => {
    const site = mergeSite({ ...empty, name: "   ", email: "" });
    expect(site.name).toBe(DEFAULT_SITE.name);
    expect(site.email).toBeNull();
  });

  it("주소는 DB 가 아니라 환경변수에서 온다", () => {
    expect(mergeSite(null).url).toMatch(/^https?:\/\//);
  });
});
