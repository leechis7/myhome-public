import { expect, test } from "@playwright/test";
import { createPost, login, uniqueTitle } from "./helpers";
import { sweepPosts } from "./sweep";

/**
 * 첫 화면의 많이 읽은 글(MYH-189). 글을 열면 그날 조회가 쌓이고, 첫 화면은
 * 최근 90일 조회 순으로 보인다.
 *
 * 개발 DB 에는 다른 시험이 쌓은 조회도 있어 이 글이 몇 번째일지는 모른다.
 * 기준이 「최근 90일」 로 바뀌는 것과 줄이 조회 순인 것을 본다.
 */
test.describe("많이 읽은 글", () => {
  test.afterEach(async ({ page }) => {
    await sweepPosts(page);
  });

  test("글을 열면 최근 조회로 세고, 조회가 많은 순으로 선다", async ({
    page,
    browser,
  }) => {
    await login(page);
    const id = await createPost(page, {
      title: uniqueTitle("많이읽음"),
      content: "읽히는 글.",
    });

    // 방문자로 연다. 조회는 방문자마다 한 번이다
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto(`/blog/${id}`);
    // 조회는 화면이 뜬 뒤 따로 보낸다. 보낸 것이 들어갈 때까지 기다린다
    await expect
      .poll(async () => {
        const html = await (await visitor.request.get(`/blog/${id}`)).text();
        return /조회 [1-9]/.test(html);
      })
      .toBe(true);

    await visitor.goto("/");
    const section = visitor.getByRole("region", { name: "많이 읽은 글" });
    await expect(section).toBeVisible();
    await expect(section.getByText("최근 90일 조회")).toBeVisible();
    const counts = (await section.getByText(/^조회 \d+$/).allTextContents()).map(
      (t) => Number(t.replace(/\D/g, "")),
    );
    expect(counts.length).toBeGreaterThan(0);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    await context.close();
  });
});
