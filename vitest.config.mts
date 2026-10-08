import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // 브라우저 테스트(Playwright)는 tests/e2e 에 있고 별도로 돌린다
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
