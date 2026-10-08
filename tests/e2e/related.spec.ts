import { expect, test } from "@playwright/test";
import { createPost, login, uniqueTitle } from "./helpers";
import { sweepPosts } from "./sweep";

/**
 * 관련 글(MYH-188). 같은 태그가 많은 공개 글이 글 끝에 나온다. 겹치는 태그가
 * 없으면 절이 없다.
 */
test.describe("관련 글", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepPosts(page);
  });

  test("겹치는 태그가 많은 글이 먼저 나오고, 없으면 절이 없다", async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const t1 = `e2e관련a${stamp}`;
    const t2 = `e2e관련b${stamp}`;
    const base = uniqueTitle("관련기준");
    const two = uniqueTitle("관련둘");
    const one = uniqueTitle("관련하나");
    const none = uniqueTitle("관련없음");

    const id = await createPost(page, { title: base, content: "기준.", tags: `${t1}, ${t2}` });
    await createPost(page, { title: one, content: "하나.", tags: t1 });
    await createPost(page, { title: two, content: "둘.", tags: `${t2}, ${t1}` });
    const lonely = await createPost(page, {
      title: none,
      content: "없음.",
      tags: `e2e외톨이${stamp}`,
    });

    await page.goto(`/blog/${id}`);
    const section = page.getByRole("region", { name: "관련 글" });
    const links = section.getByRole("link");
    await expect(links).toHaveCount(2);
    // 둘이 겹치는 글이 먼저다
    await expect(links.nth(0)).toContainText(two);
    await expect(links.nth(1)).toContainText(one);

    await page.goto(`/blog/${lonely}`);
    await expect(page.getByRole("region", { name: "관련 글" })).toHaveCount(0);
  });
});
