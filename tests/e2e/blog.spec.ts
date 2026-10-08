import { expect, test } from "@playwright/test";
import {
  createPost,
  deletePost,
  login,
  pressDelete,
  uniqueTitle,
} from "./helpers";

/** 1x1 PNG */
const PIXEL = {
  name: "e2e.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/** 「올린 이미지」 목록은 접힌 채로 나온다. 이미 펴져 있으면 그냥 둔다 */
async function 목록열기(목록: import("@playwright/test").Locator) {
  // 목록 자체의 펼침. 안에 든 그림마다 지우기도 펼침(<details>)이라(MYH-110)
  // 맨 바깥 것 하나만 고른다
  const details = 목록.locator("details").first();
  if ((await details.count()) === 0) return;
  if ((await details.getAttribute("open")) === null) {
    await details.locator(":scope > summary").click();
  }
}

/** 「이미지 올리기」 상자. 「올린 이미지」 목록과 글자가 겹쳐서 갈라 본다 */
function 올리기상자(page: import("@playwright/test").Page) {
  return page
    .locator("div")
    .filter({
      has: page.getByRole("button", { name: "이미지 올리기" }),
    })
    .last();
}

/**
 * 새 글 화면에서 그림만 올리고 저장하지 않으면 제목 없는 초안이 남는다.
 * 시험이 쌓아 두지 않게 치운다.
 */
async function deleteDraft(page: import("@playwright/test").Page) {
  await page.goto("/admin/posts");
  const link = page.getByRole("link", { name: "제목 없음" });
  if ((await link.count()) === 0) return;
  await link.first().click();
  await page.getByRole("heading", { name: "글 수정" }).waitFor();
  await pressDelete(page);
  await page.getByRole("heading", { name: "블로그 관리" }).waitFor();
}

const TITLE = "e2e 블로그 확인용 글";

test.describe("블로그", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await deletePost(page, TITLE);
  });

  // 처음 낸 글은 1.0.0 이다. 칸에 미리 들어 있어야 매번 적지 않는다.
  test("새 글은 문서 버전 1.0.0 으로 시작한다", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await expect(page.getByLabel("문서 버전")).toHaveValue("1.0.0");

    await page.getByLabel("제목").fill(TITLE);
    await page.getByLabel("본문").fill("첫 판이다.");
    await page.getByRole("button", { name: "발행하기" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    const id = Number(page.url().split("?")[0].split("/").pop());

    await page.goto(`/blog/${id}`);
    await expect(page.getByText("버전 1.0.0")).toBeVisible();
  });

  // 앞뒤 글 이어가기. 관리자에게는 나만 보는 글도 이어지고, 손님에게는
  // 그 글을 건너뛰어야 한다.
  test("나만 보는 글은 관리자에게만 앞뒤로 이어진다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const 앞 = `e2e 앞글 ${stamp}`;
    const 가운데 = `e2e 나만 보는 가운데 ${stamp}`;
    const 뒤 = `e2e 뒷글 ${stamp}`;

    // 낸 순서가 곧 앞뒤 순서다
    const 앞번호 = await createPost(page, { title: 앞, content: "앞글이다." });
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(가운데);
    await page.getByLabel("본문").fill("가운데 글이다.");
    await page.getByRole("button", { name: "나만 보기" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    const 뒤번호 = await createPost(page, { title: 뒤, content: "뒷글이다." });

    // 관리자: 가운데 글이 앞뒤 양쪽에 이어진다
    await page.goto(`/blog/${뒤번호}`);
    const 이어가기 = page.getByRole("navigation", { name: "다른 글" });
    await expect(이어가기.getByText(가운데)).toBeVisible();

    await page.goto(`/blog/${앞번호}`);
    await expect(이어가기.getByText(가운데)).toBeVisible();

    // 손님: 가운데 글을 건너뛰고 서로 이어진다
    await page.context().clearCookies();
    await page.goto(`/blog/${뒤번호}`);
    await expect(이어가기.getByText(가운데)).toHaveCount(0);
    await expect(이어가기.getByText(앞)).toBeVisible();

    await login(page);
    for (const t of [앞, 가운데, 뒤]) await deletePost(page, t);
  });

  // 나만 보는 글. 임시저장과 달리 "다 썼지만 나만 본다" 다.
  test("나만 보는 글은 관리자에게만 보인다", async ({ page }) => {
    await page.goto("/admin/posts/new");
    await page.getByLabel("제목").fill(TITLE);
    await page.getByLabel("본문").fill("나만 보는 글의 본문이다.");
    await page.getByRole("button", { name: "나만 보기" }).click();
    await page.getByRole("heading", { name: "글 수정" }).waitFor();
    const id = Number(page.url().split("?")[0].split("/").pop());

    // 관리자에게는 목록과 글 화면에 딱지와 함께 보인다
    await page.goto("/blog");
    const 줄 = page
      .locator("main li")
      .filter({ has: page.getByRole("heading", { name: TITLE }) });
    await expect(줄.getByText("나만 보기")).toBeVisible();

    await page.goto(`/blog/${id}`);
    await expect(page.getByText("나만 보기")).toBeVisible();
    await expect(page.getByText("나만 보는 글의 본문이다.")).toBeVisible();

    // 손님에게는 없는 글이다
    await page.context().clearCookies();
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: TITLE })).toHaveCount(0);
    const 응답 = await page.goto(`/blog/${id}`);
    expect(응답?.status()).toBe(404);

    // 사이트맵과 RSS 에도 없다.
    // 번호만 찾으면 안 된다 — 3 은 priority 0.3 이나 /blog/35 안에도 들어 있다.
    // 두 피드 모두 주소 뒤가 바로 태그 닫기이므로 < 까지 붙여 찾는다.
    for (const feed of ["/sitemap.xml", "/rss.xml"]) {
      const body = await page.request.get(feed);
      expect(await body.text()).not.toContain(`/blog/${id}<`);
    }

    await login(page);

    // 공개로 돌리면 손님에게도 보인다
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: TITLE }).first().click();
    await page.getByRole("button", { name: "공개로" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(`/blog/${id}`);
    await expect(page.getByText("나만 보는 글의 본문이다.")).toBeVisible();
    await expect(page.getByText("나만 보기")).toHaveCount(0);

    await login(page);
  });

  // 첨부파일. 붙이고, 공개 화면에서 받고, 떼는 것까지 본다.
  test("파일을 붙이면 글 아래에 나오고 떼면 사라진다", async ({ page }) => {
    const id = await createPost(page, {
      title: TITLE,
      content: "첨부 확인용 글이다.",
    });

    const 이름 = `읽을거리-${Date.now().toString(36)}.txt`;
    const 내용 = `첨부 시험 ${Date.now()}`;
    await page.locator('input[aria-label="붙일 파일"]').setInputFiles({
      name: 이름,
      mimeType: "text/plain",
      buffer: Buffer.from(내용, "utf8"),
    });

    // 고르면 바로 올라간다
    const 목록 = page.locator("section").filter({ hasText: "첨부파일" });
    await expect(목록.getByRole("link", { name: 이름 })).toBeVisible();

    // 공개 화면에도 나오고, 눌러 받으면 올린 내용 그대로다
    await page.goto(`/blog/${id}`);
    const 링크 = page.getByRole("link", { name: 이름 });
    await expect(링크).toBeVisible();
    const href = await 링크.getAttribute("href");
    const 받은것 = await page.request.get(href!);
    expect(받은것.status()).toBe(200);
    expect(await 받은것.text()).toBe(내용);
    expect(받은것.headers()["content-disposition"]).toContain("attachment");

    // 떼면 사라진다
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: TITLE }).first().click();
    await pressDelete(page, "첨부파일 삭제");
    await expect(page.getByRole("link", { name: 이름 })).toHaveCount(0);

    await page.goto(`/blog/${id}`);
    await expect(page.getByRole("link", { name: 이름 })).toHaveCount(0);
    // 뗀 파일은 주소를 알아도 받을 수 없다
    const 다시 = await page.request.get(href!);
    expect(다시.status()).toBe(404);
  });

  // 형식은 가리지 않는다(MYH-161). 전에는 브라우저가 알려 준 MIME 이름을
  // 허용 목록과 맞춰 봤는데, 그 이름은 OS 가 준다 — 윈도우 크롬이 zip 을
  // application/x-zip-compressed 로 보내는 통에 압축 파일이 하나도 안 붙었다.
  // 목록을 걷어낸 대신, 안전은 내려주는 쪽에서 나와야 한다.
  test("어떤 형식이든 붙고, 그림이 아니면 내려받게 나온다", async ({
    page,
  }) => {
    const id = await createPost(page, {
      title: TITLE,
      content: "형식 확인용 글이다.",
    });

    const 꼬리 = Date.now().toString(36);
    const 파일들 = [
      // 표준 이름이 아니다. 전에는 이것 때문에 걸렸다
      { name: `묶음-${꼬리}.zip`, mimeType: "application/x-zip-compressed" },
      // 브라우저가 형식을 모를 때. 빈 채로 담기면 content-type 이 비어 나간다
      { name: `묶음-${꼬리}.tar`, mimeType: "" },
      // 열리면 안 된다. 내려받게 나와야 한다
      { name: `쪽-${꼬리}.html`, mimeType: "text/html" },
      // 그림이지만 안에 <script> 가 들 수 있다. inline 으로 내보내면
      // 주소를 여는 것만으로 우리 도메인에서 그 스크립트가 돈다
      { name: `그림-${꼬리}.svg`, mimeType: "image/svg+xml" },
    ];

    const 고르는칸 = page.locator('input[aria-label="붙일 파일"]');
    const 목록 = page.locator("section").filter({ hasText: "첨부파일" });
    for (const 파일 of 파일들) {
      await 고르는칸.setInputFiles({
        ...파일,
        buffer: Buffer.from(`${파일.name} 의 내용`, "utf8"),
      });
      await expect(목록.getByRole("link", { name: 파일.name })).toBeVisible();
    }

    await page.goto(`/blog/${id}`);
    for (const 파일 of 파일들) {
      const href = await page
        .getByRole("link", { name: 파일.name })
        .getAttribute("href");
      const 받은것 = await page.request.get(href!);
      expect(받은것.status()).toBe(200);
      // 그림이 아닌 것은 브라우저가 열지 않게 첨부로 내보낸다. svg 도 여기 든다
      expect(받은것.headers()["content-disposition"]).toContain("attachment");
      // 형식 이름이 비어 나가면 브라우저가 알아서 짐작한다. 그 문을 닫아 둔다
      expect(받은것.headers()["content-type"]).toBeTruthy();
    }
  });

  // 본문의 ```mermaid 를 그림으로 그린다(MYH-160). 그리는 것은 브라우저라
  // 단위 시험으로는 못 본다.
  test("mermaid 블록은 그림으로 그려지고, 틀리면 코드 그대로 남는다", async ({
    page,
  }) => {
    const id = await createPost(page, {
      title: TITLE,
      content: [
        "도식 확인용 글이다.",
        "",
        "```mermaid",
        "graph TD",
        "  받는다 --> 줄인다",
        "  줄인다 --> 담는다",
        "```",
        "",
        "```mermaid",
        "이것은 도식이 아니다 {{{",
        "```",
        "",
        "```ts",
        "const x: number = 1;",
        "```",
      ].join("\n"),
    });

    await page.goto(`/blog/${id}`);

    const 도식 = page.getByRole("img", { name: "도식" });
    await expect(도식).toBeVisible();
    // 글자가 그림 안에 들어갔는지 본다. 코드블록이 그대로 남은 것과 구별된다.
    await expect(도식.locator("svg")).toContainText("줄인다");

    // 문법이 틀린 블록은 붉은 오류 그림이 아니라 원래 코드로 남는다
    await expect(page.getByRole("img", { name: "도식" })).toHaveCount(1);
    await expect(page.getByText("이것은 도식이 아니다")).toBeVisible();

    // mermaid 가 아닌 코드블록은 건드리지 않는다 — 복사 단추가 그대로 있다
    await expect(page.getByText("const x: number = 1;")).toBeVisible();

    // 테마를 바꾸면 다시 그린다. 사라지지 않아야 한다.
    await page.getByRole("button", { name: /모드로 전환/ }).click();
    await expect(도식.locator("svg")).toContainText("줄인다");
  });

  // 고치기 단추는 관리자에게만 붙는다. 글이 하나 있어야 볼 수 있어 여기서 본다.
  test("고치기 단추는 방문자에게 보이지 않는다", async ({ page }) => {
    const id = await createPost(page, {
      title: TITLE,
      content: "손님에게는 고치기가 없다.",
    });

    await page.goto(`/blog/${id}`);
    await expect(page.getByRole("link", { name: "고치기" })).toBeVisible();

    // 쿠키를 버리면 손님이 된다
    await page.context().clearCookies();
    await page.goto(`/blog/${id}`);
    await expect(page.getByRole("link", { name: "고치기" })).toHaveCount(0);

    // afterEach 가 지우려면 다시 들어가 있어야 한다
    await login(page);
  });

  test("글을 쓰면 목록과 상세에 나오고 지우면 사라진다", async ({ page }) => {
    await createPost(page, {
      title: TITLE,
      tags: "테스트, e2e",
      content: [
        "첫 문단이다.",
        "",
        "## 첫 제목",
        "",
        "- 목록 하나",
        "- 목록 둘",
        "",
        "## 둘째 제목",
        "",
        "```ts",
        "const x: number = 1;",
        "```",
      ].join("\n"),
    });

    await page.goto("/blog");
    await expect(page.getByRole("link", { name: TITLE })).toBeVisible();

    await page.getByRole("link", { name: TITLE }).click();
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();

    // 목차와 읽는 시간
    await expect(page.getByRole("navigation", { name: "목차" })).toBeVisible();
    await expect(page.getByText(/읽는 데 \d+분/)).toBeVisible();

    // 목차를 누르면 해당 제목으로 이동한다
    await page.getByRole("link", { name: "둘째 제목" }).click();
    await expect(page.locator("#둘째-제목")).toBeInViewport();

    // 코드 하이라이팅
    await expect(page.locator("pre code.hljs")).toBeVisible();
  });

  test("임시저장 글은 공개되지 않는다", async ({ page }) => {
    const id = await createPost(page, {
      title: TITLE,
      content: "아직 쓰는 중",
      publish: false,
    });

    await page.goto("/blog");
    await expect(page.getByRole("link", { name: TITLE })).toHaveCount(0);

    const response = await page.goto(`/blog/${id}`);
    expect(response?.status()).toBe(404);
  });

  test("태그와 검색으로 걸러진다", async ({ page }) => {
    await createPost(page, {
      title: TITLE,
      tags: "e2e필터",
      content: "검색어확인용문장",
    });

    await page.goto("/blog?tag=e2e필터");
    await expect(page.getByRole("link", { name: TITLE })).toBeVisible();

    await page.goto("/blog?q=검색어확인용문장");
    await expect(page.getByRole("link", { name: TITLE })).toBeVisible();

    await page.goto("/blog?q=절대없는말zzz");
    await expect(page.getByText("조건에 맞는 글이 없습니다")).toBeVisible();
  });

  test("조회수가 올라간다", async ({ page }) => {
    const id = await createPost(page, { title: TITLE, content: "조회수 확인" });

    await page.goto(`/blog/${id}`);
    await expect(page.getByText(/조회 \d+/)).toBeVisible();

    // 조회수는 화면이 그려진 뒤에 올라가므로, 다시 불러와야 반영된 값이 보인다.
    // 언제 반영될지 알 수 없어 값이 바뀔 때까지 다시 불러온다.
    await expect
      .poll(
        async () => {
          await page.reload();
          return page.getByText(/조회 \d+/).innerText();
        },
        { timeout: 20_000, message: "조회수가 올라가지 않았다" },
      )
      .toBe("조회 1");

    // 같은 탭에서 새로고침해도 더 오르지 않는다
    await page.reload();
    await expect(page.getByText("조회 1")).toBeVisible();
  });
});

