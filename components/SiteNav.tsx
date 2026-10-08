"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./admin/LogoutButton";
import type { MenuItem } from "@/lib/menus";

/**
 * 위쪽 메뉴. 자료는 트리다(lib/menus.ts) — 잎이면 링크, 가지면 펼침이다.
 *
 * 깊이 제한은 자료에 두지 않고 그리는 쪽이 정한다(MYH-125).
 *   데스크톱   2단까지 펼침. 3단부터는 펼침 안에서 작은 제목 아래 늘어놓는다.
 *              펼침 안에 또 펼침이 나오면 마우스로 지나가다 닫히기 쉽다.
 *   모바일     들여쓰기로 몇 단이든 그린다. 그룹은 접어 두고 첫 단만 보인다.
 *
 * 펼침은 <details> 다. 자바스크립트가 없어도 열리고, 키보드(Enter·Space)와
 * 스크린리더(펼침 상태)는 브라우저가 맡는다. 자바스크립트는 닫는 일만
 * 거든다 — Esc, 바깥 누르기, 포커스가 밖으로 나가기, 화면 옮기기.
 *
 * 로그아웃은 관리자 그룹의 맨 아래에 붙인다. 따로 있던 관리 띠가 없어지며
 * 옮겨 왔다.
 */

/** 갈 곳이 지금 화면인가. 물음표 뒤(?manage=1 같은 것)는 보지 않는다 */
function matches(href: string | null, pathname: string) {
  if (!href || /^https?:/i.test(href)) return false;
  const base = href.split("?")[0];
  // 첫 화면과 관리 첫 화면은 딱 맞을 때만. 앞부분으로 보면 아래가 다 켜진다
  if (base === "/" || base === "/admin") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** 이 줄이나 그 아래 어딘가가 지금 화면인가. 그룹도 함께 켜 둔다 */
function contains(item: MenuItem, pathname: string): boolean {
  return (
    matches(item.href, pathname) ||
    item.children.some((c) => contains(c, pathname))
  );
}

/** 로그아웃을 붙일 그룹. 첫 단의 관리자만인 그룹 중 마지막 것 */
function logoutHost(items: readonly MenuItem[]) {
  return items.findLast((i) => i.adminOnly && i.children.length > 0)?.id;
}

const idle =
  "text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground";
const on = "bg-foreground/[0.07] font-medium text-foreground";

function ItemLink({
  item,
  pathname,
  className,
}: {
  item: MenuItem;
  pathname: string;
  className: string;
}) {
  const current = matches(item.href, pathname);
  return (
    <Link
      href={item.href!}
      aria-current={current ? "page" : undefined}
      className={`${className} ${current ? on : idle}`}
    >
      {item.label}
    </Link>
  );
}

/* ─────────────── 데스크톱 ─────────────── */

/** 펼침 안. 둘째 단은 링크, 셋째 단부터는 작은 제목 아래 묶는다 */
function DropdownItems({
  items,
  pathname,
  depth = 0,
}: {
  items: readonly MenuItem[];
  pathname: string;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? "pl-3" : undefined}>
      {items.map((item) => (
        <li key={item.id}>
          {item.children.length > 0 ? (
            <>
              {item.href ? (
                <ItemLink
                  item={item}
                  pathname={pathname}
                  className="block rounded-md px-3 py-2 text-sm"
                />
              ) : (
                <p className="px-3 pb-1 pt-3 text-xs font-medium text-muted">
                  {item.label}
                </p>
              )}
              <DropdownItems
                items={item.children}
                pathname={pathname}
                depth={depth + 1}
              />
            </>
          ) : item.href ? (
            <ItemLink
              item={item}
              pathname={pathname}
              className="block rounded-md px-3 py-2 text-sm"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Dropdown({
  item,
  pathname,
  logout,
}: {
  item: MenuItem;
  pathname: string;
  logout: boolean;
}) {
  const active = contains(item, pathname);
  return (
    <details className="group relative" data-menu>
      <summary
        className={`flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-2 [&::-webkit-details-marker]:hidden ${
          active ? on : idle
        }`}
      >
        {item.label}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="size-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-border bg-background p-1.5 shadow-lg">
        {/* 그룹에도 갈 곳이 있으면 맨 위에 둔다. 펼치는 단추라 눌러서는 못 간다 */}
        {item.href ? (
          <ItemLink
            item={{ ...item, children: [] }}
            pathname={pathname}
            className="block rounded-md px-3 py-2 text-sm"
          />
        ) : null}
        <DropdownItems items={item.children} pathname={pathname} />
        {logout ? (
          <div className="mt-1.5 border-t border-border pt-1.5">
            <LogoutButton
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${idle}`}
            />
          </div>
        ) : null}
      </div>
    </details>
  );
}

/* ─────────────── 모바일 ─────────────── */

function MobileItems({
  items,
  pathname,
  host,
  depth = 0,
}: {
  items: readonly MenuItem[];
  pathname: string;
  host: number | undefined;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? "ml-3 border-l border-border pl-2" : undefined}>
      {items.map((item) => (
        <li key={item.id}>
          {item.children.length > 0 ? (
            // 그룹은 접어 둔다. 첫 단만 보여야 한눈에 들어온다. 다만 지금
            // 화면이 그 안에 있으면 펼쳐 둔다 — 어디 있는지는 보여야 한다.
            <details open={contains(item, pathname)} className="group">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-3 text-sm [&::-webkit-details-marker]:hidden ${idle}`}
              >
                {item.label}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="ml-3 border-l border-border pl-2">
                {item.href ? (
                  <ItemLink
                    item={{ ...item, children: [] }}
                    pathname={pathname}
                    className="block rounded-md px-3 py-3 text-sm"
                  />
                ) : null}
                <MobileItems
                  items={item.children}
                  pathname={pathname}
                  host={host}
                  depth={0}
                />
                {item.id === host ? (
                  <LogoutButton
                    className={`block w-full rounded-md px-3 py-3 text-left text-sm ${idle}`}
                  />
                ) : null}
              </div>
            </details>
          ) : item.href ? (
            <ItemLink
              item={item}
              pathname={pathname}
              className="block rounded-md px-3 py-3 text-sm"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function SiteNav({ items }: { items: readonly MenuItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openPath, setOpenPath] = useState(pathname);
  const navRef = useRef<HTMLElement>(null);
  const host = logoutHost(items);

  // 경로가 바뀌면 모바일 메뉴를 닫는다 (렌더 중 상태 조정 패턴)
  if (openPath !== pathname) {
    setOpenPath(pathname);
    setOpen(false);
  }

  // 펼침도 화면을 옮기면 닫는다. <details> 는 DOM 이 제 상태를 들고 있다
  useEffect(() => {
    navRef.current
      ?.querySelectorAll("details[open]")
      .forEach((d) => d.removeAttribute("open"));
  }, [pathname]);

  // 펼침을 닫는 길들. 여는 것은 브라우저가 한다
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const opened = () => [...nav.querySelectorAll("details[open]")];

    function onPointerDown(e: PointerEvent) {
      for (const d of opened()) {
        if (!d.contains(e.target as Node)) d.removeAttribute("open");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      for (const d of opened()) {
        d.removeAttribute("open");
        // 닫은 자리로 포커스를 돌려준다. 안에 있던 포커스가 허공에 뜨지 않게
        if (d.contains(document.activeElement)) {
          d.querySelector("summary")?.focus();
        }
      }
    }
    // 탭으로 펼침 밖으로 나가면 닫는다. 열린 채 남아 다른 것을 가리지 않게
    function onFocusOut(e: FocusEvent) {
      const d = (e.target as Element).closest("details");
      if (d && !d.contains(e.relatedTarget as Node | null)) {
        d.removeAttribute("open");
      }
    }
    // 하나를 열면 나머지는 닫는다
    function onToggle(e: Event) {
      const d = e.target as HTMLDetailsElement;
      if (!d.open) return;
      for (const other of opened()) if (other !== d) other.removeAttribute("open");
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    nav.addEventListener("focusout", onFocusOut);
    nav.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      nav.removeEventListener("focusout", onFocusOut);
      nav.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  // 열려 있을 때 Esc로 모바일 메뉴 닫기
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex items-center gap-1">
      {/* 데스크톱 메뉴 */}
      <nav ref={navRef} aria-label="주요 메뉴" className="hidden sm:block">
        <ul className="flex items-center gap-1 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              {item.children.length > 0 ? (
                <Dropdown
                  item={item}
                  pathname={pathname}
                  logout={item.id === host}
                />
              ) : item.href ? (
                <ItemLink
                  item={item}
                  pathname={pathname}
                  className="rounded-md px-3 py-2"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </nav>

      <ThemeToggle />

      {/* 모바일 햄버거 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="grid size-9 place-items-center rounded-md text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground sm:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="size-5"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {/* 모바일 메뉴 패널 */}
      <nav
        id="mobile-menu"
        aria-label="모바일 메뉴"
        hidden={!open}
        className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background sm:hidden"
      >
        <div className="mx-auto w-full max-w-3xl px-5 py-2">
          <MobileItems items={items} pathname={pathname} host={host} />
        </div>
      </nav>
    </div>
  );
}
