import { describe, expect, it } from "vitest";
import { actionLabel, readAction, splitActions } from "@/lib/ai/assistant-actions";

describe("AI 비서의 블록 (MYH-260)", () => {
  it("답에서 블록을 떼어 일로 읽는다", () => {
    const reply = [
      "내일 저녁 운동을 넣을 수 있어요.",
      "```myhome",
      '{"action":"todo","title":"운동","startOn":null,"dueOn":"2026-10-20","startTime":"7:00","endTime":null}',
      "```",
    ].join("\n");
    const { text, actions } = splitActions(reply);
    expect(text).toBe("내일 저녁 운동을 넣을 수 있어요.");
    expect(actions).toEqual([
      { action: "todo", title: "운동", startOn: null, dueOn: "2026-10-20", startTime: "07:00", endTime: null },
    ]);
    expect(actionLabel(actions[0])).toBe("✅ 할 일 · 운동 · 10.20 07:00");
  });

  it("배열 · 메모 · 끝냄을 읽고, 틀린 것은 버린다", () => {
    const reply = '```myhome\n[{"action":"memo","text":"우유"},{"action":"done","id":12,"title":"독감주사"},{"action":"todo"},{"action":"rm","id":1}]\n```\n```myhome\n깨진 JSON\n```';
    const { text, actions } = splitActions(reply);
    expect(text).toBe("");
    expect(actions).toEqual([
      { action: "memo", text: "우유" },
      { action: "done", id: 12, title: "독감주사" },
    ]);
  });

  it("날짜 · 시각 꼴이 틀리면 비운다", () => {
    expect(readAction({ action: "todo", title: "x", dueOn: "내일", startTime: "25:00" })).toEqual({
      action: "todo",
      title: "x",
      startOn: null,
      dueOn: null,
      startTime: null,
      endTime: null,
    });
    expect(readAction({ action: "done", id: -1 })).toBeNull();
  });
});
