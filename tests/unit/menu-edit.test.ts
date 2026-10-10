import { describe, expect, it } from "vitest";
import {
  audienceFixes,
  audienceFromParent,
  descendantIds,
  isAdminHref,
  liftedOrder,
  movedOrder,
  numbered,
  resolveHref,
  wouldCycle,
} from "@/lib/site/menu-edit";
import type { Menu } from "@/lib/db";

function row(id: number, over: Partial<Menu> = {}): Menu {
  return {
    id,
    label: `줄 ${id}`,
    href: `/${id}`,
    parentId: null,
    sortOrder: id * 10,
    audience: "all",
    ...over,
  };
}

// 글(1) ─ 블로그(2) ─ 태그(4)
//       └ 짧은 글(3)
// 연락처(5)
const tree = [
  row(1, { href: null }),
  row(2, { parentId: 1, sortOrder: 10 }),
  row(3, { parentId: 1, sortOrder: 20 }),
  row(4, { parentId: 2 }),
  row(5, { sortOrder: 20 }),
];

describe("resolveHref", () => {
  it("목록에 있는 화면을 받는다", () => {
    expect(resolveHref("/blog", "")).toEqual({ href: "/blog" });
  });

  it("둘 다 비우면 그룹이다", () => {
    expect(resolveHref("", "")).toEqual({ href: null });
  });

  it("바깥 주소를 적으면 그것이 이긴다. https 는 붙여 준다", () => {
    expect(resolveHref("/blog", "books.example.com")).toEqual({
      href: "https://books.example.com",
    });
  });

  it("주소 모양이 아니면 받지 않는다", () => {
    expect(resolveHref("", "캘리브레")).toHaveProperty("error");
  });

  // 폼은 손으로 만들어 보낼 수 있다
  it("목록에 없는 화면은 받지 않는다", () => {
    expect(resolveHref("/admin/없는화면", "")).toHaveProperty("error");
  });

  it("지금 적혀 있는 값은 목록에 없어도 받는다", () => {
    expect(resolveHref("/old", "", "/old")).toEqual({ href: "/old" });
  });
});

describe("isAdminHref", () => {
  it.each([
    ["/admin", true],
    ["/admin/links?manage=1", true],
    ["/administrator", false],
    ["/blog", false],
    [null, false],
  ])("%s → %s", (href, expected) => {
    expect(isAdminHref(href)).toBe(expected);
  });
});

describe("고리 막기", () => {
  it("손주까지 자손으로 센다", () => {
    expect([...descendantIds(tree, 1)].toSorted()).toEqual([2, 3, 4]);
  });

  it("자기 자신이나 제 자손 아래로는 못 간다", () => {
    expect(wouldCycle(tree, 1, 1)).toBe(true);
    expect(wouldCycle(tree, 1, 4)).toBe(true);
  });

  it("다른 가지나 첫 단으로는 간다", () => {
    expect(wouldCycle(tree, 4, 3)).toBe(false);
    expect(wouldCycle(tree, 4, null)).toBe(false);
  });
});

describe("보는 사람 맞추기", () => {
  it("관리자만인 부모 아래는 손주까지 관리자만이 된다", () => {
    const rows = tree.map((r) =>
      r.id === 1 ? { ...r, audience: "admin" } : r,
    );
    expect(audienceFixes(rows).toSorted()).toEqual([2, 3, 4]);
  });

  it("관리 화면으로 가는 줄은 관리자만이 된다", () => {
    expect(audienceFixes([row(1, { href: "/admin/secrets" })])).toEqual([1]);
  });

  it("이미 맞으면 고칠 것이 없다", () => {
    expect(audienceFixes(tree)).toEqual([]);
  });

  it("부모 때문에 묶였는지 알려 준다", () => {
    const rows = tree.map((r) =>
      r.id === 1 ? { ...r, audience: "admin" } : r,
    );
    expect(audienceFromParent(rows, rows[3])).toBe(true);
    expect(audienceFromParent(rows, rows[4])).toBe(false);
  });
});

describe("옮기기", () => {
  it("형제 사이에서 한 칸 올린다", () => {
    expect(movedOrder(tree, 3, "up")).toEqual([3, 2]);
  });

  it("끝에 있으면 더 못 간다", () => {
    expect(movedOrder(tree, 2, "up")).toBeNull();
    expect(movedOrder(tree, 5, "down")).toBeNull();
  });

  it("지우며 올린 자식은 지운 줄이 있던 자리에 선다", () => {
    // 글(1)을 지우면 블로그·짧은 글이 첫 단의 그 자리, 연락처 앞에 온다
    expect(liftedOrder(tree, 1)).toEqual([2, 3, 5]);
  });

  it("10 단위로 다시 매긴다", () => {
    expect(numbered([7, 3])).toEqual([
      { id: 7, sortOrder: 10 },
      { id: 3, sortOrder: 20 },
    ]);
  });
});
