import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MonitoringDashboard from "@/components/admin/MonitoringDashboard";
import { isAdmin } from "@/lib/security/auth";
import { siteConfig } from "@/lib/site/settings";

export const metadata: Metadata = {
  title: "감시",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// 같은 도메인 밑의 경로다. Caddy 가 /grafana/* 를 127.0.0.1:53000 으로
// 넘기고, 그 앞에서 forward_auth 로 authorize/route.ts 에 물어본다.
// 다른 도메인(grafana.example.com 같은)을 iframe 에 넣으면 basic auth
// 비밀번호 창이 뜨지 않아 흰 화면이 된다.
//
// 경로는 설치마다 다르다(MYH-170). MONITORING_DASHBOARD 나 관리 › 설정 ›
// 사이트(MYH-232)에 적는다.
// 내 서버는 "/grafana/d/myhome/myhome" — uid 는
// infra/monitoring/grafana/build-dashboard.py 가 박는 값이다.
// 비어 있으면 감시를 붙이지 않은 설치로 보고 그렇다고 알린다.
export default async function AdminMonitoringPage() {
  if (!(await isAdmin())) redirect("/admin");
  const DASHBOARD = (await siteConfig()).monitoringDashboard ?? "";

  // 대시보드는 넓고 높아야 읽힌다. 본문 폭(max-w-3xl)을 벗어나고,
  // main 의 위쪽 여백도 되돌려 첫 화면에 최대한 많이 담는다.
  if (!DASHBOARD) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5">
        <h1 className="text-2xl font-semibold tracking-tight">감시</h1>
        <p className="mt-3 text-sm text-muted">
          감시가 설정되지 않았습니다. Grafana 대시보드를 붙이려면 관리 › 설정 ›
          사이트 의 「환경설정」 이나 환경변수
          <code className="mx-1">MONITORING_DASHBOARD</code>에 대시보드 경로를 적으세요.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto -mt-8 w-full max-w-[110rem] px-5">
      <MonitoringDashboard title="감시" dashboard={DASHBOARD} />
    </div>
  );
}
