"use client";

import { addSkill, deleteSkill } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import CodePicker from "@/components/admin/CodePicker";
import { codesHref, SKILL_CATEGORY } from "@/lib/code-groups";
import type { Code } from "@/lib/db";
import type { SkillRow } from "@/lib/skills";
import { groupByCategory } from "@/lib/category";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

export default function SkillEditor({
  rows,
  codes,
}: {
  rows: SkillRow[];
  /** 기술 분류 코드 전부(꺼 둔 것까지) */
  codes: Code[];
}) {
  return (
    <>
      {/* 분류마다 한 줄에 칩으로 늘어놓는다 - 한 기술에 한 줄은 자리만 먹었다 */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">아직 적은 기술이 없습니다.</p>
      ) : (
        <dl className="space-y-3">
          {groupByCategory(rows).map(([category, list]) => (
            <div key={category || "-"} className="sm:flex sm:gap-4">
              <dt className="mb-1.5 shrink-0 pt-1 text-sm text-muted sm:mb-0 sm:w-28">
                {category || "분류 없음"}
              </dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {list.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-1.5 rounded-md border border-border py-1 pr-1.5 pl-2.5 text-sm"
                    >
                      {row.name}
                      <span className="text-[11px] text-faint tabular-nums" title="정렬 순서">
                        {row.sortOrder}
                      </span>
                      <form action={deleteSkill} className="contents">
                        <input type="hidden" name="id" value={row.id} />
                        <DeleteButton
                          aria-label={`${row.name} 삭제`}
                          className="text-faint transition-colors hover:text-red-600 dark:hover:text-red-400"
                          confirmMessage={`기술 "${row.name}" 을 지울까요?`}
                        >
                          ×
                        </DeleteButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <form
        action={addSkill}
        className="mt-4 rounded-xl border border-dashed border-border p-4"
      >
        <p className="mb-3 text-sm font-medium text-foreground/70">기술 추가</p>
        <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-start">
          <input
            name="name"
            placeholder="이름"
            aria-label="이름"
            required
            className={field}
          />
          <CodePicker
            codes={codes}
            editHref={codesHref(SKILL_CATEGORY)}
            className={field}
          />
          <input
            name="sortOrder"
            type="number"
            placeholder="순서"
            aria-label="정렬 순서"
            defaultValue={(rows.length + 1) * 10}
            className={field}
          />
          <button type="submit" className={button}>
            추가
          </button>
        </div>
      </form>
    </>
  );
}
