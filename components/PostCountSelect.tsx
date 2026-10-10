"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_POST_COUNT, POST_COUNTS } from "@/lib/posts/counts";

/**
 * 홈에 몇 개를 보여줄지 고른다. 고른 값은 주소(`?posts=`)에 남는다.
 */
export default function PostCountSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const current = Number(params.get("posts")) || DEFAULT_POST_COUNT;

  function choose(value: number) {
    const next = new URLSearchParams(params);
    if (value === DEFAULT_POST_COUNT) next.delete("posts");
    else next.set("posts", String(value));
    router.replace(next.size ? `/?${next}` : "/");
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">최근 글 개수</span>
      <select
        value={current}
        onChange={(e) => choose(Number(e.target.value))}
        aria-label="최근 글 개수"
        // 키보드로 왔을 때 어디에 있는지 보여야 한다. 테두리 색만 바꾸면
        // 초점 표시가 없는 것으로 본다(tests/e2e/a11y.spec.ts).
        className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
      >
        {POST_COUNTS.map((n) => (
          <option key={n} value={n}>
            {`${n}개`}
          </option>
        ))}
      </select>
    </label>
  );
}
