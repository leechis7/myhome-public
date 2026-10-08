import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import CodeBlock from "./CodeBlock";
import Mermaid from "./Mermaid";
import { mermaidSource } from "@/lib/mermaid-block";
import remarkGfm from "remark-gfm";

/**
 * DB에 저장된 마크다운 본문을 렌더한다.
 * HTML을 직접 삽입하지 않고 React 요소로 만들기 때문에 스크립트가 실행되지 않는다.
 *
 * 코드는 인라인(`foo`)과 블록(```)의 구분을 컴포넌트에서 알 수 없어
 * 바깥 div의 CSS로 구분해 스타일을 준다.
 *
 * 코드 블록 색은 rehype-highlight가 붙이는 hljs-* 클래스에
 * globals.css에서 색을 지정하는 방식이다. 테마별 CSS 파일을 가져오지 않고
 * 라이트/다크에 맞춘 색을 직접 정의한다.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div
      className={[
        "space-y-5 leading-relaxed text-foreground/80",
        // 인라인 코드
        "[&_code]:rounded [&_code]:bg-foreground/[0.07] [&_code]:px-1.5 [&_code]:py-0.5",
        "[&_code]:font-mono [&_code]:text-[0.9em]",
        // 코드 블록 안에서는 배경과 여백을 없앤다
        "[&_pre_code]:block [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // detect를 켜면 언어를 안 적은 블록을 멋대로 추측해 엉뚱하게 칠한다.
        // (Caddyfile을 CSS로 인식하는 식) 언어를 적은 블록만 칠한다.
        rehypePlugins={[
          // 제목에 id를 붙여 목차에서 바로 이동할 수 있게 한다
          rehypeSlug,
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ]}
        components={{
          // id를 그대로 넘겨야 목차 링크가 동작한다.
          // scroll-mt은 고정 헤더에 제목이 가리지 않게 한다.
          h2: ({ children, id }) => (
            <h2
              id={id}
              className="mt-10 mb-3 scroll-mt-24 text-xl font-semibold text-foreground"
            >
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3
              id={id}
              className="mt-8 mb-2 scroll-mt-24 text-lg font-semibold text-foreground"
            >
              {children}
            </h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-4 text-foreground/60">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
          // 코드 블록만 따로 감싼다. 복사 버튼을 붙이기 위해서다.
          //
          // ```mermaid 는 갈래를 쳐서 그림으로 그린다(MYH-160). 그리기 전과
          // 문법이 틀렸을 때는 코드블록 그대로 보이므로, 그것을 그대로
          // 넘겨 준다 — 도식을 못 그려도 글에서 내용이 사라지지는 않는다.
          pre: ({ children }) => {
            const 도식 = mermaidSource(children);
            const 코드블록 = <CodeBlock>{children}</CodeBlock>;
            if (도식 === null) return 코드블록;
            return <Mermaid chart={도식} fallback={코드블록} />;
          },
          hr: () => <hr className="border-border" />,
          img: ({ src, alt }) => (
            // 크기를 미리 알 수 없어 next/image 대신 그대로 쓴다.
            // 대신 화면에 들어올 때 불러오게 해서 첫 로딩을 가볍게 한다.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? ""}
              loading="lazy"
              decoding="async"
              className="rounded-xl"
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
