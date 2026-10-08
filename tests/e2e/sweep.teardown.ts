import { test as teardown } from "@playwright/test";
import { ADMIN_PASSWORD, login } from "./helpers";
import { sweepAll } from "./sweep";

/** 뒤쪽 뒷정리. 하는 일은 sweep.setup.ts 와 같다 — 설명은 거기에 있다 */
teardown("이번 실행이 남긴 것을 치운다", async ({ page }) => {
  teardown.skip(!ADMIN_PASSWORD, "E2E_ADMIN_PASSWORD 가 없어 건너뛴다");
  teardown.setTimeout(5 * 60_000);
  await login(page);
  const tally = await sweepAll(page);
  const done = Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ");
  console.log(done ? `치운 것: ${done}` : "치울 것이 없었다");
});
