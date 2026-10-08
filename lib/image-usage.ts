/**
 * 본문 어디에 그 그림을 썼는가.
 *
 * 「올린 이미지」 목록에서 지우기 전에 보여 준다(MYH-148). 안 쓰는 것은
 * 마음 놓고 지우고, 쓰는 것은 어디에 쓰는지 보고 나서 정하면 된다.
 *
 * 찾는 방법은 본문 글자 맞추기다. 마크다운을 파싱하지 않는다 — 그림은
 * `![이름](주소)` 로만 들어가는 것이 아니라 `<img src>` 로도, 그냥 링크로도
 * 들어갈 수 있다. 주소만 찾으면 어느 쪽이든 걸린다.
 */

export type ImageUsage = {
  /** 본문에 몇 번 나오는가 */
  count: number;
  /** 나오는 줄 번호. 1부터 센다 */
  lines: number[];
  /** 처음 나온 자리의 앞뒤. 없으면 null */
  excerpt: string | null;
};

/** 발췌를 이보다 길게 보여 주지 않는다 */
const EXCERPT_LENGTH = 60;

/**
 * 정규식에서 뜻을 가지는 글자를 막는다.
 * 주소에는 `.` 와 `/` 가 들어 있고, 파일 이름에 `+` 나 `(` 가 있을 수도 있다.
 */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 본문에서 `needle` 을 찾는다.
 *
 * 블로그 그림은 내용 해시(32자)를 넣고, 비밀글은 `/admin/secrets/files/31`
 * 처럼 번호로 끝나는 주소를 넣는다. 뒤가 숫자로 이어지면 다른 것이므로
 * (`files/3` 이 `files/31` 에 걸린다) 숫자가 아닌 자리까지 본다.
 */
export function findImageUsage(content: string, needle: string): ImageUsage {
  if (!needle) return { count: 0, lines: [], excerpt: null };

  const pattern = new RegExp(`${escapeRegExp(needle)}(?![0-9])`, "g");
  const lines: number[] = [];
  let excerpt: string | null = null;
  let count = 0;

  content.split("\n").forEach((line, index) => {
    pattern.lastIndex = 0;
    const hits = line.match(pattern);
    if (!hits) return;

    count += hits.length;
    lines.push(index + 1);
    if (excerpt === null) excerpt = cut(line, line.indexOf(needle));
  });

  return { count, lines, excerpt };
}

/** 긴 줄은 찾은 자리를 가운데 두고 잘라 준다 */
function cut(line: string, at: number) {
  const trimmed = line.trim();
  if (trimmed.length <= EXCERPT_LENGTH) return trimmed;

  const start = Math.max(0, at - Math.floor(EXCERPT_LENGTH / 2));
  const end = Math.min(line.length, start + EXCERPT_LENGTH);
  return `${start > 0 ? "…" : ""}${line.slice(start, end).trim()}${
    end < line.length ? "…" : ""
  }`;
}

/** 화면에 적을 한 줄. "본문에 없음" 인지 몇 번째 줄인지 */
export function describeUsage(usage: ImageUsage) {
  if (usage.count === 0) return "본문에 없음";
  const where = usage.lines.join(", ");
  return usage.count === 1
    ? `본문 ${where}번째 줄`
    : `본문 ${where}번째 줄 (${usage.count}번)`;
}

/**
 * 본문에서 그 그림을 뺀다(MYH-197). 「올린 이미지」 에서 지울 때 쓴다.
 *
 * 빼는 것은 그림으로 넣은 것뿐이다 - `![이름](주소)` 와 `<img … src=주소>`.
 * 그냥 링크로 적은 주소는 사람이 쓴 글이라 건드리지 않는다. 찾는 방법은
 * findImageUsage 와 같다(해시나 주소, 뒤에 숫자가 이어지면 다른 것).
 *
 * 그림만 있던 줄은 줄째 뺀다. 그래서 위아래 빈 줄이 겹치면 하나만 남기고,
 * 끝에 있던 그림이면 그 앞의 빈 줄도 걷는다.
 */
export function stripImage(content: string, needle: string) {
  if (!needle) return content;
  const at = `${escapeRegExp(needle)}(?![0-9])`;
  const markdown = new RegExp(`!\\[[^\\]\\n]*\\]\\([^)\\s]*${at}[^)\\n]*\\)`, "g");
  const html = new RegExp(`<img\\b[^>]*${at}[^>]*>`, "gi");

  const out: string[] = [];
  let dropped = false;
  for (const line of content.split("\n")) {
    const next = line.replace(markdown, "").replace(html, "");
    if (next === line) {
      // 그림 줄을 빼서 빈 줄이 겹치면 하나만 둔다
      if (
        dropped &&
        line.trim() === "" &&
        (out.length === 0 || out.at(-1)!.trim() === "")
      ) {
        dropped = false;
        continue;
      }
      out.push(line);
      dropped = false;
      continue;
    }
    if (next.trim() === "") {
      dropped = true;
      continue;
    }
    out.push(next);
    dropped = false;
  }
  // 끝에 있던 그림을 뺐으면 그 앞의 빈 줄도 걷는다
  if (dropped) {
    while (out.length > 0 && out.at(-1)!.trim() === "") out.pop();
    // \r\n 으로 담긴 본문이면 마지막 줄에 \r 이 남는다
    if (out.length > 0) out[out.length - 1] = out.at(-1)!.replace(/\r$/, "");
  }
  return out.join("\n");
}
