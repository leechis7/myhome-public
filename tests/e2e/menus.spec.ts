import { expect, test, type Page } from "@playwright/test";
import {
  login,
  pressDelete,
  TEST_PREFIX,
} from "./helpers";
import { sweepMenus } from "./sweep";

/**
 * 메뉴를 관리 화면에서 고친다(MYH-124).
 *
 * 시험이 더한 줄은 이름에 접두어를 붙이고 끝나면 지운다. "처음 상태로" 는
 * 여기서 누르지 않는다 — 개발 DB 에서 돌리면 손으로 고쳐 둔 메뉴까지
 * 날아간다. 그 값이 맞는지는 단위 시험(menus.test.ts)이 본다.
 */

const stamp = () => Date.now().toString(36);

/** 왼쪽 트리에서 줄 하나. 이름이 딱 맞는 것만 — "관리자만"·"그룹" 표시가 옆에 붙는다 */
function treeItem(page: Page, label: string) {
  return page
    .getByRole("navigation", { name: "메뉴 트리" })
    .getByRole("link")
    .filter({ has: page.getByText(label, { exact: true }) });
}

/** 트리에서 줄을 골라 오른쪽에 연다 */
async function open(page: Page, label: string) {
  await treeItem(page, label).click();
  await expect(
    page.getByRole("heading", { name: label, level: 2, exact: true }),
  ).toBeVisible();
}

async function addMenu(
  page: Page,
  {
    label,
    page: target = "",
    external,
    parent,
    audience = "all",
  }: {
    label: string;
    page?: string;
    external?: string;
    parent?: string;
    audience?: "all" | "admin";
  },
) {
  await page.getByRole("link", { name: "＋ 첫 단에 줄 더하기" }).click();
  await expect(
    page.getByRole("heading", { name: "줄 더하기", level: 2 }),
  ).toBeVisible();
  await page.getByLabel("이름", { exact: true }).fill(label);
  await page.getByLabel("갈 곳").selectOption(target);
  if (external) await page.getByLabel("바깥 주소").fill(external);
  if (parent) {
    await page.getByLabel("부모").selectOption({ label: `${parent} 아래` });
  }
  await page.getByLabel("누가 보나").selectOption(audience);
  await page.getByRole("button", { name: "추가" }).click();
  // 더하면 그 줄이 열린다
  await expect(
    page.getByRole("heading", { name: label, level: 2, exact: true }),
  ).toBeVisible();
}

