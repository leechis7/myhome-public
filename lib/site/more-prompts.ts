import { DEFAULT_CATEGORY_PROMPT, DEFAULT_REVIEW_PROMPT } from "@/lib/books/ai";
import { DEFAULT_SPAM_PROMPT } from "@/lib/posts/spam";
import { DEFAULT_PROOF_PROMPT } from "@/lib/posts/proofread";

/**
 * 환경설정 › AI 프롬프트 의 「그 밖의 프롬프트」 칸들(MYH-251 · 252). 화면과 저장
 * 동작이 함께 본다 - 새 프롬프트는 여기 한 줄과 lib/site/settings.ts 의 SETTINGS 에 더한다.
 */
export const MORE_PROMPTS = {
  bookReviewPrompt: {
    id: "review-prompt",
    title: "책 한 줄 평 프롬프트",
    env: "BOOK_REVIEW_PROMPT",
    fallback: DEFAULT_REVIEW_PROMPT,
    hint: "독서 노트 화면의 「노트로 한 줄 평」 이 쓴다. {제목} · {지은이} · {별점} · {노트} 자리가 채워집니다({노트} 를 빼면 맨 끝에 붙습니다).",
  },
  bookCategoryPrompt: {
    id: "category-prompt",
    title: "책 분류 제안 프롬프트",
    env: "BOOK_CATEGORY_PROMPT",
    fallback: DEFAULT_CATEGORY_PROMPT,
    hint: "책 추가 · 고치기의 「분류 제안」 이 쓴다. {제목} · {지은이} · {분류}(지금 쓰는 분류 이름들) · {소개} 자리가 채워집니다({소개} 를 빼면 맨 끝에 붙습니다). 답은 목록에 있는 이름일 때만 받습니다.",
  },
  spamAiPrompt: {
    id: "spam-prompt",
    title: "방명록 · 댓글 스팸 판정 프롬프트",
    env: "SPAM_AI_PROMPT",
    fallback: DEFAULT_SPAM_PROMPT,
    hint: "새 방명록 · 댓글이 올라오면 AI 가 보고 스팸이면 숨깁니다(MYH-252). {자리}(방명록 · 글 댓글) · {이름} · {글} 자리가 채워집니다({글} 을 빼면 맨 끝에 붙습니다). 받는 꼴(ok · spam, 까닭)은 바뀌지 않습니다.",
  },
  proofAiPrompt: {
    id: "proof-prompt",
    title: "맞춤법 · 문장 다듬기 프롬프트",
    env: "PROOF_AI_PROMPT",
    fallback: DEFAULT_PROOF_PROMPT,
    hint: "블로그 · 짧은 글 쓰기 화면의 「맞춤법 · 문장 보기」 가 쓴다(MYH-253). {종류} · {글} 자리가 채워집니다({글} 을 빼면 맨 끝에 붙습니다). 답은 {\"edits\":[{from, to, why}]} 꼴이어야 하고, 본문에 그대로 있는 from 만 받습니다.",
  },
} as const;
