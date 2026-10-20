/**
 * AI 답을 소리로 읽을 글로(MYH-263). 마크다운 · 코드 · 주소 · 비서 블록은
 * 소리로 들어도 뜻이 없으니 뺀다. 브라우저 · 시험이 함께 쓰므로 다른 것을 보지 않는다.
 */
export function speakableText(markdown: string, max = 1500) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ") // 코드 · ```myhome 블록
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 그림
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [글](주소) → 글
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~|]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
