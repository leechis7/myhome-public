import { expect, test } from "@playwright/test";
import { deleteControl, login, pressDelete, TEST_PREFIX } from "./helpers";

/**
 * 빠른 메모(MYH-215). 화면에서 쓰고 고치고 지우고, 일기로 옮긴다.
 * 텔레그램에서 오는 길은 단위 시험(telegram-inbox)이 문을 보고, 여기서는
 * 토큰 없는 요청이 막히는 것만 본다 — 맞는 요청은 봇이 실제로 답장을 보낸다.
 */

test.describe("메모", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("쓰고, 고치고, 일기로 옮기고, 지운다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const first = `${TEST_PREFIX}메모 ${stamp}`;
    const edited = `${TEST_PREFIX}고친 메모 ${stamp}`;

    // 내 공간 › 메모
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await nav.getByText("내 공간", { exact: true }).first().click();
    await nav.getByRole("link", { name: "메모", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "메모", level: 1 })).toBeVisible();

    await page.getByLabel("새 메모").fill(first);
    await page.getByRole("button", { name: "메모하기" }).click();
    const list = page.getByRole("list", { name: "메모 목록" });
    const item = list.locator("li", { hasText: first });
    await expect(item).toBeVisible();

    // 고치기
    await item.getByText("고치기").click();
    await item.getByLabel("메모 고치기").fill(edited);
    await item.getByRole("button", { name: "저장" }).click();
    const again = list.locator("li", { hasText: edited });
    await expect(again).toBeVisible();
    await expect(list.locator("li", { hasText: first })).toHaveCount(0);

    // 일기로 옮기기 - 오늘 일기가 이미 있으면 남의 일기를 건드리지 않게 건너뛴다
    const today = await again.locator("time").getAttribute("datetime");
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(today!),
    );
    await page.goto(`/admin/diary/${day}`);
    const hadDiary = (await deleteControl(page, "이 날 일기 지우기").count()) > 0;
    if (!hadDiary) {
      await page.goto("/admin/memos");
      await list.locator("li", { hasText: edited }).getByRole("button", { name: "일기로 옮기기" }).click();
      await expect(page.getByRole("status")).toContainText(`${day} 일기`);
      await expect(list.locator("li", { hasText: edited }).getByText("일기로 옮김")).toBeVisible();
      await page.getByRole("link", { name: `${day} 일기` }).click();
      await expect(page.getByRole("article").getByText(edited)).toBeVisible();
      await pressDelete(page, "이 날 일기 지우기");
    }

    // 지우기
    await page.goto("/admin/memos");
    await pressDelete(list.locator("li", { hasText: edited }), "메모 삭제");
    await expect(list.locator("li", { hasText: edited })).toHaveCount(0);
  });

  test("토큰 없이 들어온 웹훅은 막는다", async ({ request }) => {
    const res = await request.post("/telegram/webhook", {
      data: { message: { chat: { id: 1 }, text: "가짜" } },
    });
    // 받기를 끈 서버(TELEGRAM_INBOX=off)면 404 다. 어느 쪽이든 받지 않는다
    expect([401, 404]).toContain(res.status());
    const wrong = await request.post("/telegram/webhook", {
      headers: { "x-telegram-bot-api-secret-token": "wrong-token" },
      data: { message: { chat: { id: 1 }, text: "가짜" } },
    });
    expect([401, 404]).toContain(wrong.status());
  });

  // MYH-223. 어디서나 띄우는 단추. 저장해도 보던 화면에 있다
  test("떠 있는 단추로 어느 화면에서나 메모한다", async ({ page, browser }) => {
    const text = `${TEST_PREFIX}빠른 단추 ${Date.now().toString(36)}`;
    await page.goto("/blog");
    await page.getByRole("button", { name: "빠른 메모" }).click();
    await page.getByRole("form", { name: "빠른 메모" }).getByLabel("메모").fill(text);
    await page.getByRole("form", { name: "빠른 메모" }).getByRole("button", { name: "메모하기" }).click();
    await expect(page.getByText("📝 메모했습니다")).toBeVisible();
    await expect(page).toHaveURL(/\/blog$/);

    await page.goto("/admin/memos");
    const list = page.getByRole("list", { name: "메모 목록" });
    await expect(list.locator("li", { hasText: text })).toBeVisible();
    await pressDelete(list.locator("li", { hasText: text }), "메모 삭제");

    // 할 일 탭: 기간을 붙여 넣으면 할 일 목록에 들어간다(MYH-228)
    const todo = `${TEST_PREFIX}빠른 할 일 ${Date.now().toString(36)}`;
    await page.goto("/notes");
    await page.getByRole("button", { name: "빠른 메모" }).click();
    const quick = page.getByRole("form", { name: "빠른 메모" });
    await quick.getByRole("tab", { name: "✅ 할 일" }).click();
    await quick.getByLabel("할 일", { exact: true }).fill(todo);
    await quick.getByLabel("시작일").fill("2099-01-01");
    await quick.getByLabel("마감일").fill("2099-01-02");
    await quick.getByRole("button", { name: "더하기" }).click();
    await expect(page.getByText("✅ 할 일에 넣었습니다")).toBeVisible();
    await page.goto("/admin/todos");
    const open = page.getByRole("list", { name: "남은 할 일" });
    await expect(open.locator("li", { hasText: todo })).toContainText("1.1 ~ 1.2");
    await pressDelete(open.locator("li", { hasText: todo }), "할 일 삭제");
    // 마지막 탭을 기억한다 - 다음 시험을 위해 메모로 되돌린다
    await page.getByRole("button", { name: "빠른 메모" }).click();
    await expect(page.getByRole("tab", { name: "✅ 할 일" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "📝 메모" }).click();

    // 방문자에게는 단추가 없다
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/blog");
    await expect(visitor.getByRole("heading", { name: "블로그", level: 1 })).toBeVisible();
    await expect(visitor.getByRole("button", { name: "빠른 메모" })).toHaveCount(0);
    await context.close();
  });
});
