import { and, asc, eq, sql } from "drizzle-orm";
import { codes, getDb, links, type Link } from "@/lib/db";

/** 목록에 쓰는 줄. 분류는 코드 번호와 함께 이름(category)으로 풀어 둔다 */
export type LinkRow = Link & {
  /** 분류 이름. 코드 테이블에서 풀었다. 없으면 null */
  category: string | null;
};

/**
 * 내 서비스 목록. 분류의 순서(codes.sort_order)대로, 그 안에서는 줄 순서대로.
 * 분류가 없는 것은 맨 뒤다.
 */
export async function listLinks(): Promise<LinkRow[]> {
  return getDb()
    .select({
      id: links.id,
      name: links.name,
      url: links.url,
      note: links.note,
      categoryGroup: links.categoryGroup,
      categoryCode: links.categoryCode,
      category: codes.label,
      sortOrder: links.sortOrder,
      createdAt: links.createdAt,
    })
    .from(links)
    .leftJoin(
      codes,
      and(
        eq(codes.groupCode, links.categoryGroup),
        eq(codes.code, links.categoryCode),
      ),
    )
    .orderBy(
      sql`${codes.sortOrder} asc nulls last`,
      asc(links.sortOrder),
      asc(links.name),
    );
}

/** 주소에서 사람이 읽는 부분만. https:// 와 뒤의 경로를 뗀다 */
export function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export type LinkStatus = "살아 있음" | "오류 응답" | "닿지 않음";

/**
 * 주소가 응답하는지 짧게 물어본다.
 *
 * 죽은 주소가 섞여 있어도 눌러 보기 전에는 모른다. 관리 화면을 열 때
 * 한 번씩 물어본다. 오래 붙잡지 않도록 시간 제한을 둔다.
 *
 * 세 가지를 나눈다. 고칠 곳이 다르기 때문이다.
 *   살아 있음   응답이 왔다. 401·403 도 서버는 살아 있는 것으로 본다
 *   오류 응답   서버까지는 닿았는데 5xx 다. 보통 뒤쪽 앱이 죽은 것이다
 *   닿지 않음   이름을 못 찾거나 연결이 안 된다
 *
 * 확인하는 주체는 이 서버다. 집에 있는 공유기 주소처럼 바깥에서만 닿는
 * 것은 브라우저에서 열리는데도 "닿지 않음"으로 나올 수 있다.
 */
export async function checkLink(
  url: string,
  timeoutMs = 3000,
): Promise<LinkStatus> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.status >= 500 ? "오류 응답" : "살아 있음";
  } catch {
    return "닿지 않음";
  }
}

export async function checkLinks(rows: readonly { id: number; url: string }[]) {
  const states = await Promise.all(rows.map((r) => checkLink(r.url)));
  return new Map(rows.map((r, i) => [r.id, states[i]] as const));
}
