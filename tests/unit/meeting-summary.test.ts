import { describe, expect, it } from "vitest";
import {
  callsAssistant,
  commandPrompt,
  handoffPrompt,
  meetingPrompt,
  readWakeWords,
} from "@/lib/ai/meeting-summary";

describe("회의 요약 프롬프트 (MYH-266)", () => {
  it("회의 날 · 제목 · 대본을 넣고, 카드 블록 꼴을 알려 준다", () => {
    const p = meetingPrompt("금요일까지 견적서", "2026년 10월 20일 화요일", "주간 회의");
    expect(p).toContain("「주간 회의」 회의(2026년 10월 20일 화요일, 한국)");
    expect(p).toContain("```myhome");
    expect(p.endsWith("금요일까지 견적서")).toBe(true);
  });

  it("너무 긴 대본은 앞뒤를 남기고 가운데를 줄인다", () => {
    const long = `${"앞".repeat(40_000)}${"뒤".repeat(40_000)}`;
    const p = meetingPrompt(long, "d", "t");
    expect(p).toContain("…(가운데 줄임)…");
    expect(p.length).toBeLessThan(62_000);
  });
});


describe("회의 중 비서 부르기 (MYH-267)", () => {
  it("「비서」 가 들어 있으면 부른 것이다", () => {
    expect(callsAssistant("비서야, 이거 할 일로 넣어")).toBe(true);
    expect(callsAssistant("AI 비서님 메모해")).toBe(true);
    expect(callsAssistant("견적서는 금요일까지")).toBe(false);
  });

  it("앞 30초와 부른 30초를 함께 넣는다", () => {
    const p = commandPrompt("비서야 메모해", "앞의 말", "2026년 10월 20일 화요일");
    expect(p).toContain("앞의 말");
    expect(p).toContain("비서야 메모해");
    expect(commandPrompt("x", "", "d")).toContain("(없음)");
  });
});

describe("오픈클로에 맡기기 (MYH-268)", () => {
  it("요약 · 대본을 넣고, 다른 사람에게 닿는 일은 초안만 쓰라고 한다", () => {
    const p = handoffPrompt("대본 글", "## 요약\n견적", "2026년 10월 20일 화요일", "주간 회의");
    expect(p).toContain("「주간 회의」 회의(2026년 10월 20일 화요일, 한국)");
    expect(p).toContain("초안만");
    expect(p).toContain("요약:\n## 요약\n견적");
    expect(p.endsWith("대본 글")).toBe(true);
    expect(handoffPrompt("x", null, "d", "t")).not.toContain("요약:");
  });
});

describe("호출어 (MYH-267)", () => {
  it("쉼표로 가르고 끝의 아 · 야 · 님 을 뗀다. 비면 「비서」", () => {
    expect(readWakeWords("푸딩아, 비서님")).toEqual(["푸딩", "비서"]);
    expect(readWakeWords("  ")).toEqual(["비서"]);
    expect(readWakeWords(null)).toEqual(["비서"]);
  });

  it("정한 이름으로 부른 것을 알아챈다", () => {
    const words = readWakeWords("푸딩");
    expect(callsAssistant("푸딩아 이거 할 일로 넣어", words)).toBe(true);
    expect(callsAssistant("푸딩님 메모해 줘", words)).toBe(true);
    expect(callsAssistant("비서야 메모해", words)).toBe(false);
    expect(commandPrompt("x", "", "d", "푸딩")).toContain("비서(「푸딩」)");
  });
});

