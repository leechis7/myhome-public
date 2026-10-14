"use server";

import { eq } from "drizzle-orm";
import { askAi } from "@/lib/ai";
import { missOf } from "@/lib/ai/gemini";
import {
  CATEGORY_SCHEMA,
  cleanReview,
  DEFAULT_CATEGORY_PROMPT,
  DEFAULT_REVIEW_PROMPT,
  pickCategory,
  renderCategoryPrompt,
  renderReviewPrompt,
} from "@/lib/books/ai";
import { BOOK_CATEGORY, listCodes } from "@/lib/codes";
import { books, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/security/auth";
import { promptSetting, siteAi } from "@/lib/site/settings";

/**
 * 책에 AI(MYH-251). 둘 다 저장하지 않는다 - 칸에 넣어 주고 사람이 고쳐 저장한다.
 * 보내는 것은 책 제목 · 지은이 · 소개 · 내가 쓴 독서 노트다(공개 화면에 나가는 글).
 */

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤에 다시 해 주세요.",
  slow: "AI 가 너무 오래 답하지 않습니다. 다시 해 주세요.",
  error: "AI 에게 묻지 못했습니다. 환경설정 › AI 사용 을 확인하세요.",
} as const;

const NO_ENGINE = "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요.";

/** 독서 노트로 한 줄 평 초안. 노트는 화면에서 쓰던 것(저장 전)을 받는다 */
export async function suggestReviewAction(input: {
  id: number;
  note: string;
  rating: number | null;
}): Promise<{ text?: string; error?: string }> {
  await requireAdmin();
  const note = String(input.note ?? "").trim();
  if (note.length < 20) return { error: "독서 노트를 조금 더 쓴 뒤에 해 주세요." };
  const access = await siteAi();
  if (!access) return { error: NO_ENGINE };
  const [book] = await getDb()
    .select({ title: books.title, author: books.author })
    .from(books)
    .where(eq(books.id, Number(input.id)))
    .limit(1);
  if (!book) return { error: "책을 찾지 못했습니다." };
  const rating = Number.isInteger(input.rating) && input.rating! >= 1 && input.rating! <= 5 ? input.rating : null;
  const prompt = renderReviewPrompt((await promptSetting("bookReviewPrompt")) ?? DEFAULT_REVIEW_PROMPT, {
    ...book,
    note,
    rating,
  });
  try {
    const text = cleanReview(await askAi(prompt, access, { timeoutMs: 60_000 }));
    return text ? { text } : { error: MISS.error };
  } catch (error) {
    return { error: MISS[missOf(error)] };
  }
}

/** 제목 · 지은이 · 소개로 분류 제안. 지금 쓰는(켜 둔) 분류 가운데서만 고른다 */
export async function suggestCategoryAction(input: {
  title: string;
  author: string;
  intro: string;
}): Promise<{ code?: string; label?: string; error?: string }> {
  await requireAdmin();
  const title = String(input.title ?? "").trim();
  if (!title) return { error: "제목을 먼저 적어 주세요." };
  const access = await siteAi();
  if (!access) return { error: NO_ENGINE };
  const codes = await listCodes(BOOK_CATEGORY);
  if (codes.length === 0) return { error: "고를 분류가 없습니다. 관리 › 설정 › 코드에서 만들어 주세요." };
  const prompt = renderCategoryPrompt((await promptSetting("bookCategoryPrompt")) ?? DEFAULT_CATEGORY_PROMPT, {
    title,
    author: String(input.author ?? ""),
    intro: String(input.intro ?? ""),
    labels: codes.map((c) => c.label),
  });
  try {
    const picked = pickCategory(await askAi(prompt, access, { timeoutMs: 60_000, schema: CATEGORY_SCHEMA }), codes);
    return picked ? { code: picked.code, label: picked.label } : { error: "맞는 분류를 고르지 못했습니다." };
  } catch (error) {
    return { error: MISS[missOf(error)] };
  }
}
