import { expect, test } from "@playwright/test";
import {
  ADMIN_PASSWORD,
  login,
  loginScreen,
  logout,
  openPasswordLogin,
} from "./helpers";

const TEMP = "임시비밀번호12"; // 8자

async function change(
  page: import("@playwright/test").Page,
  current: string,
  next: string,
  again = next,
) {
  await page.goto("/admin/security");
  await page.getByLabel("지금 비밀번호").fill(current);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(next);
  await page.getByLabel("새 비밀번호 다시").fill(again);
  await page.getByRole("button", { name: /비밀번호/ }).click();
}

// 비밀번호를 실제로 바꾸므로 다른 시험과 겹치면 안 된다
test.describe.configure({ mode: "serial" });

test.describe("암호설정", () => {
  test("로그인 없이는 볼 수 없다", async ({ page }) => {
    await page.goto("/admin/security");
    await expect(loginScreen(page)).toBeVisible();
  });

  test("지금 비밀번호가 틀리면 바뀌지 않는다", async ({ page }) => {
    await login(page);
    await change(page, "이건아니다아", TEMP);
    await expect(page.getByText("지금 비밀번호가 맞지 않습니다")).toBeVisible();
  });

  test("새 비밀번호 두 개가 다르면 바뀌지 않는다", async ({ page }) => {
    await login(page);
    await change(page, ADMIN_PASSWORD, TEMP, `${TEMP}다름`);
    await expect(page.getByText("새 비밀번호가 서로 다릅니다")).toBeVisible();
  });

  test("지금 쓰는 것과 같으면 바뀌지 않는다", async ({ page }) => {
    await login(page);
    await change(page, ADMIN_PASSWORD, ADMIN_PASSWORD);
    await expect(page.getByText("지금 쓰는 것과 같습니다")).toBeVisible();
  });

  /**
   * 비밀번호를 시험용 값으로 바꿨는데 아직 되돌리지 않았는가.
   *
   * 되돌리는 일은 시험 안(finally)이 아니라 afterAll 에서 **새 브라우저로**
   * 한다(MYH-167). 시험이 시간 제한에 걸려 끝나면 그 시험의 page 는 이미
   * 닫혀 있어서, finally 에서 page.goto 를 부르다 터지고 비밀번호가 시험용
   * 값으로 남았다(2026-09-26). 그 뒤로 로그인이 필요한 시험이 다 깨지고
   * 개발 서버에도 못 들어갔다.
   *
   * 바꿨는지를 기록해 두는 까닭: 되돌릴 필요가 없는데 옛 비밀번호로 로그인해
   * 보면 실패 한 번이 쌓인다. 로그인 실패는 10분에 5번으로 막혀 있다.
   */
  let changed = false;

  test("바꾸면 새 비밀번호로 들어간다", async ({ page }) => {
    await login(page);
    await change(page, ADMIN_PASSWORD, TEMP);
    await expect(page.getByText("비밀번호를 바꿨습니다")).toBeVisible();
    changed = true;

    await page.goto("/admin");
    await logout(page);
    await expect(loginScreen(page)).toBeVisible();

    // 일부러 틀리게 넣어 보지 않는다. 로그인 실패는 10분에 5번으로
    // 막혀 있어서, 시험이 그 횟수를 까먹으면 뒤 시험이 다 막힌다.
    // 틀린 비밀번호를 막는지는 public.spec.ts 에서 본다.
    await openPasswordLogin(page);
    await page.getByLabel("비밀번호").fill(TEMP);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page.getByRole("heading", { name: "받은 메시지" })).toBeVisible();

    // 여기서 되돌려 둔다. 이 줄에 닿지 못하고 끝나면 afterAll 이 되돌린다
    await change(page, TEMP, ADMIN_PASSWORD);
    await expect(page.getByText("비밀번호를 바꿨습니다")).toBeVisible();
    changed = false;
  });

  // 뒤 시험들(과 다음 실행)이 원래 비밀번호를 쓰므로 반드시 되돌린다.
  // 시험의 page 에 기대지 않고 새 브라우저 문맥을 연다.
  test.afterAll(async ({ browser }, testInfo) => {
    if (!changed) return;
    testInfo.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto("/admin");
      await openPasswordLogin(page);
      await page.getByLabel("비밀번호").fill(TEMP);
      await page.getByRole("button", { name: "로그인", exact: true }).click();
      await page.getByRole("heading", { name: "받은 메시지" }).waitFor();
      await change(page, TEMP, ADMIN_PASSWORD);
      await expect(page.getByText("비밀번호를 바꿨습니다")).toBeVisible();
      changed = false;
    } finally {
      await context.close();
    }
  });

  /**
   * 앱 지표는 남에게 주지 않는다.
   *
   * 운영·개발에서는 Caddy 가 공개 도메인의 /metrics 를 404 로 막고, 여기는
   * 앱까지 닿지도 않는다. 검사 환경(Caddy 없이 앱만 도는 곳)에서는 앱이
   * 직접 막는다 — X-Forwarded-For 의 마지막 값이 공인 주소면 없는 주소로
   * 답한다. 어느 쪽이든 404 여야 한다.
   */
  test("지표는 바깥에 보이지 않는다", async ({ page }) => {
    const res = await page.request.get("/metrics", {
      headers: { "X-Forwarded-For": "8.8.8.8" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
    expect(await res.text()).not.toContain("myhome_content");
  });

  // 사설 주소를 적어 보내는 것만으로 통과하면 안 된다. 마지막 값이 기준이다.
  test("사설 주소를 적어 보내도 지표를 주지 않는다", async ({ page }) => {
    const res = await page.request.get("/metrics", {
      headers: { "X-Forwarded-For": "127.0.0.1, 8.8.8.8" },
      maxRedirects: 0,
    });
    expect(res.status()).toBe(404);
  });
});
