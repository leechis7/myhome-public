import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createPost, deletePost, login } from "./helpers";

/**
 * 자동 검사가 접근성을 다 잡아주지는 않는다. 다만 대비 미달이나 빠진
 * 라벨처럼 기계가 확실히 알 수 있는 것은 여기서 걸러진다.
 *
 * 라이트·다크를 모두 본다. 색 대비는 테마마다 다르고, 실제로 라이트에서만
 * 미달이던 적이 있다.
 */
const RULES = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: import("@playwright/test").Page, path: string) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(RULES).analyze();
    const found = result.violations.map(
      (v) => `${v.id} (${v.impact}) — ${v.nodes[0]?.html?.slice(0, 80)}`,
    );
    expect(found, `${path} · ${scheme}`).toEqual([]);
  }
}

test.describe("접근성", () => {
  for (const path of ["/", "/about", "/blog", "/guestbook"]) {
    test(`${path} 에 자동으로 잡히는 위반이 없다`, async ({ page }) => {
      await scan(page, path);
    });
  }

  test("없는 주소(404)도 확인한다", async ({ page }) => {
    await scan(page, "/이런-주소는-없다");
  });

  test("글 화면도 확인한다", async ({ page }) => {
    await login(page);
    const title = "e2e 접근성 확인용 글";
    const id = await createPost(page, {
      title,
      tags: "점검",
      content: [
        "첫 문단이다. **굵게** 와 [링크](https://example.com) 가 있다.",
        "",
        "## 첫 제목",
        "",
        "- 목록 하나",
        "- 목록 둘",
        "",
        "| 항목 | 값 |",
        "| --- | --- |",
        "| 가 | 1 |",
        "",
        "## 둘째 제목",
        "",
        "```ts",
        "const x: number = 1;",
        "```",
      ].join("\n"),
    });

    try {
      await scan(page, `/blog/${id}`);
    } finally {
      await deletePost(page, title);
    }
  });

  // 칸 다섯과 미리보기가 있는 관리 화면(MYH-169)
  test("사이트 정보 화면도 확인한다", async ({ page }) => {
    await login(page);
    await scan(page, "/admin/site");
    await scan(page, "/admin/settings");
  });

  // 트리와 고치는 칸이 나란히 있는 관리 화면이다. 줄을 고른 상태(끝에
  // 있어 못 누르는 위/아래 단추가 섞인다)와 더하는 폼을 따로 본다(MYH-124).
  test("메뉴 관리 화면도 확인한다", async ({ page }) => {
    await login(page);
    await page.goto("/admin/menus");
    await page
      .getByRole("navigation", { name: "메뉴 트리" })
      .getByRole("link")
      .first()
      .click();
    await expect(page).toHaveURL(/\?id=\d+/);
    const selected = new URL(page.url());
    await scan(page, `${selected.pathname}${selected.search}`);
    await scan(page, "/admin/menus?add=1");
  });

  test("키보드로 이동할 때 어디에 있는지 보인다", async ({ page }) => {
    await page.goto("/");
    const missing: string[] = [];

    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          name: `<${el.tagName.toLowerCase()}> ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 20)}`,
          marked:
            (style.outlineStyle !== "none" &&
              parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== "none",
          // 숨긴 요소에 탭이 닿으면 초점이 사라진 것처럼 보인다
          visible: box.width > 0 && box.height > 0,
        };
      });
      if (!info) break;
      // next dev 의 오류 오버레이는 우리 것이 아니고 운영 빌드에는 없다.
      // 탭할 것이 적은 화면에서는 여기까지 닿는다.
      if (info.name.startsWith("<nextjs-portal>")) continue;
      if (!info.marked || !info.visible) missing.push(info.name);
    }

    expect(missing).toEqual([]);
  });
});
