import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findIndexNowKey, indexNowHost, submitToIndexNow } from "@/lib/posts/indexnow";

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

describe("indexNowHost (MYH-257)", () => {
  it("운영 주소면 host 를 준다", () => {
    expect(indexNowHost("https://leechis.dev")).toBe("leechis.dev");
  });
  it("개발기 · 내 컴퓨터 · 틀린 주소는 알리지 않는다", () => {
    expect(indexNowHost("https://dev.leechis.dev")).toBeNull();
    expect(indexNowHost("http://localhost:3000")).toBeNull();
    expect(indexNowHost("주소 아님")).toBeNull();
  });
});

describe("findIndexNowKey (MYH-257)", () => {
  it("public 의 32자리 .txt 이름이 열쇠다", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "indexnow-"));
    writeFileSync(path.join(dir, "robots.txt"), "");
    writeFileSync(path.join(dir, "0123456789abcdef0123456789abcdef.txt"), "");
    expect(findIndexNowKey(dir, undefined)).toBe("0123456789abcdef0123456789abcdef");
  });
  it("INDEXNOW_KEY 가 먼저고, 아무것도 없으면 null", () => {
    expect(findIndexNowKey("/없는/폴더", "abc")).toBe("abc");
    expect(findIndexNowKey("/없는/폴더", undefined)).toBeNull();
  });
});
