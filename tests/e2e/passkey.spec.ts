import { expect, test, type Page } from "@playwright/test";
import {
  login,
  logout,
  pressDelete,
  TEST_PREFIX,
} from "./helpers";

const LABEL = `${TEST_PREFIX}패스키`;
const RENAMED = `${TEST_PREFIX}이름바꾼기기`;

/**
 * 진짜 지문 센서 없이 패스키를 시험한다.
 *
 * 크롬에 가짜 인증기를 하나 꽂는다. 등록하라면 열쇠를 만들고 확인하라면
 * 서명해 준다 — 사람이 손가락을 대는 대목만 대신한다. 나머지는 실제
 * 화면과 실제 서버를 그대로 지난다.
 *
 * internal + 기기에 남는 열쇠로 잡는다. 폰에 등록하는 것과 같은 모양이라야
 * 우리가 쓰는 흐름(아이디 없이 곧장 들어오기)을 시험하는 값이 있다.
 */
async function plugInAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  return authenticatorId;
}

/**
 * 시험이 만든 기기를 지운다.
 *
 * 실패해서 중간에 멈춰도 다음 판이 깨끗한 자리에서 시작하도록 앞뒤로 부른다.
 * 손으로 등록해 둔 진짜 기기는 건드리지 않는다 — 이름이 e2e- 로 시작하는
 * 것만 고른다.
 */
async function removeTestPasskeys(page: Page) {
  await page.goto("/admin/security");
  for (;;) {
    const row = page.locator("li").filter({
      has: page.locator(`input[value^="${TEST_PREFIX}"]`),
    });
    const before = await row.count();
    if (before === 0) return;
    await pressDelete(row.first());
    // 지우기 전에 센 것과 견준다. 지운 뒤에 세면 이미 줄어 있어 -1 을 기다린다
    await expect(row).toHaveCount(before - 1);
  }
}

test.describe("패스키", () => {
  test("등록하고, 이름을 고치고, 그것으로 들어오고, 지운다", async ({
    page,
  }) => {
    await login(page);
    await removeTestPasskeys(page);
    await plugInAuthenticator(page);

    try {
      // 등록
      await page.goto("/admin/security");
      await page.getByLabel("기기 이름").fill(LABEL);
      await page.getByRole("button", { name: "이 기기 등록" }).click();
      await expect(page.getByText(`'${LABEL}' 을 등록했습니다.`)).toBeVisible();

      const row = page
        .locator("li")
        .filter({ has: page.locator(`input[value^="${TEST_PREFIX}"]`) });
      await page.reload();
      await expect(row).toHaveCount(1);
      await expect(row.getByText("아직 쓴 적 없음")).toBeVisible();

      // 이름 고치기
      await row.getByRole("textbox").fill(RENAMED);
      await row.getByRole("button", { name: "이름 바꾸기" }).click();
      await expect(row.getByRole("textbox")).toHaveValue(RENAMED);

      // 그것으로 들어오기
      await page.goto("/admin");
      await logout(page);
      await expect(
        page.getByRole("heading", { name: "관리자 로그인" }),
      ).toBeVisible();
      // 패스키가 앞이므로 비밀번호 칸은 접혀 있다
      await expect(page.getByLabel("비밀번호")).toBeHidden();

      await page.getByRole("button", { name: "패스키로 로그인" }).click();
      await expect(
        page.getByRole("heading", { name: "대시보드", level: 1 }),
      ).toBeVisible();

      // 쓴 자국이 남는다
      await page.goto("/admin/security");
      await expect(row.getByText(/마지막으로 씀/)).toBeVisible();
    } finally {
      await removeTestPasskeys(page);
    }

    // 지우고 나면 목록에서도 사라진다
    await expect(page.getByText(RENAMED)).toHaveCount(0);
  });
});
