import { expect, test } from "@playwright/test";
import { login, pressDelete } from "./helpers";
import { sweepGuestbook } from "./sweep";

/**
 * 방명록(MYH-191). 로그인 없이 이름과 한마디를 남기고, 최신 것이 위다.
 * 관리자는 지울 수 있다. 위쪽 메뉴에 있다.
 */
test.describe("방명록", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepGuestbook(page);
  });

  test("방문자가 남기면 위에 서고, 관리자가 지운다", async ({ page, browser }) => {
    const stamp = Date.now().toString(36);
    const first = `e2e 첫 ${stamp}`;
    const second = `e2e 둘 ${stamp}`;

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/");
    await visitor
      .getByRole("navigation", { name: "주요 메뉴" })
      .getByRole("link", { name: "방명록" })
      .click();
    await expect(visitor).toHaveURL(/\/guestbook$/);
    await expect(visitor.getByRole("heading", { name: "방명록" })).toBeVisible();

    for (const [name, body] of [
      [first, "처음 남긴다."],
      [second, "두 번째로 남긴다."],
    ]) {
      await visitor.getByLabel("이름").fill(name);
      await visitor.getByLabel("내용").fill(body);
      await visitor.getByRole("button", { name: "남기기" }).click();
      await expect(visitor.getByText(body)).toBeVisible();
    }
    // 최신이 위
    const items = visitor.getByRole("region", { name: "남긴 글" }).locator("li");
    await expect(items.nth(0)).toContainText(second);
    await expect(items.nth(1)).toContainText(first);
    // 방문자에게는 지우기가 없다
    await expect(items.nth(0).getByText("삭제")).toHaveCount(0);

    // 빈 칸은 받지 않는다(브라우저가 먼저 막는다)
    expect(
      await visitor.getByLabel("내용").evaluate((el: HTMLTextAreaElement) => el.validity.valid),
    ).toBe(false);
    await context.close();

    // 관리자가 지운다
    await page.goto("/guestbook");
    const mine = page
      .getByRole("region", { name: "남긴 글" })
      .locator("li", { hasText: second });
    await pressDelete(mine);
    await expect(page.getByText("두 번째로 남긴다.")).toHaveCount(0);
  });
});
