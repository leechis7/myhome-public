import { afterEach, describe, expect, it, vi } from "vitest";
import { checkLink, checkLinks, hostOf } from "@/lib/my-space/links";
import type { Link } from "@/lib/db";

afterEach(() => vi.unstubAllGlobals());

function link(id: number, url: string): Link {
  return {
    id,
    name: `링크 ${id}`,
    url,
    note: null,
    categoryGroup: "00001",
    categoryCode: null,
    sortOrder: id,
    createdAt: new Date(),
  };
}

describe("hostOf", () => {
  it("주소에서 도메인만 남긴다", () => {
    expect(hostOf("https://books.example.com/list?p=1")).toBe(
      "books.example.com",
    );
  });

  it("포트가 있으면 같이 남긴다", () => {
    expect(hostOf("http://127.0.0.1:3000/")).toBe("127.0.0.1:3000");
  });

  it("주소 모양이 아니면 적은 그대로 보여준다", () => {
    expect(hostOf("이건 주소가 아니다")).toBe("이건 주소가 아니다");
  });
});

describe("checkLink", () => {
  it("200 이면 살아 있음", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));
    expect(await checkLink("https://a.example")).toBe("살아 있음");
  });

  it("302 도 살아 있음", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 302 }));
    expect(await checkLink("https://a.example")).toBe("살아 있음");
  });

  it("401 도 살아 있음 — 서버는 떠 있다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401 }));
    expect(await checkLink("https://a.example")).toBe("살아 있음");
  });

  it("502 는 오류 응답 — 뒤쪽 앱이 죽은 것이다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 502 }));
    expect(await checkLink("https://a.example")).toBe("오류 응답");
  });

  it("연결이 안 되면 닿지 않음", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));
    expect(await checkLink("https://없는주소.example")).toBe("닿지 않음");
  });
});

describe("checkLinks", () => {
  it("여러 개를 한꺼번에 보고 id로 찾을 수 있게 준다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 502 })
      .mockRejectedValueOnce(new Error("끊김"));
    vi.stubGlobal("fetch", fetchMock);

    const states = await checkLinks([
      link(1, "https://a.example"),
      link(2, "https://b.example"),
      link(3, "https://c.example"),
    ]);

    expect(states.get(1)).toBe("살아 있음");
    expect(states.get(2)).toBe("오류 응답");
    expect(states.get(3)).toBe("닿지 않음");
  });

  it("링크가 없으면 아무 데도 묻지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await checkLinks([])).size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
