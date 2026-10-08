import { expect, test, type Page } from "@playwright/test";
import { login, openAllCodes, uniqueTitle } from "./helpers";
import { sweepCodes, sweepPosts } from "./sweep";

/**
 * 연재(MYH-187). 연재 이름은 코드 화면의 「연재」 그룹에서 더하고, 글 쓰기에서
 * 고른다. 같은 연재의 글은 글 끝 상자에서 발행일 순으로 이어진다.
 */

async function addSeries(page: Page, name: string) {
  await page.goto("/admin/codes");
  await openAllCodes(page);
  const section = page.getByRole("region", { name: "연재", exact: true });
  const form = section.locator("form").last();
  await form.getByLabel("새 연재", { exact: true }).fill(name);
  await form.getByRole("button", { name: "추가" }).click();
  await expect(
    section.locator(`input[name="label"][value="${name}"]`),
  ).toBeVisible();
}

async function writeInSeries(
  page: Page,
  title: string,
  series: string,
  button: "발행하기" | "임시저장" = "발행하기",
) {
  await page.goto("/admin/posts/new");
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("본문").fill(`${title} 의 본문이다.`);
  await page.getByLabel("연재").selectOption({ label: series });
  await page.getByRole("button", { name: button }).click();
  await page.getByRole("heading", { name: "글 수정" }).waitFor();
  return Number(page.url().match(/\/admin\/posts\/(\d+)/)![1]);
}

test.describe("연재", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    // 글이 연재를 쓰는 동안은 연재를 못 지운다. 글부터 치운다
    await sweepPosts(page);
    await sweepCodes(page);
  });

  test("같은 연재의 글이 발행일 순으로 이어지고, 안 낸 편은 세지 않는다", async ({
    page,
    browser,
  }) => {
    const name = `e2e 연재 ${Date.now().toString(36)}`;
    await addSeries(page, name);

    const first = uniqueTitle("연재1");
    const second = uniqueTitle("연재2");
    const draft = uniqueTitle("연재3");
    const a = await writeInSeries(page, first, name);
    const b = await writeInSeries(page, second, name);
    await writeInSeries(page, draft, name, "임시저장");

    // 고른 연재가 글 쓰기 화면에 남는다
    await page.goto(`/admin/posts/${b}`);
    await expect(page.getByLabel("연재")).toHaveValue(/.+/);

    // 방문자: 공개된 두 편만 센다
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto(`/blog/${b}`);
    await expect(visitor.getByText(`연재 · ${name} (2/2)`)).toBeVisible();
    const box = visitor.getByRole("navigation", { name: `연재 ${name}` });
    await expect(box.getByRole("listitem")).toHaveCount(2);
    await expect(box.getByText(draft)).toHaveCount(0);
    await expect(box.locator('[aria-current="page"]')).toContainText(second);
    await expect(box.getByRole("link", { name: "다음 편 →" })).toHaveCount(0);
    await box.getByRole("link", { name: "← 이전 편" }).click();
    await expect(visitor).toHaveURL(new RegExp(`/blog/${a}$`));
    await expect(visitor.getByText(`연재 · ${name} (1/2)`)).toBeVisible();
    await context.close();

    // 연재를 빼면 상자가 없다
    await page.goto(`/admin/posts/${a}`);
    await page.getByLabel("연재").selectOption("");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await page.goto(`/blog/${b}`);
    await expect(
      page.getByRole("navigation", { name: `연재 ${name}` }),
    ).toHaveCount(0);
  });
});
