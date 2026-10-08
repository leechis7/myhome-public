import { expect, test } from "@playwright/test";
import { login, pressDelete } from "./helpers";

/**
 * 이력서 전용 항목(MYH-198). 관리 › 설정 › 프로필(MYH-218 · MYH-220)에서 적고,
 * /resume 에서
 * 관리자에게는 늘 보이고 방문자에게는 고른 항목만 보인다.
 */
test.describe("이력서 전용 항목", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("적은 자격증은 관리자에게만 보이고, 항목을 켜면 방문자에게도 보인다", async ({
    page,
    browser,
  }) => {
    const name = `e2e 자격증 ${Date.now().toString(36)}`;
    await page.goto("/admin#resume");
    const add = page.getByRole("form", { name: "자격증 추가" });
    await add.getByLabel("취득일").fill("2001-02-03");
    await add.getByLabel("자격증명").fill(name);
    await add.getByLabel("발행처").fill("e2e 발행처");
    await add.getByRole("button", { name: "추가" }).click();
    await expect(page.getByRole("form", { name })).toBeVisible();

    // 처음에는 방문자에게 안 보이는 항목이다
    const visibility = page.getByRole("form", { name: "이력서에 보일 항목" });
    const licenses = visibility.getByLabel("자격증");
    const was = await licenses.isChecked();
    if (was) {
      await licenses.uncheck();
      await visibility.getByRole("button", { name: "저장" }).click();
      await page.waitForLoadState("networkidle");
    }

    await page.goto("/resume");
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByRole("heading", { name: /자격증/ })).toContainText(
      "방문자에게 안 보임",
    );

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/resume");
    await expect(visitor.getByRole("heading", { name: /기술이력서$/ })).toBeVisible();
    expect(await visitor.content()).not.toContain(name);

    // 켜면 방문자에게도 보인다
    await page.goto("/admin#resume");
    await page.getByRole("form", { name: "이력서에 보일 항목" }).getByLabel("자격증").check();
    await page.getByRole("form", { name: "이력서에 보일 항목" }).getByRole("button", { name: "저장" }).click();
    // 저장이 끝날 때까지 다시 열어 본다
    await expect
      .poll(async () => (await (await visitor.request.get("/resume")).text()).includes(name))
      .toBe(true);
    await visitor.reload();
    await expect(visitor.getByText(name)).toBeVisible();
    await context.close();

    // 되돌리고 지운다
    await page.goto("/admin#resume");
    if (!was) {
      await page.getByRole("form", { name: "이력서에 보일 항목" }).getByLabel("자격증").uncheck();
      await page.getByRole("form", { name: "이력서에 보일 항목" }).getByRole("button", { name: "저장" }).click();
      await page.waitForLoadState("networkidle");
      await page.goto("/admin#resume");
    }
    const row = page.locator("li", { has: page.getByRole("form", { name }) });
    await pressDelete(row, `${name} 삭제`);
    await expect(page.getByRole("form", { name })).toHaveCount(0);
  });

  // 옛 주소는 한 화면의 이력서 절로 넘어간다
  test("옛 이력서 관리 주소는 프로필 화면으로 간다", async ({ page }) => {
    await page.goto("/admin/resume");
    await expect(page).toHaveURL(/\/admin(#resume)?$/);
    await expect(page.getByRole("heading", { name: "프로필", level: 1 })).toBeVisible();
    await expect(page.getByRole("form", { name: "기본 인적 사항" })).toBeVisible();
  });

  test("연령과 전산 경력은 저절로 센다", async ({ page }) => {
    await page.goto("/admin#resume");
    const form = page.getByRole("form", { name: "기본 인적 사항" });
    const birth = await form.getByLabel("생년월일").inputValue();
    test.skip(!birth, "생년월일이 없는 DB");
    const [by, bm, bd] = birth.split("-").map(Number);
    const now = new Date();
    const age =
      now.getFullYear() -
      by -
      (now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd) ? 1 : 0);
    await page.goto("/resume");
    await expect(page.getByRole("cell", { name: `${age}세` })).toBeVisible();
    await expect(page.getByRole("cell", { name: /^\d+년$/ })).toBeVisible();
  });

  // 소개에서도 항목을 고른다(MYH-220). 관리자에게는 표시와 함께 다 보인다
  test("소개에 보일 항목을 끄면 방문자에게 그 절이 없다", async ({ page, browser }) => {
    await page.goto("/admin");
    const about = page.getByRole("form", { name: "소개에 보일 항목" });
    const skills = about.getByLabel("기술");
    const was = await skills.isChecked();
    await skills.uncheck();
    await about.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/#visibility$/);

    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /^기술/ })).toContainText("방문자에게 안 보임");

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/about");
    await expect(visitor.getByRole("heading", { name: "소개", level: 1 })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: /^기술/ })).toHaveCount(0);
    await context.close();

    // 되돌린다
    if (was) {
      await page.goto("/admin");
      await page.getByRole("form", { name: "소개에 보일 항목" }).getByLabel("기술").check();
      await page.getByRole("form", { name: "소개에 보일 항목" }).getByRole("button", { name: "저장" }).click();
      await expect(page).toHaveURL(/#visibility$/);
    }
  });
});
