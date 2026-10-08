/**
 * 마크다운 본문에서 제목을 뽑는다.
 * 목차 링크가 실제 제목의 id와 맞아야 하므로, rehype-slug와 같은 방식으로
 * id를 만든다(GitHub 방식: 소문자화, 공백은 하이픈, 특수문자 제거).
 */
export function slugifyHeading(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

export type Heading = { level: number; text: string };

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inCodeBlock = false;

  for (const line of markdown.split("\n")) {
    // 코드 블록 안의 # 은 제목이 아니다
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (match) {
      headings.push({
        level: match[1].length,
        // 제목에 쓰인 강조·링크 표시는 떼고 글자만 남긴다
        text: match[2]
          .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
          .replace(/[*_`]/g, "")
          .trim(),
      });
    }
  }

  return headings;
}
