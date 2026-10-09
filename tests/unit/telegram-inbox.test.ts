import { describe, expect, it } from "vitest";
import { asMemo, asTodo, matchesSecret, readUpdate, webhookSecret } from "@/lib/telegram-inbox";

const ME = "5873072800";
const msg = (over: Record<string, unknown>) => ({
  update_id: 1,
  message: { message_id: 1, chat: { id: Number(ME) }, ...over },
});

describe("텔레그램 웹훅 비밀 토큰(MYH-215)", () => {
  it("SESSION_SECRET 에서 늘 같은 값을 만든다", () => {
    const a = webhookSecret("x".repeat(32));
    expect(a).toBe(webhookSecret("x".repeat(32)));
    expect(a).not.toBe(webhookSecret("y".repeat(32)));
    // 텔레그램이 받는 글자만
    expect(a).toMatch(/^[A-Za-z0-9_-]{1,256}$/);
  });

  it("맞는 토큰만 통과한다", () => {
    const s = webhookSecret("x".repeat(32));
    expect(matchesSecret(s, s)).toBe(true);
    expect(matchesSecret(`${s}0`, s)).toBe(false);
    expect(matchesSecret("", s)).toBe(false);
    expect(matchesSecret(null, s)).toBe(false);
    expect(matchesSecret(s, "")).toBe(false);
  });
});

describe("받은 글 읽기(MYH-215)", () => {
  it("내 대화방의 「메모 …」 는 메모다", () => {
    expect(readUpdate(msg({ text: "  메모 우유 사기 " }), ME)).toEqual({
      kind: "memo",
      chatId: ME,
      text: "우유 사기",
    });
  });

  it("말이 없는 글은 free - 할 일인지는 웹훅이 가른다(MYH-230)", () => {
    expect(readUpdate(msg({ text: "우유 사기" }), ME)).toEqual({ kind: "free", chatId: ME, text: "우유 사기" });
    // 말이 있으면 말을 따른다
    expect(readUpdate(msg({ text: "메모 내일 회의 내용" }), ME)).toMatchObject({ kind: "memo" });
  });

  it("남의 대화방 · 내 대화방 번호가 없으면 버린다", () => {
    expect(readUpdate({ message: { chat: { id: 1 }, text: "안녕" } }, ME)).toBeNull();
    expect(readUpdate(msg({ text: "안녕" }), undefined)).toBeNull();
  });

  it("명령 · 빈 글 · 새 글이 아닌 것은 메모가 아니다", () => {
    expect(readUpdate(msg({ text: "/start" }), ME)).toBeNull();
    expect(readUpdate(msg({ text: "   " }), ME)).toBeNull();
    expect(readUpdate({ edited_message: { chat: { id: Number(ME) }, text: "고침" } }, ME)).toBeNull();
    expect(readUpdate(null, ME)).toBeNull();
    expect(readUpdate("문자열", ME)).toBeNull();
  });

  it("글자가 없으면(사진 · 스티커) 알려 준다", () => {
    expect(readUpdate(msg({ photo: [{}] }), ME)).toEqual({ kind: "not-text", chatId: ME });
  });
});

describe("텔레그램에서 할 일 넣기(MYH-217)", () => {
  it("「할일 …」 · 「할 일: …」 은 할 일이다", () => {
    expect(asTodo("할일 우유 사기")).toBe("우유 사기");
    expect(asTodo("할 일: 치과 예약")).toBe("치과 예약");
    expect(asTodo("할일：보고서")).toBe("보고서");
    expect(asTodo("할일 :  보고서 ")).toBe("보고서");
    expect(readUpdate(msg({ text: "할일 우유 사기" }), ME)).toEqual({
      kind: "todo",
      chatId: ME,
      text: "우유 사기",
    });
  });

  it("뒤가 비었거나 낱말 중간이면 메모다", () => {
    expect(asTodo("할일")).toBeNull();
    expect(asTodo("할일이 많다")).toBeNull();
    expect(readUpdate(msg({ text: "할일이 많다" }), ME)?.kind).toBe("free");
  });
});

describe("할 일로 보는 말 - 느슨하게(MYH-217)", () => {
  it.each([
    ["할일 우유 사기", "우유 사기"],
    ["할일: 우유 사기", "우유 사기"],
    ["할 일: 우유 사기", "우유 사기"],
    ["할일에 추가 우유 사기", "우유 사기"],
    ["할 일 추가: 우유 사기", "우유 사기"],
    ["리마인드 우유 사기", "우유 사기"],
    ["리마인더: 치과 예약", "치과 예약"],
    ["todo 보고서", "보고서"],
    ["TODO: 보고서", "보고서"],
    ["투두 - 보고서", "보고서"],
    ["해야 할 일: 세차", "세차"],
    ["우유 사기 할일에 추가", "우유 사기"],
    ["우유 사기 할 일 추가해줘", "우유 사기"],
    ["치과 예약 리마인드", "치과 예약"],
  ])("「%s」 → 할 일 「%s」", (text, todo) => {
    expect(asTodo(text)).toBe(todo);
  });

  it.each(["할일이 많다", "오늘 할 일 정리했다", "할일", "리마인드", "할일에 추가", "리마인더가 울렸다"])(
    "「%s」 는 메모",
    (text) => {
      expect(asTodo(text)).toBeNull();
    },
  );
});

describe("메모로 보는 말(MYH-215)", () => {
  it.each([
    ["메모 우유 사기", "우유 사기"],
    ["메모: 우유 사기", "우유 사기"],
    ["메모해 우유 사기", "우유 사기"],
    ["메모해줘: 회의 때 나온 생각", "회의 때 나온 생각"],
    ["저장 이 링크 https://a.example", "이 링크 https://a.example"],
    ["기록: 오늘 5km 달림", "오늘 5km 달림"],
    ["memo 아이디어", "아이디어"],
    ["오늘 떠오른 생각 메모해줘", "오늘 떠오른 생각"],
    ["이 글 저장해", "이 글"],
  ])("「%s」 → 메모 「%s」", (text, memo) => {
    expect(asMemo(text)).toBe(memo);
  });

  it.each(["우유 사기", "메모", "메모장 정리", "저장소 만들기", "기록이 깨졌다"])("「%s」 는 메모가 아니다", (text) => {
    expect(asMemo(text)).toBeNull();
  });
});
