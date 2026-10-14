import { afterEach, describe, expect, it, vi } from "vitest";
import { aiAccess, askAi, chatAi } from "@/lib/ai";
import { moveEngine, readEngines, writeEngines } from "@/lib/ai/engines";

/** AI 엔진 고르기 - 오픈클로가 먼저, 안 되면 Gemini(MYH-246) */
afterEach(() => vi.unstubAllGlobals());

const OPENCLAW = {
  engine: "openclaw" as const,
  url: "http://host.docker.internal:18789/",
  token: "t",
  agent: "homepage",
};
const GEMINI = { engine: "gemini" as const, key: "k" };

function openclawReply(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}
function geminiReply(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });
}

describe("AI 엔진(MYH-246)", () => {
  it("쓸 것이 없으면 null, 문자열은 Gemini 키", () => {
    expect(aiAccess(null)).toBeNull();
    expect(aiAccess([])).toBeNull();
    expect(aiAccess("k")).toEqual([GEMINI]);
  });

  it("오픈클로에 에이전트로 묻는다", async () => {
    const fetch = vi.fn().mockResolvedValue(openclawReply("답"));
    vi.stubGlobal("fetch", fetch);
    expect(await askAi("물음", [OPENCLAW, GEMINI], { timeoutMs: 1000 })).toBe("답");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://host.docker.internal:18789/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer t");
    expect(JSON.parse(init.body).model).toBe("openclaw/homepage");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("JSON 을 원하면 답에서 { … } 만 떼어 낸다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(openclawReply('네, 여기 있습니다:\n{"kind":"todo"}\n끝')));
    const out = await askAi("물음", [OPENCLAW], {
      timeoutMs: 1000,
      schema: { type: "OBJECT", properties: { kind: { type: "STRING", enum: ["todo", "memo"] } } },
    });
    expect(JSON.parse(out)).toEqual({ kind: "todo" });
  });

  it("오픈클로가 안 되면 Gemini 로", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(openclawReply("", 502))
      .mockResolvedValueOnce(geminiReply("제미나이 답"));
    vi.stubGlobal("fetch", fetch);
    expect(await askAi("물음", [OPENCLAW, GEMINI], { timeoutMs: 1000 })).toBe("제미나이 답");
    expect(String(fetch.mock.calls[1][0])).toContain("generativelanguage.googleapis.com");
  });

  it("오픈클로뿐인데 안 되면 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(openclawReply("", 429)));
    await expect(askAi("물음", [OPENCLAW], { timeoutMs: 1000 })).rejects.toThrow(
      "quota",
    );
  });

  it("Gemini 를 앞에 두면 Gemini 먼저", async () => {
    const fetch = vi.fn().mockResolvedValue(geminiReply("제미나이"));
    vi.stubGlobal("fetch", fetch);
    expect(await askAi("물음", [GEMINI, OPENCLAW], { timeoutMs: 1000 })).toBe("제미나이");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("차례 · 사용 글을 읽고 쓴다", () => {
    expect(readEngines(null)).toEqual([
      { engine: "openclaw", on: true },
      { engine: "gemini", on: true },
    ]);
    const list = readEngines("gemini,-openclaw");
    expect(writeEngines(list)).toBe("gemini,-openclaw");
    expect(writeEngines(moveEngine(list, "openclaw", "up"))).toBe("-openclaw,gemini");
    expect(readEngines("모름,gemini")).toEqual([
      { engine: "gemini", on: true },
      { engine: "openclaw", on: true },
    ]);
  });
});

describe("AI 대화(MYH-248)", () => {
  const talk = [
    { role: "user" as const, content: "안녕" },
    { role: "assistant" as const, content: "반가워요" },
    { role: "user" as const, content: "오늘 뭐 해?" },
  ];

  it("오픈클로에 대화를 통째로 넘긴다", async () => {
    const fetch = vi.fn().mockResolvedValue(openclawReply(" 답 "));
    vi.stubGlobal("fetch", fetch);
    expect(await chatAi(talk, [OPENCLAW, GEMINI], { timeoutMs: 1000 })).toEqual({
      text: "답",
      engine: "openclaw",
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages).toEqual(talk);
  });

  it("오픈클로가 안 되거나 빈 답이면 Gemini 로, assistant 는 model 로", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(openclawReply("", 200))
      .mockResolvedValueOnce(geminiReply("제미니"));
    vi.stubGlobal("fetch", fetch);
    expect(await chatAi(talk, [OPENCLAW, GEMINI], { timeoutMs: 1000 })).toEqual({
      text: "제미니",
      engine: "gemini",
    });
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(["user", "model", "user"]);
  });

  it("다 안 되면 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(openclawReply("", 500)));
    await expect(chatAi(talk, [OPENCLAW], { timeoutMs: 1000 })).rejects.toThrow();
  });

  it("그림을 오픈클로엔 image_url, Gemini 엔 inline_data 로 붙인다 (MYH-248)", async () => {
    const withPic = [{ role: "user" as const, content: "이건 뭐야?", images: [{ type: "image/png", data: "QUJD" }] }];
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(openclawReply("", 500))
      .mockResolvedValueOnce(geminiReply("고양이"));
    vi.stubGlobal("fetch", fetch);
    await chatAi(withPic, [OPENCLAW, GEMINI], { timeoutMs: 1000 });
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages[0].content).toEqual([
      { type: "text", text: "이건 뭐야?" },
      { type: "image_url", image_url: { url: "data:image/png;base64,QUJD" } },
    ]);
    expect(JSON.parse(fetch.mock.calls[1][1].body).contents[0].parts).toEqual([
      { text: "이건 뭐야?" },
      { inline_data: { mime_type: "image/png", data: "QUJD" } },
    ]);
  });
});
