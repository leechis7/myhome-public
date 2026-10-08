import { asc } from "drizzle-orm";
import { unstable_cache, updateTag } from "next/cache";
import { getDb, menus, type Menu } from "@/lib/db";
import { hasSecretKey } from "@/lib/secret-crypto";

export type MenuAudience = "all" | "admin";

/** 화면에 넘기는 모양 */
export type MenuItem = {
  id: number;
  label: string;
  /** 비어 있으면 순수한 그룹이다 */
  href: string | null;
  /** 관리자만 보는 줄인가. 거르는 것은 이미 끝났다 — 화면이 자리를 정할 때 쓴다 */
  adminOnly: boolean;
  children: MenuItem[];
};

type DefaultMenu = {
  label: string;
  href: string | null;
  audience: MenuAudience;
  children?: readonly DefaultMenu[];
};

/**
 * 처음 메뉴. 코드에 흩어져 있던 것을 옮기고(MYH-123), 따로 있던 관리 화면
 * 메뉴를 "관리" 그룹으로 넣었다.
 *
 * 0029 마이그레이션이 이 값을 넣고(뒤의 0030 · 0031 · 0037 · 0039 · 0040 이 줄을 더한다),
 * "처음 상태로" 가 이 값으로 되돌린다.
 * **둘이 어긋나면 안 된다** — tests/unit/menus.test.ts 가 본다.
 * 순서는 배열 순서이고, DB 에는 10, 20, 30 … 으로 들어간다.
 *
 * - 홈은 왼쪽 이름이 대신하므로 넣지 않는다. 소개는 연락처 화면 안에서
 *   들어간다 — 방문자가 늘 누르는 것이 아니다.
 * - 관리 그룹은 방문자에게 있는지조차 알릴 이유가 없다. 관리자만이다.
 */
export const DEFAULT_MENUS: readonly DefaultMenu[] = [
  { label: "블로그", href: "/blog", audience: "all" },
  { label: "짧은 글", href: "/notes", audience: "all" },
  // 뒤가 아니라 짧은 글 옆이다. 글 쓰는 자리끼리 모은다.
  { label: "비밀글", href: "/admin/secrets", audience: "admin" },
  { label: "프로젝트", href: "/projects", audience: "all" },
  // 0039 가 더한다(MYH-190)
  { label: "책", href: "/books", audience: "all" },
  // 0037 이 더한다(MYH-191)
  { label: "방명록", href: "/guestbook", audience: "all" },
  { label: "연락처", href: "/contact", audience: "all" },
  // 비밀글 · 내 서비스 · 감시는 관리 화면이지만 하루에 몇 번씩 여는 것이라
  // 펼치지 않고 바로 누르게 첫 단에 둔다. 방문자에게는 보이지 않는다.
  { label: "내 서비스", href: "/admin/links", audience: "admin" },
  { label: "감시", href: "/admin/monitoring", audience: "admin" },
  {
    label: "관리",
    href: null,
    audience: "admin",
    /**
     * 여덟 줄이 늘어서 있던 것을 둘로 묶었다(MYH-126). 첫 단은 넷이다.
     *
     * - 메시지가 맨 앞이다. 남이 보낸 것이라 늦게 보면 곤란한 것은 이것뿐이다.
     * - 비밀글 · 내 서비스 · 감시는 여기 없다. 자주 여는 것이라 첫 단에 있다.
     * - 설정 안에서는 "소개" 를 "프로필" 로 부른다. 무엇의 소개인지는 설정
     *   안이라는 자리가 말해 준다. "암호설정" 도 설정 안이라 "암호" 다.
     * - 메뉴 줄을 지워도 /admin/menus 주소로는 늘 들어간다. 막기보다 빠져나갈
     *   길을 남긴다.
     */
    children: [
      { label: "메시지", href: "/admin/messages", audience: "admin" },
      {
        label: "글",
        href: null,
        audience: "admin",
        children: [
          { label: "블로그", href: "/admin/posts", audience: "admin" },
          { label: "짧은 글", href: "/admin/notes", audience: "admin" },
          // 0039 가 더한다(MYH-190)
          { label: "책", href: "/admin/books", audience: "admin" },
        ],
      },
      { label: "프로젝트", href: "/admin/projects", audience: "admin" },
      {
        label: "설정",
        href: null,
        audience: "admin",
        children: [
          { label: "사이트", href: "/admin/site", audience: "admin" },
          { label: "프로필", href: "/admin", audience: "admin" },
          // 0040 이 더한다(MYH-198)
          { label: "이력서", href: "/admin/resume", audience: "admin" },
          { label: "암호", href: "/admin/security", audience: "admin" },
          { label: "메뉴", href: "/admin/menus", audience: "admin" },
          { label: "코드", href: "/admin/codes", audience: "admin" },
        ],
      },
    ],
  },
];

