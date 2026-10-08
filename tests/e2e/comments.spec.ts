import { expect, test } from "@playwright/test";
import {
  createPost,
  deleteControl,
  deletePost,
  login,
  pressDelete,
} from "./helpers";

const TITLE = "e2e 댓글 확인용 글";

test.describe("댓글", () => {
  test("방문자가 남기고 관리자가 지운다", async ({ page }) => {
    await login(page);
    const id = await createPost(page, { title: TITLE, content: "댓글 확인" });

    await page.goto(`/blog/${id}`);
    await expect(page.getByText("첫 댓글을 남겨보세요")).toBeVisible();

    await page.getByLabel("이름").fill("지나가던 사람");
    await page.getByLabel("댓글").fill("잘 봤습니다");
    await page.getByRole("button", { name: "댓글 남기기" }).click();

    await expect(page.getByText("지나가던 사람", { exact: true })).toBeVisible();
    await expect(page.getByText("잘 봤습니다")).toBeVisible();

    // 관리자에게만 삭제 버튼이 보인다
    await expect(deleteControl(page).first()).toBeVisible();
    await pressDelete(page);
    await expect(page.getByText("잘 봤습니다")).toHaveCount(0);

    await deletePost(page, TITLE);
  });

  test("이름이나 내용을 비우면 등록되지 않는다", async ({ page }) => {
    await login(page);
    const id = await createPost(page, { title: TITLE, content: "댓글 확인" });

    await page.context().clearCookies();
    await page.goto(`/blog/${id}`);

    // 브라우저 기본 검사에 걸려 전송되지 않는다
    await page.getByRole("button", { name: "댓글 남기기" }).click();
    await expect(page.getByText("첫 댓글을 남겨보세요")).toBeVisible();

    await login(page);
    await deletePost(page, TITLE);
  });

  test("비로그인 방문자에게는 삭제 버튼이 없다", async ({ page }) => {
    await login(page);
    const id = await createPost(page, { title: TITLE, content: "댓글 확인" });

    await page.goto(`/blog/${id}`);
    await page.getByLabel("이름").fill("손님");
    await page.getByLabel("댓글").fill("남깁니다");
    await page.getByRole("button", { name: "댓글 남기기" }).click();
    await expect(page.getByText("남깁니다")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(`/blog/${id}`);
    await expect(page.getByText("남깁니다")).toBeVisible();
    await expect(deleteControl(page)).toHaveCount(0);

    await login(page);
    await deletePost(page, TITLE);
  });
});
