/**
 * AI 로 맞춤법 · 문장 다듬기 제안(MYH-253). 고칠 곳을 「원문 → 제안」 으로 받아
 * 하나씩 받아들인다 - 글을 통째로 바꾸지 않는다. DB 를 보지 않는 것만 두고 시험한다.
 * 프롬프트는 환경설정 › AI 프롬프트(.env PROOF_AI_PROMPT).
 */

export const DEFAULT_PROOF_PROMPT = [
  "아래 {종류}의 맞춤법 · 띄어쓰기 · 어색한 문장을 고칠 곳을 찾아라.",
  "- 뜻 · 말투 · 마크다운 · 코드 · 링크는 바꾸지 않는다. 고칠 곳만 짚는다(많아야 20곳).",
  "- from 은 본문에 있는 그대로의 짧은 구절(한 문장 안), to 는 고친 구절, why 는 까닭 한 줄.",
  "- 고칠 곳이 없으면 빈 목록.",
  "",
  '다른 말 없이 이 JSON 으로만 답하라: {"edits":[{"from":"","to":"","why":""}]}',
  "",
  "본문:",
  "{글}",
].join("\n");

export type ProofEdit = { from: string; to: string; why: string };

const MAX_BODY = 8000;
const MAX_EDITS = 20;

export function renderProofPrompt(template: string, { kind, content }: { kind: "post" | "note"; content: string }) {
  const body = content.slice(0, MAX_BODY);
  const filled = template.replaceAll("{종류}", kind === "post" ? "블로그 글" : "짧은 글").replaceAll("{글}", body);
  return template.includes("{글}") ? filled : `${filled}\n\n본문:\n${body}`;
}

/**
 * 답에서 고칠 곳을 읽는다. 본문에 그대로 있는 원문만, 같은 것은 하나만 받는다 -
 * AI 가 지어낸 원문으로 엉뚱한 곳을 바꾸지 않게.
 */
export function readProofEdits(raw: string, content: string): ProofEdit[] {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new SyntaxError("JSON 이 없다");
  const data = JSON.parse(json) as { edits?: unknown };
  const list = Array.isArray(data.edits) ? data.edits : [];
  const out: ProofEdit[] = [];
  for (const e of list) {
    if (typeof e !== "object" || e === null) continue;
    const { from, to, why } = e as Record<string, unknown>;
    if (typeof from !== "string" || typeof to !== "string" || !from || from === to) continue;
    if (!content.includes(from) || out.some((o) => o.from === from)) continue;
    out.push({ from, to, why: typeof why === "string" ? why.trim().slice(0, 80) : "" });
    if (out.length >= MAX_EDITS) break;
  }
  return out;
}

/** 받아들인다: 본문의 첫 원문 하나를 제안으로. 원문이 없어졌으면 null */
export function applyEdit(content: string, { from, to }: ProofEdit) {
  const at = content.indexOf(from);
  return at < 0 ? null : content.slice(0, at) + to + content.slice(at + from.length);
}