test.describe("메뉴 관리", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/menus");
    await expect(
      page.getByRole("heading", { name: "메뉴 관리", level: 1 }),
    ).toBeVisible();
  });

  // 시험이 남긴 줄을 치운다. 중간에 깨져 남은 것까지(MYH-158, sweep.ts)
  test.afterEach(async ({ page }) => {
    await sweepMenus(page);
  });

  test("더한 줄이 위쪽 메뉴에 나오고, 고치고 옮기고 지울 수 있다", async ({
    page,
  }) => {
    const label = `${TEST_PREFIX}소개-${stamp()}`;
    await addMenu(page, { label, page: "/about" });

    const nav = page.getByRole("navigation", { name: "주요 메뉴" });

    // 이름을 고친다
    const renamed = `${label}-고침`;
    await page.getByLabel("이름", { exact: true }).fill(renamed);
    await page.getByRole("button", { name: "수정" }).click();
    await expect(page.getByText("수정했습니다.")).toBeVisible();
    await expect(treeItem(page, renamed)).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(nav.getByRole("link", { name: renamed })).toHaveAttribute(
      "href",
      "/about",
    );

    // 한 칸 올리면 메뉴에서도 한 칸 앞으로 온다 — 맨 뒤의 관리 그룹 앞으로
    const roots = nav.locator(":scope > ul > li");
    await expect(roots.last()).toHaveText(renamed);
    await page.getByRole("button", { name: "위로" }).click();
    await expect(roots.nth(-2)).toHaveText(renamed);

    // 지우면 사라진다
    await pressDelete(page);
    await expect(page).toHaveURL(/\/admin\/menus$/);
    await expect(treeItem(page, renamed)).toHaveCount(0);
    await expect(nav.getByRole("link", { name: renamed })).toHaveCount(0);
  });

  // 가장 새기 쉬운 자리. 화면에서 감추면 HTML 에는 남는다.
  test("관리자만 보는 줄은 로그아웃한 사람의 HTML 에 없다", async ({
    page,
    request,
  }) => {
    const label = `${TEST_PREFIX}숨김-${stamp()}`;
    await addMenu(page, { label, page: "/about", audience: "admin" });
    await expect(
      page
        .getByRole("navigation", { name: "주요 메뉴" })
        .getByRole("link", { name: label }),
    ).toBeVisible();

    // request 는 이 page 의 쿠키를 나눠 쓰지 않는다 — 로그인하지 않은 사람이다
    const html = await (await request.get("/")).text();
    expect(html).not.toContain(label);
  });

  test("관리자만인 그룹 아래 줄은 부모를 따라간다", async ({
    page,
    request,
  }) => {
    const group = `${TEST_PREFIX}그룹-${stamp()}`;
    const child = `${TEST_PREFIX}자식-${stamp()}`;
    await addMenu(page, { label: group, audience: "admin" });
    // 모두로 골라 넣어도
    await addMenu(page, { label: child, page: "/about", parent: group });

    // 관리자만으로 적히고, 화면에 그 까닭이 나온다
    await expect(page.getByText("부모를 따라갑니다")).toBeVisible();
    const html = await (await request.get("/")).text();
    expect(html).not.toContain(child);
  });

  // MYH-185. 바깥 그룹을 펴도 접힌 안쪽 그룹 삼각형은 그대로여야 한다
  test("접힌 그룹의 삼각형은 바깥이 펼쳐져도 돌지 않는다", async ({ page }) => {
    const arrow = (label: string) =>
      page.locator(`summary[aria-label="${label} 아래 줄"] svg`);
    const turned = async (label: string) =>
      arrow(label).evaluate((el) => {
        // Tailwind v4 의 rotate-90 은 transform 이 아니라 rotate 속성을 쓴다
        const r = getComputedStyle(el).rotate;
        return r !== "none" && r !== "0deg";
      });

    await page.locator('summary[aria-label="관리 아래 줄"]').click();
    await expect(arrow("설정")).toBeVisible();
    await expect.poll(() => turned("관리")).toBe(true);
    // 설정은 아직 접혀 있다
    expect(await turned("설정")).toBe(false);

    await page.locator('summary[aria-label="설정 아래 줄"]').click();
    await expect.poll(() => turned("설정")).toBe(true);
  });

  test("자기 아래로는 옮길 수 없다", async ({ page }) => {
    const group = `${TEST_PREFIX}그룹-${stamp()}`;
    const child = `${TEST_PREFIX}자식-${stamp()}`;
    await addMenu(page, { label: group });
    await addMenu(page, { label: child, page: "/about", parent: group });

    await open(page, group);
    const parents = page.getByLabel("부모").locator("option");
    await expect(parents.filter({ hasText: `${group} 아래` })).toHaveCount(0);
    await expect(parents.filter({ hasText: `${child} 아래` })).toHaveCount(0);
  });

  test("이 줄 아래에 더하면 부모가 미리 골라져 있다", async ({ page }) => {
    const group = `${TEST_PREFIX}그룹-${stamp()}`;
    await addMenu(page, { label: group });

    await page.getByRole("link", { name: "＋ 이 줄 아래에 더하기" }).click();
    await expect(page.getByLabel("부모").locator("option:checked")).toHaveText(
      `${group} 아래`,
    );
  });

  test("그룹을 지우며 아래 줄을 한 단 위로 올린다", async ({ page }) => {
    const group = `${TEST_PREFIX}그룹-${stamp()}`;
    const child = `${TEST_PREFIX}자식-${stamp()}`;
    await addMenu(page, { label: group });
    await addMenu(page, { label: child, page: "/about", parent: group });

    await open(page, group);
    await pressDelete(page, "지우고 아래는 올리기");
    await expect(page).toHaveURL(/\/admin\/menus$/);
    await expect(treeItem(page, group)).toHaveCount(0);
    // 첫 단이 됐다
    await open(page, child);
    await expect(page.getByLabel("부모")).toHaveValue("");
  });

  // 트리는 첫 단만 보이게 접어 둔다. 고른 줄이 든 그룹은 펼쳐 둔다.
  test("트리의 그룹은 접혀 있고, 고른 줄이 들면 펼쳐진다", async ({ page }) => {
    const group = `${TEST_PREFIX}그룹-${stamp()}`;
    const child = `${TEST_PREFIX}자식-${stamp()}`;
    await addMenu(page, { label: group });
    await addMenu(page, { label: child, page: "/about", parent: group });
    // 자식을 더하면 그 줄이 열리므로 그룹이 펼쳐져 있다
    await expect(treeItem(page, child)).toBeVisible();

    await page.goto("/admin/menus");
    await expect(treeItem(page, child)).toBeHidden();
    await page.locator(`summary[aria-label="${group} 아래 줄"]`).click();
    await expect(treeItem(page, child)).toBeVisible();
  });

  test("바깥 주소를 적으면 그리로 간다", async ({ page }) => {
    const label = `${TEST_PREFIX}바깥-${stamp()}`;
    await addMenu(page, { label, external: "example.com" });

    await expect(
      page
        .getByRole("navigation", { name: "주요 메뉴" })
        .getByRole("link", { name: label }),
    ).toHaveAttribute("href", "https://example.com");
  });
});