/**
 * 처음 메뉴를 테이블에 넣을 줄로 편다. 번호는 트리를 위에서 아래로 편
 * 순서다 — 0029 가 넣는 번호와 같다.
 */
export function defaultRows() {
  const rows: Menu[] = [];
  const walk = (items: readonly DefaultMenu[], parentId: number | null) => {
    items.forEach(({ children, ...m }, i) => {
      const id = rows.length + 1;
      rows.push({ ...m, id, parentId, sortOrder: (i + 1) * 10 });
      walk(children ?? [], id);
    });
  };
  walk(DEFAULT_MENUS, null);
  return rows;
}

/**
 * 볼 수 있는 줄만 남겨 트리로 엮는다.
 *
 * 관리자가 아니면 관리자 줄을 뺀다. 그 줄에 딸린 것도 함께 빠진다 — 부모가
 * 없으니 붙을 자리가 없다. 모두 보기로 둔 줄이라도 관리자 그룹 아래에
 * 있으면 방문자에게 보이지 않는다.
 *
 * DB 를 보지 않는 순수한 함수라 따로 시험한다.
 */
export function visibleMenu(
  rows: readonly Menu[],
  { admin }: { admin: boolean },
): MenuItem[] {
  const shown = rows
    .filter((r) => admin || r.audience === "all")
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const items = new Map<number, MenuItem>(
    shown.map((r) => [
      r.id,
      {
        id: r.id,
        label: r.label,
        href: r.href,
        adminOnly: r.audience === "admin",
        children: [],
      },
    ]),
  );

  const roots: MenuItem[] = [];
  for (const r of shown) {
    const item = items.get(r.id)!;
    if (r.parentId === null) roots.push(item);
    else items.get(r.parentId)?.children.push(item);
  }
  return roots;
}

/** 메뉴 캐시의 이름. 메뉴를 고친 뒤 invalidateMenus 로 비운다 */
const MENU_TAG = "menus";

/**
 * 메뉴를 **거르지 않고** 통째로 읽는다. 캐시를 씌운다.
 *
 * 메뉴는 모든 화면에 붙어서 요청마다 DB 를 보면 아깝다. 캐시에는 관리자
 * 줄까지 다 들어 있다 — 누가 보는지는 요청마다 다르니 거르는 것은 꺼낸
 * 다음(visibleMenu)에 한다. 캐시는 서버 안에만 있어 바깥으로 나가지 않는다.
 *
 * 고치면 비운다. 그래도 psql 로 손댄 것은 비울 길이 없어 한 시간이 지나면
 * 새로 읽는다.
 */
const readMenus = unstable_cache(
  async () =>
    getDb().select().from(menus).orderBy(asc(menus.sortOrder), asc(menus.id)),
  ["menus"],
  { tags: [MENU_TAG], revalidate: 3600 },
);

/**
 * 고치는 화면이 쓰는 목록. 캐시를 거치지 않는다 — 방금 고친 것이 곧바로
 * 보여야 하고, 관리자만 여는 화면이라 아낄 것도 없다.
 */
export async function listMenus() {
  return getDb()
    .select()
    .from(menus)
    .orderBy(asc(menus.sortOrder), asc(menus.id));
}

/**
 * 지금 보는 사람에게 보여줄 메뉴.
 *
 * 붙이지 않은 기능의 줄은 뺀다(MYH-173). 받아 띄운 사람이 쓰지 않는 것이
 * 메뉴에 있으면 열어 봐야 「설정되지 않았습니다」 뿐이다. 메뉴 관리 화면에는
 * 그대로 남는다.
 *   비밀글  SECRETS_KEY 가 없으면
 *   감시    MONITORING_DASHBOARD 가 없으면
 */
export async function getMenu({ admin }: { admin: boolean }) {
  const off: string[] = [];
  if (!hasSecretKey()) off.push("/admin/secrets");
  if (!process.env.MONITORING_DASHBOARD?.trim()) off.push("/admin/monitoring");
  const rows = (await readMenus()).filter(
    (r) => !off.some((href) => r.href?.startsWith(href)),
  );
  return visibleMenu(rows, { admin });
}

/**
 * 메뉴 캐시를 비운다. 메뉴를 고친 서버 액션에서 부른다.
 *
 * revalidateTag 가 아니라 updateTag 다 — 고친 사람이 바로 다음 화면에서
 * 옛 메뉴를 보지 않게 한다.
 */
export function invalidateMenus() {
  updateTag(MENU_TAG);
}
