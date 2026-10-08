"use client";

import { logout } from "@/app/admin/actions";

export default function LogoutButton({
  className = "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5",
}: {
  /** 위쪽 메뉴의 관리 그룹 안에서는 메뉴 줄과 같은 모양이어야 해서 바꿔 넣는다 */
  className?: string;
}) {
  return (
    <form action={logout}>
      <button type="submit" className={className}>
        로그아웃
      </button>
    </form>
  );
}
