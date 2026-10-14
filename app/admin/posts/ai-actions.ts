"use server";

import { askAi } from "@/lib/ai";
import { missOf } from "@/lib/ai/gemini";
import { listTags } from "@/lib/posts";
import { DEFAULT_POST_PROMPT, POST_META_SCHEMA, readPostMeta, renderPostPrompt } from "@/lib/posts/ai-meta";
import { requireAdmin } from "@/lib/security/auth";
import { postAiPrompt, promptSetting, siteAi } from "@/lib/site/settings";
import { DEFAULT_PROOF_PROMPT, readProofEdits, renderProofPrompt, type ProofEdit } from "@/lib/posts/proofread";

/**
 * 글 요약 · 태그 제안(MYH-249). 블로그 쓰기 화면의 「AI 로 채우기」 · 짧은 글의
 * 「태그 제안」 이 부른다. 저장은 하지 않는다 - 칸에 넣어 주고 사람이 고쳐 저장한다.
 * 이미 쓰던 태그를 함께 알려 주어 같은 말을 고르게 한다.
 */

export type PostMetaReply = { summary?: string; tags?: string[]; error?: string };

const MISS = {
  quota: "AI 사용 한도를 넘었습니다. 잠시 뒤에 다시 해 주세요.",
  slow: "AI 가 너무 오래 답하지 않습니다. 다시 해 주세요.",
  error: "AI 에게 묻지 못했습니다. 환경설정 › AI 사용 을 확인하세요.",
} as const;

export async function suggestPostMetaAction(input: {
  kind: "post" | "note";
  title: string;
  content: string;
}): Promise<PostMetaReply> {
  await requireAdmin();
  const kind = input.kind === "note" ? "note" : "post";
  const content = String(input.content ?? "").trim();
  if (content.length < 20) return { error: "본문을 조금 더 쓴 뒤에 해 주세요." };
  const access = await siteAi();
  if (!access) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  const [template, known] = await Promise.all([
    postAiPrompt(),
    listTags(kind, true).catch(() => []),
  ]);
  const prompt = renderPostPrompt(template ?? DEFAULT_POST_PROMPT, {
    kind,
    title: String(input.title ?? ""),
    content,
    knownTags: known.map((t) => t.tag),
  });
  try {
    const raw = await askAi(prompt, access, { timeoutMs: 60_000, schema: POST_META_SCHEMA });
    return readPostMeta(raw);
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "AI 의 답을 읽지 못했습니다. 다시 해 주세요." };
    return { error: MISS[missOf(error)] };
  }
}

/**
 * 맞춤법 · 문장 다듬기(MYH-253). 고칠 곳 목록만 돌려준다 - 받아들이는 것은 화면이
 * 하나씩 한다. 본문은 쓰던 것(저장 전)을 받는다.
 */
export async function proofreadAction(input: {
  kind: "post" | "note";
  content: string;
}): Promise<{ edits?: ProofEdit[]; error?: string }> {
  await requireAdmin();
  const content = String(input.content ?? "");
  if (content.trim().length < 10) return { error: "본문을 조금 더 쓴 뒤에 해 주세요." };
  const access = await siteAi();
  if (!access) return { error: "쓸 AI 엔진이 없습니다. 환경설정 › AI 사용 에서 켜 주세요." };
  const prompt = renderProofPrompt((await promptSetting("proofAiPrompt")) ?? DEFAULT_PROOF_PROMPT, {
    kind: input.kind === "note" ? "note" : "post",
    content,
  });
  try {
    return { edits: readProofEdits(await askAi(prompt, access, { timeoutMs: 90_000, temperature: 0.2 }), content) };
  } catch (error) {
    if (error instanceof SyntaxError) return { error: "AI 의 답을 읽지 못했습니다. 다시 해 주세요." };
    return { error: MISS[missOf(error)] };
  }
}
