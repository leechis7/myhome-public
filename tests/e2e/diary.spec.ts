import { expect, test, type Page } from "@playwright/test";
import { deleteControl, login, pressDelete } from "./helpers";

/**
 * 일기장(MYH-213). 하루 한 편, 달력으로 본다. 암호화해서 저장되는지는 단위
 * 시험(secret-crypto)이 본다 — 비밀글과 같은 자물쇠다.
 *
 * 실제 일기와 겹치지 않게 먼 앞날(2099년)에 쓴다.
 */

/** 1x1 PNG */
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function testDay() {
  const n = Date.now();
  const month = String((n % 12) + 1).padStart(2, "0");
  const day = String((Math.floor(n / 12) % 28) + 1).padStart(2, "0");
  return `2099-${month}-${day}`;
}

/** 시험이 깨져도 그 날 일기를 남기지 않는다 */
async function removeDiary(page: Page, day: string) {
  await page.goto(`/admin/diary/${day}`);
  if (await deleteControl(page, "이 날 일기 지우기").count()) {
    await pressDelete(page, "이 날 일기 지우기");
  }
}

test.describe("일기장", () => {
  const day = testDay();

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await removeDiary(page, day);
  });

  test("하루 한 편을 쓰고, 달력에서 찾고, 고치고 지운다", async ({ page }) => {
    const month = day.slice(0, 7);
    const n = Number(day.slice(8));

    // 내 공간 › 일기장
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await nav.getByText("내 공간", { exact: true }).first().click();
    await nav.getByRole("link", { name: "일기장", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "일기장", level: 1 })).toBeVisible();

    // 아직 안 쓴 날은 곧바로 쓰는 칸
    await page.goto(`/admin/diary/${day}`);
    const form = page.getByRole("form", { name: "일기 쓰기" });
    await form.getByText("😄 좋음").click();
    const body = form.locator('textarea[name="content"]');
    await body.fill("오늘은 시험을 돌렸다.\n\n");
    // 붙여넣은 그림은 암호화해서 올라가고 본문에 한 줄이 들어간다
    await body.evaluate((el, pixel) => {
      const bytes = Uint8Array.from(atob(pixel), (c) => c.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], "일기.png", { type: "image/png" }));
      el.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
      );
    }, PIXEL);
    await expect(body).toHaveValue(/!\[일기\.png\]\(\/admin\/secrets\/files\/\d+\)/);
    await form.getByRole("button", { name: "저장" }).click();

    // 읽는 화면
    await expect(page).toHaveURL(new RegExp(`/admin/diary/${day}$`));
    await expect(page.getByText("오늘은 시험을 돌렸다.")).toBeVisible();
    await expect(page.getByText("😄 좋음")).toBeVisible();
    await expect(page.getByRole("img", { name: "일기.png" })).toBeVisible();

    // 달력에 기분과 함께 찍힌다
    await page.goto(`/admin/diary?month=${month}`);
    await expect(page.getByRole("link", { name: `${n}일 일기 있음 · 좋음` })).toBeVisible();

    // 비밀글 목록에는 섞이지 않는다
    await page.goto("/admin/secrets");
    await expect(page.getByText("오늘은 시험을 돌렸다.")).toHaveCount(0);

    // 고치기: 같은 날을 다시 쓰면 그 일기가 바뀐다(하루 한 편)
    await page.goto(`/admin/diary/${day}`);
    await page.getByRole("link", { name: "고치기" }).click();
    await page.getByRole("form", { name: "일기 쓰기" }).getByText("😴 피곤").click();
    await page.locator('textarea[name="content"]').fill("고쳐 쓴 일기다.");
    await page.getByRole("button", { name: "저장" }).click();
    // 쓰는 칸에도 같은 글자가 있으니, 읽는 화면으로 넘어간 것을 먼저 본다
    await expect(page).toHaveURL(new RegExp(`/admin/diary/${day}$`));
    await expect(page.getByRole("article").getByText("고쳐 쓴 일기다.")).toBeVisible();
    await expect(page.getByText("오늘은 시험을 돌렸다.")).toHaveCount(0);
    await page.goto(`/admin/diary?month=${month}`);
    await expect(page.getByRole("link", { name: `${n}일 일기 있음 · 피곤` })).toBeVisible();

    // 지우기
    await removeDiary(page, day);
    await expect(page).toHaveURL(new RegExp(`/admin/diary\\?month=${month}$`));
    await expect(page.getByRole("link", { name: `${n}일`, exact: true })).toBeVisible();
  });

  test("로그인하지 않으면 일기장에 들어갈 수 없다", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`/admin/diary/${day}`);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("오늘은")).toHaveCount(0);
  });
});
