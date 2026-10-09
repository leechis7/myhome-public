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
  {
    title,
    status,
    cover = false,
    category,
  }: { title: string; status: "읽는 중" | "다 읽음" | "읽고 싶은 책"; cover?: boolean; category?: string },
) {
  await page.goto("/admin/books");
  const form = page.getByRole("form", { name: "책 추가" });
  await form.getByLabel("제목").fill(title);
  await form.getByLabel("지은이").fill("e2e 지은이");
  await form.getByLabel("종류").selectOption({ label: "이북" });
  if (category) await form.getByLabel("분류", { exact: true }).selectOption({ label: category });
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
    // 소개에는 읽는 책 줄을 두지 않는다(MYH-222)
    await visitor.goto("/about");
    await expect(visitor.getByRole("link", { name: /지금 읽는 책/ })).toHaveCount(0);
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

test.describe("책 분류", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  // MYH-225. 분류는 코드 그룹 00005 에서 고르고, /books 에서 분류로 걸러 본다
  test("분류를 고르면 카드에 보이고 분류로 걸러 볼 수 있다", async ({ page, browser }) => {
    const stamp = Date.now().toString(36);
    const novel = `e2e 소설 ${stamp}`;
    const computer = `e2e 컴퓨터 책 ${stamp}`;
    await addBook(page, { title: novel, status: "읽는 중", category: "소설" });
    await addBook(page, { title: computer, status: "다 읽음", category: "컴퓨터" });
    // 관리 목록의 줄에도 분류가 붙는다
    await expect(
      page.locator("#books li", { hasText: novel }).locator(":scope > details > summary"),
    ).toContainText("소설 · 이북");

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/books");
    await expect(visitor.locator("li", { hasText: novel })).toContainText("e2e 지은이 · 소설 · 이북");
    const filters = visitor.getByRole("navigation", { name: "분류" });
    await filters.getByRole("link", { name: /^소설/ }).click();
    await expect(visitor).toHaveURL(/\/books\?category=/);
    await expect(filters.getByRole("link", { name: /^소설/ })).toHaveAttribute("aria-current", "page");
    await expect(visitor.getByText(novel, { exact: true })).toBeVisible();
    await expect(visitor.getByText(computer, { exact: true })).toHaveCount(0);
    // 「전체」 로 돌아오면 다 보인다
    await filters.getByRole("link", { name: "전체" }).click();
    await expect(visitor).toHaveURL(/\/books$/);
    await expect(visitor.getByText(computer, { exact: true })).toBeVisible();
    await context.close();
  });
});

test.describe("읽고 싶은 책", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  // MYH-227. 아직 시작하지 않은 책은 /books 맨 아래 따로 선다
  test("읽고 싶은 책은 따로 모이고, 읽는 중으로 옮길 수 있다", async ({ page, browser }) => {
    const title = `e2e 읽고 싶은 책 ${Date.now().toString(36)}`;
    await addBook(page, { title, status: "읽고 싶은 책" });
    await expect(
      page.locator("#books li", { hasText: title }).locator(":scope > details > summary"),
    ).toContainText("읽고 싶은 책");

    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/books");
    const want = visitor.getByRole("region", { name: /읽고 싶은 책/ });
    await expect(want.getByText(title, { exact: true })).toBeVisible();
    await expect(
      visitor.getByRole("region", { name: "지금 읽는 책" }).getByText(title, { exact: true }),
    ).toHaveCount(0);

    // 읽기 시작하면 위로 올라간다
    const row = page.locator("#books li", { hasText: title });
    await row.locator(":scope > details > summary").click();
    const edit = page.getByRole("form", { name: `${title} 고치기` });
    await edit.getByLabel("상태").selectOption({ label: "읽는 중" });
    await edit.getByRole("button", { name: "저장" }).click();
    await expect(
      page.locator("#books li", { hasText: title }).locator(":scope > details > summary"),
    ).toContainText("읽는 중");
    await visitor.goto("/books");
    await expect(
      visitor.getByRole("region", { name: "지금 읽는 책" }).getByText(title, { exact: true }),
    ).toBeVisible();
    await expect(visitor.getByRole("region", { name: /읽고 싶은 책/ }).getByText(title)).toHaveCount(0);
    await context.close();
  });
});

