import { expect, test, type Page } from "@playwright/test";
import { login, TEST_PREFIX } from "./helpers";
import { sweepNotes, sweepPosts } from "./sweep";

/**
 * 쓰던 글을 이 브라우저에 보관하고 되살린다(MYH-193).
 *
 * 보관은 몇 초마다 한다. 기다리는 대신 저장소에 들어갈 때까지 들여다본다.
 */

const body = (page: Page) => page.locator('textarea[name="content"]');
const banner = (page: Page) =>
  page.getByRole("region", { name: "저장하지 않은 내용" });

/** 그 보관본이 들어갈 때까지 기다린다 */
async function kept(page: Page, key: string, text: string) {
  await expect
    .poll(() => page.evaluate((k) => localStorage.getItem(k) ?? "", key), {
      timeout: 10_000,
    })
    .toContain(text);
}

function stored(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

test.describe("쓰던 글 보관", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("myhome:draft:")) localStorage.removeItem(k);
      }
    });
    await sweepPosts(page);
    await sweepNotes(page);
  });

  test("새 글: 다시 열면 되살리고, 저장하면 보관본이 없어진다", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX}보관 ${Date.now().toString(36)}`;
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(title);
    await body(page).fill("쓰다 만 본문이다.");
    await page.getByLabel("태그").fill("가,나");
    await kept(page, "myhome:draft:post:new", "쓰다 만 본문이다.");

    // 창을 닫았다 연 셈
    await page.reload();
    await expect(banner(page)).toBeVisible();
    await expect(banner(page)).toContainText("이 브라우저");
    await expect(page.getByLabel("제목")).toHaveValue("");
    await banner(page).getByRole("button", { name: "되살리기" }).click();
    await expect(banner(page)).toHaveCount(0);
    await expect(page.getByLabel("제목")).toHaveValue(title);
    await expect(body(page)).toHaveValue("쓰다 만 본문이다.");
    await expect(page.getByLabel("태그")).toHaveValue("가,나");

    // 되살린 것으로 저장하면 번호가 붙은 화면에서 「새 글」 보관본을 치운다
    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    await expect.poll(() => stored(page, "myhome:draft:post:new")).toBeNull();
    await page.goto("/admin/posts/new");
    await expect(page.getByLabel("제목")).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
  });

  test("고치던 글: 버리면 저장된 대로 두고, 같으면 묻지 않는다", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX}보관 고치기 ${Date.now().toString(36)}`;
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(title);
    await body(page).fill("저장한 본문이다.");
    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    const id = page.url().match(/\/admin\/posts\/(\d+)/)![1];
    const key = `myhome:draft:post:${id}`;

    await body(page).fill("고치다 만 본문이다.");
    await kept(page, key, "고치다 만 본문이다.");
    await page.reload();
    await expect(banner(page)).toBeVisible();
    await banner(page).getByRole("button", { name: "버리기" }).click();
    await expect(banner(page)).toHaveCount(0);
    await expect(body(page)).toHaveValue("저장한 본문이다.");
    expect(await stored(page, key)).toBeNull();

    // 저장된 것과 같은 보관본은 조용히 지운다
    await page.evaluate(
      ([k, t]) =>
        localStorage.setItem(
          k,
          JSON.stringify({
            savedAt: Date.now(),
            fields: { title: t, content: "저장한 본문이다.\n", tags: "" },
          }),
        ),
      [key, title],
    );
    await page.reload();
    await expect(body(page)).toHaveValue("저장한 본문이다.");
    await expect(banner(page)).toHaveCount(0);
    await expect.poll(() => stored(page, key)).toBeNull();
  });

  test("편집기 탭이 열려 있어도 되살린 본문이 보인다", async ({ page }) => {
    await page.goto("/admin/posts/new");
    // 화면이 다 살아난 뒤 첫 보관(3초)이 돌기 전에 보관본을 넣고 새로 고친다.
    // 전에는 손대지 않은 화면이 떠나면서(pagehide) 남의 보관본을 지웠다 -
    // GitHub 검사에서만 그 틈에 걸려 깨졌다
    await page.getByLabel("제목").fill("");
    await page.waitForTimeout(800);
    await page.evaluate(() =>
      localStorage.setItem(
        "myhome:draft:post:new",
        JSON.stringify({
          savedAt: Date.now(),
          fields: { title: "", content: "편집기로 되살린다", tags: "" },
        }),
      ),
    );
    await page.reload();
    await page
      .getByRole("tablist", { name: "편집기 고르기" })
      .getByRole("tab", { name: /^(Milkdown|TipTap|Toast UI)$/ })
      .click();
    const panel = page.getByRole("tabpanel");
    await expect(panel.locator(".ProseMirror").first()).toBeVisible();
    await banner(page).getByRole("button", { name: "되살리기" }).click();
    await expect(panel).toContainText("편집기로 되살린다");
    await expect(body(page)).toHaveValue("편집기로 되살린다");
    await page
      .getByRole("tablist", { name: "편집기 고르기" })
      .getByRole("tab", { name: "마크다운" })
      .click();
  });

  test("짧은 글 고치기도 보관한다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    await page.goto("/admin/notes");
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill(`e2e 보관 짧은 글 ${stamp}`);
    await 새로.getByRole("button", { name: "올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    const row = page
      .locator("li[id^='note-']")
      .filter({ has: page.locator(`textarea:text("${stamp}")`) })
      .first();
    const id = (await row.getAttribute("id"))!.replace("note-", "");
    const key = `myhome:draft:note:${id}`;
    const field = page.locator(`#note-content-${id}`);
    await field.fill(`e2e 보관 짧은 글 ${stamp} 고치는 중`);
    await kept(page, key, "고치는 중");

    await page.reload();
    const mine = page.locator(`#note-${id}`);
    await expect(banner(page)).toHaveCount(1);
    await mine.getByRole("button", { name: "되살리기" }).click();
    await expect(field).toHaveValue(`e2e 보관 짧은 글 ${stamp} 고치는 중`);
  });

  test("비밀글은 보관하지 않는다", async ({ page }) => {
    await page.goto("/admin/secrets/new");
    await page.getByLabel("제목").fill(`${TEST_PREFIX}비밀 보관 안 함`);
    await body(page).fill("브라우저에 남기면 안 되는 본문");
    // 보관하는 사이(3초)보다 넉넉히 기다린다
    await page.waitForTimeout(4_000);
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("myhome:draft:")),
    );
    expect(keys).toEqual([]);
  });
});
