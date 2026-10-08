import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";

/** 테스트가 만든 글을 알아볼 수 있게 접두어를 붙인다 */
export const TEST_PREFIX = "e2e-";

/** 시험이 만든 글임을 제목에서 알아볼 수 있게 붙인다 */
export function uniqueTitle(name: string) {
  return `${TEST_PREFIX}${name}-${Date.now().toString(36)}`;
}

/**
 * 로그인 화면에서 비밀번호 칸을 편다.
 *
 * 패스키가 앞이라 비밀번호는 접혀 있다. 다만 등록한 기기가 하나도 없으면
 * 처음부터 펴져 있다 — 그때 또 누르면 도로 접힌다. 그래서 보고 나서 누른다.
 */
export async function openPasswordLogin(page: Page) {
  const field = page.getByLabel("비밀번호");
  if (await field.isVisible().catch(() => false)) return;
  await page.getByText("비밀번호로 로그인").click();
  await field.waitFor({ state: "visible" });
}

/** 로그인 화면이 떠 있는가 — 비밀번호가 접혀 있든 펴져 있든 */
export function loginScreen(page: Page) {
  return page.getByRole("heading", { name: "관리자 로그인" });
}

export async function login(page: Page) {
  await page.goto("/admin");
  await openPasswordLogin(page);
  await page.getByLabel("비밀번호").fill(ADMIN_PASSWORD);
  // "패스키로 로그인" 과 겹치므로 정확히 "로그인" 인 것만 고른다
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  // 들어오면 메시지 화면이다
  await page.getByRole("heading", { name: "받은 메시지" }).waitFor();
}

/**
 * 글을 하나 만들고 **번호**를 돌려준다.
 *
 * 주소가 번호라 시험도 번호로 찾아간다(MYH-142). 번호는 만든 뒤 열리는
 * 고치기 화면 주소(`/admin/posts/<번호>`)에서 읽는다.
 */
export async function createPost(
  page: Page,
  {
    title,
    content,
    tags = "",
    publish = true,
  }: {
    title: string;
    content: string;
    tags?: string;
    publish?: boolean;
  },
) {
  await page.goto("/admin/posts/new");
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("본문").fill(content);
  if (tags) await page.getByLabel("태그").fill(tags);
  await page
    .getByRole("button", { name: publish ? "발행하기" : "임시저장" })
    .click();
  await page.getByRole("heading", { name: "글 수정" }).waitFor();
  // 새로 만들면 주소에 ?ok=1 이 붙어 "저장했습니다" 가 이미 떠 있다. 그대로
  // 두면 다음 저장을 기다리는 표지로 쓸 수 없다 — 기다리는 척만 하고 바로
  // 다음 줄로 가서, 화면을 옮기는 순간 저장이 끊긴다. 그 글자를 지워 둔다.
  const url = page.url().split("?")[0];
  await page.goto(url);
  return Number(url.split("/").pop());
}

/** 목록에서 글을 찾아 지운다 */
export async function deletePost(page: Page, title: string) {
  await page.goto("/admin/posts");
  const link = page.getByRole("link", { name: title });
  if ((await link.count()) === 0) return;
  await link.first().click();
  await page.getByRole("heading", { name: "글 수정" }).waitFor();
  // 첨부파일 삭제와 겹치지 않는다 — 그쪽은 이름(aria-label)이 따로 있다
  await pressDelete(page);
  await page.getByRole("heading", { name: "블로그 관리" }).waitFor();
}

/**
 * 위쪽 메뉴의 "관리" 그룹을 펼치고 그 펼침을 돌려준다.
 *
 * 관리 화면들로 가는 길과 로그아웃이 여기 들어 있다(MYH-125). 전에는
 * 관리 화면마다 띠가 붙어 있었다. 펼침은 <details> 라 자바스크립트가
 * 살아나기 전에도 열린다.
 */
