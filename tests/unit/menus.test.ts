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
  // 마이그레이션이 넣은 처음 값과 "처음 상태로" 가 되돌릴 값이 같아야 한다
  // 새로 설치하면 0029 가 메뉴를 넣고 0030 이 「사이트」 줄을(MYH-169), 0031 이
  // 「코드」 줄을(MYH-131) 더한다. 그것을 합친 것이 「처음 상태로」 가 되돌릴
  // 값과 같아야 한다. 번호는
  // 달라도 된다 — 모양(이름 · 갈 곳 · 보는 사람 · 형제 순서 · 부모)만 본다.
  it("0029 · 0030 · 0031 · 0037 · 0039 · 0040 · 0042 · 0043 ~ 0049 · 0057 · 0058 이 넣고 옮긴 줄을 합치면 처음 값과 같다", () => {
    const sql = readFileSync("drizzle/0029_add_menus.sql", "utf8");
    const rows = [
      ...sql.matchAll(
        /\((\d+), (NULL|\d+), (\d+), '([^']+)', (NULL|'[^']+'), '(all|admin)'\)/g,
      ),
    ].map(([, id, parentId, sortOrder, label, href, audience]) => ({
      id: Number(id),
      parentId: parentId === "NULL" ? null : Number(parentId),
      sortOrder: Number(sortOrder),
      label,
      href: href === "NULL" ? null : href.slice(1, -1),
      audience,
    }));

    // 0030: 관리 › 설정 의 맨 앞(순서 5)에 「사이트」
    const sql30 = readFileSync("drizzle/0030_add_site_settings.sql", "utf8");
    expect(sql30).toContain("SELECT s.id, 5, '사이트', '/admin/site', 'admin'");
    const 관리 = rows.find((r) => r.label === "관리" && r.parentId === null)!;
    const 설정 = rows.find((r) => r.label === "설정" && r.parentId === 관리.id)!;
    rows.push({
      id: 9999,
      parentId: 설정.id,
      sortOrder: 5,
      label: "사이트",
      href: "/admin/site",
      audience: "admin",
    });

    // 0031: 관리 › 설정 의 「메뉴」 뒤(순서 35)에 「코드」
    const sql31 = readFileSync("drizzle/0031_add_codes.sql", "utf8");
    expect(sql31).toContain("SELECT s.id, 35, '코드', '/admin/codes', 'admin'");
    rows.push({
      id: 9998,
      parentId: 설정.id,
      sortOrder: 35,
      label: "코드",
      href: "/admin/codes",
      audience: "admin",
    });

    // 0037: 첫 단의 프로젝트 뒤(순서 45)에 「방명록」(MYH-191)
    const sql37 = readFileSync("drizzle/0037_add_guestbook.sql", "utf8");
    expect(sql37).toContain("SELECT NULL, 45, '방명록', '/guestbook', 'all'");
    rows.push({
      id: 9997,
      parentId: null,
      sortOrder: 45,
      label: "방명록",
      href: "/guestbook",
      audience: "all",
    });

    // 0039: 첫 단의 프로젝트 뒤(순서 42)에 「책」, 관리 › 글 의 끝(순서 30)에 「책」(MYH-190)
    const sql39 = readFileSync("drizzle/0039_add_book_menus.sql", "utf8");
    expect(sql39).toContain("SELECT NULL, 42, '책', '/books', 'all'");
    expect(sql39).toContain("SELECT g.id, 30, '책', '/admin/books', 'admin'");
    const 글 = rows.find((r) => r.label === "글" && r.parentId === 관리.id)!;
    rows.push(
      {
        id: 9996,
        parentId: null,
        sortOrder: 42,
        label: "책",
        href: "/books",
        audience: "all",
      },
      {
        id: 9995,
        parentId: 글.id,
        sortOrder: 30,
        label: "책",
        href: "/admin/books",
        audience: "admin",
      },
    );

    // 0040: 관리 › 설정 의 프로필 뒤(순서 15)에 「이력서」(MYH-198)
    const sql40 = readFileSync("drizzle/0040_add_resume_details.sql", "utf8");
    expect(sql40).toContain("SELECT s.id, 15, '이력서', '/admin/resume', 'admin'");
    rows.push({
      id: 9994,
      parentId: 설정.id,
      sortOrder: 15,
      label: "이력서",
      href: "/admin/resume",
      audience: "admin",
    });

    // 0042: 첫 단의 관리 바로 앞(관리 순서 - 5)에 「내 공간」 그룹, 첫 단의 비밀글 · 내 서비스 ·
    // 감시를 그 아래 10 · 20 · 30 으로(MYH-212)
    const sql42 = readFileSync("drizzle/0042_add_my_space_menu.sql", "utf8");
    expect(sql42).toContain("SELECT sort_order - 5 FROM");
    expect(sql42).toContain("'내 공간', NULL, 'admin'");
    expect(sql42).toContain("WHEN '/admin/secrets' THEN 10");
    expect(sql42).toContain("WHEN '/admin/links' THEN 20");
    expect(sql42).toContain("ELSE 30");
    rows.push({
      id: 9993,
      parentId: null,
      sortOrder: 관리.sortOrder - 5,
      label: "내 공간",
      href: null,
      audience: "admin",
    });
    const order: Record<string, number> = {
      "/admin/secrets": 10,
      "/admin/links": 20,
      "/admin/monitoring": 30,
    };
    for (const r of rows) {
      if (r.parentId === null && r.href && r.href in order) {
        r.parentId = 9993;
        r.sortOrder = order[r.href];
      }
    }

    // 0043: 내 공간의 맨 앞(순서 5)에 「일기장」(MYH-213)
    const sql43 = readFileSync("drizzle/0043_add_diary.sql", "utf8");
    expect(sql43).toContain("SELECT g.id, 5, '일기장', '/admin/diary', 'admin'");
    rows.push({
      id: 9992,
      parentId: 9993,
      sortOrder: 5,
      label: "일기장",
      href: "/admin/diary",
      audience: "admin",
    });

    // 0044: 내 공간의 일기장 뒤(순서 7)에 「메모」(MYH-215)
    const sql44 = readFileSync("drizzle/0044_add_memos.sql", "utf8");
    expect(sql44).toContain("SELECT g.id, 7, '메모', '/admin/memos', 'admin'");
    rows.push({
      id: 9991,
      parentId: 9993,
      sortOrder: 7,
      label: "메모",
      href: "/admin/memos",
      audience: "admin",
    });

    // 0045: 내 공간의 메모 뒤(순서 8)에 「할 일」(MYH-217)
    const sql45 = readFileSync("drizzle/0045_add_todos.sql", "utf8");
    expect(sql45).toContain("SELECT g.id, 8, '할 일', '/admin/todos', 'admin'");
    rows.push({
      id: 9990,
      parentId: 9993,
      sortOrder: 8,
      label: "할 일",
      href: "/admin/todos",
      audience: "admin",
    });

    // 0046: 내 공간의 일기장 뒤(순서 6)에 「일정」(MYH-214)
    const sql46 = readFileSync("drizzle/0046_add_calendar.sql", "utf8");
    expect(sql46).toContain("SELECT g.id, 6, '일정', '/admin/calendar', 'admin'");
    rows.push({
      id: 9989,
      parentId: 9993,
      sortOrder: 6,
      label: "일정",
      href: "/admin/calendar",
      audience: "admin",
    });

    // 0047: 설정의 「프로필」 을 「프로필 · 이력서」 로, 「이력서」 줄은 지운다(MYH-218)
    const sql47 = readFileSync("drizzle/0047_merge_profile_resume_menu.sql", "utf8");
    expect(sql47).toContain("SET label = '프로필 · 이력서'");
    expect(sql47).toContain("DELETE FROM \"menus\" WHERE href = '/admin/resume'");
    for (const r of rows) {
      if (r.href === "/admin" && r.label === "프로필") r.label = "프로필 · 이력서";
    }
    rows.splice(
      rows.findIndex((r) => r.href === "/admin/resume"),
      1,
    );

    // 0048: 첫 단의 「연락처」 를 뺀다 — 방명록으로 합쳤다(MYH-216)
    const sql48 = readFileSync("drizzle/0048_merge_contact_into_guestbook.sql", "utf8");
    expect(sql48).toContain("DELETE FROM \"menus\" WHERE href = '/contact' AND label = '연락처'");
    rows.splice(
      rows.findIndex((r) => r.href === "/contact"),
      1,
    );

    // 0049: 「프로필 · 이력서」 를 다시 「프로필」 로(MYH-220)
    const sql49 = readFileSync("drizzle/0049_profile_page.sql", "utf8");
    expect(sql49).toContain("SET label = '프로필'");
    for (const r of rows) {
      if (r.href === "/admin" && r.label === "프로필 · 이력서") r.label = "프로필";
    }

    // 0057: 「암호」 바로 앞(그 순서 - 5)에 「환경설정」, 「암호」 는 「보안」 으로(MYH-232)
    const sql57 = readFileSync("drizzle/0057_menu_settings_security.sql", "utf8");
    expect(sql57).toContain("SELECT s.parent_id, s.sort_order - 5, '환경설정', '/admin/settings', 'admin'");
    expect(sql57).toContain("SET \"label\" = '보안' WHERE \"href\" = '/admin/security' AND \"label\" = '암호'");
    const 보안줄 = rows.find((r) => r.href === "/admin/security")!;
    rows.push({
      id: 9998,
      parentId: 보안줄.parentId,
      sortOrder: 보안줄.sortOrder - 5,
      label: "환경설정",
      href: "/admin/settings",
      audience: "admin",
    });
    for (const r of rows) {
      if (r.href === "/admin/security" && r.label === "암호") r.label = "보안";
    }

    // 0058: 프로필은 /admin/profile, 「관리」 맨 앞(그 순서 - 5)에 「대시보드」(MYH-234)
    const sql58 = readFileSync("drizzle/0058_admin_home.sql", "utf8");
    expect(sql58).toContain("UPDATE \"menus\" SET \"href\" = '/admin/profile' WHERE \"href\" = '/admin'");
    expect(sql58).toContain("'대시보드', '/admin', 'admin'");
    for (const r of rows) if (r.href === "/admin") r.href = "/admin/profile";
    const 관리그룹 = rows.find((r) => r.label === "관리" && r.parentId === null)!;
    const 첫줄 = Math.min(...rows.filter((r) => r.parentId === 관리그룹.id).map((r) => r.sortOrder));
    rows.push({
      id: 9997,
      parentId: 관리그룹.id,
      sortOrder: 첫줄 - 5,
      label: "대시보드",
      href: "/admin",
      audience: "admin",
    });

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

    expect(shape(rows, null)).toEqual(shape(defaultRows(), null));
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
