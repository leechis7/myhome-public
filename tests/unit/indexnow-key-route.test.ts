import { describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ indexnowKey: null as string | null }));
vi.mock("@/lib/site/settings", () => ({ siteConfig: async () => config }));

import { GET } from "@/app/indexnow/[key]/route";

const call = (key: string) =>
  GET(new Request(`https://a.example/${key}.txt`), { params: Promise.resolve({ key }) });

describe("/<열쇠>.txt (MYH-257)", () => {
  it("환경설정 · .env 의 열쇠와 같으면 열쇠를 글로 돌려준다", async () => {
    config.indexnowKey = "test-key-0000";
    const res = await call("test-key-0000");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("test-key-0000");
  });

  it("다르거나 열쇠가 없으면 404", async () => {
    config.indexnowKey = "test-key-0000";
    expect((await call("zzzzzzzzzzzz")).status).toBe(404);
    config.indexnowKey = null;
    expect((await call("test-key-0000")).status).toBe(404);
  });
});
