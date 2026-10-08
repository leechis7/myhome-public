"use client";

import { addSkill, deleteSkill } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import CodePicker from "@/components/admin/CodePicker";
import { codesHref, SKILL_CATEGORY } from "@/lib/code-groups";
import type { Code } from "@/lib/db";
import type { SkillRow } from "@/lib/skills";

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
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-2.5"
          >
            <span className="text-sm">
              {row.name}
              {row.category ? (
                <span className="ml-2 text-muted">{row.category}</span>
              ) : null}
              <span className="ml-2 text-xs text-faint tabular-nums">
                {row.sortOrder}
              </span>
            </span>
            <form action={deleteSkill}>
              <input type="hidden" name="id" value={row.id} />
              <DeleteButton
                className="text-sm text-red-600 transition-opacity hover:opacity-70 dark:text-red-400"
                confirmMessage={`기술 "${row.name}" 을 지울까요?`}
              />
            </form>
          </li>
        ))}
      </ul>

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
