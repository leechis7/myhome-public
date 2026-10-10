import type { Menu } from "@/lib/db";

/**
 * 메뉴를 고칠 때 쓰는 계산들(MYH-124). DB 를 보지 않는다 — 줄 목록을 받아
 * 무엇을 바꿀지만 돌려준다. 그래서 시험하기 쉽고, 서버 액션은 받은 대로
 * 적기만 한다.
 */

/** 갈 곳으로 고를 수 있는 화면들. 손으로 적게 하면 오타 하나로 깨진 메뉴가 생긴다 */
export const MENU_PAGES = [
  { href: "/blog", label: "블로그" },
  { href: "/notes", label: "짧은 글" },
  { href: "/projects", label: "프로젝트" },
  { href: "/books", label: "책" },
  { href: "/guestbook", label: "방명록 · 연락" },
  { href: "/about", label: "소개" },
  { href: "/resume", label: "이력서" },
  { href: "/admin/diary", label: "내 공간 · 일기장" },
  { href: "/admin/calendar", label: "내 공간 · 일정" },
  { href: "/admin/memos", label: "내 공간 · 메모" },
  { href: "/admin/todos", label: "내 공간 · 할 일" },
  { href: "/admin/secrets", label: "내 공간 · 비밀글" },
  { href: "/admin/links", label: "내 공간 · 내 서비스 (보기)" },
  { href: "/admin/links?manage=1", label: "내 공간 · 내 서비스 (고치기)" },
  { href: "/admin/monitoring", label: "내 공간 · 감시" },
  { href: "/admin/messages", label: "관리 · 메시지" },
  { href: "/admin/posts", label: "관리 · 블로그" },
  { href: "/admin/notes", label: "관리 · 짧은 글" },
  { href: "/admin/books", label: "관리 · 책" },
  { href: "/admin/projects", label: "관리 · 프로젝트" },
  { href: "/admin/site", label: "관리 · 사이트" },
  { href: "/admin/settings", label: "관리 · 환경설정" },
  { href: "/admin", label: "관리 · 대시보드" },
  { href: "/admin/profile", label: "관리 · 프로필 · 이력서" },
  { href: "/admin/security", label: "관리 · 보안" },
  { href: "/admin/menus", label: "관리 · 메뉴" },
  { href: "/admin/codes", label: "관리 · 코드" },
] as const;

/** 관리 화면으로 가는 주소인가. 이런 줄은 방문자에게 보일 이유가 없다 */
export function isAdminHref(href: string | null) {
  return href !== null && /^\/admin(?:$|[/?])/.test(href);
}

/**
 * 폼에서 받은 갈 곳을 정한다.
 *
 * 바깥 주소 칸에 적은 것이 이긴다 — 적었는데 고르는 칸의 옛 값이 이기면
 * 아무 일도 안 일어난 것처럼 보인다(내 서비스의 분류와 같다). 둘 다 비면
 * 그룹이다.
 *
 * 고르는 칸은 목록에 있는 것만 받는다. 폼은 손으로 만들어 보낼 수도 있다.
 * 다만 지금 그 줄에 적혀 있는 값은 목록에 없어도 받는다 — psql 로 넣었던
 * 것을 고치다가 갈 곳을 잃으면 안 된다.
 */
export function resolveHref(
  page: string,
  external: string,
  current: string | null = null,
): { href: string | null } | { error: string } {
  const url = external.trim();
  if (url) {
    const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      const parsed = new URL(full);
      if (!parsed.hostname.includes(".")) throw new Error();
    } catch {
      return { error: "바깥 주소가 주소 모양이 아닙니다." };
    }
    return { href: full };
  }
  if (!page) return { href: null };
  if (page === current || MENU_PAGES.some((p) => p.href === page)) {
    return { href: page };
  }
  return { error: "갈 곳은 목록에서 고르세요." };
}

/** 형제들. 순서 컬럼으로, 같으면 먼저 만든 것이 앞이다 */
export function siblingsOf(rows: readonly Menu[], parentId: number | null) {
  return rows
    .filter((r) => r.parentId === parentId)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

/** 이 줄 아래에 딸린 것 전부(손주까지) */
export function descendantIds(rows: readonly Menu[], id: number) {
  const found = new Set<number>();
  const queue = [id];
  while (queue.length) {
    const at = queue.shift()!;
    for (const r of rows) {
      if (r.parentId === at && !found.has(r.id)) {
        found.add(r.id);
        queue.push(r.id);
      }
    }
  }
  return found;
}

/** 이 부모 아래로 옮기면 고리가 되는가. 자기 자신이나 제 자손 아래로는 못 간다 */
export function wouldCycle(
  rows: readonly Menu[],
  id: number,
  parentId: number | null,
) {
  if (parentId === null) return false;
  return parentId === id || descendantIds(rows, id).has(parentId);
}

/**
 * 관리자만 보게 바꿔야 할 줄들.
 *
 * 자식은 부모보다 넓게 보일 수 없다 — 부모가 관리자만인데 자식이 모두면
 * 보일 길이 없다. 적힌 값과 보이는 것이 어긋나면 헷갈리니 부모를 따라가게
 * 적어 둔다. 관리 화면으로 가는 줄도 관리자만이다.
 *
 * 고친 뒤마다 이것을 돌려 테이블 전체를 맞춘다. 어느 경로로 고쳤든(부모를
 * 바꿨든, 부모의 보는 사람을 바꿨든) 한 곳에서 맞추니 빠뜨릴 데가 없다.
 */
export function audienceFixes(rows: readonly Menu[]) {
  const fixes: number[] = [];
  const walk = (parentId: number | null, inherited: boolean) => {
    for (const r of rows.filter((x) => x.parentId === parentId)) {
      const admin = inherited || r.audience === "admin" || isAdminHref(r.href);
      if (admin && r.audience !== "admin") fixes.push(r.id);
      walk(r.id, admin);
    }
  };
  walk(null, false);
  return fixes;
}

/** 이 줄이 관리자만인 까닭이 부모에게 있는가. 화면에서 알려 준다 */
export function audienceFromParent(rows: readonly Menu[], row: Menu) {
  let parentId = row.parentId;
  while (parentId !== null) {
    const parent = rows.find((r) => r.id === parentId);
    if (!parent) return false;
    if (parent.audience === "admin") return true;
    parentId = parent.parentId;
  }
  return false;
}

/** 형제 사이에서 한 칸 옮긴 뒤의 순서. 끝에 있어 못 옮기면 null */
export function movedOrder(
  rows: readonly Menu[],
  id: number,
  direction: "up" | "down",
) {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const ids = siblingsOf(rows, row.parentId).map((r) => r.id);
  const at = ids.indexOf(id);
  const to = direction === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= ids.length) return null;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  return ids;
}

/**
 * 줄을 지우며 자식을 한 단 위로 올릴 때, 올라간 자식들이 설 자리.
 *
 * 지운 줄이 있던 자리에 자식들이 순서대로 들어선다. 맨 뒤로 몰아 두면
 * 메뉴가 엉뚱하게 섞인다. 돌려주는 것은 그 단의 새 순서다.
 */
export function liftedOrder(rows: readonly Menu[], id: number) {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const children = siblingsOf(rows, row.id).map((r) => r.id);
  return siblingsOf(rows, row.parentId).flatMap((r) =>
    r.id === id ? children : [r.id],
  );
}

/** 순서대로 10, 20, 30 … 을 매긴다. 사이에 끼워 넣을 틈을 남긴다 */
export function numbered(ids: readonly number[]) {
  return ids.map((id, i) => ({ id, sortOrder: (i + 1) * 10 }));
}
