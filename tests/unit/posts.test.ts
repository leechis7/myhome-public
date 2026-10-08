import { describe, expect, it } from "vitest";
import { isVersion, versionChange } from "@/lib/post-version";
import {
  listedAt,
  readingMinutes,
  revisionInfo,
  wasEditedLater,
} from "@/lib/posts";

describe("wasEditedLater", () => {
  const 낸때 = new Date("2026-09-01T10:00:00+09:00");

  it("낸 직후 고친 것은 밝히지 않는다", () => {
    expect(wasEditedLater(낸때, new Date("2026-09-01T10:20:00+09:00"))).toBe(
      false,
    );
  });

  it("30분이 넘으면 밝힌다. 같은 날이어도 그렇다", () => {
    expect(wasEditedLater(낸때, new Date("2026-09-01T10:31:00+09:00"))).toBe(
      true,
    );
    expect(wasEditedLater(낸때, new Date("2026-09-01T23:50:00+09:00"))).toBe(
      true,
    );
  });

  it("며칠 뒤에 고친 것도 당연히 밝힌다", () => {
    expect(wasEditedLater(낸때, new Date("2026-09-05T09:00:00+09:00"))).toBe(
      true,
    );
  });

  it("임시저장(발행일 없음)은 밝히지 않는다", () => {
    expect(wasEditedLater(null, new Date())).toBe(false);
  });
});

describe("isVersion", () => {
  it("숫자 세 자리는 받는다", () => {
    expect(isVersion("1.0.0")).toBe(true);
    expect(isVersion("0.2.13")).toBe(true);
    expect(isVersion("10.20.30")).toBe(true);
  });

  it("그 밖은 받지 않는다", () => {
    for (const bad of ["1.1", "v1.0.0", "1.0.0-rc1", "2판", "1", "1.0.0.1", ""]) {
      expect(isVersion(bad)).toBe(false);
    }
  });
});

describe("versionChange", () => {
  it("값이 바뀌면 개정이다", () => {
    expect(versionChange("1.0", "1.1")).toBe("개정");
  });

  it("없던 버전을 넣어도 개정이다", () => {
    expect(versionChange(null, "1.0")).toBe("개정");
  });

  it("그대로면 아무 일도 없다", () => {
    expect(versionChange("1.0", "1.0")).toBe("그대로");
    // 앞뒤 공백만 다른 것은 같은 값으로 본다
    expect(versionChange("1.0", " 1.0 ")).toBe("그대로");
    expect(versionChange(null, "  ")).toBe("그대로");
  });

  it("비우면 개정을 지운 것이다", () => {
    expect(versionChange("1.1", "")).toBe("지움");
    expect(versionChange("1.1", null)).toBe("지움");
  });
});

describe("revisionInfo", () => {
  const 낸때 = new Date("2026-09-01T00:46:00+09:00");

  it("개정한 글은 개정으로 적는다. 버전은 화면에서 따로 보여준다", () => {
    const info = revisionInfo({
      publishedAt: 낸때,
      revisedAt: new Date("2026-09-08T09:00:00+09:00"),
      updatedAt: new Date("2026-09-09T11:00:00+09:00"),
      version: "1.1",
    });
    // 고친 날이 더 나중이어도 개정일을 적는다. 판을 가리키는 값이 우선이다
    expect(info?.label).toBe("개정 2026년 9월 8일");
    expect(info?.kind).toBe("개정");
  });

  it("버전이 없으면 날짜만 적는다", () => {
    const info = revisionInfo({
      publishedAt: 낸때,
      revisedAt: new Date("2026-09-08T09:00:00+09:00"),
      updatedAt: new Date("2026-09-08T09:00:00+09:00"),
      version: null,
    });
    expect(info?.label).toBe("개정 2026년 9월 8일");
  });

  it("개정이 없으면 고침으로 적는다", () => {
    const info = revisionInfo({
      publishedAt: 낸때,
      revisedAt: null,
      updatedAt: new Date("2026-09-05T09:00:00+09:00"),
    });
    expect(info?.label).toBe("고침 2026년 9월 5일");
  });

  it("같은 날이면 시각만 적는다", () => {
    const info = revisionInfo({
      publishedAt: 낸때,
      revisedAt: null,
      updatedAt: new Date("2026-09-01T15:53:00+09:00"),
    });
    expect(info?.label).toBe("고침 오후 3:53");
  });

  it("낸 직후 손본 글은 아무것도 적지 않는다", () => {
    expect(
      revisionInfo({
        publishedAt: 낸때,
        revisedAt: null,
        updatedAt: new Date("2026-09-01T01:00:00+09:00"),
      }),
    ).toBeNull();
  });
});

describe("listedAt", () => {
  it("개정했으면 개정일로 줄을 선다", () => {
    const 개정 = new Date("2026-09-08T09:00:00+09:00");
    expect(
      listedAt({ publishedAt: new Date("2026-09-01T00:00:00+09:00"), revisedAt: 개정 }),
    ).toBe(개정);
  });

  it("개정하지 않았으면 발행일로 선다", () => {
    const 발행 = new Date("2026-09-01T00:00:00+09:00");
    expect(listedAt({ publishedAt: 발행, revisedAt: null })).toBe(발행);
  });
});

describe("readingMinutes", () => {
  it("짧은 글도 최소 1분", () => {
    expect(readingMinutes("짧다")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("한글 분량에 따라 늘어난다", () => {
    const short = readingMinutes("가".repeat(500));
    const long = readingMinutes("가".repeat(2500));
    expect(short).toBe(1);
    expect(long).toBe(5);
  });

  it("영어 단어도 센다", () => {
    expect(readingMinutes("word ".repeat(200))).toBe(1);
    expect(readingMinutes("word ".repeat(800))).toBe(4);
  });
});
