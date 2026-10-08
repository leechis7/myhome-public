import { expect, test, type Browser, type Page } from "@playwright/test";
import { login, uniqueTitle } from "./helpers";
import { sweepPosts } from "./sweep";

/**
 * 예약 발행(MYH-194). 발행 시각을 앞날로 적으면 그때까지 방문자에게는 없는
 * 글이고, 관리자에게는 「예약」 딱지가 붙어 보인다.
 */

/** 내일 이 시각을 칸에 넣는 모양으로(한국 시간) */
function tomorrow() {
  const kst = new Date(Date.now() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

/** 로그인하지 않은 눈으로 본다 */
async function asVisitor<T>(browser: Browser, look: (page: Page) => Promise<T>) {
  const context = await browser.newContext();
  try {
    return await look(await context.newPage());
  } finally {
    await context.close();
  }
}

async function schedulePost(page: Page, title: string) {
  await page.goto("/admin/posts/new");
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("본문").fill("예약한 글의 본문이다.");
  await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible();
  await page.getByLabel("발행 시각").fill(tomorrow());
  // 앞날을 고르면 단추 이름이 바뀐다
  await page.getByRole("button", { name: "예약 발행" }).click();
  await page.getByRole("heading", { name: "글 수정" }).waitFor();
  return Number(page.url().match(/\/admin\/posts\/(\d+)/)![1]);
}

test.describe("예약 발행", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepPosts(page);
  });

  test("예약한 글은 그 시각까지 방문자에게 없고, 지금 발행하면 보인다", async ({
    page,
    browser,
  }) => {
    const title = uniqueTitle("예약");
    const id = await schedulePost(page, title);

    // 글 쓰기 화면: 언제 공개되는지와 예약 단추들
    await expect(page.getByText(/에 공개됩니다/)).toBeVisible();
    await expect(page.getByRole("button", { name: "지금 발행" })).toBeVisible();
    await expect(page.getByRole("button", { name: "예약 취소" })).toBeVisible();

    // 관리 목록에 예약 딱지
    await page.goto("/admin/posts");
    const row = page.locator("li", { hasText: title });
    await expect(row.getByText(/^예약 · /)).toBeVisible();

    // 관리자는 공개 화면에서 미리 본다. 딱지가 붙는다
    await page.goto(`/blog/${id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(/^예약 · /)).toBeVisible();

    // 방문자에게는 없다 - 목록 · 글 · RSS · 사이트맵
    await asVisitor(browser, async (visitor) => {
      expect((await visitor.goto(`/blog/${id}`))!.status()).toBe(404);
      await visitor.goto("/blog");
      await expect(visitor.getByRole("link", { name: title })).toHaveCount(0);
      const rss = await (await visitor.request.get("/rss.xml")).text();
      expect(rss).not.toContain(title);
      const sitemap = await (await visitor.request.get("/sitemap.xml")).text();
      expect(sitemap).not.toContain(`/blog/${id}<`);
    });

    // 지금 발행하면 방문자에게도 보인다
    await page.goto(`/admin/posts/${id}`);
    await page.getByRole("button", { name: "지금 발행" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await expect(page.getByRole("button", { name: "지금 발행" })).toHaveCount(0);
    await asVisitor(browser, async (visitor) => {
      expect((await visitor.goto(`/blog/${id}`))!.status()).toBe(200);
      await expect(visitor.getByText(/^예약 · /)).toHaveCount(0);
    });
  });

  test("예약을 거두면 임시저장이 되고, 시각을 바꾸면 옮겨진다", async ({
    page,
  }) => {
    const title = uniqueTitle("예약취소");
    const id = await schedulePost(page, title);

    // 시각을 옮긴다(모레)
    const later = new Date(Date.now() + 48 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
    await page.getByLabel("발행 시각").fill(later);
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await expect(page.getByLabel("발행 시각")).toHaveValue(later);

    await page.getByRole("button", { name: "예약 취소" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await expect(page.getByLabel("발행 시각")).toHaveValue("");
    await expect(page.getByRole("button", { name: "발행하기" })).toBeVisible();
    await page.goto("/admin/posts");
    await expect(
      page.locator("li", { hasText: title }).getByText("임시저장"),
    ).toBeVisible();
    expect(id).toBeGreaterThan(0);
  });
});
