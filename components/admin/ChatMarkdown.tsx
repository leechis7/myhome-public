import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

/**
 * AI 대화창의 답(MYH-248)을 마크다운으로. 블로그 본문(components/blog/Markdown.tsx)과
 * 같은 렌더러를 쓰되 말풍선에 맞게 촘촘하게. HTML 은 넣지 않는다(react-markdown 은
 * 날 HTML 을 그리지 않는다). 코드 색은 블로그와 같은 hljs-* 색(globals.css).
 */
export default function ChatMarkdown({ children }: { children: string }) {
  return (
    <div
      className={[
        "space-y-2 break-words",
        "[&_code]:rounded [&_code]:bg-foreground/[0.08] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-foreground/[0.06] [&_pre]:p-2.5",
        "[&_pre_code]:block [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
        "[&_ul]:list-disc [&_ul]:space-y-0.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-0.5 [&_ol]:pl-5",
        "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-foreground/70",
        "[&_table]:block [&_table]:overflow-x-auto [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        "[&_a]:underline [&_a]:underline-offset-4",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