test.describe("글 수정", () => {
  const EDIT_TITLE = "e2e 수정 확인용 글";

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await deletePost(page, EDIT_TITLE);
    await deletePost(page, `${EDIT_TITLE} (고침)`);
  });

  test("제목과 본문을 고치면 공개 화면에 반영된다", async ({ page }) => {
    const id = await createPost(page, {
      title: EDIT_TITLE,
      tags: "처음태그",
      content: "고치기 전 본문이다.",
    });

    await page.getByLabel("제목").fill(`${EDIT_TITLE} (고침)`);
    await page.getByLabel("본문").fill("고친 뒤 본문이다.");
    await page.getByLabel("태그").fill("바뀐태그");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.goto(`/blog/${id}`);
    await expect(
      page.getByRole("heading", { name: `${EDIT_TITLE} (고침)` }),
    ).toBeVisible();
    await expect(page.getByText("고친 뒤 본문이다.")).toBeVisible();
    await expect(page.getByText("고치기 전 본문이다.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "바뀐태그" })).toBeVisible();
  });

  // 고쳐 쓴 글은 다시 읽을 만하니 목록에서 위로 올라와야 한다.
  // 무엇을 눌렀느냐가 아니라 문서 버전이 바뀌었느냐로 정한다.
  test("문서 버전을 바꿔 저장하면 목록에서 위로 올라온다", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const 앞글 = `e2e 개정 앞글 ${stamp}`;
    const 뒷글 = `e2e 개정 뒷글 ${stamp}`;

    await createPost(page, { title: 앞글, content: "앞글 본문" });
    await createPost(page, { title: 뒷글, content: "뒷글 본문" });

    // 나중에 낸 글이 위에 있다.
    // 첫 글은 "main li h2" 로 본다 — main 의 첫 li 는 태그 고르는 칩이다
    await page.goto("/blog");
    await expect(page.locator("main li h2").first()).toHaveText(뒷글);

    // 앞글의 버전을 올리면 앞글이 위로 온다
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: 앞글 }).click();
    await page.getByLabel("문서 버전").fill("1.1.0");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText(/지금 개정일/)).toBeVisible();

    await page.goto("/blog");
    await expect(page.locator("main li h2").first()).toHaveText(앞글);
    const row = page
      .locator("main li")
      .filter({ has: page.getByRole("heading", { name: 앞글 }) });
    await expect(row.getByText("버전 1.1.0")).toBeVisible();

    // 버전을 비우면 제자리로 돌아간다.
    // 저장이 끝난 것을 보고 나서 옮긴다 — 바로 다른 화면으로 가면 서버
    // 작업이 끊겨서 그대로 남는다(GitHub 검사에서 이걸로 한 번 걸렸다).
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: 앞글 }).click();
    await page.getByLabel("문서 버전").fill("");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await expect(page.getByText(/지금 개정일/)).toHaveCount(0);

    await page.goto("/blog");
    await expect(page.locator("main li h2").first()).toHaveText(뒷글);

    await deletePost(page, 앞글);
    await deletePost(page, 뒷글);
  });

  // 내렸다 올려도 처음 낸 날은 그대로여야 한다
  test("글을 내리면 공개 목록에서 빠지고, 올리면 발행일 그대로 돌아온다", async ({
    page,
  }) => {
    const id = await createPost(page, {
      title: EDIT_TITLE,
      content: "잠깐 내려 둘 글이다.",
    });

    await page.goto("/blog");
    await expect(page.getByRole("link", { name: EDIT_TITLE })).toBeVisible();
    const 발행일 = await page
      .locator("main li")
      .filter({ hasText: EDIT_TITLE })
      .locator("time")
      .first()
      .innerText();

    // 내린다
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: EDIT_TITLE }).first().click();
    await page.getByRole("button", { name: "글 내리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    // 발행일은 남아 있다
    await expect(page.getByRole("button", { name: "글 올리기" })).toBeVisible();

    await page.goto("/blog");
    await expect(page.getByRole("link", { name: EDIT_TITLE })).toHaveCount(0);
    const res = await page.request.get(`/blog/${id}`);
    expect(res.status()).toBe(404);

    // 다시 올린다
    await page.goto("/admin/posts");
    await page.getByRole("link", { name: EDIT_TITLE }).first().click();
    await page.getByRole("button", { name: "글 올리기" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    await page.goto("/blog");
    const row = page.locator("main li").filter({ hasText: EDIT_TITLE });
    await expect(row.locator("time").first()).toHaveText(발행일);
  });
});

