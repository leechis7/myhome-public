import { describe, expect, it, vi } from "vitest";
import { submitToIndexNow } from "@/lib/indexnow";

function fakeFetch(status: number, body = "") {
  return vi.fn().mockResolvedValue({
    status,
    text: async () => body,
  }) as unknown as typeof fetch;
}

describe("submitToIndexNow", () => {
  it("보낼 주소가 없으면 아무 데도 요청하지 않는다", async () => {
    const f = fakeFetch(200);
    const r = await submitToIndexNow({
      host: "a.example",
      key: "k",
      urls: [],
      fetchImpl: f,
    });
    expect(r.accepted).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("열쇠 위치를 함께 보낸다", async () => {
    const f = fakeFetch(200, "ok");
    await submitToIndexNow({
      host: "a.example",
      key: "abc",
      urls: ["https://a.example/"],
      fetchImpl: f,
    });
    const sent = JSON.parse(
      (f as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(sent).toMatchObject({
      host: "a.example",
      key: "abc",
      keyLocation: "https://a.example/abc.txt",
      urlList: ["https://a.example/"],
    });
  });

  for (const [status, accepted] of [
    [200, true],
    [202, true],
    [400, false],
    [403, false],
    [422, false],
    [429, false],
  ] as const) {
    it(`${status} → ${accepted ? "받아들여짐" : "거절"}`, async () => {
      const r = await submitToIndexNow({
        host: "a.example",
        key: "k",
        urls: ["https://a.example/"],
        fetchImpl: fakeFetch(status),
      });
      expect(r.accepted).toBe(accepted);
    });
  }

  it("한 번에 만 개까지만 보낸다", async () => {
    const f = fakeFetch(200);
    await submitToIndexNow({
      host: "a.example",
      key: "k",
      urls: Array.from({ length: 10050 }, (_, i) => `https://a.example/${i}`),
      fetchImpl: f,
    });
    const sent = JSON.parse(
      (f as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(sent.urlList).toHaveLength(10000);
  });
});
