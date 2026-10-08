"use client";

import { useTheme } from "@/components/useTheme";

/**
 * Grafana 대시보드를 화면 안에 그린다.
 *
 * Grafana 는 URL 의 theme 파라미터로만 색을 정한다. theme=system 은 URL 로
 * 넘겨도 다크로 떨어지므로, 우리가 읽은 값을 그대로 넘겨 사이트 모드를
 * 따라가게 한다. 모드를 바꾸면 주소가 바뀌어 프레임이 다시 그려진다.
 *
 * 제목과 "새 창에서" 를 한 줄에 같이 둔다. 첫 화면에 대시보드가 최대한
 * 많이 보여야 하는 화면이라, 위에 쌓이는 줄을 하나로 줄였다.
 *
 * 제목 크기는 공개 화면들(PageHeader)과 같다. 위쪽 메뉴로 들어오는 화면이라
 * 여기만 작으면 눈에 걸린다. 대신 아래 여백을 줄였다.
 */
export default function MonitoringDashboard({
  title,
  dashboard,
}: {
  title: string;
  dashboard: string;
}) {
  const theme = useTheme();
  // kiosk 는 Grafana 자체 메뉴와 위쪽 막대를 숨긴다
  const src = theme ? `${dashboard}?kiosk&theme=${theme}` : null;
  const frame =
    "h-[calc(100vh-11rem)] min-h-[30rem] w-full rounded-lg border border-border";

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <a
          href={src ?? dashboard}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          새 창에서 ↗
        </a>
      </div>
      {src ? (
        <iframe src={src} title="myhome 대시보드" className={frame} />
      ) : (
        // 테마를 알기 전에 그리면 다크로 한 번 뜬 뒤 다시 불러오게 된다.
        // 자리만 잡아 두고 하이드레이션을 기다린다.
        <div className={frame} aria-hidden="true" />
      )}
    </>
  );
}
