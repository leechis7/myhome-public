import { defineConfig, devices } from "@playwright/test";

/**
 * 이미 떠 있는 개발 서버를 대상으로 돌린다.
 * 테스트가 글을 만들고 지우므로 운영 주소로는 돌리지 않는다.
 *
 * **Cloudflare 를 거치지 않고 곧장 두드린다.** dev.leechis.dev 로 돌리면
 * 같은 시험이 돌 때마다 다른 자리에서 60초를 기다리다 깨진다 — 프록시가
 * 한 겹 끼면서 늦어지는 만큼 화면이 늦게 차기 때문이다. 앱이 멀쩡한지
 * 보려고 돌리는 시험인데 남의 CDN 사정에 흔들릴 이유가 없다.
 * GitHub 검사도 같은 이유로 localhost 를 쓴다.
 *
 * 127.0.0.1 이 아니라 localhost 다. WebAuthn 은 rpID 로 도메인만 받고
 * IP 는 거절해서, 그러면 패스키 시험이 깨진다(docs/PASSKEY.md).
 *
 * Cloudflare 까지 함께 보고 싶으면 그때만 주소를 준다.
 *   E2E_BASE_URL=https://dev.leechis.dev npx playwright test
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:40002";

export default defineConfig({
  testDir: "./tests/e2e",
  // 같은 DB를 건드리므로 순서대로 하나씩 돌린다
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  // 시험 앞뒤로 시험이 남긴 것을 치운다(tests/e2e/sweep.ts, MYH-158).
  // teardown 은 시험이 깨져도 돈다. 깨진 시험이 남긴 찌꺼기가 다음 실행을
  // 깨뜨리던 것을 막는다.
  projects: [
    {
      name: "뒷정리-앞",
      testMatch: /sweep\.setup\.ts/,
      teardown: "뒷정리-뒤",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "뒷정리-뒤",
      testMatch: /sweep\.teardown\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["뒷정리-앞"],
      testIgnore: /sweep\.(setup|teardown)\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
