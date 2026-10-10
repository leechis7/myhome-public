import Link from "next/link";
import { isAdmin } from "@/lib/security/auth";

/**
 * 공개 화면에 붙는 관리자 전용 단추. 로그인했을 때만 렌더한다.
 *
 * 보고 있던 화면에서 바로 손을 대려는 것이다 — 전에는 글 하나 쓰거나
 * 오타 하나 고치려고 관리 화면까지 들어가 그 글을 찾아야 했다. 방문자에게는
 * 보이지 않는다. 위쪽 메뉴의 "내 서비스·감시" 와 같은 방식이다
 * (components/Header.tsx).
 *
 * 모양은 관리 화면의 "새 글" 단추와 맞춰 둔다.
 */
export default async function AdminLinkButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  if (!(await isAdmin())) return null;

  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
    >
      {label}
    </Link>
  );
}
