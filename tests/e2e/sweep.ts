import { expect, type Page } from "@playwright/test";
import { deleteControl, openAllCodes, pressDelete } from "./helpers";

/**
 * 시험이 남긴 것을 치운다(MYH-158).
 *
 * 시험이 중간에 깨지면 뒷정리 줄까지 못 간다. 그 찌꺼기가 개발 DB 에 쌓여
 * 다음 시험을 깨뜨렸다 — 2026-09-19 에는 짧은 글 여덟 편이 `/notes` 를 흐려
 * 그림 하나를 찾던 시험이 둘을 만났고, 2026-09-26 에는 같은 제목의 글 두 개가
 * 「하나만 있어야 한다」 는 시험을 깨뜨렸다.
 *
 * **이름이 시험 접두어로 시작하는 것만 지운다.** 시험은 모두 `e2e-` 나
 * `e2e ` 로 이름을 짓는다(helpers.ts 의 TEST_PREFIX, 그리고 몇몇 고정 제목).
 *
 * **DB 를 직접 건드리지 않고 관리 화면으로 지운다.** 두 가지 까닭이다.
 * - 로컬에서 `.env.local` 의 DATABASE_URL 은 **운영 DB** 다. 화면으로 지우면
 *   시험이 여는 서버(개발기, CI 는 빈 DB)에만 닿는다. 운영에 닿을 길이 없다
 * - 비밀글은 제목까지 암호문이라 DB 에서는 이름으로 고를 수 없다. 올린 파일을
 *   디스크에서 함께 지우는 것도 앱이 한다
 *
 * 제목 없는 초안(그림만 올리고 떠난 것)은 건드리지 않는다. 화면에서는 시험이
 * 만든 것인지 사람이 만든 것인지 가를 수 없다. 시험은 늘 제목을 먼저 적는다.
 *
 * 부르기 전에 로그인해 두어야 한다. 지우기 전에 묻는 창은 login() 이 "예" 로
 * 답하게 해 둔다.
 */

/** 시험이 지은 이름인가 */
export const TEST_NAME = /^e2e[- ]/;

/** 무엇이 잘못돼 같은 것을 계속 지우려 들면 멈춘다. 한 번에 이만큼 남을 일은 없다 */
const LIMIT = 200;

/**
 * 목록에서 고른 것의 주소로 곧장 간다. 누르지 않는다 — 화면이 아직 살아나는
 * 중이면 누른 것이 먹지 않을 때가 있다. 이미 지워진 것이면(방금 시험이 지웠는데
 * 목록에 아직 남아 있던 것) 404 가 나오고, 그때는 false 를 돌려준다.
 */
async function open(page: Page, href: string) {
  await page.goto(href);
  return (
    (await page
      .getByRole("heading", { name: "페이지를 찾을 수 없습니다" })
      .count()) === 0
  );
}

/** 한 번 지울 때마다 몇 개가 치워졌는지 센다. 끝에 알린다 */
type Tally = Record<string, number>;

async function loop(
  label: string,
  tally: Tally,
  next: () => Promise<boolean>,
) {
  for (let i = 0; i < LIMIT; i++) {
    if (!(await next())) return;
    tally[label] = (tally[label] ?? 0) + 1;
  }
  throw new Error(`${label}: ${LIMIT}번 지워도 남아 있다 — 지우기가 안 먹는 것 같다`);
}

/** 블로그 글. 목록의 제목 링크로 들어가 「삭제」 */
export async function sweepPosts(page: Page, tally: Tally = {}) {
  await loop("블로그 글", tally, async () => {
    await page.goto("/admin/posts");
    // 글로 가는 링크만. 목록에는 공개 화면으로 가는 링크 같은 것도 섞여 있다
    const link = page
      .getByRole("main")
      .locator('a[href^="/admin/posts/"]:not([href$="/new"])')
      .filter({ hasText: TEST_NAME });
    if ((await link.count()) === 0) return false;
    if (!(await open(page, (await link.first().getAttribute("href"))!))) {
      return true;
    }
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    await pressDelete(page);
    await page.getByRole("heading", { name: "블로그 관리" }).waitFor();
    return true;
  });
  return tally;
}

