import { expect, test } from "@playwright/test";
import {
  login,
  deleteControl,
  pressDelete,
  TEST_PREFIX,
} from "./helpers";
import { sweepSecrets } from "./sweep";

/**
 * 나만 보는 비밀글.
 *
 * 여기서 보는 것은 두 가지다 — 쓰고 읽고 지우는 것이 도는가, 그리고
 * **로그인하지 않은 사람에게는 없는 것으로 보이는가.**
 *
 * 내용이 정말 암호화해서 저장되는지는 단위 시험(tests/unit/secret-crypto.test.ts)이
 * 본다. 화면으로는 확인할 수 없는 것이라 여기서 흉내 내지 않는다.
 */
/** 1x1 PNG */
const PIXEL = {
  name: "e2e.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

test.describe("비밀글", () => {
  // 깨진 시험이 남긴 것이 같은 실행의 다음 시험을 흐리지 않게, 시험마다
  // 끝에 치운다(MYH-158). 로그인은 각 시험이 이미 해 두었다.
  test.afterEach(async ({ page }) => {
    await sweepSecrets(page);
  });

  test("쓰고 읽고 지운다", async ({ page }) => {
    await login(page);

    // 태그도 이 시험만의 것으로 만든다. 앞서 돌린 시험이 남긴 태그가 있으면
    // 칩에 붙는 개수가 달라져 "태그 1" 로 찾는 것이 빗나간다.
    const stamp = Date.now().toString(36);
    const title = `${TEST_PREFIX}비밀글 ${stamp}`;
    const tag = `${TEST_PREFIX}일기-${stamp}`;
    const body = "여기에 적은 것은 나만 본다.";

    await page.goto("/admin/secrets");
    await page.getByRole("link", { name: "새 글" }).click();
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("태그").fill(tag);
    await page.getByLabel("본문").fill(body);
    await page.getByRole("button", { name: "저장" }).click();

    // 저장하면 보기 화면으로 간다
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();

    // 목록에도 있다
    await page.goto("/admin/secrets");
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    // 태그로 거르면 남고, 없는 태그로 거르면 사라진다
    await page
      .getByRole("navigation", { name: "태그" })
      .getByRole("link", { name: new RegExp(`^${tag} \\d+$`) })
      .click();
    await expect(page).toHaveURL(/tag=/);
    await expect(page.getByRole("link", { name: title })).toBeVisible();

    await page.goto(`/admin/secrets?tag=${tag}-없는것`);
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
    await page.goto("/admin/secrets");

    // 고치면 바뀐다
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("link", { name: "고치기" }).click();
    await page.getByLabel("본문").fill(`${body} 고쳤다.`);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText(`${body} 고쳤다.`)).toBeVisible();

    // 이미지를 올리면 붙여 넣을 마크다운이 나오고, 그 주소로 이미지가 내려온다
    await page.getByRole("link", { name: "고치기" }).click();
    await page.getByLabel("올릴 이미지").setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    // 올리기 상자가 주는 줄. 「올린 이미지」 목록에도 같은 글자가 생기므로
    // 앞의 것(상자 쪽)만 본다.
    const snippet = page
      .getByText(/^!\[.*\]\(\/admin\/secrets\/files\/\d+\)$/)
      .first();
    await expect(snippet).toBeVisible();

    const url = (await snippet.textContent())!.match(/\((.*)\)/)![1];
    const image = await page.request.get(url);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/");
    // 화면에 바로 보여야 본문의 그림이 깨지지 않는다
    expect(image.headers()["content-disposition"]).toContain("inline");

    // 본문에 넣은 그림은 첨부파일이 아니다(MYH-144). 둘은 같은 테이블에
    // 살지만 나오는 자리가 다르다.
    await expect(page.getByText("아직 붙인 파일이 없습니다.")).toBeVisible();

    // 「올린 이미지」 목록에 미리보기와 함께 남는다(MYH-145·147).
    // 암호화한 그림이라 관리자 길로만 내려오는데, 그 길로 실제로 그려져야 한다.
    await page.reload();
    const 목록 = page.locator("section", { hasText: "올린 이미지" });
    // 접힌 채로 나온다. 갯수는 접힌 채로도 보인다.
    await expect(목록.getByText("올린 이미지 (1)")).toBeVisible();
    await 목록.locator("details").first().locator(":scope > summary").click();
    const 미리보기 = 목록.locator("img");
    await expect(미리보기).toHaveCount(1);

    // 암호화한 본문도 복호화해서 어디에 쓰는지 본다(MYH-148).
    // 아직 안 넣었으니 "없음" 이고, 넣으면 줄 번호가 나와야 한다.
    await expect(목록.getByText("본문에 없음")).toBeVisible();
    // 마크다운은 화면에 없다. 이름과 주소로 만든다 — 「복사」 가 주는 것과 같다.
    const 이름 = (await 목록.getByRole("link").first().innerText()).trim();
    const md = `![${이름}](${await 미리보기.getAttribute("src")})`;
    await page.getByLabel("본문").fill(`첫 줄이다.\n\n${md}`);
    await page.getByRole("button", { name: "저장" }).click();
    await page.getByRole("link", { name: "고치기" }).click();
    await 목록.locator("details").first().locator(":scope > summary").click();
    await expect(목록.getByText("본문 3번째 줄", { exact: true })).toBeVisible();

    // 지우면 목록에서 빠진다
    await pressDelete(목록, "e2e.png 삭제");
    await expect(목록).toHaveCount(0);

    await page.goto("/admin/secrets");
    await page.getByRole("link", { name: title }).click();

    // 지우면 목록에서 사라진다
    await page.getByRole("link", { name: "고치기" }).click();
    await pressDelete(page);
    // 지우면 목록으로 돌아간다. 그것까지 기다린다 — 안 기다리면 지워지는 중에
    // 다음 시험(과 뒷정리)이 시작돼 사라지는 중인 글을 연다(MYH-158)
    await expect(page).toHaveURL(/\/admin\/secrets$/);
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });

  // MYH-144. 그림과 첨부는 같은 테이블에 담기므로, 하나를 넣었을 때 다른
  // 쪽 목록이 흔들리지 않는지 둘 다 있는 상태에서 본다.
  test("본문 그림과 첨부파일이 서로 섞이지 않는다", async ({ page }) => {
    await login(page);

    const title = `${TEST_PREFIX}그림과 첨부 ${Date.now().toString(36)}`;

    await page.goto("/admin/secrets/new");
    await page.getByLabel("제목").fill(title);
    await page.getByLabel("본문").fill("둘 다 붙인다.");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("link", { name: "고치기" }).click();

    // 그림 하나. 첨부 목록은 그대로 비어 있어야 한다
    await page.getByLabel("올릴 이미지").setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    await expect(
      page.getByText(/^!\[.*\]\(\/admin\/secrets\/files\/\d+\)$/).first(),
    ).toBeVisible();
    await expect(page.getByText("아직 붙인 파일이 없습니다.")).toBeVisible();

    // 첨부 하나. 이제 첨부 목록에는 그것 하나만 있다
    await page.getByLabel("붙일 파일").setInputFiles({
      name: "메모.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("첨부다"),
    });
    await expect(page.getByRole("link", { name: "메모.txt" })).toBeVisible();
    await expect(deleteControl(page, "첨부파일 삭제")).toHaveCount(1);

    // 뒷정리
    await pressDelete(page);
    // 지우면 목록으로 돌아간다. 그것까지 기다린다 — 안 기다리면 지워지는 중에
    // 다음 시험(과 뒷정리)이 시작돼 사라지는 중인 글을 연다(MYH-158)
    await expect(page).toHaveURL(/\/admin\/secrets$/);
    await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  });

  // 블로그와 같아야 하는 자리다. 저장하기 전에도 이미지를 올릴 수 있고,
  // 그 뒤에 저장해도 글이 둘로 갈라지지 않아야 한다.
  test("새 글에서 저장하기 전에 이미지를 올린다", async ({ page }) => {
    await login(page);

    const title = `${TEST_PREFIX}이미지 먼저 ${Date.now().toString(36)}`;

    await page.goto("/admin/secrets/new");
    await page.getByLabel("올릴 이미지").setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).click();

    const snippet = page
      .getByText(/^!\[.*\]\(\/admin\/secrets\/files\/\d+\)$/)
      .first();
    await expect(snippet).toBeVisible();
    const markdown = (await snippet.textContent())!;

    await page.getByLabel("제목").fill(title);
    await page.getByLabel("본문").fill(`사진을 넣는다.\n\n${markdown}`);
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    // 본문의 그림이 실제로 그려진다
    await expect(page.locator("main img")).toBeVisible();

    // 글은 하나다 - 이미지를 올릴 때 만든 초안에 그대로 저장됐다
    await page.goto("/admin/secrets");
    await expect(page.getByRole("link", { name: title })).toHaveCount(1);
    await expect(page.getByRole("link", { name: "제목 없음" })).toHaveCount(0);

    // 뒷정리
    await page.getByRole("link", { name: title }).click();
    await page.getByRole("link", { name: "고치기" }).click();
    await pressDelete(page);
  });

  test("로그인하지 않으면 없는 화면이다", async ({ page, context }) => {
    await context.clearCookies();

    for (const path of ["/admin/secrets", "/admin/secrets/new"]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} 는 404 여야 한다`).toBe(404);
    }

    // 파일 주소도 마찬가지다. 번호를 찍어 봐도 있는지 알 수 없어야 한다.
    const file = await page.request.get("/admin/secrets/files/1");
    expect(file.status()).toBe(404);
  });

  test("메뉴는 로그인했을 때만 보인다", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(
      page.getByRole("navigation", { name: "주요 메뉴" }).getByText("비밀글"),
    ).toHaveCount(0);

    await login(page);
    await page.goto("/");
    // 「내 공간」 안에 있다(MYH-212)
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await nav.getByText("내 공간", { exact: true }).first().click();
    await expect(nav.getByText("비밀글").first()).toBeVisible();
  });
});
