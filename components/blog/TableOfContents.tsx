import { slugifyHeading } from "@/lib/posts/headings";

type Heading = { level: number; text: string };

/** 본문에 제목이 두 개 이상일 때만 목차를 보여준다 */
export default function TableOfContents({
  headings,
}: {
  headings: Heading[];
}) {
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="목차"
      className="my-10 rounded-xl border border-border p-5"
    >
      <p className="text-sm font-medium">목차</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {headings.map((heading, i) => (
          <li
            key={`${heading.text}-${i}`}
            className={heading.level === 3 ? "pl-4" : undefined}
          >
            <a
              href={`#${slugifyHeading(heading.text)}`}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
