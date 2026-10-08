"use client";

import { addCareer, deleteCareer, updateCareer } from "@/app/admin/actions";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import type { Career } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

export default function CareerEditor({ rows }: { rows: Career[] }) {
  return (
    <>
      <ul className="space-y-4">
        {rows.map((row) => (
          <Row key={row.id} row={row} />
        ))}
      </ul>

      <AddForm />
    </>
  );
}

/** 목록의 한 줄 */
function Row({ row }: { row: Career }) {
  return (
    <li className="rounded-xl border border-border p-4">
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
