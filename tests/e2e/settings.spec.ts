import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * .env 에만 있던 환경설정을 화면에서 정한다(MYH-232). Search Console 값으로
 * 넣고 빼 본다 - 넣으면 모든 화면 머리에 확인 태그가 붙는다. 이미 .env · 화면에
 * 값이 있는 서버면 건드리지 않는다.
 */

test.describe("환경설정", () => {
  // 서비스마다 칸이 따로다(텔레그램 · 구글 · 카카오 · Gemini · 통계 · 감시)
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Search Console 값을 넣으면 머리에 태그가 붙고, 비우면 빠진다", async ({ page }) => {
    await page.goto("/admin/settings#google");
    const form = page.getByRole("form", { name: "Search Console" });
    const input = form.getByLabel("Search Console 소유 확인");
    test.skip((await input.count()) === 0, ".env 에 값이 있다");
    test.skip((await input.inputValue()) !== "", "이미 넣어 둔 값이 있다");

    // 모양이 틀린 값은 받지 않는다(대화방 번호가 .env 에 있으면 칸이 없다)
    const telegram = page.getByRole("form", { name: "텔레그램" });
    const chat = telegram.getByLabel("텔레그램 대화방 번호");
    if ((await chat.count()) > 0 && (await chat.inputValue()) === "") {
      await chat.fill("내 방");
      await telegram.getByRole("button", { name: "텔레그램 저장" }).click();
      await expect(page.locator("#telegram").getByRole("status")).toHaveText(/대화방 번호는 숫자/);
      await page.goto("/admin/settings#google");
    }
    await form.getByLabel("Search Console 소유 확인").fill("e2e-verify-232");
    await form.getByRole("button", { name: "Search Console 저장" }).click();
    await expect(page.locator("#google").getByRole("status")).toHaveText("저장했습니다.");
    await page.goto("/");
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute(
      "content",
      "e2e-verify-232",
    );

    await page.goto("/admin/settings#google");
    await expect(form.getByLabel("Search Console 소유 확인")).toHaveValue("e2e-verify-232");
    await form.getByLabel("Search Console 소유 확인").fill("");
    await form.getByRole("button", { name: "Search Console 저장" }).click();
    await expect(page.locator("#google").getByRole("status")).toHaveText("저장했습니다.");
    await page.goto("/");
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveCount(0);
  });
});
