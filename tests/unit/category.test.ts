import { describe, expect, it } from "vitest";
import { groupByCategory } from "@/lib/category";
import type { SkillRow } from "@/lib/skills";

function skill(id: number, name: string, category: string | null): SkillRow {
  return {
    id,
    name,
    category,
    categoryGroup: "00002",
    categoryCode: category ? String(id).padStart(5, "0") : null,
    sortOrder: id * 10,
  };
}

// 표가 달라도 규칙은 하나다. 내 서비스도 같은 함수로 묶는다.
describe("groupByCategory — 내 서비스", () => {
  it("분류가 다른 것을 나눈다", () => {
    const groups = groupByCategory([
      { id: 1, category: "내 서버", name: "Grafana" },
      { id: 2, category: "바깥 도구", name: "Jira" },
      { id: 3, category: "내 서버", name: "방문자 통계" },
    ]);

    expect(groups.map(([category]) => category)).toEqual([
      "내 서버",
      "바깥 도구",
    ]);
    expect(groups[0][1].map((r) => r.name)).toEqual(["Grafana", "방문자 통계"]);
  });
});

describe("groupByCategory", () => {
  it("나온 순서대로 분류를 묶는다", () => {
    const groups = groupByCategory([
      skill(1, "Oracle", "데이터"),
      skill(2, "SQL", "데이터"),
      skill(3, "Vue", "프론트엔드"),
    ]);
    expect(groups.map(([c]) => c)).toEqual(["데이터", "프론트엔드"]);
    expect(groups[0][1].map((s) => s.name)).toEqual(["Oracle", "SQL"]);
  });

  it("분류가 떨어져 있어도 한 그룹으로 모은다", () => {
    const groups = groupByCategory([
      skill(1, "Oracle", "데이터"),
      skill(2, "Vue", "프론트엔드"),
      skill(3, "SQL", "데이터"),
    ]);
    expect(groups[0][1].map((s) => s.name)).toEqual(["Oracle", "SQL"]);
  });

  it("분류가 없는 것은 맨 뒤로 보낸다", () => {
    const groups = groupByCategory([
      skill(1, "이름없음", null),
      skill(2, "Oracle", "데이터"),
    ]);
    expect(groups.map(([c]) => c)).toEqual(["데이터", null]);
  });

  it("빈 문자열도 분류 없음으로 본다", () => {
    const groups = groupByCategory([skill(1, "Oracle", "  ")]);
    expect(groups.map(([c]) => c)).toEqual([null]);
  });
});
