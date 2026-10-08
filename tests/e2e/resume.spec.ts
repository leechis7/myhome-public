import { expect, test } from "@playwright/test";

/**
 * 이력서(MYH-195). 소개에서 들어가고, 인쇄하면 메뉴 · 꼬리 · 단추가 빠진다.
 * PDF 는 브라우저 인쇄로 만든다 - 시험에서는 Chromium 의 PDF 로 대신 본다.
 */
test.describe("이력서", () => {
  test("소개에서 들어가 경력 · 기술 · 수행 업무가 한 장에 있다", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "이력서 →" }).click();
    await expect(page).toHaveURL(/\/resume$/);
    await expect(page.getByRole("button", { name: "PDF로 저장" })).toBeVisible();
    // 소개에 내용이 있는 절은 이력서에도 있다(보기 데이터든 실제 데이터든).
    // 소개는 수행 업무가 비어도 제목과 「아직 … 없습니다」 를 보이지만,
    // 이력서는 빈 절을 빼므로 그때는 보지 않는다(GitHub 검사의 빈 DB)
    const onAbout = await (await page.request.get("/about")).text();
    for (const name of ["경력", "기술", "수행 업무"]) {
      if (!onAbout.includes(`>${name}</h2>`)) continue;
      if (name === "수행 업무" && onAbout.includes("아직 등록한 수행 업무가 없습니다"))
        continue;
      // 이력서의 절은 번호가 붙는다(「3. 경력」, MYH-198)
      await expect(
        page.getByRole("heading", { name: new RegExp(`^\\d+\\. ${name}`) }),
      ).toBeVisible();
    }
  });

  test("인쇄하면 메뉴 · 꼬리 · 단추가 빠지고 흰 바탕이다", async ({ page }) => {
    await page.goto("/resume");
    await page.emulateMedia({ media: "print", colorScheme: "dark" });
    await expect(page.locator("body > header")).toBeHidden();
    await expect(page.locator("body > footer")).toBeHidden();
    await expect(page.getByRole("button", { name: "PDF로 저장" })).toBeHidden();
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe("rgb(255, 255, 255)");

    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});
