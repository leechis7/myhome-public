import { expect, test } from "@playwright/test";
import {
  openAllCodes,
  createPost,
  deleteControl,
  deletePost,
  login,
  loginScreen,
  openAdminMenu,
  pressDelete,
  TEST_PREFIX,
} from "./helpers";

// 이전 실행이 중간에 실패해 남긴 자료와 겹치지 않게 매번 다른 이름을 쓴다
const PROJECT = `e2e 프로젝트 ${Date.now().toString(36)}`;

test.describe("관리 화면", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // 자주 여는 셋은 펼치지 않고 첫 단에서 바로 간다. 나머지 관리 화면은
  // "관리" 그룹 안에 있다(MYH-125).
  test("로그인하면 주요 메뉴에 비밀글·내 서비스·감시가 붙는다", async ({
    page,
  }) => {
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    for (const item of ["비밀글", "내 서비스", "감시"]) {
      await page.goto("/");
      await nav.getByRole("link", { name: item, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: item, level: 1 }),
      ).toBeVisible();
    }
  });

  // 글 하나 쓰려고 관리 화면까지 들어가는 것이 번거로워 목록에 단추를 뒀다.
  test("블로그와 짧은 글 목록에서 바로 쓰러 갈 수 있다", async ({ page }) => {
    await page.goto("/blog");
    await page.getByRole("link", { name: "새 글" }).click();
    await expect(page.getByRole("heading", { name: "새 글" })).toBeVisible();

    await page.goto("/notes");
    await page.getByRole("link", { name: "새 글" }).click();
    await expect(page.getByText("새로 쓰기")).toBeVisible();
  });

  // 오타 하나 고치려고 관리 화면에서 그 글을 찾는 것이 번거로워 붙였다.
  test("보고 있는 글에서 바로 고치러 갈 수 있다", async ({ page }) => {
    const 제목 = `e2e 고치기 확인 ${Date.now().toString(36)}`;
    const id = await createPost(page, { title: 제목, content: "고치기 단추 확인" });

    await page.goto(`/blog/${id}`);
    await page.getByRole("link", { name: "고치기" }).click();
    await expect(page.getByRole("heading", { name: "글 수정" })).toBeVisible();
    await expect(page.getByLabel("제목")).toHaveValue(제목);

    await deletePost(page, 제목);
  });

  // 관리 화면마다 붙던 띠는 없어졌다. 같은 것이 관리 그룹에 있다.
  test("관리 띠는 없고, 관리 그룹은 로그인했을 때만 있다", async ({
    page,
    context,
  }) => {
    await page.goto("/admin/posts");
    await expect(
      page.getByRole("navigation", { name: "관리 메뉴" }),
    ).toHaveCount(0);
    await openAdminMenu(page);

    await context.clearCookies();
    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "주요 메뉴" })
        .locator("summary", { hasText: /^관리$/ }),
    ).toHaveCount(0);
  });

  // 메뉴는 모든 화면에 있다. 그래서 한 번 들어가면 계속 옆으로 갈 수 있다.
  // 관리 안의 글 · 설정 그룹은 펼침 안에서 작은 제목 아래 늘어놓는다 —
  // 펼침 안에 또 펼침을 두지 않는다(MYH-125).
  test("관리 그룹으로 각 화면에 갈 수 있다", async ({ page }) => {
    // 비밀글 · 내 서비스 · 감시는 첫 단에 있다. 수행 업무는 소개 관리 안이다.
    const screens = [
      ["메시지", "받은 메시지"],
      ["블로그", "블로그 관리"],
      ["프로젝트", "프로젝트 관리"],
      // 설정 그룹 안에서는 이름이 짧다(MYH-126)
      ["프로필", "소개 관리"],
      ["암호", "암호설정"],
      ["메뉴", "메뉴 관리"],
    ] as const;

    await page.goto("/");
    const menu = await openAdminMenu(page);
    await expect(menu.getByText("글", { exact: true })).toBeVisible();
    await expect(menu.getByText("설정", { exact: true })).toBeVisible();

    for (const [item, heading] of screens) {
      await openAdminMenu(page);
      await menu.getByRole("link", { name: item, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: heading, level: 1 }),
      ).toBeVisible();
      // 화면을 옮기면 펼침이 닫히고, 지금 있는 줄에 표시가 남는다
      await expect(menu).not.toHaveAttribute("open");
      await expect(menu.locator('[aria-current="page"]')).toHaveText(item);
    }
  });

  // 휴대폰에서는 그룹을 접어 둔다. 첫 단만 보여야 한눈에 들어온다.
  test("휴대폰 메뉴는 관리 그룹을 접어 두고, 지금 화면이 그 안이면 펼쳐 둔다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = page.getByRole("navigation", { name: "모바일 메뉴" });
    const messages = mobile.getByRole("link", { name: "메시지" });

    await page.goto("/");
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(mobile.getByRole("link", { name: "블로그" }).first()).toBeVisible();
    await expect(messages).toBeHidden();
    await mobile.locator("summary", { hasText: "관리" }).click();
    await expect(messages).toBeVisible();

    await page.goto("/admin/messages");
    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(messages).toBeVisible();
    await expect(messages).toHaveAttribute("aria-current", "page");
  });

  // 펼침은 키보드로도 닫혀야 한다. 열린 채 남으면 아래를 가린다.
  test("관리 그룹은 Esc 와 바깥 누르기로 닫힌다", async ({ page }) => {
    await page.goto("/");
    const menu = await openAdminMenu(page);
    const summary = menu.locator("summary");

    await menu.getByRole("link", { name: "메시지" }).focus();
    await page.keyboard.press("Escape");
    await expect(menu).not.toHaveAttribute("open");
    // 닫은 자리로 포커스가 돌아온다
    await expect(summary).toBeFocused();

    await summary.click();
    await expect(menu).toHaveAttribute("open");
    await page.getByRole("heading", { level: 1 }).first().click();
    await expect(menu).not.toHaveAttribute("open");
  });

  // 지우기 확인은 화면의 스크립트가 없어도 선다(MYH-110). 전에는 브라우저
  // confirm 이라, 하이드레이션이 실패한 순간에는 묻지도 않고 지워졌다.
  // 스크립트를 끈 브라우저로 그 순간을 흉내 낸다.
  test("스크립트가 없어도 지우기 전에 묻는다", async ({ browser }) => {
    const name = `${TEST_PREFIX}묻기-${Date.now().toString(36)}`;
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await login(page);
      await page.goto("/admin/projects");
      const form = page.locator("form").last();
      await form.getByLabel("이름").fill(name);
      await form.getByLabel("한 줄 요약").fill("묻는지 본다");
      await form.getByRole("button", { name: "추가" }).click();
      await page.goto("/admin/projects");
      const row = page
        .locator("form")
        .filter({ has: page.locator(`input[value="${name}"]`) });
      await expect(row).toHaveCount(1);

      // 한 번 누르면 묻기만 한다. 지워지지 않는다
      const 지우기 = deleteControl(row);
      await 지우기.locator(":scope > summary").click();
      await expect(지우기).toContainText(name);
      await page.goto("/admin/projects");
      await expect(page.locator(`input[value="${name}"]`)).toHaveCount(1);

      // 「예, 지웁니다」 까지 눌러야 지워진다
      await pressDelete(
        page.locator("form").filter({
          has: page.locator(`input[value="${name}"]`),
        }),
      );
      await page.goto("/admin/projects");
      await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  // 프로젝트는 프로젝트 관리에서 고치고 /projects 에 나온다
  test("프로젝트를 넣으면 프로젝트 화면에 나오고 지우면 사라진다", async ({
    page,
  }) => {
    const name = `e2e 프로젝트 ${Date.now().toString(36)}`;

    await page.goto("/admin/projects");
    const form = page.locator("form").last();
    await form.getByLabel("이름").fill(name);
    await form.getByLabel("한 줄 요약").fill("만들고 있는 것");
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator(`input[value="${name}"]`)).toBeVisible();

    // 프로젝트 화면에는 나오고, 수행 업무 쪽에는 나오지 않는다
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await page.goto("/about");
    await expect(page.getByRole("heading", { name })).toHaveCount(0);

    await page.goto("/admin/projects");
    const row = page.locator("li").filter({
      has: page.locator(`input[value="${name}"]`),
    });
    await pressDelete(row);
    await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);
  });

  // 비공개 저장소에 링크를 걸면 눌러 봐야 404 다. 주소는 적어 두되
  // 링크만 안 건다(MYH-163).
  test("비공개 저장소는 링크가 걸리지 않는다", async ({ page }) => {
    const name = `e2e 저장소 ${Date.now().toString(36)}`;
    const repo = "https://github.com/example/myhome";

    await page.goto("/admin/projects");
    const form = page.locator("form").last();
    await form.getByLabel("이름").fill(name);
    await form.getByLabel("저장소 주소").fill(repo);
    // 새로 넣는 줄은 공개로 시작한다
    await expect(form.getByLabel("저장소 공개")).toBeChecked();
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator(`input[value="${name}"]`)).toBeVisible();

    await page.goto("/projects");
    const 켰을때 = page.locator("li").filter({ hasText: name });
    await expect(
      켰을때.getByRole("link", { name: /저장소/ }),
    ).toHaveAttribute("href", repo);

    // 끄면 링크가 사라지고 글자만 남는다
    await page.goto("/admin/projects");
    const row = page.locator("li").filter({
      has: page.locator(`input[value="${name}"]`),
    });
    await row.getByLabel("저장소 공개").uncheck();
    await row.getByRole("button", { name: "수정" }).click();
    // 수정은 눌러도 보이는 변화가 없다. 그래서 고쳤다고 알린다(MYH-166).
    await expect(row.getByText("수정했습니다.")).toBeVisible();
    await expect(row.getByLabel("저장소 공개")).not.toBeChecked();

    await page.goto("/projects");
    const 껐을때 = page.locator("li").filter({ hasText: name });
    await expect(껐을때.getByRole("link", { name: /저장소/ })).toHaveCount(0);
    await expect(껐을때.getByText("저장소 비공개")).toBeVisible();

    await page.goto("/admin/projects");
    await pressDelete(page
      .locator("li")
      .filter({ has: page.locator(`input[value="${name}"]`) }));
    await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);
  });

  // 목록에 줄이 여럿이다. 알림이 누른 줄에만 떠야 하고, 계속 남아 있으면
  // 다음에 눌렀을 때 그것이 방금 것인지 아까 것인지 알 수 없다(MYH-166).
  test("수정 알림은 누른 줄에만 뜨고 잠시 뒤 사라진다", async ({ page }) => {
    const 꼬리 = Date.now().toString(36);
    const 이름들 = [`e2e 알림가 ${꼬리}`, `e2e 알림나 ${꼬리}`];

    await page.goto("/admin/projects");
    for (const 이름 of 이름들) {
      const form = page.locator("form").last();
      await form.getByLabel("이름").fill(이름);
      await form.getByRole("button", { name: "추가" }).click();
      await expect(page.locator(`input[value="${이름}"]`)).toBeVisible();
    }

    const 줄 = (이름: string) =>
      page.locator("li").filter({ has: page.locator(`input[value="${이름}"]`) });

    await page.goto("/admin/projects");
    await 줄(이름들[0]).getByRole("button", { name: "수정" }).click();
    await expect(줄(이름들[0]).getByText("수정했습니다.")).toBeVisible();
    // 옆 줄은 조용하다
    await expect(줄(이름들[1]).getByText("수정했습니다.")).toHaveCount(0);

    // 3초 뒤 스스로 사라진다
    await expect(줄(이름들[0]).getByText("수정했습니다.")).toHaveCount(0, {
      timeout: 8000,
    });

    for (const 이름 of 이름들) {
      await pressDelete(줄(이름));
      await expect(page.locator(`input[value="${이름}"]`)).toHaveCount(0);
    }
  });

  // 수행 업무는 소개 관리 안에서 고치고 소개 화면에 나온다
  test("수행 업무를 넣으면 소개 화면에 나오고 지우면 사라진다", async ({
    page,
  }) => {
    await page.goto("/admin");
    const form = page.locator("form").last();
    await form.getByLabel("이름").fill(PROJECT);
    await form.getByLabel("한 줄 요약").fill("자동 시험용");
    await form.getByLabel("사용 기술").fill("Playwright, TypeScript");
    await form.getByLabel("시작일").fill("2026-01-01");
    await form.getByRole("button", { name: "추가" }).click();
    // 클릭은 서버 액션이 끝나기 전에 반환된다. 바로 다른 곳으로 옮겨 가면
    // 전송이 취소된다. 목록에 나타난 것을 보고 넘어간다.
    await expect(page.locator(`input[value="${PROJECT}"]`)).toBeVisible();

    await page.goto("/about");
    const card = page.locator("li").filter({ hasText: PROJECT });
    await expect(card.getByRole("heading", { name: PROJECT })).toBeVisible();
    await expect(card.getByText("2026.01 — 진행 중")).toBeVisible();
    await expect(card.getByText("Playwright")).toBeVisible();

    // 관리 화면에서는 이름이 입력칸 안에 있어 글자 검색으로는 못 찾는다
    await page.goto("/admin");
    const row = page.locator("li").filter({
      has: page.locator(`input[value="${PROJECT}"]`),
    });
    await pressDelete(row);
    await expect(page.locator(`input[value="${PROJECT}"]`)).toHaveCount(0);

    await page.goto("/about");
    await expect(page.getByRole("heading", { name: PROJECT })).toHaveCount(0);
  });
});

