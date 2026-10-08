import { expect, test, type Page } from "@playwright/test";
import { createPost, deletePost, login, TEST_PREFIX } from "./helpers";

/**
 * 본문 칸의 탭(MYH-118): 마크다운 · 편집기 · 미리보기.
 *
 * 편집기 자리에는 설정에서 고른 위지윅 편집기가 나온다(기본 Milkdown).
 * 가장 지켜야 할 것은 **탭을 열어 보기만 해서는 본문이 바뀌지 않는 것**이다.
 * 편집기는 손대지 않고 뽑아도 마크다운 모양이 조금 다르다.
 */

// 편집기가 모양을 바꾸기 쉬운 것을 일부러 넣는다: 표, _ 들어간 낱말, 두 칸 줄바꿈
const BODY = [
  "## 첫 제목",
  "",
  "forward_auth 를 쓴다. 이 줄은  ",
  "두 칸 줄바꿈으로 이어진다.",
  "",
  "| 이름 | 값 |",
  "| --- | --- |",
  "| 가 | `a \\| b` |",
  "",
].join("\n");

const body = (page: Page) => page.locator('textarea[name="content"]');
const tab = (page: Page, name: string | RegExp) =>
  page
    .getByRole("tablist", { name: "편집기 고르기" })
    .getByRole("tab", { name });

/** 관리 › 설정 › 사이트 에서 기본 편집기를 고른다. 다른 칸은 그대로 둔다 */
async function chooseEditor(page: Page, kind: "milkdown" | "tiptap" | "toast") {
  await page.goto("/admin/site");
  await page.getByLabel("기본 편집기").selectOption(kind);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장했습니다.")).toBeVisible();
}

// 편집기 설정은 하나라 차례로 돈다
test.describe.configure({ mode: "serial" });

test.describe("본문 탭", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("탭을 열어 보기만 하면 본문이 그대로다", async ({ page }) => {
    const title = `${TEST_PREFIX}탭 ${Date.now().toString(36)}`;
    await createPost(page, { title, content: BODY, publish: false });
    const saved = await body(page).inputValue();

    // 편집기 탭. 편집기가 다 그려질 때까지 기다린다
    await tab(page, /^(Milkdown|TipTap|Toast UI)$/).click();
    await expect(page.getByText("편집기를 불러오는 중…")).toHaveCount(0);
    await expect(
      page.locator("[data-editor]").getByText("첫 제목"),
    ).toBeVisible();
    expect(await body(page).inputValue()).toBe(saved);

    // 미리보기는 사이트와 같은 모양이다
    await tab(page, "미리보기").click();
    await expect(
      page
        .getByRole("tabpanel", { name: "미리보기" })
        .getByRole("heading", { name: "첫 제목" }),
    ).toBeVisible();

    await tab(page, "마크다운").click();
    await expect(body(page)).toBeVisible();
    expect(await body(page).inputValue()).toBe(saved);

    await deletePost(page, title);
  });

  // 설정에서 고른 편집기가 탭에 나오고, 셋 모두 고친 것이 저장된다
  for (const [kind, label] of [
    ["milkdown", "Milkdown"],
    ["tiptap", "TipTap"],
    ["toast", "Toast UI"],
  ] as const) {
    test(`${label}: 고른 편집기에서 고친 것이 저장된다`, async ({ page }) => {
      await chooseEditor(page, kind);
      try {
        const title = `${TEST_PREFIX}편집기 ${kind} ${Date.now().toString(36)}`;
        await createPost(page, { title, content: BODY, publish: false });

        // 탭 이름이 고른 편집기다. 다른 편집기 탭은 없다
        await expect(tab(page, /^(Milkdown|TipTap|Toast UI)$/)).toHaveText(
          label,
        );
        await tab(page, label).click();
        // Toast UI 는 숨은 마크다운 칸과 미리보기도 들고 있다. 위지윅 칸만 본다
        const surface =
          kind === "toast"
            ? '[data-editor="toast"] .toastui-editor-ww-container'
            : `[data-editor="${kind}"]`;
        const heading = page.locator(surface).getByText("첫 제목");
        await expect(heading).toBeVisible();
        await heading.click();
        await page.keyboard.press("End");
        await page.keyboard.type(" 고침");

        // 고친 것은 마크다운 칸에도 들어가 있다
        await expect
          .poll(() => body(page).inputValue())
          .toContain("## 첫 제목 고침");

        // 초안이라 단추 이름이 「임시저장」 이다
        await page.getByRole("button", { name: "임시저장" }).click();
        await expect(page.getByText("저장했습니다")).toBeVisible();
        await page.reload();
        await tab(page, "마크다운").click();
        const after = await body(page).inputValue();
        expect(after).toContain("## 첫 제목 고침");
        // 표 칸 안의 \| 는 살아 있어야 한다 - 풀리면 칸이 둘로 쪼개진다
        expect(after).toContain("a \\| b");

        await deletePost(page, title);
      } finally {
        await chooseEditor(page, "milkdown");
      }
    });
  }

  test("탭의 ▾ 로 편집기를 바꾸고, 그 브라우저가 기억한다", async ({
    page,
  }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("본문").fill("## 바꿔 보기\n\n문단이다.\n");
    const editorTab = tab(page, /^(Milkdown|TipTap|Toast UI)$/);
    // 설정의 기본 편집기가 먼저 나온다
    await expect(editorTab).toHaveText("Milkdown");

    await page.getByLabel("편집기 바꾸기").click();
    await page.getByRole("menuitemradio", { name: /^TipTap/ }).click();
    await expect(editorTab).toHaveText("TipTap");
    await expect(editorTab).toHaveAttribute("aria-selected", "true");
    await expect(
      page.locator('[data-editor="tiptap"]').getByText("바꿔 보기"),
    ).toBeVisible();
    // 바꿔도 본문은 그대로다
    expect(await body(page).inputValue()).toBe("## 바꿔 보기\n\n문단이다.\n");

    await page.reload();
    await expect(editorTab).toHaveText("TipTap");

    // 뒤따르는 시험을 위해 기본으로 돌려 둔다
    await page.getByLabel("편집기 바꾸기").click();
    await page.getByRole("menuitemradio", { name: /^Milkdown/ }).click();
    await tab(page, "마크다운").click();
  });

  test("고른 탭을 기억한다", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await tab(page, "미리보기").click();
    await page.reload();
    await expect(tab(page, "미리보기")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // 뒤따르는 시험이 마크다운 탭에서 시작하도록 돌려 둔다
    await tab(page, "마크다운").click();
  });
});
