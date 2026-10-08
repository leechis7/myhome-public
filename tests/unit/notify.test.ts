import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_BOT_TOKEN_2",
  "TELEGRAM_CHAT_ID_2",
] as const;

async function loadNotify() {
  vi.resetModules();
  return (await import("@/lib/notify")).notifyTelegram;
}

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

afterEach(() => {
  setEnv({});
  vi.unstubAllGlobals();
});

describe("notifyTelegram", () => {
  it("설정이 없으면 아무 데도 보내지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setEnv({});
    await (
      await loadNotify()
    )("안녕");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("봇이 하나면 한 번 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    setEnv({ TELEGRAM_BOT_TOKEN: "tok1", TELEGRAM_CHAT_ID: "111" });
    await (
      await loadNotify()
    )("안녕");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("bottok1");
  });

  it("봇이 둘이면 각각 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    setEnv({
      TELEGRAM_BOT_TOKEN: "tok1",
      TELEGRAM_CHAT_ID: "111",
      TELEGRAM_BOT_TOKEN_2: "tok2",
      TELEGRAM_CHAT_ID_2: "222",
    });
    await (
      await loadNotify()
    )("안녕");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("bottok1"))).toBe(true);
    expect(urls.some((u) => u.includes("bottok2"))).toBe(true);
  });

  it("토큰만 있고 대화방 번호가 없으면 그 봇은 건너뛴다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    setEnv({
      TELEGRAM_BOT_TOKEN: "tok1",
      TELEGRAM_CHAT_ID: "111",
      TELEGRAM_BOT_TOKEN_2: "tok2",
    });
    await (
      await loadNotify()
    )("안녕");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("한 봇이 실패해도 나머지는 보낸다", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("끊김"))
      .mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    setEnv({
      TELEGRAM_BOT_TOKEN: "tok1",
      TELEGRAM_CHAT_ID: "111",
      TELEGRAM_BOT_TOKEN_2: "tok2",
      TELEGRAM_CHAT_ID_2: "222",
    });
    await expect((await loadNotify())("안녕")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
