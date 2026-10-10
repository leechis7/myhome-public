import { expect, test, type Page } from "@playwright/test";
import { deleteControl, login, openAllCodes, pressDelete } from "./helpers";
import { sweepCodeGroups, sweepCodes } from "./sweep";

/**
 * 코드 화면(MYH-131). 관리 › 설정 › 코드.
 *
 * 기술 분류 그룹으로 본다. 소개 화면에 이 순서 그대로 나온다.
 * 이름은 모두 「e2e 」 로 시작해 뒷정리(sweep.ts 의 sweepCodes)가 치운다.
 */

function section(page: Page) {
  // 그룹 이름은 고치는 칸에 들어 있어 글자로는 못 찾는다. 구역 이름으로 찾는다
  return page.getByRole("region", { name: "기술 분류", exact: true });
}

function rowOf(page: Page, label: string) {
  return section(page)
    .locator("li")
    .filter({ has: page.locator(`input[name="label"][value="${label}"]`) });
}

async function add(page: Page, label: string, code = "") {
  const form = section(page).locator("form").last();
  if (code) await form.getByLabel("새 기술 분류 코드").fill(code);
  await form.getByLabel("새 기술 분류", { exact: true }).fill(label);
  await form.getByRole("button", { name: "추가" }).click();
}

test.describe("코드", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin/codes");
    await openAllCodes(page);
  });

  test.afterEach(async ({ page }) => {
    await sweepCodes(page);
    await sweepCodeGroups(page);
  });

  test("비워 두면 다음 번호가 붙고, 글자로도 적을 수 있다", async ({
    page,
  }) => {
    const stamp = Date.now().toString(36);
    const a = `e2e 자동 ${stamp}`;
    const b = `e2e 글자 ${stamp}`;

    // 비운 코드 칸에는 붙을 번호가 흐리게 보인다
    const hint = await section(page)
      .getByLabel("새 기술 분류 코드")
      .getAttribute("placeholder");
    expect(hint).toMatch(/^\d{5,}$/);

    await add(page, a);
    await expect(rowOf(page, a)).toBeVisible();
    await expect(rowOf(page, a).getByLabel(`${a} 코드`)).toHaveValue(hint!);

    const code = `e2e_${stamp}`;
    await add(page, b, code);
    await expect(rowOf(page, b).getByLabel(`${b} 코드`)).toHaveValue(code);

    // 같은 이름 · 같은 코드는 막는다
    await add(page, a);
    await expect(page.getByText(`「${a}」 은 이미 있습니다.`)).toBeVisible();
    await add(page, `e2e 겹침 ${stamp}`, code);
    await expect(
      page.getByText(`코드 ${code} 는 이미 있습니다.`),
    ).toBeVisible();

    // 모양이 틀린 코드는 브라우저가 먼저 막는다(한글, 빈칸)
    const input = section(page).getByLabel("새 기술 분류 코드");
    await input.fill("한 글");
    expect(
      await input.evaluate((el: HTMLInputElement) => el.validity.valid),
    ).toBe(false);
  });

  test("이름 · 코드를 고치고 순서를 바꾸고 끈다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const first = `e2e 첫째 ${stamp}`;
    const second = `e2e 둘째 ${stamp}`;
    // 하나씩 기다린다. 추가 폼은 저장이 끝나면 비워지므로, 앞의 것이 끝나기
    // 전에 다음 이름을 적으면 그 글자가 지워진다(CI 에서 걸렸다)
    await add(page, first);
    await expect(rowOf(page, first)).toBeVisible();
    await add(page, second);
    await expect(rowOf(page, second)).toBeVisible();

    // 둘째를 위로 올리면 첫째 앞에 선다
    const order = async () =>
      (
        await section(page)
          .locator('input[name="label"]')
          .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
      ).filter((v) => v.includes(stamp));
    expect(await order()).toEqual([first, second]);
    await rowOf(page, second)
      .getByRole("button", { name: `${second} 위로` })
      .click();
    await expect.poll(order).toEqual([second, first]);

    // 이름을 고친다. 줄은 코드로 찾는다 - 이름은 방금 바뀌었다
    const renamed = `e2e 고친 ${stamp}`;
    const code = await rowOf(page, first)
      .getByLabel(`${first} 코드`)
      .inputValue();
    const byCode = section(page)
      .locator("li")
      .filter({ has: page.locator(`input[name="code"][value="${code}"]`) });
    await byCode.getByLabel("이름").fill(renamed);
    await byCode.getByRole("button", { name: "저장" }).click();
    await expect(byCode.getByText("고쳤습니다.")).toBeVisible();
    await expect(rowOf(page, renamed)).toBeVisible();

    // 코드도 고친다. 줄의 열쇠가 바뀌어 새 줄로 그려지므로 알림 대신 값을 본다
    await rowOf(page, renamed)
      .getByLabel(`${renamed} 코드`)
      .fill(`e2e_r_${stamp}`);
    await rowOf(page, renamed).getByRole("button", { name: "저장" }).click();
    await expect(
      section(page)
        .locator("li")
        .filter({
          has: page.locator(`input[name="code"][value="e2e_r_${stamp}"]`),
        }),
    ).toHaveCount(1);
    await page.reload();
    await openAllCodes(page);
    await expect(
      rowOf(page, renamed).getByLabel(`${renamed} 코드`),
    ).toHaveValue(`e2e_r_${stamp}`);

    // 끄면 기술 추가의 고르는 칸에서 빠진다
    await page.goto("/admin/profile");
    const picker = page
      .locator("form", { hasText: "기술 추가" })
      .getByLabel("분류", { exact: true });
    await expect(picker.locator("option", { hasText: renamed })).toHaveCount(1);

    await page.goto("/admin/codes");
    await openAllCodes(page);
    await rowOf(page, renamed)
      .getByRole("button", { name: "쓰지 않기" })
      .click();
    await expect(rowOf(page, renamed).getByText("쓰지 않음")).toBeVisible();
    await page.goto("/admin/profile");
    await expect(picker.locator("option", { hasText: renamed })).toHaveCount(0);

    // 다시 쓰면 돌아온다
    await page.goto("/admin/codes");
    await openAllCodes(page);
    await rowOf(page, renamed)
      .getByRole("button", { name: "다시 쓰기" })
      .click();
    await expect(rowOf(page, renamed).getByText("쓰지 않음")).toHaveCount(0);

    // 아무도 안 쓰니 지울 수 있다
    await expect(
      deleteControl(rowOf(page, renamed), `${renamed} 삭제`),
    ).toHaveCount(1);
    await pressDelete(rowOf(page, renamed), `${renamed} 삭제`);
    await expect(rowOf(page, renamed)).toHaveCount(0);
  });

  // MYH-183
  test("그룹을 더하고 고치고, 코드가 없을 때만 지운다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const name = `e2e 그룹 ${stamp}`;
    const renamed = `e2e 고친 그룹 ${stamp}`;

    const adder = page.getByRole("region", { name: "그룹 추가" });
    await adder.getByLabel("새 그룹 이름").fill(name);
    await adder.getByRole("button", { name: "추가" }).click();
    const group = page.getByRole("region", { name, exact: true });
    await expect(group).toBeVisible();
    await expect(group.getByText("쓰는 화면 없음")).toBeVisible();
    // 코드 목록은 접혀 있다. 코드 개수는 접힌 채로도 보인다
    await expect(group.getByText("코드 0개")).toBeVisible();
    // 코드를 비워 두면 번호가 붙는다
    await expect(group.getByLabel(`${name} 그룹 코드`)).toHaveValue(/^\d{5,}$/);

    // 이름과 코드를 고친다
    await group.getByLabel("그룹 이름").fill(renamed);
    await group.getByLabel(`${name} 그룹 코드`).fill(`e2e_g_${stamp}`);
    await group.getByRole("button", { name: "저장" }).first().click();
    const again = page.getByRole("region", { name: renamed, exact: true });
    await expect(again).toBeVisible();
    await openAllCodes(page);
    await expect(again.getByLabel(`${renamed} 그룹 코드`)).toHaveValue(
      `e2e_g_${stamp}`,
    );

    // 코드를 하나 넣으면 그룹은 지울 수 없다
    const label = `e2e 그룹 속 ${stamp}`;
    await again.getByLabel(`새 ${renamed}`, { exact: true }).fill(label);
    await again.getByRole("button", { name: "추가" }).click();
    await expect(
      again.locator(`input[name="label"][value="${label}"]`),
    ).toBeVisible();
    await expect(again.getByText("코드가 남아 못 지움")).toBeVisible();
    await expect(deleteControl(again, `${renamed} 그룹 삭제`)).toHaveCount(0);

    // 코드를 지우면 그룹도 지울 수 있다
    await pressDelete(again, `${label} 삭제`);
    await expect(
      again.locator(`input[name="label"][value="${label}"]`),
    ).toHaveCount(0);
    await pressDelete(again, `${renamed} 그룹 삭제`);
    await expect(
      page.getByRole("region", { name: renamed, exact: true }),
    ).toHaveCount(0);
  });

  test("프로그램이 쓰는 그룹은 코드를 못 바꾸고 못 지운다", async ({
    page,
  }) => {
    const group = section(page);
    await expect(group.getByLabel("기술 분류 그룹 코드")).toHaveAttribute(
      "readonly",
      "",
    );
    await expect(group.getByText("프로그램이 씀")).toBeVisible();
    await expect(deleteControl(group, "기술 분류 그룹 삭제")).toHaveCount(0);
  });

  test("로그인하지 않으면 들어갈 수 없다", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/admin/codes");
    await openAllCodes(page);
    await expect(page).toHaveURL(/\/admin$/);
  });
});
