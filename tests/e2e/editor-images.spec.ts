import { expect, test, type Locator, type Page } from "@playwright/test";
import { login, TEST_PREFIX } from "./helpers";
import { sweepPosts, sweepSecrets } from "./sweep";

/**
 * 본문 칸에 그림을 붙여넣고 끌어놓는다(MYH-192).
 *
 * 시험 브라우저의 클립보드에는 파일을 넣을 수 없어, 브라우저가 보내는 것과
 * 같은 paste · drop 사건을 그림 파일을 실어 직접 보낸다.
 */

/** 1x1 PNG */
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** 그림 파일을 실은 paste(또는 drop) 사건을 보낸다 */
async function sendImage(
  target: Locator,
  kind: "paste" | "drop",
  name: string,
) {
  await target.evaluate(
    (el, { kind, name, pixel }) => {
      const bytes = Uint8Array.from(atob(pixel), (c) => c.charCodeAt(0));
      const file = new File([bytes], name, { type: "image/png" });
      const data = new DataTransfer();
      data.items.add(file);
      const rect = el.getBoundingClientRect();
      const event =
        kind === "paste"
          ? new ClipboardEvent("paste", {
              clipboardData: data,
              bubbles: true,
              cancelable: true,
            })
          : new DragEvent("drop", {
              dataTransfer: data,
              bubbles: true,
              cancelable: true,
              clientX: rect.left + 10,
              clientY: rect.top + 10,
            });
      el.dispatchEvent(event);
    },
    { kind, name, pixel: PIXEL },
  );
}

const body = (page: Page) => page.locator('textarea[name="content"]');
const picked = (page: Page) =>
  page.getByRole("tablist", { name: "편집기 고르기" }).getByRole("tab", {
    name: /^(Milkdown|TipTap|Toast UI)$/,
  });

/** ▾ 로 편집기를 고르고 그 편집기의 글 쓰는 곳을 돌려준다 */
async function useEditor(
  page: Page,
  label: "Milkdown" | "TipTap" | "Toast UI",
) {
  await page.getByLabel("편집기 바꾸기").click();
  await page
    .getByRole("menuitemradio", { name: new RegExp(`^${label}`) })
    .click();
  await expect(picked(page)).toHaveText(label);
  const surface = {
    Milkdown: '[data-editor="milkdown"] .ProseMirror',
    TipTap: '[data-editor="tiptap"]',
    "Toast UI":
      '[data-editor="toast"] .toastui-editor-ww-container .ProseMirror',
  }[label];
  const el = page.locator(surface).first();
  await expect(el).toBeVisible();
  await el.click();
  return el;
}

test.describe("본문에 그림 붙여넣기", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepPosts(page);
    await sweepSecrets(page);
  });

  test("마크다운 칸에 붙여넣으면 올리고 그 자리에 넣는다. 새 글은 초안이 하나다", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX}그림 붙이기 ${Date.now().toString(36)}`;
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(title);
    await body(page).fill("앞 문단이다.");
    await body(page).press("End");

    // 두 장을 한 번에. 새 글이라 첫 그림이 초안을 만들고 둘째가 이어받는다
    await sendImage(body(page), "paste", "첫째.png");
    await sendImage(body(page), "paste", "둘째.png");
    await expect(body(page)).toHaveValue(/!\[첫째\.png\]\(\/[^)]+\)/);
    await expect(body(page)).toHaveValue(/!\[둘째\.png\]\(\/[^)]+\)/);
    await expect(page.getByText(/그림 올리는 중/)).toHaveCount(0);
    // 그림은 제 줄에 들어간다
    expect(await body(page).inputValue()).toMatch(/^앞 문단이다\.\n!\[/);

    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    // 글은 하나다 - 그림을 올릴 때 만든 초안에 저장됐다
    await page.goto("/admin/posts");
    await expect(page.getByRole("link", { name: title })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "제목 없음" })).toHaveCount(0);
  });

  test("마크다운 칸에 끌어놓아도 올린다", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page
      .getByLabel("제목")
      .fill(`${TEST_PREFIX}그림 끌기 ${Date.now().toString(36)}`);
    await sendImage(body(page), "drop", "끌어놓기.png");
    await expect(body(page)).toHaveValue(/!\[끌어놓기\.png\]\(\/[^)]+\)/);
    // 저장해 둔다. 그림이 만든 초안은 제목이 없어 뒷정리가 가를 수 없다
    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
  });

  for (const label of ["Milkdown", "TipTap", "Toast UI"] as const) {
    test(`${label} 에 붙여넣으면 그림이 들어가고 본문에 남는다`, async ({
      page,
    }) => {
      await page.goto("/admin/posts/new");
      await page
        .getByLabel("제목")
        .fill(`${TEST_PREFIX}그림 ${label} ${Date.now().toString(36)}`);
      await body(page).fill("문단이다.\n");
      const surface = await useEditor(page, label);
      await sendImage(surface, "paste", "편집기.png");

      // 편집기 안에 그림이 보이고, 마크다운 칸에도 들어가 있다
      await expect(surface.locator("img").first()).toBeVisible();
      await expect
        .poll(() => body(page).inputValue())
        .toMatch(/!\[편집기\.png\]\(\/[^)]+\)/);

      await page.getByRole("button", { name: "임시저장" }).click();
      await page.getByRole("heading", { name: "글 수정" }).waitFor();

      // 다른 시험을 위해 편집기를 기본으로 돌려 둔다
      await page.getByLabel("편집기 바꾸기").click();
      await page.getByRole("menuitemradio", { name: /^Milkdown/ }).click();
      await page
        .getByRole("tablist", { name: "편집기 고르기" })
        .getByRole("tab", { name: "마크다운" })
        .click();
    });
  }

  test("비밀글은 담아서 저장하는 비밀글 그림으로 올린다", async ({ page }) => {
    await page.goto("/admin/secrets/new");
    await page
      .getByLabel("제목")
      .fill(`${TEST_PREFIX}비밀 그림 ${Date.now().toString(36)}`);
    await sendImage(body(page), "paste", "비밀.png");
    await expect(body(page)).toHaveValue(
      /!\[비밀\.png\]\(\/admin\/secrets\/files\/\d+\)/,
    );
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/secrets\/\d+$/);
  });
});
