import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultRows, visibleMenu } from "@/lib/site/menus";
import { audienceFixes } from "@/lib/site/menu-edit";
import type { Menu } from "@/lib/db";

function row(id: number, label: string, over: Partial<Menu> = {}): Menu {
  return {
    id,
    label,
    href: `/${id}`,
    parentId: null,
    sortOrder: id * 10,
    audience: "all",
    ...over,
  };
}

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe("visibleMenu", () => {
  it("방문자에게는 관리자 줄을 빼고 준다", () => {
    const rows = [
      row(1, "블로그"),
      row(2, "비밀글", { audience: "admin" }),
      row(3, "연락처"),
    ];
    expect(labels(visibleMenu(rows, { admin: false }))).toEqual([
      "블로그",
      "연락처",
    ]);
    expect(labels(visibleMenu(rows, { admin: true }))).toEqual([
      "블로그",
      "비밀글",
      "연락처",
    ]);
  });

  it("순서 컬럼으로 줄을 세우고, 같으면 먼저 만든 것이 앞이다", () => {
    const rows = [
      row(1, "셋", { sortOrder: 30 }),
      row(2, "하나", { sortOrder: 10 }),
      row(4, "둘-나중", { sortOrder: 20 }),
      row(3, "둘-먼저", { sortOrder: 20 }),
    ];
    expect(labels(visibleMenu(rows, { admin: false }))).toEqual([
      "하나",
      "둘-먼저",
      "둘-나중",
      "셋",
    ]);
  });

  it("부모 아래로 엮는다. 갈 곳이 없는 줄은 그룹이다", () => {
    const rows = [
      row(1, "글", { href: null }),
      row(2, "블로그", { parentId: 1, sortOrder: 2 }),
      row(3, "짧은 글", { parentId: 1, sortOrder: 1 }),
    ];
    const [group] = visibleMenu(rows, { admin: false });
    expect(group.href).toBeNull();
    expect(labels(group.children)).toEqual(["짧은 글", "블로그"]);
  });

  // 가장 새기 쉬운 자리다. 자식은 모두 보기여도 부모가 관리자 줄이면 빠진다.
  it("관리자 그룹에 딸린 줄은 방문자에게 따라 나오지 않는다", () => {
    const rows = [
      row(1, "도구", { href: null, audience: "admin" }),
      row(2, "감시", { parentId: 1 }),
      row(3, "블로그"),
    ];
    const items = visibleMenu(rows, { admin: false });
    expect(labels(items)).toEqual(["블로그"]);
    expect(JSON.stringify(items)).not.toContain("감시");
  });
});

describe("DEFAULT_MENUS", () => {
  // 새 설치가 넣는 메뉴(기준선 0000_baseline, MYH-234)와 「처음 상태로」 가 되돌릴
  // 값이 같아야 한다. 번호는 달라도 된다 — 모양(이름 · 갈 곳 · 보는 사람 · 형제
  // 순서 · 부모)만 본다.
  it("기준선이 넣는 메뉴가 처음 값과 같다", () => {
    const sql = readFileSync("drizzle/0000_baseline.sql", "utf8");
    const rows = [
      ...sql.matchAll(
        /INSERT INTO public\.menus \(id, label, href, parent_id, sort_order, audience\) VALUES \((\d+), '([^']+)', (NULL|'[^']+'), (NULL|\d+), (\d+), '(all|admin)'\);/g,
      ),
    ].map(([, id, label, href, parentId, sortOrder, audience]) => ({
      id: Number(id),
      parentId: parentId === "NULL" ? null : Number(parentId),
      sortOrder: Number(sortOrder),
      label,
      href: href === "NULL" ? null : href.slice(1, -1),
      audience,
    }));
    expect(rows.length).toBeGreaterThan(20);

    type Row = (typeof rows)[number];
    const shape = (all: readonly Row[], parentId: number | null): unknown[] =>
      all
        .filter((r) => r.parentId === parentId)
        .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((r) => ({
          label: r.label,
          href: r.href,
          audience: r.audience,
          children: shape(all, r.id),
        }));

    // 기준선 뒤의 마이그레이션이 넣은 메뉴(기준선은 고치지 않는다 - 이미 돈 DB 가
    // 다시 돌리게 된다). 그 마이그레이션에 정말 있는지도 본다
    const later = { "/admin/ai": "drizzle/0007_meetings.sql" } as Record<string, string>;
    for (const [href, file] of Object.entries(later)) {
      expect(readFileSync(file, "utf8")).toContain(`'${href}'`);
    }
    const defaults = defaultRows().filter((r) => !r.href || !(r.href in later));
    expect(shape(rows, null)).toEqual(shape(defaults, null));
  });

  it("관리 화면으로 가는 줄은 전부 관리자만 보고, 관리자 그룹 아래도 그렇다", () => {
    expect(audienceFixes(defaultRows())).toEqual([]);
  });

  it("방문자에게는 공개 화면만 보인다", () => {
    const rows = defaultRows();
    expect(visibleMenu(rows, { admin: false }).map((i) => i.label)).toEqual([
      "블로그",
      "짧은 글",
      "프로젝트",
      "책",
      "방명록",
    ]);
  });
});
