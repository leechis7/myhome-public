import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanSummary, summarizeBook } from "@/lib/books/summary";

const DESC =
  "1980년 5월 광주를 그린 소설이다. 열다섯 살 동호의 눈으로 그날을 따라간다. 이어지는 장들은 남은 사람들의 이야기다.";

afterEach(() => vi.unstubAllGlobals());

describe("책 소개 요약(MYH-233)", () => {
  it("키가 없으면 앞부분 줄이기", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await summarizeBook("소년이 온다", DESC, null)).toEqual({
      summary: "1980년 5월 광주를 그린 소설이다. 열다섯 살 동호의 눈으로 그날을 따라간다. 이어지는 장들은 남은 사람들의 이야기다.",
      how: "trim",
      miss: "nokey",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("키가 있으면 Gemini 에 묻고 답을 다듬어 쓴다", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "“5·18 광주를 소년의 눈으로 그린 소설이다.”\n" }] } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const out = await summarizeBook("소년이 온다", DESC, "AIza-test-key-0000000000");
    expect(out).toEqual({ summary: "5·18 광주를 소년의 눈으로 그린 소설이다.", how: "ai" });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toMatch(/generativelanguage\.googleapis\.com\/v1beta\/models\/.+:generateContent$/);
    expect(init.headers["x-goog-api-key"]).toBe("AIza-test-key-0000000000");
    expect(JSON.parse(init.body).contents[0].parts[0].text).toContain("소년이 온다");
  });

  it("한도를 넘으면 다음 모델로, 다 넘으면 앞부분 줄이기로(까닭: quota)", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    const out = await summarizeBook("소년이 온다", DESC, "AIza-test-key-0000000000");
    expect(out).toMatchObject({ how: "trim", miss: "quota" });
    // 기본 모델 둘을 차례로 물었다
    const models = fetch.mock.calls.map(([url]) => String(url).match(/models\/([^:]+):/)?.[1]);
    expect(models).toEqual(["gemini-flash-lite-latest", "gemini-flash-latest"]);
  });

  it("앞 모델이 한도를 넘어도 다음 모델이 답하면 AI 요약", async () => {
    const ok = new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: "요약이다." }] } }] }),
      { status: 200 },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429 })).mockResolvedValueOnce(ok),
    );
    expect(await summarizeBook("소년이 온다", DESC, "AIza-test-key-0000000000")).toEqual({
      summary: "요약이다.",
      how: "ai",
    });
  });

  it("소개가 비면 묻지 않는다(까닭: empty)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await summarizeBook("책", "  ", "AIza-test-key-0000000000")).toMatchObject({ miss: "empty" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("받은 요약 다듬기", () => {
    expect(cleanSummary("  「요약이다.」 ")).toBe("요약이다.");
    expect(cleanSummary("")).toBeNull();
    expect(cleanSummary("가".repeat(300))!.length).toBeLessThanOrEqual(121);
  });
});

describe("요약 프롬프트(환경설정)", () => {
  it("자리에 그 책의 것을 넣고, {소개글} 이 없으면 맨 끝에 붙인다", async () => {
    const { renderSummaryPrompt } = await import("@/lib/books/summary");
    expect(renderSummaryPrompt("「{제목}」({지은이}) 요약:\n{소개글}", { title: "책", author: "", description: "소개" })).toBe(
      "「책」(지은이 모름) 요약:\n소개",
    );
    expect(renderSummaryPrompt("짧게 요약하라", { title: "책", author: "A", description: "소개" })).toBe(
      "짧게 요약하라\n\n소개",
    );
  });

  it("「이 책은」 으로 시작하면 떼어 낸다", () => {
    expect(cleanSummary("이 책은 맨먼스의 함정을 다룬다.")).toBe("맨먼스의 함정을 다룬다.");
    expect(cleanSummary("본서는 소프트웨어 관리를 다룬다.")).toBe("소프트웨어 관리를 다룬다.");
  });
});
