import { describe, expect, it } from "vitest";
import {
  callsAssistant,
  commandPrompt,
  handoffPrompt,
  meetingPrompt,
  readWakeWords,
  splitMeetingTitle,
  titlePrompt,
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

  it("맨 앞에 제목 한 줄을 쓰라고 한다 (MYH-278)", () => {
    expect(meetingPrompt("x", "d", "t")).toContain("「# 4분기 견적 일정 정리」");
  });
});

describe("AI 가 지은 회의 제목 (MYH-278)", () => {
  it("맨 앞 「# 제목」 줄을 떼어 제목으로, 나머지를 요약으로", () => {
    const { title, summary } = splitMeetingTitle("# 4분기 견적 일정 정리\n\n## 요약\n견적은 금요일까지.");
    expect(title).toBe("4분기 견적 일정 정리");
    expect(summary).toBe("## 요약\n견적은 금요일까지.");
  });

  it("제목 줄이 없으면 제목은 null, 요약은 그대로", () => {
    expect(splitMeetingTitle("## 요약\n견적")).toEqual({ title: null, summary: "## 요약\n견적" });
  });

  it("「제목:」 · 따옴표를 벗기고 길면 자른다", () => {
    expect(splitMeetingTitle("# 제목: 「주간 회의 정리」\n## 요약").title).toBe("주간 회의 정리");
    expect(splitMeetingTitle(`# ${"가".repeat(100)}\n## 요약`).title).toHaveLength(60);
  });

  it("「# 제목」 머리 다음 줄에 쓴 제목도 알아본다", () => {
    expect(splitMeetingTitle("# 제목\n서버 이전 계획\n## 요약\n다음 주")).toEqual({
      title: "서버 이전 계획",
      summary: "## 요약\n다음 주",
    });
  });

  it("빈 제목은 null", () => {
    expect(splitMeetingTitle("# 「」\n## 요약").title).toBeNull();
  });

  it("「제목 다시 만들기」 는 제목 한 줄만 쓰라고 한다", () => {
    const p = titlePrompt("## 요약\n견적", "2026년 10월 20일 화요일");
    expect(p).toContain("제목 한 줄만");
    expect(p).toContain("2026년 10월 20일 화요일");
    expect(p.endsWith("## 요약\n견적")).toBe(true);
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

