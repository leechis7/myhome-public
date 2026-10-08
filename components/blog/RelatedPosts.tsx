import Link from "next/link";
import { formatDate } from "@/lib/posts";

type Related = {
  id: number;
  title: string;
  publishedAt: Date | null;
  shared: string[];
};

/**
 * 관련 글(MYH-188). 같은 태그가 많은 공개 글 몇 편. 없으면 절을 그리지 않는다.
 * 겹친 태그를 줄 끝에 흐리게 적어 왜 나왔는지 보인다.
 */
export default function RelatedPosts({ rows }: { rows: Related[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <h2 id="related-heading" className="text-sm font-medium">
        관련 글
      </h2>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/blog/${r.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="text-sm font-medium">{r.title}</span>
              <span className="text-xs text-faint">
                {formatDate(r.publishedAt)}
                {r.shared.length > 0 ? ` · ${r.shared.join(", ")}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
