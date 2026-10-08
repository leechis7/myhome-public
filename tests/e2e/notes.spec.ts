import { expect, test } from "@playwright/test";
import {
  login,
  pressDelete,
} from "./helpers";
import { sweepNotes } from "./sweep";

/** 1x1 PNG */
const PIXEL = {
  name: "e2e.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/**
 * 짧은 글. 블로그 글과 같은 표에 담고 kind 로만 갈라 본다.
 * 그래서 "섞이지 않는지" 를 함께 본다.
 */
test.describe("짧은 글", () => {
  // 깨진 시험이 남긴 것이 같은 실행의 다음 시험을 흐리지 않게, 시험마다
  // 끝에 치운다(MYH-158). 로그인은 각 시험이 이미 해 두었다.
  test.afterEach(async ({ page }) => {
    await sweepNotes(page);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // MYH-184. 첫 화면의 짧은 글은 네 줄 남짓만 보이고, 넘치면 「더 보기」 가 붙는다
  test("첫 화면에서 긴 짧은 글은 몇 줄만 보인다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const 긴글 = `e2e 긴 짧은 글 ${stamp}`;
    const 짧은 = `e2e 한 줄 ${stamp}`;
    const 줄들 = Array.from({ length: 12 }, (_, i) => `${i + 1}번째 문단이다.`);

    await page.goto("/admin/notes");
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill([긴글, ...줄들].join("\n\n"));
    await 새로.getByRole("button", { name: "올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await 새로.getByLabel("본문").fill(짧은);
    await 새로.getByRole("button", { name: "올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.goto("/");
    const 절 = page.locator("section").filter({
      has: page.getByRole("heading", { name: "짧은 글", exact: true }),
    });
    const 긴것 = 절.locator("li").filter({ hasText: 긴글 });
    const 짧은것 = 절.locator("li").filter({ hasText: 짧은 });
    await expect(긴것).toBeVisible();
    // 마지막 문단은 잘려서 보이지 않는다
    await expect(긴것.getByText("12번째 문단이다.")).not.toBeInViewport();
    await expect(긴것.getByRole("link", { name: "더 보기 →" })).toBeVisible();
    // 짧은 것에는 붙지 않는다
    await expect(짧은것.getByRole("link", { name: "더 보기 →" })).toHaveCount(0);

    await 긴것.getByRole("link", { name: "더 보기 →" }).click();
    await expect(page).toHaveURL(/\/notes\/\d+$/);
    await expect(page.getByText("12번째 문단이다.")).toBeVisible();
  });

  test("쓰면 목록에 나오고 지우면 사라진다", async ({ page }) => {
    const 본문 = `e2e 짧은 글 ${Date.now().toString(36)}`;
    const 태그 = `e2e태그${Date.now().toString(36)}`;

    // 관리 화면에서 쓴다. 제목·주소 칸은 없다.
    await page.goto("/admin/notes");
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill(본문);
    await 새로.getByLabel("태그").fill(태그);
    await 새로.getByRole("button", { name: "올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    // 공개 목록에 나온다
    await page.goto("/notes");
    await expect(page.getByText(본문)).toBeVisible();
    // 태그로 걸러진다
    await page
      .getByRole("link", { name: new RegExp(태그) })
      .first()
      .click();
    await expect(page).toHaveURL(/tag=/);
    await expect(page.getByText(본문)).toBeVisible();

    // 블로그 목록에는 섞이지 않는다 - 공개 쪽과 관리 쪽 둘 다
    await page.goto("/blog");
    await expect(page.getByText(본문)).toHaveCount(0);

    // 관리 목록에 섞여 나오던 적이 있다(MYH-127). 종류를 걸지 않은 탓이었다.
    await page.goto("/admin/posts");
    await expect(page.getByText(본문)).toHaveCount(0);

    // 주소로 찔러도 블로그 편집기가 열리지 않는다
    await page.goto("/admin/notes");
    const 번호 = await page
      .locator("li[id^='note-']")
      .filter({ hasText: 본문 })
      .first()
      .getAttribute("id");
    const 짧은글아이디 = 번호!.replace("note-", "");
    const 응답 = await page.goto(`/admin/posts/${짧은글아이디}`);
    expect(응답?.status()).toBe(404);

    // 첫 화면에는 블로그 글 아래에 따로 나온다
    await page.goto("/");
    const 짧은글절 = page.locator("section").filter({
      has: page.getByRole("heading", { name: "짧은 글", exact: true }),
    });
    await expect(짧은글절.getByText(본문)).toBeVisible();
    await expect(
      짧은글절.getByRole("link", { name: "짧은 글 전체 보기 →" }),
    ).toHaveAttribute("href", "/notes");

    // 위아래 순서까지 본다 - "최근 글" 이 위, "짧은 글" 이 아래다
    const 위 = await page
      .getByRole("heading", { name: "최근 글" })
      .boundingBox();
    const 아래 = await page
      .getByRole("heading", { name: "짧은 글", exact: true })
      .boundingBox();
    expect(위!.y).toBeLessThan(아래!.y);

    // 한 편 화면에는 댓글 칸이 있다
    await page.goto("/notes");
    await page.locator("main time").first().click();
    // 주소는 번호다. 제목이 바뀌어도 변하지 않는다(MYH-142).
    await expect(page).toHaveURL(/\/notes\/\d+$/);
    await expect(page.getByLabel("이름")).toBeVisible();

    // 글 화면에서 바로 고치러 간다 - 관리 목록의 그 글 자리로 데려간다
    await page.getByRole("link", { name: "고치기" }).click();
    await expect(page).toHaveURL(/\/admin\/notes#note-\d+/);
    await expect(
      page.locator("li[id^='note-']").filter({ hasText: 본문 }),
    ).toBeVisible();

    // 지운다
    await page.goto("/admin/notes");
    const 줄 = page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) });
    await pressDelete(줄);
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.goto("/notes");
    await expect(page.getByText(본문)).toHaveCount(0);
  });

  // MYH-146. 블로그·비밀글에는 있고 짧은 글에만 없던 자리다.
  test("본문에 그림을 넣는다", async ({ page }) => {
    const 본문 = `e2e 그림 짧은 글 ${Date.now().toString(36)}`;

    await page.goto("/admin/notes");

    // 저장하기 전에 올린다. 서버가 빈 초안을 만들어 번호를 준다.
    await page.locator('input[type="file"]').first().setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).first().click();

    const 줄 = page.locator("code", { hasText: "/uploads/" }).first();
    await expect(줄).toBeVisible({ timeout: 30_000 });
    const markdown = (await 줄.textContent())!;

    // 그 마크다운을 본문에 넣고 낸다
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill(`${본문}\n\n${markdown}`);
    await 새로.getByRole("button", { name: "올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    // 글은 하나다 — 그림을 올릴 때 만든 초안에 그대로 담겼다
    const 그줄 = page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) });
    await expect(그줄).toHaveCount(1);

    // 올린 이미지 목록에 남는다
    // 「이미지」 와 안쪽 「올린 이미지」 둘이라 바깥 것만 누른다
    await 그줄.locator("summary").first().click();
    await expect(
      그줄.locator("section", { hasText: "올린 이미지" }).locator("img"),
    ).toHaveCount(1);

    // 공개 화면에 그림이 그려진다.
    // 목록에도 그림이 딸린 줄이 여럿 있을 수 있으니 한 편 화면까지 들어가서 본다.
    await page.goto("/notes");
    await page
      .locator("main li")
      .filter({ hasText: 본문 })
      .locator("time")
      .first()
      .click();
    await expect(page).toHaveURL(/\/notes\/\d+$/);
    await expect(page.locator("main img").first()).toBeVisible();

    // 지운다
    await page.goto("/admin/notes");
    await pressDelete(page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) }));
    await expect(page.getByText("저장했습니다")).toBeVisible();
  });

  test("나만 보는 짧은 글은 관리자에게만 보인다", async ({ page }) => {
    const 본문 = `e2e 나만 보는 짧은 글 ${Date.now().toString(36)}`;

    await page.goto("/admin/notes");
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill(본문);
    await 새로.getByRole("button", { name: "나만 보기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    // 관리자에게는 목록에 딱지와 함께 보인다
    await page.goto("/notes");
    await expect(page.getByText(본문)).toBeVisible();
    const 줄 = page.locator("main li").filter({ hasText: 본문 });
    await expect(줄.getByText("나만 보기")).toBeVisible();

    // 손님에게는 없다
    await page.context().clearCookies();
    await page.goto("/notes");
    await expect(page.getByText(본문)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByText(본문)).toHaveCount(0);

    // 지운다
    await login(page);
    await page.goto("/admin/notes");
    await pressDelete(page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) }));
    await expect(page.getByText("저장했습니다")).toBeVisible();
  });

  test("임시저장한 것은 공개되지 않는다", async ({ page }) => {
    const 본문 = `e2e 임시 짧은 글 ${Date.now().toString(36)}`;

    await page.goto("/admin/notes");
    const 새로 = page.getByRole("form", { name: "새로 쓰기" });
    await 새로.getByLabel("본문").fill(본문);
    await 새로.getByRole("button", { name: "임시저장" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    // "임시저장" 은 새로 쓰기 단추에도 있다. 그 글 줄 안에서만 찾는다
    const 줄 = page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) });
    await expect(줄.getByText("임시저장", { exact: true })).toBeVisible();

    await page.goto("/notes");
    await expect(page.getByText(본문)).toHaveCount(0);

    // 올리면 나온다
    await page.goto("/admin/notes");
    await 줄.getByRole("button", { name: "글 올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.goto("/notes");
    await expect(page.getByText(본문)).toBeVisible();

    await page.goto("/admin/notes");
    await pressDelete(page
      .locator("li")
      .filter({ has: page.locator(`textarea:has-text("${본문}")`) }));
    await expect(page.getByText("저장했습니다")).toBeVisible();
  });
});
