import { expect, test, type Page } from "@playwright/test";
import { login, pressDelete } from "./helpers";
import { sweepBooks } from "./sweep";

/**
 * 읽는 책(MYH-190). 관리 › 글 › 책(/admin/books)에서 적고, 공개 화면 /books 에
 * 지금 읽는 책과 다 읽은 책(연도별)이 나온다. 소개에는 링크 한 줄이다.
 */

/** 4x6 PNG 표지 */
const COVER = {
  name: "e2e-cover.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

async function addBook(
  page: Page,
  { title, status, cover = false }: { title: string; status: "읽는 중" | "다 읽음"; cover?: boolean },
) {
  await page.goto("/admin/books");
  const form = page.getByRole("form", { name: "책 추가" });
  await form.getByLabel("제목").fill(title);
  await form.getByLabel("지은이").fill("e2e 지은이");
  await form.getByLabel("종류").selectOption({ label: "이북" });
  await form.getByLabel("상태").selectOption({ label: status });
  await form.getByLabel("소개").fill(`${title} 를 읽는다.`);
  if (status === "다 읽음") await form.getByLabel("다 읽은 날").fill("2026-09-20");
  if (cover) await form.getByLabel("표지", { exact: true }).setInputFiles(COVER);
  await form.getByRole("button", { name: "추가" }).click();
  await expect(page.locator("#books").getByText(title, { exact: true })).toBeVisible();
}

test.describe("읽는 책", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  test("적은 책이 소개에 나오고, 고치고 지울 수 있다", async ({ page, browser }) => {
    const stamp = Date.now().toString(36);
    const reading = `e2e 읽는 책 ${stamp}`;
    const done = `e2e 다 읽은 책 ${stamp}`;
    await addBook(page, { title: reading, status: "읽는 중", cover: true });
    await addBook(page, { title: done, status: "다 읽음" });

    // 방문자: 위쪽 메뉴 「책」 → /books
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/");
    await visitor
      .getByRole("navigation", { name: "주요 메뉴" })
      .getByRole("link", { name: "책", exact: true })
      .click();
    await expect(visitor).toHaveURL(/\/books$/);
    const now = visitor.getByRole("region", { name: "지금 읽는 책" });
    await expect(now.getByText(reading, { exact: true })).toBeVisible();
    await expect(now.getByAltText(`${reading} 표지`)).toBeVisible();
    const past = visitor.getByRole("region", { name: /다 읽은 책/ });
    await expect(past.getByRole("heading", { name: "2026" })).toBeVisible();
    await expect(past.getByText(done, { exact: true })).toBeVisible();
    // 소개에는 길만 있다
    await visitor.goto("/about");
    await visitor.getByRole("link", { name: /^지금 읽는 책 \d+권/ }).click();
    await expect(visitor).toHaveURL(/\/books$/);
    await context.close();

    // 고치기: 읽는 중 → 다 읽음
    await page.goto("/admin/books");
    const row = page.locator("#books li", { hasText: reading });
    await row.locator(":scope > details > summary").click();
    const edit = page.getByRole("form", { name: `${reading} 고치기` });
    await edit.getByLabel("상태").selectOption({ label: "다 읽음" });
    await edit.getByRole("button", { name: "저장" }).click();
    await expect(
      page
        .locator("#books li", { hasText: reading })
        .locator(":scope > details > summary")
        .getByText("다 읽음"),
    ).toBeVisible();

    // 지우기
    const again = page.locator("#books li", { hasText: done });
    await again.locator(":scope > details > summary").click();
    await pressDelete(again, `${done} 삭제`);
    await expect(page.locator("#books").getByText(done, { exact: true })).toHaveCount(0);
  });
});

test.describe("책 표지 붙여넣기", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  // MYH-199. 서점에서 복사한 그림을 표지 상자에 붙여넣으면 미리보기가 뜨고
  // 저장할 때 함께 올라간다
  test("표지 상자에 붙여넣으면 미리보기가 뜨고 저장된다", async ({ page }) => {
    const title = `e2e 붙인 표지 ${Date.now().toString(36)}`;
    await page.goto("/admin/books");
    const form = page.getByRole("form", { name: "책 추가" });
    await form.getByLabel("제목").fill(title);
    await form.getByLabel("지은이").fill("e2e 지은이");

    const box = form.getByLabel("표지 붙여넣기");
    // 누르면 고르기 창이 아니라 붙여넣을 자리가 잡힌다
    await box.click();
    await expect(box).toBeFocused();
    await expect(box).toContainText("Ctrl+V");
    await box.evaluate((el, pixel) => {
      const bytes = Uint8Array.from(atob(pixel), (c) => c.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], "복사한.png", { type: "image/png" }));
      el.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
      );
    }, COVER.buffer.toString("base64"));
    await box.blur();
    await expect(box.locator("img")).toBeVisible();
    await expect(form.getByText(/새 그림이 저장할 때 올라갑니다/)).toBeVisible();

    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator("#books").getByText(title, { exact: true })).toBeVisible();
    await page.goto("/books");
    await expect(page.getByAltText(`${title} 표지`)).toBeVisible();
  });
});
