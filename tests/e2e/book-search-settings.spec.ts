import { expect, test } from "@playwright/test";
import { login, pressDelete } from "./helpers";

/**
 * 카카오 책 검색 키를 화면에서 넣는다(MYH-231). 넣은 키는 다시 보여 주지 않고,
 * 책 추가의 찾기가 카카오로 바뀐다. 진짜 키가 아니라 찾기까지는 부르지 않는다.
 */

test.describe("책 찾기 설정", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("키를 넣고 빼고, 넣은 키는 다시 보이지 않는다", async ({ page }) => {
    await page.goto("/admin/settings#book-search");
    const section = page.locator("#book-search");
    await expect(section.getByRole("heading", { name: "카카오", exact: true })).toBeVisible();
    // 이미 키를 넣어 둔 서버라면 건드리지 않는다
    test.skip((await section.getByText(/^● /).count()) > 0, "이미 카카오 키가 있다");

    const form = page.getByRole("form", { name: "카카오 키" });
    await form.getByLabel("REST API 키").fill("짧다");
    await form.getByRole("button", { name: "카카오 키 저장" }).click();
    await expect(page.getByRole("status")).toHaveText(/REST API 키/);

    const fake = "e2e0000fake0000kakao0000key00000";
    await page.getByRole("form", { name: "카카오 키" }).getByLabel("REST API 키").fill(fake);
    await page.getByRole("form", { name: "카카오 키" }).getByRole("button", { name: "카카오 키 저장" }).click();
    await expect(page.getByRole("status")).toHaveText("카카오 키를 저장했습니다.");
    await expect(section.getByText(/● 설정됨/)).toBeVisible();
    expect(await page.content()).not.toContain(fake);

    // 책 추가의 찾기가 카카오로 바뀐다
    await page.goto("/admin/books?add=1");
    await expect(page.getByText(/카카오\(없으면 Open Library\) 에서 찾습니다/)).toBeVisible();

    await page.goto("/admin/settings#book-search");
    await pressDelete(page, "카카오 키 지우기");
    await expect(page.getByRole("status")).toHaveText("카카오 키를 지웠습니다.");
    await expect(page.locator("#book-search").getByText(/○ 설정 안 됨/)).toBeVisible();
  });
});
