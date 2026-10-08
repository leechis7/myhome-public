"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 분류를 골라 목록을 좁힌다.
 *
 * 고른 값은 주소에 남긴다(`?category=...`). 그래야 수정하고 돌아왔을 때도
 * 보고 있던 분류가 그대로다 — 서버 액션은 이 경로를 다시 그리기만 한다.
 */
export default function LinkFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("category") ?? "";

  function choose(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("category", value);
    else next.delete("category");
    router.replace(next.size ? `/admin/links?${next}` : "/admin/links");
  }

  return (
    <label className="mt-6 flex items-center gap-2 text-sm">
      <span className="text-muted">분류</span>
      {/* label 이 select 를 감싸고 있어서 이름이 없으면 읽어 주는 이름이
          "분류전체내 서버바깥 도구…" 가 된다 - 라벨 안의 글자를 다 이어
          붙이기 때문이다. 이름을 직접 준다. */}
      <select
        aria-label="분류"
        value={current}
        onChange={(e) => choose(e.target.value)}
        className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
      >
        <option value="">전체</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
