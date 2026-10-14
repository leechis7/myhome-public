import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * 카카오 책 검색 키를 화면에서 넣는다(MYH-231). 넣은 키는 다시 보여 주지 않고,
 * 책 추가의 찾기가 카카오로 바뀐다. 진짜 키가 아니라 찾기까지는 부르지 않는다.
 */

test.describe("책 찾기 설정", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("키를 넣고 빼고, 넣은 키는 다시 보이지 않는다", async ({ page }) => {
    await page.goto("/admin/settings#kakao");
    const section = page.locator("#book-search");
    await expect(section.getByRole("heading", { name: "책 찾기", exact: true })).toBeVisible();
    const form = page.getByRole("form", { name: "카카오 키" });
    const input = form.getByLabel("카카오 REST API 키");
    // 이미 키를 넣어 둔 서버(.env 나 화면)라면 건드리지 않는다
    test.skip((await input.count()) === 0, ".env 에 카카오 키가 있다");
    test.skip(((await input.getAttribute("placeholder")) ?? "").startsWith("●"), "이미 카카오 키가 있다");

    await input.fill("짧다");
    await form.getByRole("button", { name: "카카오 키 저장" }).click();
    await expect(page.locator("#kakao").getByRole("status")).toHaveText(/REST API 키/);

    const fake = "e2e0000fake0000kakao0000key00000";
    await page.getByRole("form", { name: "카카오 키" }).getByLabel("카카오 REST API 키").fill(fake);
    await page.getByRole("form", { name: "카카오 키" }).getByRole("button", { name: "카카오 키 저장" }).click();
    await expect(page.locator("#kakao").getByRole("status")).toHaveText("저장했습니다.");
    await expect(page.getByRole("form", { name: "카카오 키" }).getByLabel("카카오 REST API 키")).toHaveAttribute(
      "placeholder",
      /● 설정됨/,
    );
    expect(await page.content()).not.toContain(fake);

    // 책 추가의 찾기가 카카오로 바뀐다
    await page.goto("/admin/books?add=1");
    await expect(page.getByText(/카카오 · .*Open Library 에서 찾습니다/)).toBeVisible();

    // 「지우기」 를 체크하고 저장하면 지운다
    await page.goto("/admin/settings#kakao");
    const again = page.getByRole("form", { name: "카카오 키" });
    await again.getByLabel("지우기").check();
    await again.getByRole("button", { name: "카카오 키 저장" }).click();
    await expect(page.locator("#kakao").getByRole("status")).toHaveText("저장했습니다.");
    await expect(page.getByRole("form", { name: "카카오 키" }).getByLabel("카카오 REST API 키")).not.toHaveAttribute(
      "placeholder",
      /● 설정됨/,
    );
  });

  // MYH-226. 찾는 곳의 차례를 바꾸면 책 추가의 안내에도 그 차례로 적힌다. 끝나면 되돌린다
  test("찾는 곳의 차례를 바꾸고 되돌린다", async ({ page }) => {
    await page.goto("/admin/settings#book-search");
    const form = page.getByRole("form", { name: "책 찾기 출처" });
    // 항목이 접혀 있다가 #주소로 펴진다(MYH-249) - 펴진 뒤에 읽는다
    await expect(form).toBeVisible();
    const names = () => form.locator("li label span:first-of-type").allTextContents();
    const before = await names();
    // 맨 아래 것을 한 칸 올린다
    const last = before.at(-1)!;
    await form.getByRole("button", { name: `${last} 위로` }).click();
    await expect.poll(async () => (await names()).at(-2)).toBe(last);
    // 되돌린다
    await page.getByRole("form", { name: "책 찾기 출처" }).getByRole("button", { name: `${last} 아래로` }).click();
    // 저장 알림은 앞의 것이 남아 있을 수 있다 - 차례가 돌아올 때까지 본다
    await expect.poll(names).toEqual(before);
    await expect(page.locator("#book-search").getByRole("status")).toHaveText("저장했습니다.");
  });
});
