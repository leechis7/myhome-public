import { afterEach, describe, expect, it, vi } from "vitest";
import { byRule, classify, fromAi } from "@/lib/telegram/classify";

// 2026-10-10 은 토요일이다
const today = "2026-10-10";
const KEY = "AIza-test-key-0000000000";

function gemini(answer: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }),
    { status: 200 },
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("텔레그램 판정 - AI 먼저(MYH-233)", () => {
  it("키가 없으면 규칙이다", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await classify("내일 우유 사기", today, null, null)).toEqual({
      kind: "todo",
      title: "우유 사기",
      startOn: null,
      dueOn: "2026-10-11",
      how: "rule",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("AI 가 할 일로 보면 그 제목 · 날짜를 쓴다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(gemini({ kind: "todo", title: "보고서 내기", start_on: "", due_on: "2026-10-31" })),
    );
    expect(await classify("월말까지 보고서 내기", today, null, KEY)).toEqual({
      kind: "todo",
      title: "보고서 내기",
      startOn: null,
      dueOn: "2026-10-31",
      how: "ai",
    });
  });

  it("AI 가 메모로 보면 보낸 글 그대로 메모한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(gemini({ kind: "memo", title: "", start_on: "", due_on: "" })),
    );
    expect(await classify("와이파이 비번 abcd1234", today, null, KEY)).toEqual({
      kind: "memo",
      text: "와이파이 비번 abcd1234",
      how: "ai",
    });
  });

  it("AI 가 실패하면 규칙으로", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    expect(await classify("오늘 날씨 좋다", today, null, KEY)).toEqual({ kind: "skip", how: "rule" });
  });

  it("메모라고 말한 글은 AI 에게 묻지 않는다", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await classify("회의 내용 정리", today, "memo", KEY)).toMatchObject({ kind: "memo", how: "rule" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("할 일이라고 말한 글은 AI 가 skip 이라 해도 할 일이다", () => {
    expect(fromAi(JSON.stringify({ kind: "skip", title: "회의", start_on: "", due_on: "" }), "내일 회의", today, "todo"))
      .toMatchObject({ kind: "todo", title: "회의", dueOn: "2026-10-11", how: "ai" });
  });

  it("AI 의 날짜가 이상하면 규칙으로 읽은 날, 거꾸로면 바로잡는다", () => {
    expect(fromAi(JSON.stringify({ kind: "todo", title: "우유", start_on: "모름", due_on: "2026-13-40" }), "내일 우유", today, null))
      .toMatchObject({ dueOn: "2026-10-11" });
    expect(fromAi(JSON.stringify({ kind: "todo", title: "출장", start_on: "2026-10-15", due_on: "2026-10-12" }), "출장", today, null))
      .toMatchObject({ startOn: "2026-10-12", dueOn: "2026-10-15" });
  });

  it("규칙: 말 없이 온 이야기는 저장하지 않는다", () => {
    expect(byRule("오늘 날씨 좋다", today, null)).toEqual({ kind: "skip", how: "rule" });
  });
});
