import { defineConfig } from "drizzle-kit";

// Next.js와 달리 drizzle-kit은 환경변수 파일을 자동으로 읽지 않는다.
// 개발 DB를 대상으로 하려면 DRIZZLE_ENV=dev 를 준다.
//
// 순서가 중요하다. loadEnvFile 은 이미 설정된 값을 덮어쓰지 않으므로,
// 개발 DB를 쓰려면 .env.development.local 을 먼저 읽어야 한다.
const envFiles =
  process.env.DRIZZLE_ENV === "dev"
    ? [".env.development.local", ".env.local"]
    : [".env.local"];

for (const file of envFiles) {
  try {
    process.loadEnvFile(file);
  } catch {
    // 파일이 없으면 이미 설정된 환경변수를 그대로 쓴다
  }
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
