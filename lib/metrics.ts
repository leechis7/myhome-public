import { Registry, collectDefaultMetrics, Gauge } from "prom-client";
import { sql } from "drizzle-orm";
import { appVersion } from "@/lib/app-version";
import { mergeContentCounts } from "@/lib/content-counts";
import { getDb } from "@/lib/db";

/**
 * Prometheus 가 긁어 가는 지표.
 *
 * 이미 도는 감시 스택(Caddy·PostgreSQL·컨테이너·바깥에서 찔러 보기)에는
 * 앱 안쪽이 없었다. 요청 수와 응답 시간은 Caddy 가, 컨테이너 메모리는
 * cAdvisor 가 이미 준다. 그래서 여기서는 그 둘이 모르는 것만 낸다 —
 * Node 프로세스 안쪽(힙·이벤트 루프)과 글·댓글·메시지 수다.
 *
 * 레지스트리를 모듈 수준에 한 번만 만든다. next dev 는 모듈을 다시 불러오는
 * 일이 있어, 그때마다 기본 지표를 또 등록하면 중복 등록으로 터진다.
 */
const registry = new Registry();

let started = false;

function start() {
  if (started) return;
  started = true;

  // 힙·이벤트 루프 지체·GC. 컨테이너 바깥에서는 보이지 않는 것들이다.
  collectDefaultMetrics({ register: registry, prefix: "myhome_" });

  // 지금 돌고 있는 판. 배포 뒤 실제로 새 판이 떴는지 대시보드에서 본다.
  new Gauge({
    name: "myhome_build_info",
    help: "지금 도는 앱 버전",
    labelNames: ["version"],
    registers: [registry],
    collect() {
      this.reset();
      this.set({ version: appVersion() ?? "unknown" }, 1);
    },
  });

  /**
   * 글·댓글·메시지 수. 긁힐 때 한 번만 센다(15초에 한 번).
   *
   * 세 가지를 한 질의로 센다 — 지표 하나에 질의 하나씩 두면 긁을 때마다
   * DB 를 여러 번 두드린다.
   */
  new Gauge({
    name: "myhome_content",
    help: "글·댓글·메시지 수",
    labelNames: ["kind", "state"],
    registers: [registry],
    async collect() {
      this.reset();
      try {
        const rows = await getDb().execute<{
          kind: string;
          state: string;
          count: number;
        }>(sql`
          select kind,
                 case
                   when not published then 'draft'
                   when published_at > now() then 'scheduled'
                   when private then 'private'
                   else 'public'
                 end as state,
                 count(*)::int as count
            from posts
           group by kind, state
          union all
          select 'comment', 'all', count(*)::int from comments
          union all
          select 'message',
                 case when read_at is null then 'unread' else 'read' end,
                 count(*)::int
            from messages
           group by 2
        `);
        // 셀 것이 없는 칸도 0 으로 낸다. 빈칸으로 두면 "고장난 건가" 와
        // "정말 없는 건가" 가 구분되지 않는다.
        for (const row of mergeContentCounts([...rows])) {
          this.set({ kind: row.kind, state: row.state }, row.count);
        }
      } catch {
        // DB 가 잠깐 안 될 때 지표까지 500 을 내지는 않는다. 그 순간에는
        // 이 지표만 빠지고, DB 가 죽은 것은 postgres exporter 가 알린다.
        //
        // 여기서 0 을 깔지 않는 것은 일부러다. 못 센 것을 0 으로 내면
        // "글이 다 사라졌다" 로 보인다 — 없는 것과 모르는 것은 다르다.
      }
    },
  });
}

export async function renderMetrics() {
  start();
  return {
    body: await registry.metrics(),
    contentType: registry.contentType,
  };
}
