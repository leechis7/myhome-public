import { expect, test } from "@playwright/test";
import { login } from "./helpers";

/**
 * AI 화면(MYH-274): 대화 · 회의 · 음성 탭. 마이크 · AI 엔진에 기대는 것은
 * 보지 않는다(단위 시험 · 손 시험). 화면이 열리고 길이 이어지는지만 본다.
 */
test.describe("AI", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("내 공간 › AI 의 탭으로 대화 · 회의 · 음성을 오간다", async ({ page }) => {
    await page.goto("/admin/ai");
    const tabs = page.getByRole("navigation", { name: "AI" });
    await expect(tabs.getByRole("link", { name: "💬 대화" })).toHaveAttribute("aria-current", "page");

    await tabs.getByRole("link", { name: "🎙 회의" }).click();
    await expect(page).toHaveURL(/\/admin\/ai\/meetings$/);
    await expect(page.getByRole("heading", { name: "회의", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "회의 녹음" })).toBeVisible();
    await expect(page.getByRole("form", { name: "녹음 파일 올리기" })).toBeVisible();

    await tabs.getByRole("link", { name: "🔊 음성" }).click();
    await expect(page).toHaveURL(/\/admin\/ai\/voice$/);
    const list = page.getByRole("list", { name: "음성 기능" });
    await expect(list.getByRole("listitem")).toHaveCount(7);
    await expect(list.getByRole("link", { name: /회의 받아쓰기/ })).toHaveAttribute("href", "/admin/ai/meetings");
  });

  test("휴대폰에서 대화 탭은 텔레그램처럼 한 화면에: 탭 · 입력칸이 함께 보이고 대화만 스크롤", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/admin/ai");
    const input = page.getByRole("textbox", { name: "AI 에게 물을 말" });
    test.skip((await input.count()) === 0, "AI 엔진이 없다");
    await expect(page.getByRole("navigation", { name: "AI" })).toBeInViewport();
    await expect(input).toBeInViewport();
    await expect(page.getByRole("button", { name: "보내기" })).toBeInViewport();
    // 페이지는 스크롤하지 않는다 - 대화 칸만
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
    // 떠 있는 「+」 단추는 AI 화면에서는 숨긴다 - 대화 입력줄의 「보내기」 와 겹쳐서(MYH-275)
    await expect(page.getByRole("button", { name: "빠른 메모" })).toHaveCount(0);
  });
});

