import { expect, test } from "@playwright/test";
import { login, pressDelete, TEST_PREFIX } from "./helpers";

/** 할 일(MYH-217). 더하고 끝내고 되살리고 고치고 지운다 */

test.describe("할 일", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("더하고, 끝내고, 되살리고, 고치고, 지운다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const first = `${TEST_PREFIX}할 일 ${stamp}`;
    const late = `${TEST_PREFIX}넘긴 일 ${stamp}`;
    const timed = `${TEST_PREFIX}시각 일 ${stamp}`;
    const said = `${TEST_PREFIX}운동 ${stamp}`;

    // 내 공간 › 할 일
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await nav.getByText("내 공간", { exact: true }).first().click();
    await nav.getByRole("link", { name: "할 일", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "할 일", level: 1 })).toBeVisible();

    const form = page.getByRole("form", { name: "할 일 더하기" });
    const open = page.getByRole("list", { name: "남은 할 일" });
    await form.getByLabel("새 할 일").fill(first);
    await form.getByRole("button", { name: "더하기" }).click();
    // 저장 뒤 화면이 다시 그려지며 칸이 비워진다. 그 전에 다음 것을 적으면
    // 지워진다(CI 에서 늘 깨졌다) - 첫 것이 목록에 나온 뒤에 적는다
    await expect(open.locator("li", { hasText: first })).toBeVisible();
    await form.getByLabel("새 할 일").fill(late);
    await form.getByLabel("마감일").fill("2020-01-02");
    await form.getByRole("button", { name: "더하기" }).click();

    // 마감을 넘긴 것은 표시가 붙고 맨 위로 온다
    const lateRow = open.locator("li", { hasText: late });
    await expect(lateRow.getByText("넘김 · 1.2")).toBeVisible();
    await expect(open.locator("li").first()).toContainText(late);

    // 시각만 넣으면 오늘 그 시각의 할 일(MYH-245)
    await expect(lateRow).toBeVisible();
    await form.getByLabel("새 할 일").fill(timed);
    await form.getByLabel("시작 시각").fill("23:00");
    await form.getByLabel("끝 시각").fill("23:59");
    await form.getByRole("button", { name: "더하기" }).click();
    const timedRow = open.locator("li", { hasText: timed });
    await expect(timedRow).toContainText(/오늘 · \d+\.\d+ 23:00~23:59/);

    // 칸을 비우고 글에 날짜 · 시각을 쓰면 글에서 읽고 제목에서는 뺀다
    await expect(timedRow).toBeVisible();
    await form.getByLabel("새 할 일").fill(`${said} 내일 오후 7시~9시`);
    await form.getByRole("button", { name: "더하기" }).click();
    const saidRow = open.locator("li", { hasText: said });
    await expect(saidRow).toContainText(/\d+\.\d+ 19:00~21:00/);
    await expect(saidRow).not.toContainText("내일");

    // 끝내기 → 끝낸 일로
    await open.getByRole("button", { name: `${first} 끝냄` }).click();
    await expect(open.locator("li", { hasText: first })).toHaveCount(0);
    await page.getByText(/^끝낸 일 \d+$/).click();
    const done = page.getByRole("list", { name: "끝낸 일" });
    await expect(done.getByText(first)).toBeVisible();

    // 되살리기
    await done.getByRole("button", { name: `${first} 되살리기` }).click();
    await expect(open.locator("li", { hasText: first })).toBeVisible();

    // 고치기: 마감을 빼고 시작일만 두면 넘김 표시가 사라지고 「… 부터」 (MYH-228)
    await lateRow.getByText("고치기").click();
    await lateRow.getByLabel("시작일 고치기").fill("2099-03-01");
    await lateRow.getByLabel("마감일 고치기").fill("");
    await lateRow.getByRole("button", { name: "저장" }).click();
    await expect(open.locator("li", { hasText: late }).getByText(/넘김/)).toHaveCount(0);
    await expect(open.locator("li", { hasText: late })).toContainText("3.1 부터");

    // 지우기
    for (const title of [first, late, timed, said]) {
      await pressDelete(open.locator("li", { hasText: title }), "할 일 삭제");
      await expect(open.locator("li", { hasText: title })).toHaveCount(0);
    }
  });
});