/** 짧은 글. 목록의 줄마다 본문 칸이 있고, 그 줄의 「삭제」 */
export async function sweepNotes(page: Page, tally: Tally = {}) {
  await loop("짧은 글", tally, async () => {
    await page.goto("/admin/notes");
    const rows = page.locator("li[id^='note-']");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const body = await row.locator("textarea").first().inputValue().catch(() => "");
      if (!TEST_NAME.test(body)) continue;
      const id = await row.getAttribute("id");
      await pressDelete(row);
      await expect(page.locator(`li[id="${id}"]`)).toHaveCount(0);
      return true;
    }
    return false;
  });
  return tally;
}

/** 비밀글. 목록 → 글 → 「고치기」 → 「삭제」. 붙인 파일도 앱이 함께 지운다 */
export async function sweepSecrets(page: Page, tally: Tally = {}) {
  await loop("비밀글", tally, async () => {
    await page.goto("/admin/secrets");
    // 글로 가는 링크(/admin/secrets/번호)만. 태그 거르기 링크(「e2e-일기-… 1」,
    // /admin/secrets?tag=…)도 시험 이름으로 시작해서, 이름만 보고 누르면 태그
    // 목록으로 가 「고치기」 를 영영 못 찾는다(2026-09-28 에 5분을 그렇게 썼다)
    const link = page
      .getByRole("main")
      .locator('a[href^="/admin/secrets/"]:not([href$="/new"])')
      .filter({ hasText: TEST_NAME });
    if ((await link.count()) === 0) return false;
    // 고치는 화면으로 곧장 간다. 「삭제」 는 거기 있다
    const href = (await link.first().getAttribute("href"))!;
    if (!(await open(page, `${href}/edit`))) return true;
    await pressDelete(page);
    // 지우면 목록으로 돌려보낸다. 그것을 기다린다 — 안 기다리고 다음 줄로
    // 가면 아직 지워지는 중인 글을 목록에서 다시 눌러 404 를 만난다
    await expect(page).toHaveURL(/\/admin\/secrets$/);
    return true;
  });
  return tally;
}

/**
 * 줄마다 이름 칸과 「삭제」 가 붙은 목록(프로젝트 · 수행 업무, 내 서비스).
 * 이름 칸의 값이 시험 이름이면 그 줄을 지운다.
 */
async function sweepRows(page: Page, label: string, path: string, tally: Tally) {
  await loop(label, tally, async () => {
    await page.goto(path);
    const inputs = page.locator('input[name="name"]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const value = await inputs.nth(i).inputValue();
      if (!TEST_NAME.test(value)) continue;
      const row = page
        .locator("li, form")
        .filter({ has: page.locator(`input[name="name"][value="${value}"]`) })
        .filter({ has: deleteControl(page) })
        .last();
      await pressDelete(row);
      await expect(
        page.locator(`input[name="name"][value="${value}"]`),
      ).toHaveCount(0);
      return true;
    }
    return false;
  });
  return tally;
}

export const sweepProjects = (page: Page, tally: Tally = {}) =>
  sweepRows(page, "프로젝트", "/admin/projects", tally);

export const sweepLinks = (page: Page, tally: Tally = {}) =>
  sweepRows(page, "내 서비스", "/admin/links?manage=1", tally);

/** 메뉴. 트리에서 고르고 오른쪽에서 지운다. 아래 줄이 있으면 같이 지운다 */
export async function sweepMenus(page: Page, tally: Tally = {}) {
  await loop("메뉴", tally, async () => {
    await page.goto("/admin/menus");
    const item = page
      .getByRole("navigation", { name: "메뉴 트리" })
      .getByRole("link")
      .filter({ hasText: TEST_NAME });
    if ((await item.count()) === 0) return false;
    await page.goto((await item.first().getAttribute("href"))!);
    // 이미 지워진 번호면 오른쪽이 「고칠 줄을 누르세요」 로 돌아온다
    if ((await page.getByRole("heading", { level: 2 }).filter({ hasText: TEST_NAME }).count()) === 0) {
      return true;
    }
    const hasChildren = await deleteControl(page, "아래까지 지우기").count();
    await pressDelete(page, hasChildren ? "아래까지 지우기" : "삭제");
    await expect(page).toHaveURL(/\/admin\/menus$/);
    return true;
  });
  return tally;
}

