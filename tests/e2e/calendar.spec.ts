import { expect, test } from "@playwright/test";
import { login, pressDelete, TEST_PREFIX } from "./helpers";

/**
 * 일정(MYH-214). iCal 을 읽고 펼치는 것은 단위 시험(calendar-ical)이 본다.
 * 여기서는 주소를 넣고 빼는 길, 주소를 다시 보여 주지 않는 것, 읽지 못한
 * 캘린더를 알리는 것을 본다(밖의 캘린더에 기대지 않게 닿지 않는 주소로).
 */

test.describe("일정", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("주소를 넣고 빼고, 넣은 주소는 다시 보이지 않는다", async ({ page }) => {
    // 연결은 관리 › 설정 › 사이트 에서 한다
    await page.goto("/admin/calendar");
    await expect(page.getByRole("heading", { name: "일정", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "연결 설정" }).click();
    await expect(page).toHaveURL(/\/admin\/settings#calendar$/);
    // 이미 진짜 캘린더를 연결해 둔 개발기라면 건드리지 않는다
    test.skip(
      (await page.getByText(/설정됨 · 캘린더/).count()) > 0,
      "이미 캘린더가 연결돼 있다",
    );

    const form = page.getByRole("form", { name: "캘린더 주소" });
    // http 는 받지 않는다
    await form.getByLabel("iCal 주소").fill("http://example.com/basic.ics");
    await form.getByRole("button", { name: "캘린더 연결" }).click();
    await expect(page.locator("#calendar").getByRole("status")).toHaveText(/http 는 받지 않습니다/);

    const secret = "회사 https://calendar.invalid/e2e-private-token/basic.ics";
    await page.getByRole("form", { name: "캘린더 주소" }).getByLabel("iCal 주소").fill(secret);
    await page.getByRole("form", { name: "캘린더 주소" }).getByRole("button", { name: "캘린더 연결" }).click();
    await expect(page.locator("#calendar").getByRole("status")).toHaveText("캘린더 주소를 저장했습니다.");
    await expect(page.locator("#calendar").getByText(/설정됨 · 캘린더 1개\(회사\)/)).toBeVisible();
    expect(await page.content()).not.toContain("e2e-private-token");
    // 닿지 않는 캘린더는 일정 화면에서 알린다. 주소는 화면 어디에도 없다
    await page.goto("/admin/calendar");
    await expect(
      page.getByRole("alert").filter({ hasText: "캘린더 1개를 읽지 못했습니다" }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("e2e-private-token");
    await page.goto("/admin/settings#calendar");

    await pressDelete(page, "캘린더 주소 지우기");
    await expect(page.locator("#calendar").getByRole("status")).toHaveText("캘린더 주소를 지웠습니다.");
    // 환경설정 화면에는 다른 칸(카카오 …)의 「설정 안 됨」 도 있다 - 캘린더 칸에서만 본다
    await expect(page.locator("#calendar").getByText("○ 설정 안 됨")).toBeVisible();
  });

  test("새로 고침 단추는 보던 화면 그대로 구글에서 다시 가져온다(MYH-262)", async ({ page }) => {
    await page.goto("/admin/calendar?view=week");
    const refresh = page.getByRole("button", { name: "↻ 새로 고침" });
    // 캘린더를 연결하지 않은 곳에는 단추가 없다
    test.skip((await refresh.count()) === 0, "캘린더가 연결돼 있지 않다");
    await refresh.click();
    await expect(page).toHaveURL(/\/admin\/calendar\?view=week$/);
    await expect(page.getByText(/\d{2}:\d{2} 에 가져옴/)).toBeVisible();
  });

  test("날짜 있는 할 일이 달력과 고른 날 목록에 보인다(MYH-254)", async ({ page }) => {
    const title = `${TEST_PREFIX}달력 할 일 ${Date.now().toString(36)}`;
    await page.goto("/admin/todos");
    const form = page.getByRole("form", { name: "할 일 더하기" });
    await form.getByLabel("새 할 일").fill(title);
    await form.getByLabel("시작 시각").fill("23:00");
    await form.getByRole("button", { name: "더하기" }).click();
    const open = page.getByRole("list", { name: "남은 할 일" });
    await expect(open.locator("li", { hasText: title })).toBeVisible();

    // 오늘이 골라진 채로 열린다 - 고른 날 목록에 할 일로, 누르면 할 일 화면
    await page.goto("/admin/calendar");
    const row = page.getByRole("list", { name: "고른 날 일정" }).getByRole("link", { name: new RegExp(title) });
    await expect(row).toContainText("23:00");
    await expect(row).toContainText("할 일");
    await page.goto("/admin/calendar?view=week");
    await expect(page.getByText(`☐ ${title}`)).toBeVisible();
    await page.goto("/admin/calendar");
    await page.getByRole("list", { name: "고른 날 일정" }).getByRole("link", { name: new RegExp(title) }).click();
    await expect(page).toHaveURL(/\/admin\/todos$/);

    // 끝내면 끝낸 할 일로 남는다
    await open.getByRole("button", { name: `${title} 끝냄` }).click();
    await expect(open.locator("li", { hasText: title })).toHaveCount(0);
    await page.goto("/admin/calendar");
    await expect(
      page.getByRole("list", { name: "고른 날 일정" }).getByRole("link", { name: new RegExp(title) }),
    ).toContainText("끝낸 할 일");

    await page.goto("/admin/todos");
    await page.getByText(/^끝낸 일 \d+$/).click();
    // 끝낸 일은 하나씩 지울 수 없다 - 되살려서 지운다(남의 끝낸 일은 건드리지 않게)
    await page.getByRole("list", { name: "끝낸 일" }).getByRole("button", { name: `${title} 되살리기` }).click();
    await pressDelete(open.locator("li", { hasText: title }), "할 일 삭제");
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
