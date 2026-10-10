import { describe, expect, it } from "vitest";
import {
  isScheduled,
  needsBadge,
  postState,
  stateLabel,
} from "@/lib/posts/state";

describe("글 상태", () => {
  it("낸 글은 공개다", () => {
    expect(postState({ published: true, private: false })).toBe("공개");
  });

  it("낸 글에 나만 보기가 붙으면 나만 보기다", () => {
    expect(postState({ published: true, private: true })).toBe("나만 보기");
  });

  it("내지 않은 글은 임시저장이다", () => {
    expect(postState({ published: false, private: false })).toBe("임시저장");
  });

  // 임시저장이면서 나만 보기 표시가 남아 있을 수 있다(공개로 되돌리지 않고
  // 내린 경우). 그때는 임시저장으로 말한다 — 아직 아무에게도 안 보인다.
  it("내리면 나만 보기 표시가 남아 있어도 임시저장이다", () => {
    expect(postState({ published: false, private: true })).toBe("임시저장");
  });

  it("공개된 글에만 딱지를 붙이지 않는다", () => {
    expect(needsBadge({ published: true, private: false })).toBe(false);
    expect(needsBadge({ published: true, private: true })).toBe(true);
    expect(needsBadge({ published: false, private: false })).toBe(true);
  });
});

describe("예약(MYH-194)", () => {
  const now = new Date("2026-10-02T00:00:00Z");
  const later = new Date("2026-10-03T00:00:00Z"); // 10월 3일 09:00 KST
  const earlier = new Date("2026-10-01T00:00:00Z");

  it("발행 시각이 아직 오지 않은 낸 글은 예약이다", () => {
    expect(postState({ published: true, private: false, publishedAt: later }, now)).toBe(
      "예약",
    );
    expect(isScheduled({ published: true, publishedAt: later }, now)).toBe(true);
  });

  it("시각이 지나면 공개다. 내리면 시각이 앞날이어도 임시저장이다", () => {
    expect(
      postState({ published: true, private: false, publishedAt: earlier }, now),
    ).toBe("공개");
    expect(
      postState({ published: false, private: false, publishedAt: later }, now),
    ).toBe("임시저장");
  });

  it("예약해 둔 나만 보기 글도 예약이다", () => {
    expect(postState({ published: true, private: true, publishedAt: later }, now)).toBe(
      "예약",
    );
  });

  it("딱지에는 언제 공개되는지 적는다", () => {
    expect(
      stateLabel({ published: true, private: false, publishedAt: later }, now),
    ).toBe("예약 · 10월 3일 09:00");
    expect(needsBadge({ published: true, private: false, publishedAt: later }, now)).toBe(
      true,
    );
  });
});
