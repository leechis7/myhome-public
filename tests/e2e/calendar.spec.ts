import { expect, test } from "@playwright/test";
import { login, pressDelete } from "./helpers";

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
});
