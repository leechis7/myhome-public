import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

async function loadNotify() {
  vi.resetModules();
  return (await import("@/lib/telegram/notify")).notifyTelegram;
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

  it("토큰만 있고 대화방 번호가 없으면 보내지 않는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    setEnv({ TELEGRAM_BOT_TOKEN: "tok1" });
    await (
      await loadNotify()
    )("안녕");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("보내다 실패해도 던지지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("끊김")));
    setEnv({ TELEGRAM_BOT_TOKEN: "tok1", TELEGRAM_CHAT_ID: "111" });
    await expect((await loadNotify())("안녕")).resolves.toBeUndefined();
  });
});