test.describe("책 찾기", () => {
  // MYH-226. 밖(카카오 · Open Library)에 닿아야 해서 평소 CI 에서는 건너뛴다.
  // 손으로 볼 때: E2E_BOOK_LOOKUP=1 npx playwright test books --workers=1
  test.skip(!process.env.E2E_BOOK_LOOKUP, "밖의 책 검색에 닿는 시험");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  test("ISBN 으로 찾아 고르면 칸이 채워지고 표지까지 저장된다", async ({ page }) => {
    await page.goto("/admin/books");
    const form = page.getByRole("form", { name: "책 추가" });
    await form.getByLabel("책 찾기").fill("9780136083221");
    await form.getByLabel("책 찾기").press("Enter");
    const found = form.getByRole("list", { name: "찾은 책" });
    await found.getByRole("button").first().click();
    await expect(form.getByLabel("제목")).toHaveValue(/Clean Code/);
    await expect(form.getByLabel("지은이")).toHaveValue(/Robert C. Martin/);
    // sweepBooks 가 치우도록 e2e 이름을 붙인다
    const title = `e2e 찾은 책 ${Date.now().toString(36)}`;
    await form.getByLabel("제목").fill(title);
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator("#books").getByText(title, { exact: true })).toBeVisible();
    await page.goto("/books");
    await expect(page.getByAltText(`${title} 표지`)).toBeVisible();
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

test.describe("독서 노트", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepBooks(page);
  });

  // MYH-211. 노트는 책마다 따로 쓰고, 노트가 있는 책만 목록에서 상세로 잇는다
  test("노트와 별점을 쓰면 상세에 보이고, 비우면 링크가 사라진다", async ({
    page,
    browser,
  }) => {
    const title = `e2e 노트 책 ${Date.now().toString(36)}`;
    await addBook(page, { title, status: "읽는 중" });

    // 노트가 없으면 목록에 「독서 노트 읽기」 가 없다
    await page.goto("/books");
    const card = page.locator("li", { hasText: title });
    await expect(card.getByRole("link", { name: "독서 노트 읽기 →" })).toHaveCount(0);

    // 관리: 줄을 펼쳐 「독서 노트 쓰기」
    await page.goto("/admin/books");
    const row = page.locator("#books li", { hasText: title });
    await row.locator(":scope > details > summary").click();
    await row.getByRole("link", { name: "독서 노트 쓰기 →" }).click();
    const form = page.getByRole("form", { name: "독서 노트" });
    await form.getByLabel("별점").selectOption("4");
    await form
      .getByRole("textbox", { name: "독서 노트" })
      .fill("## 남은 것\n\n읽으며 적은 메모다.");
    await form.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장했습니다.")).toBeVisible();

    // 방문자: 카드 → 상세
    const context = await browser.newContext();
    const visitor = await context.newPage();
    await visitor.goto("/books");
    const visitorCard = visitor.locator("li", { hasText: title });
    await expect(visitorCard.getByLabel("별점 5점 만점에 4점")).toHaveText("★★★★☆");
    await visitorCard.getByRole("link", { name: "독서 노트 읽기 →" }).click();
    await expect(visitor).toHaveURL(/\/books\/\d+$/);
    await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
    const note = visitor.getByRole("region", { name: "독서 노트" });
    await expect(note.getByRole("heading", { name: "남은 것" })).toBeVisible();
    await expect(note.getByText("읽으며 적은 메모다.")).toBeVisible();
    // 사이트맵에 들어간다
    const sitemap = await (await visitor.request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(new URL(visitor.url()).pathname);

    // 노트와 별점을 비우면 카드에서 링크와 별이 사라진다. 「저장했습니다」
    // 가 떠 있지 않은 화면에서 시작해야 새 저장을 기다릴 수 있다
    await page.goto(page.url().split("?")[0]);
    await form.getByLabel("별점").selectOption("");
    await form.getByRole("textbox", { name: "독서 노트" }).fill("");
    await form.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장했습니다.")).toBeVisible();
    await visitor.goto("/books");
    const after = visitor.locator("li", { hasText: title });
    await expect(after.getByRole("link", { name: "독서 노트 읽기 →" })).toHaveCount(0);
    await expect(after.getByLabel(/별점/)).toHaveCount(0);
    await context.close();
  });
});
