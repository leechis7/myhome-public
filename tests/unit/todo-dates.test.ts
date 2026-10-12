import { describe, expect, it } from "vitest";
import {
  orderRange,
  parseTime,
  rangeLabel,
  rangeState,
  readTodo,
  readTodoDates,
  readTodoTime,
} from "@/lib/my-space/todo-dates";

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

describe("글 속의 시각(MYH-245)", () => {
  const today = "2026-10-12";
  const at = (text: string, now = "17:00", day = today) => readTodoTime(text, { day, today, now });

  it("오전 · 오후 · 저녁 · 밤 · 낮을 읽는다", () => {
    expect(at("오후 7시 운동")).toEqual({ title: "운동", startTime: "19:00", endTime: null });
    expect(at("저녁 7시에 밥")).toEqual({ title: "밥", startTime: "19:00", endTime: null });
    expect(at("밤 11시 빨래")).toMatchObject({ startTime: "23:00" });
    expect(at("밤 12시 정리")).toMatchObject({ startTime: "00:00" });
    expect(at("낮 2시 회의")).toMatchObject({ startTime: "14:00" });
    expect(at("오전 9시 회의")).toMatchObject({ startTime: "09:00" });
    expect(at("오후 12시 점심")).toMatchObject({ startTime: "12:00" });
    expect(at("오전 12시 출발")).toMatchObject({ startTime: "00:00" });
  });

  it("반 · 분 · 24시간 · 19:30", () => {
    expect(at("19시 운동")).toMatchObject({ title: "운동", startTime: "19:00" });
    expect(at("오후 2시 반 회의")).toMatchObject({ startTime: "14:30" });
    expect(at("오후 2시 15분 회의")).toMatchObject({ startTime: "14:15" });
    expect(at("19:30 저녁 약속")).toMatchObject({ title: "저녁 약속", startTime: "19:30" });
  });

  it("오전 · 오후 없는 1 ~ 11시는 오늘 이미 지났으면 오후", () => {
    expect(at("7시 운동", "17:00")).toMatchObject({ startTime: "19:00" });
    expect(at("7시 운동", "06:00")).toMatchObject({ startTime: "07:00" });
    // 다른 날이면 쓴 그대로
    expect(at("7시 운동", "17:00", "2026-10-13")).toMatchObject({ startTime: "07:00" });
  });

  it("범위 · 끝만", () => {
    expect(at("오후 7시~9시 운동")).toEqual({ title: "운동", startTime: "19:00", endTime: "21:00" });
    expect(at("7시부터 9시까지 회의", "06:00")).toEqual({
      title: "회의",
      startTime: "07:00",
      endTime: "09:00",
    });
    expect(at("19:00-21:00 저녁")).toMatchObject({ startTime: "19:00", endTime: "21:00" });
    // 끝이 시작보다 앞이면 오후로
    expect(at("11시~1시 점심", "06:00")).toMatchObject({ startTime: "11:00", endTime: "13:00" });
    // 끝만
    expect(at("오후 6시까지 보고서")).toEqual({ title: "보고서", startTime: null, endTime: "18:00" });
  });

  it("시각이 아닌 것", () => {
    expect(at("3시간 공부")).toEqual({ title: "3시간 공부", startTime: null, endTime: null });
    expect(at("우유 사기")).toEqual({ title: "우유 사기", startTime: null, endTime: null });
    expect(at("25시 영화")).toMatchObject({ startTime: null });
  });

  it("날짜와 함께 - 날이 없으면 오늘", () => {
    expect(readTodo("오후 7시 운동", today, "17:00")).toEqual({
      title: "운동",
      startOn: null,
      dueOn: today,
      startTime: "19:00",
      endTime: null,
    });
    expect(readTodo("내일 오전 9시 회의", today, "17:00")).toEqual({
      title: "회의",
      startOn: null,
      dueOn: "2026-10-13",
      startTime: "09:00",
      endTime: null,
    });
    expect(readTodo("10/15 7시 보고", today, "17:00")).toMatchObject({
      dueOn: "2026-10-15",
      startTime: "07:00",
    });
  });

  it("목록 글자 · 넘김 · 폼 값", () => {
    expect(rangeLabel({ startOn: null, dueOn: "2026-10-12", startTime: "19:00:00" })).toBe("10.12 19:00");
    expect(rangeLabel({ startOn: null, dueOn: "2026-10-12", startTime: "19:00", endTime: "21:00" })).toBe(
      "10.12 19:00~21:00",
    );
    expect(rangeLabel({ startOn: null, dueOn: "2026-10-12", endTime: "18:00" })).toBe("10.12 ~18:00");
    expect(rangeLabel({ startOn: null, dueOn: null, startTime: "19:00" })).toBe("19:00");
    // 넘김은 끝 시각(없으면 시작 시각)을 지났을 때
    expect(rangeState({ startOn: null, dueOn: today, startTime: "19:00" }, today, "20:00")).toBe("late");
    expect(rangeState({ startOn: null, dueOn: today, startTime: "19:00" }, today, "18:00")).toBe("today");
    expect(
      rangeState({ startOn: null, dueOn: today, startTime: "19:00", endTime: "21:00" }, today, "20:00"),
    ).toBe("today");
    expect(parseTime("7:05")).toBe("07:05");
    expect(parseTime("19:00:00")).toBe("19:00");
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("")).toBeNull();
  });
});