/**
 * 코드(MYH-131). 쓰는 줄이 남아 있으면 지우기 단추가 없으니 내 서비스를 치운
 * 뒤에 부른다. 사람이 쓰는 분류를 시험 이름으로 지을 일은 없다.
 */
export async function sweepCodes(page: Page, tally: Tally = {}) {
  await loop("코드", tally, async () => {
    await page.goto("/admin/codes");
    await openAllCodes(page);
    const inputs = page.locator('input[name="label"]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const value = await inputs.nth(i).inputValue();
      if (!TEST_NAME.test(value)) continue;
      const row = page
        .locator("li")
        .filter({ has: page.locator(`input[name="label"][value="${value}"]`) });
      // 아직 쓰는 줄이 있으면(다른 시험이 만든 서비스) 이번에는 건너뛴다
      if ((await deleteControl(row, `${value} 삭제`).count()) === 0) continue;
      await pressDelete(row, `${value} 삭제`);
      await expect(
        page.locator(`input[name="label"][value="${value}"]`),
      ).toHaveCount(0);
      return true;
    }
    return false;
  });
  return tally;
}

/** 코드 그룹(MYH-183). 안의 코드는 sweepCodes 가 먼저 치운다 */
export async function sweepCodeGroups(page: Page, tally: Tally = {}) {
  await loop("코드 그룹", tally, async () => {
    await page.goto("/admin/codes");
    await openAllCodes(page);
    const names = page.locator('input[aria-label="그룹 이름"]');
    const count = await names.count();
    for (let i = 0; i < count; i++) {
      const value = await names.nth(i).inputValue();
      if (!TEST_NAME.test(value)) continue;
      const section = page.getByRole("region", { name: value, exact: true });
      // 안에 코드가 남았으면(다른 시험 것) 지우기 단추가 없다. 다음 번에
      if ((await deleteControl(section, `${value} 그룹 삭제`).count()) === 0)
        continue;
      await pressDelete(section, `${value} 그룹 삭제`);
      await expect(
        page.getByRole("region", { name: value, exact: true }),
      ).toHaveCount(0);
      return true;
    }
    return false;
  });
  return tally;
}

/** 방명록(MYH-191). 남긴 이름이 e2e 로 시작하는 것 */
export async function sweepGuestbook(page: Page, tally: Tally = {}) {
  await loop("방명록", tally, async () => {
    await page.goto("/guestbook");
    const rows = page.getByRole("region", { name: "남긴 글" }).locator("li");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const author = (await row.locator("span").first().textContent()) ?? "";
      if (!TEST_NAME.test(author)) continue;
      if ((await deleteControl(row).count()) === 0) return false;
      await pressDelete(row);
      return true;
    }
    return false;
  });
  return tally;
}

/** 읽는 책(MYH-190). 제목이 e2e 로 시작하는 것 */
export async function sweepBooks(page: Page, tally: Tally = {}) {
  await loop("책", tally, async () => {
    await page.goto("/admin/books");
    const row = page.locator("#books li").filter({ hasText: TEST_NAME }).first();
    if ((await row.count()) === 0) return false;
    const title = (await row.locator(":scope > details > summary span").first().textContent()) ?? "";
    if (!TEST_NAME.test(title)) return false;
    await row.locator(":scope > details > summary").click();
    await pressDelete(row, `${title} 삭제`);
    await expect(
      page.locator("#books summary span", { hasText: title }),
    ).toHaveCount(0);
    return true;
  });
  return tally;
}

/** 전부. 시험을 돌리기 전과 끝난 뒤에 한 번씩 부른다(sweep.setup.ts) */
export async function sweepAll(page: Page) {
  const tally: Tally = {};
  await sweepPosts(page, tally);
  await sweepNotes(page, tally);
  await sweepSecrets(page, tally);
  await sweepProjects(page, tally);
  await sweepLinks(page, tally);
  await sweepCodes(page, tally);
  await sweepCodeGroups(page, tally);
  await sweepMenus(page, tally);
  await sweepGuestbook(page, tally);
  await sweepBooks(page, tally);
  return tally;
}