export async function openAdminMenu(page: Page) {
  const menu = page
    .getByRole("navigation", { name: "주요 메뉴" })
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: /^관리$/ }) });
  // 연 것이 열린 채로 있을 때까지 다시 연다. 화면이 막 바뀐 참이면 메뉴가
  // 살아나면서 「화면이 바뀌면 펼침을 닫는다」 가 한 번 돌아, 방금 연 것을
  // 도로 닫는다. 그러면 안의 단추를 영영 못 찾고 60초를 기다린다(2026-09-28).
  await expect(async () => {
    if (!(await menu.evaluate((d: HTMLDetailsElement) => d.open))) {
      await menu.locator("summary").click();
    }
    await expect(menu).toHaveAttribute("open", "", { timeout: 1000 });
    // 열린 직후에 닫히는 것이라, 잠깐 두고 한 번 더 본다
    await page.waitForTimeout(300);
    await expect(menu).toHaveAttribute("open", "", { timeout: 100 });
  }).toPass({ timeout: 15_000 });
  return menu;
}

/** 관리 그룹 맨 아래의 로그아웃을 누른다 */
export async function logout(page: Page) {
  const menu = await openAdminMenu(page);
  await menu.getByRole("button", { name: "로그아웃" }).click();
}

/**
 * 지우기를 누르고 「예, 지웁니다」 까지 누른다(MYH-110).
 *
 * 지우기는 두 번 누른다. 처음 누르면 그 자리에 묻는 말이 펼쳐지고(<details>),
 * 「예, 지웁니다」 를 눌러야 지워진다. 브라우저 확인창이 아니다.
 *
 * `label` 은 펼치는 쪽에 보이는 글자나 읽어 주는 이름(aria-label)이다.
 * 「삭제」, 「아래까지 지우기」, 「첨부파일 삭제」 같은 것.
 */
export async function pressDelete(scope: Page | Locator, label = "삭제") {
  const details = deleteControl(scope, label).first();
  await details.locator(":scope > summary").click();
  await details.getByRole("button", { name: "예, 지웁니다" }).click();
}

/**
 * 지우기 한 벌(<details>). 있는지 · 몇 개인지를 볼 때 쓴다.
 *
 * 펼치는 쪽(summary)의 첫 글자 칸이 label 과 딱 맞거나, 읽어 주는 이름이
 * label 인 것. summary 안에는 「취소」 칸도 숨어 있어 글자 전체로는 못 가른다.
 */
export function deleteControl(scope: Page | Locator, label = "삭제") {
  const exact = new RegExp(`^${label.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&")}$`);
  // has 에 넣는 locator 는 page 에서 만든다. 걸러지는 것 안에서 찾는다
  const page = "goto" in scope ? scope : scope.page();
  return scope.locator("details").filter({
    // 제 바로 밑의 summary 만 본다(:scope >). 지우기가 다른 펼침 안에 들어
    // 있으면(올린 그림 목록) 바깥 펼침까지 걸린다.
    has: page
      // 글자로 찾을 때는 이름(aria-label)을 따로 단 것을 뺀다. 첨부파일 삭제도
      // 보이는 글자는 「삭제」 라, 빼지 않으면 글 삭제 대신 그것을 누른다
      .locator(":scope > summary:not([aria-label]) > span:first-child", {
        hasText: exact,
      })
      .or(page.locator(`:scope > summary[aria-label="${label}"]`)),
  });
}

/**
 * 코드 화면의 접힌 코드 목록을 모두 편다(MYH-183). 그룹마다 코드는 접혀 있어
 * 그대로는 줄을 누를 수 없다. 화면을 새로 열 때마다 부른다.
 */
export async function openAllCodes(page: Page) {
  // 로그인이 풀려 코드 화면이 아니면(뒷정리가 로그아웃 뒤에 돌 때) 할 것이 없다
  const any = await page
    .locator("details[data-codes]")
    .first()
    .waitFor({ state: "attached", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!any) return;
  await page.evaluate(() =>
    document
      .querySelectorAll<HTMLDetailsElement>("details[data-codes]")
      .forEach((d) => {
        d.open = true;
      }),
  );
}
