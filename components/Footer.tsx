import Container from "./Container";
import { appVersion } from "@/lib/app-version";
import { getSite } from "@/lib/site-info";

export default async function Footer() {
  const info = await getSite();
  const version = appVersion();
  // 관리 입구는 여기 없다. 위쪽 메뉴의 "관리" 그룹이 그 일을 한다(MYH-125).

  return (
    <footer className="mt-auto border-t border-border py-8 text-sm text-foreground/60">
      <Container className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2">
          <span>{`© ${new Date().getFullYear()} ${info.name}`}</span>
          {version ? (
            <span className="text-faint tabular-nums">{`v${version}`}</span>
          ) : null}
        </p>
        <ul className="flex gap-4">
          <li>
            <a
              href="/rss.xml"
              className="transition-colors hover:text-foreground"
            >
              RSS
            </a>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
