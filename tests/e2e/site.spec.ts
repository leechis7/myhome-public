import { expect, test, type Page } from "@playwright/test";
import { login, openAdminMenu, TEST_PREFIX } from "./helpers";

/**
 * 관리 › 설정 › 사이트 (MYH-169).
 *
 * 사이트 정보는 모든 화면에 붙어서, 시험이 바꾼 채로 끝나면 뒤 시험이 다
 * 흔들린다. 그래서 처음 값을 적어 두고 afterAll 에서 **새 브라우저로**
 * 되돌린다 — 시험이 시간 제한에 걸려 끝나면 그 시험의 page 는 이미 닫혀
 * 있다(MYH-167 에서 배운 것).
 */

const FIELDS = ["name", "title", "tagline", "description", "email"] as const;
type Values = Record<(typeof FIELDS)[number], string>;

let original: Values | null = null;

/** 칸 하나. main 안에서만 찾는다 — <meta name="description"> 도 같은 이름이다 */
const field = (page: Page, name: string) =>
  page.getByRole("main").locator(`[name="${name}"]`);

async function read(page: Page): Promise<Values> {
  await page.goto("/admin/site");
  const out = {} as Values;
  for (const f of FIELDS) {
    out[f] = await field(page, f).inputValue();
  }
  return out;
}

async function save(page: Page, values: Partial<Values>) {
  await page.goto("/admin/site");
  for (const [f, v] of Object.entries(values)) {
    await field(page, f).fill(v);
  }
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("저장했습니다.")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("사이트 정보", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    original ??= await read(page);
  });

  test.afterAll(async ({ browser }, testInfo) => {
    if (!original) return;
    testInfo.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page);
      await save(page, original);
    } finally {
      await context.close();
    }
  });

  test("관리 › 설정 에 사이트 줄이 있다", async ({ page }) => {
    await page.goto("/");
    const menu = await openAdminMenu(page);
    await menu.getByRole("link", { name: "사이트", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "사이트", level: 1 }),
    ).toBeVisible();
  });

  test("고치면 머리글 · 탭 제목 · 설명에 바로 나온다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const name = `${TEST_PREFIX}이름-${stamp}`;
    const title = `${TEST_PREFIX}제목-${stamp}`;
    const description = `${TEST_PREFIX}설명-${stamp}`;
    await save(page, { name, title, description });

    // 저장한 값으로 미리보기가 바뀐다
    const preview = page.getByRole("region", { name: "검색 결과 미리보기" });
    await expect(preview).toContainText(title);
    await expect(preview).toContainText(description);

    await page.goto("/");
    await expect(page).toHaveTitle(title);
    await expect(
      page.getByRole("banner").getByRole("link").first(),
    ).toHaveText(name);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      description,
    );
    // 다른 쪽 탭 제목은 「쪽 이름 · 사이트 이름」
    await page.goto("/blog");
    await expect(page).toHaveTitle(`블로그 · ${name}`);
  });

  // 이름만 적은 사람의 탭에 「내 홈페이지」 가 뜨면 이상하다
  test("제목을 비우면 이름이 탭 제목이 된다", async ({ page }) => {
    const name = `${TEST_PREFIX}이름만-${Date.now().toString(36)}`;
    await save(page, { name, title: "" });
    await page.goto("/");
    await expect(page).toHaveTitle(name);
  });

  test("메일 모양이 아니면 저장하지 않는다", async ({ page }) => {
    // 「a@b」 는 브라우저의 type=email 검사는 넘는다(HTML 규칙에 맞다).
    // 서버는 도메인에 점이 있어야 받는다 — 그 검사를 본다
    await page.goto("/admin/site");
    await field(page, "email").fill("a@b");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("메일 주소 모양이 아닙니다")).toBeVisible();
  });
});
