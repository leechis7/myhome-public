import { isValidElement, type ReactNode } from "react";

/**
 * ```mermaid 코드블록을 가려낸다.
 *
 * `Markdown.tsx` 의 `pre` 는 이미 만들어진 React 요소를 받는다. 마크다운
 * 원본이 아니라 `<code className="language-mermaid">…</code>` 한 덩어리다.
 * 그래서 언어는 클래스에서 보고, 도식 원본은 그 안의 글자를 다시 이어
 * 붙여서 꺼낸다.
 *
 * 렌더러 밖으로 빼 둔 것은 이 규칙만 따로 시험하기 위해서다 — 브라우저를
 * 띄우지 않고도 "mermaid 만 골라내는가" 를 확인할 수 있어야 한다.
 */

/** mermaid 블록이면 그 안의 글자를, 아니면 null 을 준다 */
export function mermaidSource(children: ReactNode): string | null {
  if (!isValidElement(children)) return null;

  const props = children.props as {
    className?: unknown;
    children?: ReactNode;
  };
  if (typeof props.className !== "string") return null;
  if (!props.className.split(/\s+/).includes("language-mermaid")) return null;

  const source = plainText(props.children).trim();
  // 빈 블록은 그릴 것이 없다. mermaid 에 넘기면 오류 그림만 나온다.
  return source === "" ? null : source;
}

/**
 * 요소 안의 글자만 이어 붙인다.
 *
 * rehype-highlight 는 아는 언어의 블록을 `<span>` 여럿으로 쪼갠다. mermaid
 * 는 모르는 언어라 지금은 글자 하나로 오지만, 나중에 highlight.js 가
 * mermaid 를 알게 되거나 다른 플러그인이 끼면 쪼개진다. 그때도 원본이
 * 온전히 나오게 훑어서 모은다.
 */
function plainText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement(node)) {
    return plainText((node.props as { children?: ReactNode }).children);
  }
  return "";
}
