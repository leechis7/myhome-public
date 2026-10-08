import { expect, test, type Page } from "@playwright/test";
import { login, pressDelete, TEST_PREFIX } from "./helpers";
import { sweepPosts, sweepSecrets } from "./sweep";

/**
 * 지운 그림이 본문과 디스크에 남지 않는다(MYH-197).
 *
 * 그림 이름이 내용 해시라 같은 그림을 다른 시험도 쓰면 파일이 남는 것이
 * 맞다. 그래서 시험마다 색이 다른 그림을 그 자리에서 만든다.
 */

const body = (page: Page) => page.locator('textarea[name="content"]');

/** 본문 칸에 처음 보는 그림 한 장을 붙여 넣고 그 주소를 돌려준다 */
async function pasteFreshImage(page: Page, name: string) {
  await body(page).evaluate(async (el, name) => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;
    ctx.fillRect(0, 0, 4, 4);
    ctx.fillStyle = `#${Date.now().toString(16).slice(-6)}`;
    ctx.fillRect(0, 0, 1, 1);
    const blob = await new Promise<Blob>((ok) =>
      canvas.toBlob((b) => ok(b!), "image/png"),
    );
    const data = new DataTransfer();
    data.items.add(new File([blob], name, { type: "image/png" }));
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, name);
  const pattern = new RegExp(
    // 비밀글은 이름 뒤에 줄인 형식(.webp)이 붙는다
    `!\\[${name.replace(".", "\\.")}[^\\]]*\\]\\(((?:/uploads|/admin/secrets/files)/[^)]+)\\)`,
  );
  await expect(body(page)).toHaveValue(pattern);
  return (await body(page).inputValue()).match(pattern)![1];
}

test.describe("지운 그림 치우기", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepPosts(page);
    await sweepSecrets(page);
  });

  test("「올린 이미지」 에서 지우면 본문에서도 빠지고 파일도 없어진다", async ({
    page,
  }) => {
    const title = `${TEST_PREFIX}그림 지우기 ${Date.now().toString(36)}`;
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(title);
    await body(page).fill("앞 문단.\n\n");
    await body(page).press("End");
    const url = await pasteFreshImage(page, "지울.png");
    await body(page).fill(`${await body(page).inputValue()}\n뒤 문단.`);
    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    expect((await page.request.get(url)).status()).toBe(200);

    // 저장하지 않은 고침이 있어도 그것은 두고 그림만 뺀다
    await body(page).fill(`${await body(page).inputValue()}\n고치는 중.`);
    await page.getByText(/^올린 이미지/).click();
    await page.getByLabel("지울.png 삭제").click();
    await expect(page.getByText(/지우면 본문에서도 뺍니다/)).toBeVisible();
    await page.getByRole("button", { name: "예, 지웁니다" }).click();

    await expect(body(page)).not.toHaveValue(/지울\.png/);
    // 서버가 지우고 화면을 다시 그린 뒤에도(목록이 빠진 뒤에도) 저장 안 한
    // 고침이 남아 있어야 한다. 전에는 다시 그리면서 날아갔다(MYH-200)
    await expect(page.getByText(/^올린 이미지/)).toHaveCount(0);
    await expect(body(page)).toHaveValue(/앞 문단\.\n\n뒤 문단\.\n고치는 중\./);
    await expect.poll(async () => (await page.request.get(url)).status()).toBe(404);

    // 저장된 본문에서도 빠졌다
    await page.reload();
    await expect(body(page)).toHaveValue(/앞 문단\./);
    await expect(body(page)).not.toHaveValue(/지울\.png/);
  });

  test("글을 지우면 붙어 있던 그림 파일도 없어진다", async ({ page }) => {
    const title = `${TEST_PREFIX}글 지우기 ${Date.now().toString(36)}`;
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(title);
    const url = await pasteFreshImage(page, "글과함께.png");
    await page.getByRole("button", { name: "임시저장" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    expect((await page.request.get(url)).status()).toBe(200);

    await pressDelete(page);
    await page.waitForURL(/\/admin\/posts$/);
    expect((await page.request.get(url)).status()).toBe(404);
  });

  test("비밀글 그림도 지우면 본문에서 빠진다", async ({ page }) => {
    await page.goto("/admin/secrets/new");
    await page
      .getByLabel("제목")
      .fill(`${TEST_PREFIX}비밀 그림 지우기 ${Date.now().toString(36)}`);
    await body(page).fill("비밀 앞.\n");
    await body(page).press("End");
    await pasteFreshImage(page, "비밀지울.png");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(/\/admin\/secrets\/\d+$/);
    await page.goto(`${page.url()}/edit`);

    await page.getByText(/^올린 이미지/).click();
    await page.getByLabel(/^비밀지울\.png.* 삭제$/).click();
    await page.getByRole("button", { name: "예, 지웁니다" }).click();
    await expect(body(page)).not.toHaveValue(/비밀지울\.png/);
    // 본문 칸은 누르자마자 바뀐다. 서버가 다 지울 때까지 기다린 뒤 다시 연다
    await expect(page.getByText(/^올린 이미지/)).toHaveCount(0);
    await page.reload();
    await expect(body(page)).toHaveValue(/비밀 앞\./);
    await expect(body(page)).not.toHaveValue(/비밀지울\.png/);
  });
});
