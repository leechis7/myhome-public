import { expect, test } from "@playwright/test";
import { login, loginScreen } from "./helpers";

// Grafana 화면 자체는 여기서 보지 않는다. 문을 지키는 쪽과 프레임에 넘기는
// 주소만 본다 — 대시보드 안까지 시험이 들어가면 Grafana 판이 바뀔 때마다
// 깨진다.
test.describe("감시 화면", () => {
  test("로그인 없이는 볼 수 없다", async ({ page }) => {
    await page.goto("/admin/monitoring");
    await expect(loginScreen(page)).toBeVisible();
  });

  test("로그인 없이는 forward_auth 가 401 을 준다", async ({ request }) => {
    const res = await request.get("/admin/monitoring/authorize");
    expect(res.status()).toBe(401);
    // basic auth 창이 뜨면 iframe 안에서 흰 화면이 된다
    expect(res.headers()["www-authenticate"]).toBeUndefined();
  });

  test("로그인하면 대시보드 자리와 통과 응답이 있다", async ({ page }) => {
    await login(page);
    await page.goto("/admin/monitoring");
    await expect(page.getByRole("heading", { name: "감시" })).toBeVisible();
    await expect(page.locator("iframe")).toHaveAttribute(
      "src",
      /^\/grafana\/d\/myhome\//,
    );

    const res = await page.request.get("/admin/monitoring/authorize");
    expect(res.status()).toBe(200);
  });

  // Grafana 는 URL 의 theme 파라미터로만 색을 정한다. 사이트 모드를 따라가는지
  // 본다 — 안 따라가면 라이트 화면에 검은 대시보드가 박힌다.
  test("대시보드가 화면 모드를 따라간다", async ({ page }) => {
    await login(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/admin/monitoring");
    await expect(page.locator("iframe")).toHaveAttribute("src", /theme=light/);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("iframe")).toHaveAttribute("src", /theme=dark/);
  });
});