test.describe("연락 폼", () => {
  test("메시지를 보내면 관리 화면에 쌓인다", async ({ page }) => {
    const name = `e2e 손님 ${Date.now().toString(36)}`;

    await page.goto("/contact");
    await page.getByLabel("이름").fill(name);
    await page.getByLabel("내용").fill("자동 시험으로 보낸 메시지입니다.");
    await page.getByRole("button", { name: "보내기" }).click();
    await expect(page.getByText("보냈습니다")).toBeVisible();

    await login(page);
    await page.goto("/admin/messages");
    const row = page.locator("li", { hasText: name });
    await expect(row).toBeVisible();

    // 새로 온 것은 안 읽음이다. 읽음으로 넘기면 읽은 때가 남는다.
    const 딱지 = row.getByText("안 읽음", { exact: true });
    await expect(딱지).toBeVisible();
    await row.getByRole("button", { name: "읽음", exact: true }).click();
    await expect(row.getByText(/읽음 \d/)).toBeVisible();
    await expect(딱지).toHaveCount(0);

    // 잘못 눌렀을 때 되돌릴 수 있다
    await row.getByRole("button", { name: "읽음 취소" }).click();
    await expect(딱지).toBeVisible();

    // 지우기 전에 한 번 묻는다(MYH-110). 브라우저 창이 아니라 그 자리에
    // 펼쳐지고, 무엇을 지우는지 말한다. 「취소」 로 접으면 그대로 남는다.
    const 지우기 = deleteControl(row);
    await 지우기.locator(":scope > summary").click();
    await expect(지우기).toContainText(name);
    await expect(
      지우기.getByRole("button", { name: "예, 지웁니다" }),
    ).toBeVisible();
    await 지우기.locator("summary", { hasText: "취소" }).click();
    await expect(
      지우기.getByRole("button", { name: "예, 지웁니다" }),
    ).toBeHidden();
    await expect(page.locator("li", { hasText: name })).toHaveCount(1);

    // 예 라고 답하면 지워진다
    await pressDelete(row);
    await expect(page.locator("li", { hasText: name })).toHaveCount(0);
  });

  test("이름이나 내용을 비우면 보내지지 않는다", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "보내기" }).click();
    // 브라우저 기본 검사에 걸려 전송되지 않는다
    await expect(page.getByText("보냈습니다")).toHaveCount(0);
  });
});

