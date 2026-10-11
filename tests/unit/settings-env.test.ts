import { afterEach, describe, expect, it } from "vitest";
import { calendarsFromEnv } from "@/lib/my-space/calendar";
import { envSetting } from "@/lib/site/settings";

/** 환경설정 화면의 값도 .env 로(MYH-232) */
afterEach(() => {
  delete process.env.GOOGLE_CALENDAR_ICAL;
  delete process.env.DEFAULT_EDITOR;
});

describe(".env 로 정하는 환경설정", () => {
  it("캘린더는 ; 나 줄바꿈으로 잇고 읽을 수 없는 조각은 버린다", () => {
    process.env.GOOGLE_CALENDAR_ICAL =
      "개인 https://calendar.google.com/a/basic.ics; 회사 https://b.example/c.ics ;http://안됨\nhttps://d.example/d.ics";
    expect(calendarsFromEnv()).toEqual([
      { name: "개인", url: "https://calendar.google.com/a/basic.ics" },
      { name: "회사", url: "https://b.example/c.ics" },
      { name: "", url: "https://d.example/d.ics" },
    ]);
  });

  it("없으면 null - 화면에서 넣은 것을 쓴다", () => {
    expect(calendarsFromEnv()).toBeNull();
    expect(envSetting("editor")).toBeNull();
    process.env.DEFAULT_EDITOR = " tiptap ";
    expect(envSetting("editor")).toBe("tiptap");
  });
});
