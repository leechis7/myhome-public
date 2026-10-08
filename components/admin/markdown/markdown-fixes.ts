/**
 * 편집기가 뽑은 마크다운을 바로잡는 작은 함수들(MYH-118). 편집기 없이도 돌아
 * 단위 시험으로 본다(tests/unit/markdown-fixes.test.ts).
 */

/**
 * 문단 안 줄머리의 블록 표시를 다시 막는다. TipTap 이 뽑은 문단에 쓴다.
 *
 * 원본의 `\- 항목` · `1\) 항목` 은 목록이 아닌 글자다. TipTap 은 읽을 때 \ 를
 * 떼고 뽑을 때 다시 붙이지 않아, 줄바꿈 뒤의 그 줄이 진짜 목록이 됐다.
 */
const LINE_START = /^(\s*)([-+*]|#{1,6}|>|\d+[.)])(?=\s|$)/;

export function escapeLineStarts(markdown: string) {
  return markdown
    .split("\n")
    .map((line) =>
      line.replace(LINE_START, (_m, space: string, mark: string) => {
        if (/^\d/.test(mark))
          return `${space}${mark.slice(0, -1)}\\${mark.slice(-1)}`;
        return `${space}\\${mark}`;
      }),
    )
    .join("\n");
}

/**
 * 표 줄의 인라인 코드 안 `|` 를 다시 막는다. Toast UI 가 뽑은 것에 쓴다. Toast UI 는 `a \| b` 를 읽고
 * `a | b` 로 뽑아 칸이 둘로 쪼개진다.
 */
export function fixTablePipes(markdown: string) {
  return markdown
    .split("\n")
    .map((line) =>
      line.trimStart().startsWith("|")
        ? line.replace(/`[^`]*`/g, (code) => code.replace(/(?<!\\)\|/g, "\\|"))
        : line,
    )
    .join("\n");
}
