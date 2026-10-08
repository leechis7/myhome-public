import { test as setup } from "@playwright/test";
import { ADMIN_PASSWORD, login } from "./helpers";
import { sweepAll } from "./sweep";

/**
 * 시험 앞뒤로 한 번씩 돈다(playwright.config.ts 의 「뒷정리」 프로젝트).
 *
 * - 앞: 지난 실행이 깨지며 남긴 것을 치운다. 그래야 이번 실행이 빈 자리에서 시작한다
 * - 뒤: 이번 실행이 남긴 것을 치운다. **시험이 깨져도 돈다** — 그것이 teardown 이다
 *
 * 관리자 비밀번호가 없으면(로그인이 필요한 시험을 안 돌리는 실행) 건너뛴다.
 * 그때는 시험이 만든 것도 없다.
 */
setup("시험이 남긴 것을 치운다", async ({ page }) => {
  setup.skip(!ADMIN_PASSWORD, "E2E_ADMIN_PASSWORD 가 없어 건너뛴다");
  setup.setTimeout(5 * 60_000);
  await login(page);
  const tally = await sweepAll(page);
  const done = Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(done ? `치운 것: ${done}` : "치울 것이 없었다");
});
