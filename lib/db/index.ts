import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof create>;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL이 없습니다. .env.local을 확인하세요 (.env.example 참고)",
    );
  }
  const client = postgres(url, {
    max: 5,
    // NOTICE는 객체 전체가 서버 로그에 찍혀 시끄럽다. 메시지만 남긴다.
    onnotice: (notice) => console.log(`[NOTICE] ${notice.message}`),
  });
  return drizzle(client, { schema });
}

/**
 * dev 서버는 파일이 바뀔 때마다 모듈을 다시 평가하므로,
 * 전역에 보관하지 않으면 커넥션이 계속 늘어난다.
 */
const globalForDb = globalThis as unknown as { db?: Db };

/**
 * 접속은 처음 쓰는 시점에 만든다. 모듈을 불러오는 것만으로는 접속하지
 * 않으므로 DB 없이도 빌드가 통과한다.
 */
export function getDb(): Db {
  if (!globalForDb.db) {
    globalForDb.db = create();
  }
  return globalForDb.db;
}

export * from "./schema";
