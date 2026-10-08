import Link from "next/link";
import Container from "./Container";
import SiteNav from "./SiteNav";
import { isAdmin } from "@/lib/auth";
import { getMenu } from "@/lib/menus";
import { getSite } from "@/lib/site-info";

export default async function Header() {
  const info = await getSite();
  const admin = await isAdmin();
  // 관리자 줄은 getMenu 가 서버에서 거른다. SiteNav 에는 볼 것만 넘어간다.
  const items = await getMenu({ admin });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          {info.name}
        </Link>
        <SiteNav items={items} />
      </Container>
    </header>
  );
}
