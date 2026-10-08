import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { openPasswordLogin } from "./helpers";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

/**
 * 이 사이트의 이름과 제목. DB(관리 › 설정 › 사이트)에 있어서 설치마다 다르다
 * (MYH-169). 시험에 글자로 박지 않고 홈 화면에서 읽는다 — 제목은 탭 제목,
 * 이름은 머리글 왼쪽 링크다.
 */
async function siteOf(page: Page) {
  await page.goto("/");
  const title = await page.title();
  const name = (
    await page.getByRole("banner").getByRole("link").first().textContent()
  )?.trim();
  expect(title, "사이트 제목").not.toBe("");
  expect(name, "사이트 이름").toBeTruthy();
  return { title, name: name! };
}

test.describe("공개 페이지", () => {
  test("홈이 뜨고 메뉴로 이동할 수 있다", async ({ page }) => {
    const { title } = await siteOf(page);
    await expect(page).toHaveTitle(title);

    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("link").filter({ hasText: /./ })).toHaveText([
      "블로그",
      "짧은 글",
      "프로젝트",
      "책",
      "방명록",
      "연락처",
    ]);

    await nav.getByRole("link", { name: "블로그" }).click();
    await expect(
      page.getByRole("heading", { name: "블로그", level: 1 }),
    ).toBeVisible();
  });

  // 연락 수단은 DB(profile)에 있고 두 화면이 같은 것을 쓴다.
  // 시드가 넣는 값(보기 값): 개인 메일 · 회사 메일 · 휴대폰("010-", 아직 안 적은 값)
  // · GitHub. 홈페이지는 시드에 없어 줄이 안 나온다 — 비면 안 나오는 것도
  // 여기서 같이 보는 셈이다(MYH-164).
  test("소개와 연락처에 연락 수단과 바깥 주소가 보인다", async ({ page }) => {
    for (const path of ["/about", "/contact"]) {
      await page.goto(path);
      const labels = page.locator("dt");
      await expect(labels).toHaveText([
        "개인 메일",
        "회사 메일",
        "휴대폰",
        "GitHub",
      ]);

      // 바깥으로 나가는 링크다. 새 창으로 열고 어디서 왔는지 안 알린다.
      const github = page.getByRole("link", { name: /github\.com/ });
      await expect(github).toHaveAttribute("target", "_blank");
      await expect(github).toHaveAttribute("rel", "noreferrer");
      // 메일은 mailto: 로 건다. 어떤 주소인지는 설치마다 달라 보지 않는다
      // (CI 는 시드의 보기 값, 개발기는 손으로 적은 값이다)
      await expect(
        page.locator("dt:text-is('회사 메일') + dd a[href^='mailto:']"),
      ).toBeVisible();
      // 번호를 다 적었으면 tel: 로 걸어 주고, 아니면 걸지 않는다.
      // 어느 쪽인지는 DB 값에 달렸으므로 화면에 적힌 것을 보고 판단한다
      const 번호 = (await page.locator("dt:text-is('휴대폰') + dd").innerText())
        .replace(/\D/g, "");
      const 링크 = page.locator('a[href^="tel:"]');
      await expect(링크).toHaveCount(번호.length >= 10 ? 1 : 0);
    }
  });

  // 쓰는 단추는 관리자에게만 보인다. 있는지조차 알릴 이유가 없다.
  // 글 화면의 "고치기" 는 글이 하나 있어야 볼 수 있어 블로그 시험에서 본다.
  test("새 글 단추는 방문자에게 보이지 않는다", async ({ page }) => {
    for (const path of ["/blog", "/notes"]) {
      await page.goto(path);
      await expect(page.getByRole("link", { name: "새 글" })).toHaveCount(0);
    }
  });

  // 소개는 메뉴에서 뺐다. 첫 화면과 연락처에서 들어간다.
  test("첫 화면과 연락처에서 소개로 들어간다", async ({ page }) => {
    for (const from of ["/", "/contact"]) {
      await page.goto(from);
      await page.getByRole("link", { name: "소개 보기" }).click();
      await expect(
        page.getByRole("heading", { name: "소개", level: 1 }),
      ).toBeVisible();
    }
  });

  // 이 사이트에서 늘 새로 생기는 것은 글이다. 홈이 그것부터 보여준다.
  test("홈에 최근 글이 나오고 개수를 고를 수 있다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "최근 글" })).toBeVisible();

    const count = page.getByLabel("최근 글 개수");
    // 기본은 셋이다(MYH-184)
    await expect(count).toHaveValue("3");

    // 고르는 칸은 자바스크립트가 붙어야 주소를 바꾼다. 그 전에 고르면
    // 값만 바뀌고 아무 일도 안 일어난다 — 사람 손으로는 그만큼 빨리
    // 누를 수 없지만 시험은 누른다. 될 때까지 다시 고른다.
    await expect(async () => {
      await count.selectOption("10");
      await expect(page).toHaveURL(/posts=10/, { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByLabel("최근 글 개수")).toHaveValue("10");

    // 기본(3개)으로 돌아오면 주소에서 사라진다
    await page.getByLabel("최근 글 개수").selectOption("3");
    await expect(page).not.toHaveURL(/posts=/);
  });

  // 한 표에 담지만 화면은 둘이다. 프로젝트는 만들고 있는 것, 수행 업무는
  // 지나온 일이다.
  test("프로젝트와 수행 업무가 각자 화면에 있다", async ({ page }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("heading", { name: "프로젝트", level: 1 }),
    ).toBeVisible();

    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: "수행 업무" }),
    ).toBeVisible();
  });

  test("소개 내용을 DB에서 가져와 보여준다", async ({ page }) => {
    await page.goto("/about");
    // 시드로 넣은 이름
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "기술" })).toBeVisible();
  });

  test("없는 주소는 404", async ({ page }) => {
    const response = await page.goto("/이런페이지는없다");
    expect(response?.status()).toBe(404);
  });

  test("RSS 피드가 XML로 나온다", async ({ request }) => {
    const response = await request.get("/rss.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("rss+xml");
    expect(await response.text()).toContain("<rss");
  });

  test("dev 인스턴스는 색인을 거부한다", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(await response.text()).toContain("Disallow: /");
  });

  // 쪽마다 제 canonical 을 들어야 한다(MYH-162). 루트 레이아웃에 canonical
  // 을 적어 두는 바람에 /blog 도 /about 도 "나는 사실 홈페이지다" 라고
  // 말했고, 구글이 그 말을 안 믿고 스스로 대표를 골라 검색 결과에 글 제목
  // 대신 "블로그 · 사이트 이름" 이 떴다.
  test("쪽마다 제 주소를 canonical 로 내놓는다", async ({ page }) => {
    const { title, name } = await siteOf(page);
    // 홈이 아닌 쪽의 카드 제목은 「쪽 이름 · 사이트 이름」 이다
    const escaped = name.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
    const cardSuffix = new RegExp("· " + escaped + "$");
    for (const path of [
      "/",
      "/about",
      "/projects",
      "/contact",
      "/blog",
      "/notes",
    ]) {
      await page.goto(path);
      // 주소의 앞쪽(도메인)은 인스턴스마다 다르다. 경로만 본다.
      const href = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(new URL(href!).pathname, `${path} 의 canonical`).toBe(path);
      // 카드 제목도 쪽마다 달라야 한다. 루트 것을 물려받으면 다 같아진다.
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle, `${path} 의 og:title`).toHaveAttribute(
        "content",
        path === "/" ? title : cardSuffix,
      );
    }
  });

  // 거르고 넘긴 화면이 따로 색인될 이유가 없다. 목록 하나로 모은다.
  test("태그와 쪽넘김은 목록 하나로 모인다", async ({ page }) => {
    for (const path of ["/blog?tag=Next.js", "/blog?page=2"]) {
      await page.goto(path);
      const href = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href");
      expect(new URL(href!).pathname, `${path} 의 canonical`).toBe("/blog");
    }
  });

  // 지워진 글 주소가 구글에 남아 있으면 404 가 검색 결과에 뜬다. 그때
  // 홈 제목을 달고 있으면 안 되고, 애초에 색인에 들어가서도 안 된다.
  //
  // 제목이 무엇인지까지는 보지 않는다. 없는 글 주소는 개발기에서
  // 「글을 찾을 수 없습니다」, 운영에서 「페이지를 찾을 수 없습니다」 가
  // 나온다 — 404 경계의 메타데이터를 어느 쪽이 가져가는지가 빌드마다
  // 다르다. 어느 쪽이든 할 일은 한다. 시험이 봐야 하는 것은
  // **홈 제목이 아니라는 것**과 **색인을 거부한다는 것** 둘뿐이다.
  test("없는 주소는 제 이름을 달고 색인을 거부한다", async ({ page }) => {
    const { title } = await siteOf(page);
    for (const path of [
      "/이런페이지는없다",
      "/blog/99999999",
      "/notes/99999999",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page, path).toHaveTitle(/찾을 수 없습니다/);
      await expect(page, path).not.toHaveTitle(title);
      // 개발기는 사이트 전체에 noindex 를 하나 더 달고 나온다. 그래서
      // "하나뿐인가" 가 아니라 "적어도 하나 있는가" 를 본다.
      await expect(
        page.locator('meta[name="robots"][content*="noindex"]'),
        path,
      ).not.toHaveCount(0);
    }
  });

  // 개발 서버는 뜰 때 박아 둔 값을 쓰다가 옛 버전을 며칠씩 보여 줬다.
  // 지금 소스의 버전과 같은지 본다.
  test("푸터에 지금 버전이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(`v${version}`)).toBeVisible();
  });

  // 남의 서버(jsDelivr)에서 받는 폰트 CSS 가 첫 그림을 붙잡지 않아야 한다.
  // 서버는 media="print" 로 보내고, 다 받은 뒤 스크립트가 all 로 바꾼다.
  test("폰트 CSS 가 첫 그림을 붙잡지 않는다", async ({ page, request }) => {
    const html = await (await request.get("/")).text();
    const tag = html.match(/<link[^>]*id="font-css"[^>]*>/)?.[0] ?? "";
    expect(tag).toContain('media="print"');

    await page.goto("/");
    // 받은 뒤에는 화면에 붙는다
    await expect(page.locator("#font-css")).toHaveAttribute("media", "all");
    await expect
      .poll(() => page.evaluate(() => document.fonts.check("1em 'Pretendard Variable'")))
      .toBe(true);
  });

  // 관리 화면 두 개를 위쪽 메뉴에 뒀다. 로그인하지 않았으면 있는지조차
  // 알릴 이유가 없다.
  test("주요 메뉴에 관리 항목이 보이지 않는다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("link", { name: "내 서비스" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "감시" })).toHaveCount(0);
  });

  // 위 시험은 눈에 보이는지만 본다. 화면단에서 감춘 것은 HTML 에 남아
  // 소스 보기로 드러나니, 받은 HTML 을 통째로 뒤진다(MYH-123). 메뉴를
  // DB 에서 읽게 되면서 거르는 자리가 옮겨졌다 — 가장 새기 쉬운 곳이다.
  //
  // 이름이 아니라 주소로 찾는다. "비밀글" 같은 낱말은 글 제목에도 나올 수
  // 있다. /admin 자체는 뺀다 — 로그인 화면이 그 주소에 있다.
  test("로그아웃 상태의 HTML 에 관리자 메뉴가 한 글자도 없다", async ({
    request,
  }) => {
    const adminOnly = [
      "/admin/messages",
      "/admin/posts",
      "/admin/notes",
      "/admin/secrets",
      "/admin/projects",
      "/admin/links",
      "/admin/monitoring",
      "/admin/security",
    ];
    // 공개 화면과, 관리 메뉴가 붙는 자리(로그인 화면)
    for (const path of ["/", "/blog", "/admin"]) {
      const res = await request.get(path);
      expect(res.ok()).toBe(true);
      const html = await res.text();
      for (const href of adminOnly) {
        expect(html, `${path} 에 ${href} 가 있다`).not.toContain(href);
      }
    }
  });

  test("다크모드 토글이 테마를 바꾼다", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: /모드로 전환/ });

    // 아이콘은 클라이언트에서 테마를 읽은 뒤에 그려진다.
    // 이게 보이면 버튼이 동작할 준비가 된 것이다.
    await expect(toggle.locator("svg")).toBeVisible();

    await toggle.click();
    const first = await html.getAttribute("data-theme");
    expect(first).toMatch(/dark|light/);

    await toggle.click();
    const second = await html.getAttribute("data-theme");
    expect(second).not.toBe(first);
  });
});

test.describe("관리 화면 접근 제어", () => {
  test("로그인 없이는 로그인 화면이 뜬다", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "관리자 로그인" }),
    ).toBeVisible();
  });

  test("블로그 관리도 막힌다", async ({ page }) => {
    await page.goto("/admin/posts");
    await expect(
      page.getByRole("heading", { name: "관리자 로그인" }),
    ).toBeVisible();
  });

  test("비밀번호가 틀리면 들어가지 못한다", async ({ page }) => {
    await page.goto("/admin");
    await openPasswordLogin(page);
    await page.getByLabel("비밀번호").fill("틀린비밀번호");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    // Next의 라우트 알림 요소도 role="alert" 라서 문구로 직접 찾는다
    await expect(page.getByText("비밀번호가 맞지 않습니다")).toBeVisible();
  });
});
