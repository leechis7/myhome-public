import { expect, test } from "@playwright/test";
import { login, pressDelete, TEST_PREFIX } from "./helpers";

/**
 * 홈페이지 API(MYH-247). 환경설정에서 토큰을 만들고, 그 토큰으로 할 일 · 메모 ·
 * 글 초안을 넣고 읽는다. 끝에 토큰을 지운다(개발기 설정을 남기지 않게).
 */
test.describe("홈페이지 API", () => {
  test("토큰이 없으면 막고, 있으면 넣고 읽는다", async ({ page, request }) => {
    // 할 일은 AI 엔진(오픈클로 · Gemini)을 거치기도 해 넉넉히
    test.setTimeout(180_000);
    await login(page);
    await page.goto("/admin/settings#api");
    const section = page.locator("#api");
    const hadToken = await section.getByText("● 토큰이 있습니다").isVisible();
    // 개발기에 이미 토큰이 있으면 건드리지 않는다 - 새로 만들면 예전 것이 죽는다
    test.skip(hadToken, "개발기에 이미 토큰이 있다");

    // 토큰 없이는 막힌다
    expect((await request.get("/api/v1/todos")).status()).toBe(401);

    await section.getByRole("button", { name: "토큰 만들기" }).click();
    const token = (await section
      .locator("code")
      .filter({ hasText: /^mh_/ })
      .textContent())!.trim();
    const auth = { authorization: `Bearer ${token}` };

    try {
      expect(
        (
          await request.get("/api/v1/todos", {
            headers: { authorization: "Bearer mh_wrong" },
          })
        ).status(),
      ).toBe(401);

      // 할 일: 글만 주면 날짜 · 시각을 읽는다
      const stamp = Date.now().toString(36);
      const title = `${TEST_PREFIX}API 할 일 ${stamp}`;
      const made = await request.post("/api/v1/todos", {
        headers: auth,
        data: { text: `${title} 내일 오후 7시` },
      });
      expect(made.status()).toBe(201);
      const todo = await made.json();
      expect(todo.title).toBe(title);
      expect(todo.dueOn).toBeTruthy();
      expect(todo.startTime).toBe("19:00");
      const list = await (
        await request.get("/api/v1/todos", { headers: auth })
      ).json();
      expect(list.open.some((t: { id: number }) => t.id === todo.id)).toBe(
        true,
      );

      // 메모
      const memo = await request.post("/api/v1/memos", {
        headers: auth,
        data: { text: `${TEST_PREFIX}API 메모 ${stamp}` },
      });
      expect(memo.status()).toBe(201);

      // 글 초안은 임시저장으로만
      const draft = await request.post("/api/v1/drafts", {
        headers: auth,
        data: { kind: "note", content: `${TEST_PREFIX}API 초안 ${stamp}` },
      });
      expect(draft.status()).toBe(201);
      expect((await draft.json()).published).toBe(false);

      // 일정은 읽기만
      expect(
        (
          await request.get("/api/v1/events?days=3", { headers: auth })
        ).status(),
      ).toBe(200);

      // 화면에 「API」 로 들어와 있다 - 지운다
      await page.goto("/admin/todos");
      const row = page
        .getByRole("list", { name: "남은 할 일" })
        .locator("li", { hasText: title });
      await expect(row).toBeVisible();
      await pressDelete(row, "할 일 삭제");
      await page.goto("/admin/memos");
      await pressDelete(
        page.getByRole("list", { name: "메모 목록" }).locator("li", { hasText: `API 메모 ${stamp}` }),
        "메모 삭제",
      );
    } finally {
      await page.goto("/admin/settings#api");
      await page
        .locator("#api")
        .getByRole("button", { name: "토큰 지우기" })
        .click();
      await expect(page.getByText("토큰을 지웠습니다")).toBeVisible();
      expect(
        (await request.get("/api/v1/todos", { headers: auth })).status(),
      ).toBe(401);
    }
  });
});