test.describe("내 서비스", () => {
  const NAME = `e2e 서비스 ${Date.now().toString(36)}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("추가하면 보기 목록에 나온다", async ({ page }) => {
    await page.goto("/admin/links");
    // 고치는 칸은 "서비스 관리" 를 눌러야 나온다
    await page.getByRole("link", { name: "서비스 관리" }).click();
    const form = page.locator("form").last();
    await form.getByLabel("이름").fill(NAME);
    // https 를 안 붙여도 알아서 붙는다
    await form.getByLabel("주소").fill("example.com");
    await form.getByLabel("설명").fill("자동 시험용");
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator(`input[value="${NAME}"]`)).toBeVisible();

    // 주소가 https 로 채워졌는지
    const row = page
      .locator("li")
      .filter({ has: page.locator(`input[value="${NAME}"]`) });
    await expect(row.locator('input[name="url"]')).toHaveValue(
      "https://example.com",
    );

    // 보기 화면에서 새 창으로 열리는 링크가 된다
    await page.goto("/admin/links");
    const shortcut = page.getByRole("link", { name: new RegExp(NAME) });
    await expect(shortcut).toBeVisible();
    await expect(shortcut).toHaveAttribute("target", "_blank");

    await page.goto("/admin/links?manage=1");
    await pressDelete(row);
    await expect(page.locator(`input[value="${NAME}"]`)).toHaveCount(0);
  });

  // 성격이 다른 것이 섞여 있다. 분류를 고르면 관리 화면에서 묶여 보인다.
  // 분류는 코드 화면에서 만든다(MYH-131) - 고르는 칸 옆에 새로 적는 칸은 없다.
  test("분류를 고르면 그 이름으로 묶여 보인다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const name = `e2e 분류 ${stamp}`;
    const category = `e2e 분류칸 ${stamp}`;

    await page.goto("/admin/codes");

    await openAllCodes(page);
    const 그룹 = page.getByRole("region", { name: "내 서비스 분류", exact: true });
    await 그룹.getByLabel("새 내 서비스 분류", { exact: true }).fill(category);
    await 그룹.getByRole("button", { name: "추가" }).click();
    await expect(
      그룹.locator(`input[name="label"][value="${category}"]`),
    ).toBeVisible();

    await page.goto("/admin/links?manage=1");
    await expect(page.getByLabel("새 분류")).toHaveCount(0);
    const form = page.locator("form").last();
    await form.getByLabel("이름").fill(name);
    await form.getByLabel("주소").fill("example.org");
    await form
      .getByLabel("분류", { exact: true })
      .selectOption({ label: category });
    await form.getByRole("button", { name: "추가" }).click();
    await expect(page.locator(`input[value="${name}"]`)).toBeVisible();

    // 보기 목록에 그 이름의 그룹이 생긴다. 같은 글자가 콤보박스 선택지에도
    // 있으므로 그룹 제목만 본다.
    await page.goto("/admin/links");
    await expect(page.locator("p").filter({ hasText: category })).toBeVisible();

    // 콤보박스로 그 분류만 남긴다.
    // 화면이 살아나기(하이드레이션) 전에 고르면 onChange 가 아직 붙어 있지
    // 않아 아무 일도 일어나지 않는다 - 개발 서버가 느린 날 이걸로 걸렸다.
    // 주소가 바뀔 때까지 다시 고른다.
    const 분류칸 = page.getByLabel("분류", { exact: true });
    await expect(분류칸).toBeVisible();
    await expect(async () => {
      await 분류칸.selectOption(category);
      await expect(page).toHaveURL(/category=/, { timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(
      page.getByRole("link", { name: new RegExp(name) }),
    ).toBeVisible();

    // 쓰는 줄이 있으면 코드를 지울 수 없다
    await page.goto("/admin/codes");
    await openAllCodes(page);
    const 코드줄 = page
      .locator("li")
      .filter({
        has: page.locator(`input[name="label"][value="${category}"]`),
      });
    await expect(코드줄.getByText("1곳에서 씀")).toBeVisible();
    await expect(deleteControl(코드줄, `${category} 삭제`)).toHaveCount(0);

    // 고치는 화면의 분류 칸에는 분류가 다 들어 있어야 한다.
    // 전에는 자기 값 하나만 보여서 바꿀 수가 없었다(MYH-130).
    await page.goto("/admin/links?manage=1");
    const row = page
      .locator("li")
      .filter({ has: page.locator(`input[value="${name}"]`) });
    const 분류고르기 = row.getByLabel("분류", { exact: true });
    await expect(분류고르기.locator("option:checked")).toHaveText(category);
    await expect(분류고르기.locator("option")).not.toHaveCount(1);
    await expect(
      분류고르기.locator("option").filter({ hasText: "분류 없음" }),
    ).toHaveCount(1);

    // 실제로 바꿔 본다 - 분류를 떼면 그룹에서 빠진다
    await 분류고르기.selectOption("");
    await row.getByRole("button", { name: "수정" }).click();
    await expect(row.getByText("수정했습니다.")).toBeVisible();
    await page.reload();
    await expect(row.getByLabel("분류", { exact: true })).toHaveValue("");

    await pressDelete(row);
    await expect(page.locator(`input[value="${name}"]`)).toHaveCount(0);

    // 이제 아무도 안 쓰니 지울 수 있다
    await page.goto("/admin/codes");
    await openAllCodes(page);
    await pressDelete(코드줄, `${category} 삭제`);
    await expect(
      page.locator(`input[name="label"][value="${category}"]`),
    ).toHaveCount(0);
  });

  test("보기 화면에는 고치는 칸이 없다", async ({ page }) => {
    await page.goto("/admin/links");
    await expect(page.getByRole("button", { name: "추가" })).toHaveCount(0);

    await page.getByRole("link", { name: "서비스 관리" }).click();
    await expect(page.getByRole("button", { name: "추가" })).toBeVisible();

    await page.getByRole("link", { name: "보기로" }).click();
    await expect(page.getByRole("button", { name: "추가" })).toHaveCount(0);
  });

  test("로그인 없이는 볼 수 없다", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/admin/links");
    await expect(loginScreen(page)).toBeVisible();
  });
});
