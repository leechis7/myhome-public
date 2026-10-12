"use client";

import {
  addCareer,
  deleteCareer,
  updateCareer,
} from "@/app/admin/profile/actions";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import LazyDetails from "@/components/admin/LazyDetails";
import type { Career } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

export default function CareerEditor({ rows }: { rows: Career[] }) {
  return (
    <>
      <ul className="space-y-2">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>

      <AddForm />
    </>
  );
}

/** 2019-03-01 → 2019.03 */
function month(day: string | null) {
  return day ? day.slice(0, 7).replace("-", ".") : "";
}

/**
 * 목록의 한 줄. 회사 · 직무 · 기간만 보이게 접어 두고 펼쳐서 고친다(MYH-242)
 */
function Row({ row }: { row: Career }) {
  return (
    <li className="rounded-xl border border-border">
      <LazyDetails
        summaryClassName="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 [&::-webkit-details-marker]:hidden"
        summary={
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {row.company}{" "}
              <span className="font-normal text-muted">· {row.role}</span>
            </span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {month(row.startedOn)} ~{" "}
              {row.endedOn ? month(row.endedOn) : "재직 중"}
            </span>
          </>
        }
      >
        <div className="border-t border-border p-4">
          <ActionForm
            action={updateCareer}
            submit="수정"
            className="space-y-3"
            buttonClassName={button}
            extra={
              <DeleteButton
                formAction={deleteCareer}
                className={`${button} text-red-600 dark:text-red-400`}
                confirmMessage={`"${row.company}" 경력을 지울까요?`}
              />
            }
          >
            <input type="hidden" name="id" value={row.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="company"
                defaultValue={row.company}
                aria-label="회사"
                placeholder="회사"
                required
                className={field}
              />
              <input
                name="role"
                defaultValue={row.role}
                aria-label="직무"
                placeholder="직무"
                required
                className={field}
              />
              <input
                name="startedOn"
                type="date"
                defaultValue={row.startedOn}
                aria-label="시작일"
                required
                className={field}
              />
              <input
                name="endedOn"
                type="date"
                defaultValue={row.endedOn ?? ""}
                aria-label="종료일 (비우면 재직 중)"
                className={field}
              />
            </div>
            <input
              name="detail"
              defaultValue={row.detail ?? ""}
              aria-label="설명"
              placeholder="한 줄 설명"
              className={field}
            />
          </ActionForm>
        </div>
      </LazyDetails>
    </li>
  );
}

function AddForm() {
  return (
    <ActionForm
      action={addCareer}
      submit="추가"
      className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-4"
      buttonClassName={button}
    >
      <p className="text-sm font-medium text-foreground/70">경력 추가</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="company"
          placeholder="회사"
          aria-label="회사"
          required
          className={field}
        />
        <input
          name="role"
          placeholder="직무"
          aria-label="직무"
          required
          className={field}
        />
        <input
          name="startedOn"
          type="date"
          aria-label="시작일"
          required
          className={field}
        />
        <input
          name="endedOn"
          type="date"
          aria-label="종료일 (비우면 재직 중)"
          className={field}
        />
      </div>
      <input
        name="detail"
        placeholder="한 줄 설명"
        aria-label="설명"
        className={field}
      />
    </ActionForm>
  );
}
