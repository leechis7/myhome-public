import { afterEach, describe, expect, it, vi } from "vitest";
import { byRule, classify, DEFAULT_TODO_PROMPT, fromAi, renderTodoPrompt } from "@/lib/telegram/classify";

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
      startTime: null,
      endTime: null,
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
      startTime: null,
      endTime: null,
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

  it("시각을 읽는다 - 규칙이 읽은 것이 먼저, 못 읽으면 AI 의 것(MYH-245)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    // 키가 없으면 규칙. 날이 없으면 오늘
    expect(await classify("오후 7시~9시 운동", today, null, null, "17:00")).toMatchObject({
      kind: "todo",
      title: "운동",
      dueOn: today,
      startTime: "19:00",
      endTime: "21:00",
    });
    // AI 가 다른 시각을 말해도 규칙이 읽은 것을 쓴다
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        gemini({ kind: "todo", title: "운동", start_on: "", due_on: "", start_time: "07:00", end_time: "" }),
      ),
    );
    expect(await classify("7시 운동", today, "todo", KEY, "17:00")).toMatchObject({
      dueOn: today,
      startTime: "19:00",
      endTime: null,
      how: "ai",
    });
    // 규칙이 못 읽는 말은 AI 의 시각
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        gemini({ kind: "todo", title: "운동", start_on: "", due_on: "", start_time: "19:00", end_time: "21:00" }),
      ),
    );
    expect(await classify("저녁 일곱 시부터 아홉 시까지 운동", today, "todo", KEY, "17:00")).toMatchObject({
      title: "운동",
      dueOn: today,
      startTime: "19:00",
      endTime: "21:00",
    });
  });
});

describe("판정 프롬프트(MYH-245)", () => {
  it("자리 표시를 채우고, {글} 이 없으면 끝에 붙인다", () => {
    const p = renderTodoPrompt(DEFAULT_TODO_PROMPT, { text: "내일 운동", today, now: "17:00", fixed: null });
    expect(p).toContain("오늘은 2026-10-10(토요일), 지금은 17:00");
    expect(p).toContain("kind 를 정한다");
    expect(p).toContain("글: 내일 운동");
    expect(renderTodoPrompt("{종류}", { text: "x", today, now: "1", fixed: "todo" })).toBe(
      "이 글은 할 일이다(kind 는 todo).\n\n글: x",
    );
  });

  it("바꾼 프롬프트로 묻는다", async () => {
    const fetch = vi.fn().mockResolvedValue(gemini({ kind: "skip", title: "", start_on: "", due_on: "", start_time: "", end_time: "" }));
    vi.stubGlobal("fetch", fetch);
    await classify("안녕", today, null, KEY, "17:00", "내 프롬프트 {글}");
    expect(JSON.stringify(fetch.mock.calls[0][1].body)).toContain("내 프롬프트 안녕");
  });
});
