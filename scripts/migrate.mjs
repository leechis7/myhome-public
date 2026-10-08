/**
 * 마이그레이션을 적용한다.
 *
 *   node scripts/migrate.mjs
 *
 * drizzle-kit 은 개발 의존성이라 운영 이미지에 없다. 그래서 같은 일을 하는
 * 작은 실행기를 두고, 이미 운영 의존성인 postgres 드라이버로 SQL을 적용한다.
 *
 * 이력은 drizzle-kit 과 똑같은 방식으로 기록한다.
 *   drizzle.__drizzle_migrations (id, hash, created_at)
 *   hash       = 마이그레이션 파일 내용의 sha256
 *   created_at = _journal.json 의 when 값
 * 그래서 이 실행기와 drizzle-kit 을 섞어 써도 어긋나지 않는다.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

// 소스에서 실행할 때는 .env 파일을 읽어 준다. 컨테이너에서는 환경변수로 들어온다.
//
// 순서가 중요하다. loadEnvFile 은 이미 설정된 값을 덮어쓰지 않으므로,
// 개발 DB를 쓰려면 .env.development.local 을 먼저 읽어야 한다.
// 반대로 하면 .env.local 의 운영 주소가 남아 운영 DB를 건드리게 된다.
const envFiles =
  process.env.DRIZZLE_ENV === "dev"
    ? [".env.development.local", ".env.local", ".env"]
    : [".env.local", ".env"];

for (const file of envFiles) {
  try {
    process.loadEnvFile(file);
  } catch {
    // 없으면 넘어간다
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 없습니다.");
  process.exit(1);
}

const dir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");

const sql = postgres(url, {
  max: 1,
  // create table if not exists 같은 데서 나오는 NOTICE 는 조용히 넘긴다
  onnotice: (notice) => {
    // 이미 있음: 테이블(42P07), 스키마(42P06), 확장(42710)
    if (["42P07", "42P06", "42710"].includes(notice.code)) return;
    console.log(`[NOTICE] ${notice.message}`);
  },
});

try {
  const journal = JSON.parse(
    await readFile(path.join(dir, "meta", "_journal.json"), "utf8"),
  );

  // 확장은 스키마가 아니라 DB 준비 작업이다. 마이그레이션보다 먼저 있어야 한다.
  // 0002가 pg_trgm 연산자로 인덱스를 만들기 때문에, 빈 DB에서는 여기서
  // 먼저 만들어 주지 않으면 실패한다.
  await sql`create extension if not exists pg_trgm`;
  await sql`create extension if not exists citext`;

  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  const applied = new Set(
    (await sql`select hash from drizzle.__drizzle_migrations`).map(
      (r) => r.hash,
    ),
  );

  let count = 0;
  for (const entry of journal.entries) {
    const file = path.join(dir, `${entry.tag}.sql`);
    const text = await readFile(file, "utf8");
    const hash = createHash("sha256").update(text).digest("hex");

    if (applied.has(hash)) continue;

    // drizzle-kit 이 넣어 두는 구분자. 한 문장씩 나눠 실행한다.
    const statements = text
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    // 파일 하나가 트랜잭션 하나. 중간에 실패하면 전부 되돌린다.
    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }
      await tx`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${hash}, ${entry.when})
      `;
    });

    console.log(`적용 ${entry.tag}`);
    count += 1;
  }

  console.log(count === 0 ? "적용할 마이그레이션이 없습니다." : `완료 — ${count}개 적용`);
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await sql.end();
}