test.describe("이미지 올리기", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("올리면 마크다운 주소를 주고 그 주소로 그림이 나온다", async ({
    page,
  }) => {
    const sharp = (await import("sharp")).default;
    // 가로 2400px 로 만들어 크기를 줄이는 과정까지 확인한다
    const buffer = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 40, g: 90, b: 160 },
      },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    await page.goto("/admin/posts/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-wide.jpg",
      mimeType: "image/jpeg",
      buffer,
    });

    // 올리기 전에 고른 그림이 맞는지 눈으로 볼 수 있다
    await expect(
      page.getByRole("img", { name: "고른 그림: e2e-wide.jpg" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "이미지 올리기" }).click();

    const markdown = page.locator("code", { hasText: "/uploads/" });
    await expect(markdown).toBeVisible({ timeout: 30_000 });

    const text = (await markdown.textContent()) ?? "";
    const url = text.match(/\((\/uploads\/[^)]+)\)/)?.[1];
    expect(url).toBeTruthy();

    const res = await page.request.get(url as string);
    expect(res.status()).toBe(200);
    // 원본 JPEG 보다 작아졌고 webp 로 바뀌었다
    expect(res.headers()["content-type"]).toBe("image/webp");
    expect((await res.body()).byteLength).toBeLessThan(buffer.byteLength);

    // 새 글에서 올렸으니 빈 초안이 하나 생겼다(MYH-145). 치운다.
    await deleteDraft(page);
  });

  // MYH-145. 전에는 올린 그 순간에만 마크다운을 보여 줘서, 화면을 떠나면
  // 같은 그림을 한 번 더 넣을 길이 없었다.
  test("올린 이미지가 목록에 남아 다시 열어도 보인다", async ({ page }) => {
    const title = uniqueTitle("이미지목록");

    // 글을 먼저 만들어 번호를 받는다
    const id = await createPost(page, {
      title,
      content: "그림을 넣을 자리다.",
    });

    await page.goto(`/admin/posts/${id}`);
    await page.locator('input[type="file"]').first().setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    await expect(
      올리기상자(page).locator("code", { hasText: "/uploads/" }),
    ).toBeVisible({ timeout: 30_000 });

    // 화면을 떠났다 돌아와도 목록에 있다
    await page.goto("/admin/posts");
    await page.goto(`/admin/posts/${id}`);

    // 목록에는 마크다운이 아니라 파일 이름이 나온다. 접혀 있으니 편다.
    const 목록 = page.locator("section", { hasText: "올린 이미지" });
    await expect(목록.getByText("올린 이미지 (1)")).toBeVisible();
    await 목록열기(목록);
    await expect(목록.getByRole("link", { name: "e2e.png" })).toHaveCount(1);

    // 미리보기가 딸려 나오고 그 주소가 실제로 열린다(MYH-147)
    const 미리보기 = 목록.locator("img");
    await expect(미리보기).toHaveCount(1);
    const src = await 미리보기.getAttribute("src");
    expect((await page.request.get(src!)).status()).toBe(200);

    // 아직 본문에 안 넣었으니 그렇게 보인다(MYH-148)
    await expect(목록.getByText("본문에 없음")).toBeVisible();

    // 본문에 넣으면 몇 번째 줄인지 알려 준다.
    // 마크다운은 화면에 없으므로 주소로 만든다 — 「복사」 가 주는 것과 같다.
    const md = `![e2e.png](${src})`;
    await page.getByLabel("본문").fill(`첫 줄이다.\n\n${md}`);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();
    await 목록열기(목록);
    // 지우기의 묻는 말에도 같은 글자가 있다(접혀 숨어 있다). 드러난 것만 본다
    await expect(목록.getByText("본문 3번째 줄", { exact: true })).toBeVisible();
    // 그림만 있는 줄은 발췌가 마크다운과 같다. 같은 말을 두 번 하지 않는다.
    await expect(목록.getByText(md, { exact: true })).toHaveCount(0);

    // 같은 그림을 한 번 더 올려도 줄은 하나다
    await page.locator('input[type="file"]').first().setInputFiles(PIXEL);
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    await expect(
      올리기상자(page).locator("code", { hasText: "/uploads/" }),
    ).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await 목록열기(목록);
    await expect(목록.getByRole("link", { name: "e2e.png" })).toHaveCount(1);

    // 지우면 목록에서 빠지고 본문에서도 빠진다(MYH-148, MYH-197).
    // 파일이 디스크에서도 지워지는지는 upload-cleanup.spec.ts 가 본다 - 이
    // 그림(PIXEL)은 다른 시험도 써서 남을 수 있다.
    await 목록열기(목록);
    // 그림마다 지우기에 이름(「파일이름 삭제」)이 붙어 있다
    await pressDelete(목록, "e2e.png 삭제");
    await expect(목록).toHaveCount(0);
    await expect(page.getByLabel("본문")).toHaveValue(/^첫 줄이다\.\n?$/);
    await page.reload();
    await expect(page.getByLabel("본문")).toHaveValue(/^첫 줄이다\.\n?$/);

    await deletePost(page, title);
  });

  // MYH-148. 그림 파일 이름은 내용 해시라, 같은 그림을 두 글에 넣으면
  // 파일은 하나다. 한쪽에서 뗀다고 파일을 지우면 저쪽 글이 깨진다.
  test("같은 그림을 쓰는 글이 남아 있으면 파일은 안 지운다", async ({
    page,
  }) => {
    const 가 = uniqueTitle("그림공유가");
    const 나 = uniqueTitle("그림공유나");

    const 가번호 = await createPost(page, { title: 가, content: "가 쪽이다." });
    const 나번호 = await createPost(page, { title: 나, content: "나 쪽이다." });

    // 같은 파일을 두 글에 올린다. 해시가 같으니 디스크에는 하나만 남는다.
    let src: string | null = null;
    for (const 번호 of [가번호, 나번호]) {
      await page.goto(`/admin/posts/${번호}`);
      await page.locator('input[type="file"]').first().setInputFiles(PIXEL);
      await page.getByRole("button", { name: "이미지 올리기" }).click();
      await expect(
        올리기상자(page).locator("code", { hasText: "/uploads/" }),
      ).toBeVisible({ timeout: 30_000 });
      await page.reload();
      await 목록열기(page.locator("section", { hasText: "올린 이미지" }));
      src = await page
        .locator("section", { hasText: "올린 이미지" })
        .locator("img")
        .getAttribute("src");
    }
    expect(src).toBeTruthy();

    // 나 쪽에서 뗀다
    await pressDelete(
      page.locator("section", { hasText: "올린 이미지" }),
      "e2e.png 삭제",
    );
    await expect(
      page.locator("section", { hasText: "올린 이미지" }),
    ).toHaveCount(0);

    // 가 쪽 목록에는 그대로 있고, 파일도 그대로 내려온다
    await page.goto(`/admin/posts/${가번호}`);
    await 목록열기(page.locator("section", { hasText: "올린 이미지" }));
    await expect(
      page.locator("section", { hasText: "올린 이미지" }).locator("img"),
    ).toHaveCount(1);
    expect((await page.request.get(src!)).status()).toBe(200);

    await deletePost(page, 가);
    await deletePost(page, 나);
  });

  // MYH-151. 돌리면 내용이 바뀌고, 이름이 내용 해시라 주소도 바뀐다.
  // 본문에 적힌 주소까지 따라 바뀌어야 글이 안 깨진다.
  test("돌리면 본문 주소까지 함께 바뀐다", async ({ page }) => {
    const title = uniqueTitle("돌리기");
    const id = await createPost(page, { title, content: "그림 자리다." });

    await page.goto(`/admin/posts/${id}`);
    // 가로로 긴 그림이라야 돌았는지 눈이 아니라 크기로 알 수 있다
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: {
        width: 400,
        height: 200,
        channels: 3,
        background: { r: 30, g: 140, b: 90 },
      },
    })
      .png()
      .toBuffer();

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "e2e-rotate.png",
      mimeType: "image/png",
      buffer,
    });
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    await expect(
      올리기상자(page).locator("code", { hasText: "/uploads/" }),
    ).toBeVisible({ timeout: 30_000 });

    // 본문에 넣는다
    await page.reload();
    const 목록 = page.locator("section", { hasText: "올린 이미지" });
    await 목록열기(목록);
    const 전주소 = await 목록.locator("img").getAttribute("src");
    await page.getByLabel("본문").fill(`![e2e-rotate.png](${전주소})`);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장했습니다")).toBeVisible();

    // 돌린다. 서버가 다시 그릴 때까지 기다려야 하므로 주소가 바뀌는 것을
    // 기다린다 — 누르자마자 읽으면 옛 주소가 잡힌다.
    await 목록열기(목록);
    await 목록.getByRole("button", { name: /오른쪽으로 돌리기/ }).click();
    await expect(목록.locator("img")).not.toHaveAttribute("src", 전주소!);

    const 후주소 = await 목록.locator("img").getAttribute("src");

    // 본문이 새 주소를 가리킨다 — 옛 주소가 남아 있으면 글이 깨진다
    await 목록열기(목록);
    // 지우기의 묻는 말에도 같은 글자가 있다(접혀 숨어 있다). 드러난 것만 본다
    await expect(목록.getByText("본문 1번째 줄", { exact: true })).toBeVisible();

    // 공개 화면에서도 새 주소로 그려진다
    await page.goto(`/blog/${id}`);
    await expect(page.locator("main img").first()).toHaveAttribute(
      "src",
      후주소!,
    );

    await deletePost(page, title);
  });

  test("그림이 아닌 파일은 막는다", async ({ page }) => {
    // 막히는 쪽이라 초안도 안 생긴다
    await page.goto("/admin/posts/new");
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("이건 그림이 아니다"),
    });
    await page.getByRole("button", { name: "이미지 올리기" }).click();
    // Next 의 경로 안내판도 role=alert 이라 글자로 찾는다
    await expect(
      page.getByText("PNG, JPEG, GIF, WebP, AVIF 만 올릴 수 있습니다."),
    ).toBeVisible();
  });
});
