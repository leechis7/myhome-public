import { describe, expect, it } from "vitest";
import { orderRange, rangeLabel, rangeState, readTodoDates } from "@/lib/my-space/todo-dates";

describe("할 일의 기간(MYH-228)", () => {
  it("거꾸로 적은 기간은 바로잡는다", () => {
    expect(orderRange({ startOn: "2026-10-15", dueOn: "2026-10-12" })).toEqual({
      startOn: "2026-10-12",
      dueOn: "2026-10-15",
    });
    expect(orderRange({ startOn: null, dueOn: "2026-10-12" })).toEqual({
      startOn: null,
      dueOn: "2026-10-12",
    });
  });

  it("목록에 적는 꼴", () => {
    expect(rangeLabel({ startOn: "2026-10-12", dueOn: "2026-10-15" })).toBe("10.12 ~ 10.15");
    expect(rangeLabel({ startOn: "2026-10-15", dueOn: "2026-10-15" })).toBe("10.15");
    expect(rangeLabel({ startOn: null, dueOn: "2026-10-05" })).toBe("10.5");
    expect(rangeLabel({ startOn: "2026-10-12", dueOn: null })).toBe("10.12 부터");
    expect(rangeLabel({ startOn: null, dueOn: null })).toBeNull();
  });

  it("오늘에 견준 처지", () => {
    const today = "2026-10-09";
    expect(rangeState({ startOn: null, dueOn: "2026-10-08" }, today)).toBe("late");
    expect(rangeState({ startOn: "2026-10-01", dueOn: today }, today)).toBe("today");
    expect(rangeState({ startOn: "2026-10-01", dueOn: "2026-10-20" }, today)).toBe("ongoing");
    expect(rangeState({ startOn: "2026-10-12", dueOn: "2026-10-20" }, today)).toBe("upcoming");
    expect(rangeState({ startOn: null, dueOn: "2026-10-20" }, today)).toBe("plain");
  });
});

describe("텔레그램 할 일의 날짜 읽기(MYH-229)", () => {
  // 2026-10-09 은 금요일이다
  const today = "2026-10-09";
  const read = (text: string) => readTodoDates(text, today);

  it("날이 없으면 그대로", () => {
    expect(read("우유 사기")).toEqual({ title: "우유 사기", startOn: null, dueOn: null });
  });

  it("날 하나는 마감일이고 제목에서 뺀다", () => {
    expect(read("10/15 보고서 내기")).toEqual({ title: "보고서 내기", startOn: null, dueOn: "2026-10-15" });
    expect(read("보고서 내기 10.15까지")).toEqual({ title: "보고서 내기", startOn: null, dueOn: "2026-10-15" });
    expect(read("10월 20일 치과")).toMatchObject({ title: "치과", dueOn: "2026-10-20" });
    expect(read("2027-01-03 여권 갱신")).toMatchObject({ title: "여권 갱신", dueOn: "2027-01-03" });
    expect(read("2027.1.3 여권 갱신")).toMatchObject({ dueOn: "2027-01-03" });
  });

  it("해가 없고 지난 날이면 내년", () => {
    expect(read("3/1 등록금")).toMatchObject({ dueOn: "2027-03-01" });
    expect(read("10/9 오늘 것")).toMatchObject({ dueOn: "2026-10-09" });
  });

  it("오늘 · 내일 · 모레", () => {
    expect(read("내일 우유 사기")).toEqual({ title: "우유 사기", startOn: null, dueOn: "2026-10-10" });
    expect(read("모레까지 회신")).toMatchObject({ title: "회신", dueOn: "2026-10-11" });
    expect(read("오늘 운동")).toMatchObject({ dueOn: "2026-10-09" });
  });

  it("요일", () => {
    expect(read("금요일 회의")).toMatchObject({ title: "회의", dueOn: "2026-10-09" });
    expect(read("월요일 회의")).toMatchObject({ dueOn: "2026-10-12" });
    expect(read("다음 주 월요일 회의")).toMatchObject({ title: "회의", dueOn: "2026-10-12" });
    expect(read("다음주 금요일 발표")).toMatchObject({ dueOn: "2026-10-16" });
    expect(read("이번 주 일요일 청소")).toMatchObject({ dueOn: "2026-10-11" });
  });

  it("기간은 시작일 · 마감일로", () => {
    expect(read("10/12~10/15 출장")).toEqual({ title: "출장", startOn: "2026-10-12", dueOn: "2026-10-15" });
    expect(read("휴가 10/12 - 10/16")).toMatchObject({ title: "휴가", startOn: "2026-10-12", dueOn: "2026-10-16" });
    expect(read("10월 12일부터 10월 15일까지 출장")).toEqual({
      title: "출장",
      startOn: "2026-10-12",
      dueOn: "2026-10-15",
    });
    expect(read("12/30~1/2 여행")).toMatchObject({ startOn: "2026-12-30", dueOn: "2027-01-02" });
    expect(read("내일부터 모레까지 정리")).toMatchObject({ title: "정리", startOn: "2026-10-10", dueOn: "2026-10-11" });
  });

  it("「… 부터」 만 있으면 시작일", () => {
    expect(read("10/20부터 다이어트")).toEqual({ title: "다이어트", startOn: "2026-10-20", dueOn: null });
  });

  it("날짜가 아닌 숫자는 건드리지 않는다", () => {
    expect(read("우유 1.5L 사기")).toEqual({ title: "우유 1.5L 사기", startOn: null, dueOn: null });
    expect(read("v1.2 배포")).toMatchObject({ dueOn: null });
    expect(read("2/30 없는 날")).toMatchObject({ dueOn: null });
    expect(read("3.14159 외우기")).toMatchObject({ dueOn: null });
  });

  it("날짜만 보내면 제목은 글 그대로", () => {
    expect(read("내일")).toEqual({ title: "내일", startOn: null, dueOn: "2026-10-10" });
  });
});
