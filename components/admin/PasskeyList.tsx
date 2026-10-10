import {
  deletePasskeyAction,
  renamePasskeyAction,
} from "@/app/admin/security/passkey-actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { formatDateTime } from "@/lib/format";
import { MAX_PASSKEY_LABEL } from "@/lib/security/passkey-limits";
import type { StoredPasskey } from "@/lib/security/passkeys";

/**
 * 등록한 기기 목록. 이름을 고치고 지운다.
 *
 * 폼으로만 움직이므로 서버에서 그린다. 자바스크립트가 없어도 잃어버린
 * 기기를 떼어 낼 수 있어야 한다 — 급할 때 쓰는 단추다.
 */
export default function PasskeyList({ rows }: { rows: StoredPasskey[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">아직 등록한 기기가 없습니다.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <form
              action={renamePasskeyAction}
              className="flex flex-1 items-center gap-2"
            >
              <input type="hidden" name="id" value={row.id} />
              <input
                name="label"
                defaultValue={row.label}
                aria-label={`${row.label} 이름`}
                required
                maxLength={MAX_PASSKEY_LABEL}
                className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
              >
                이름 바꾸기
              </button>
            </form>

            <form action={deletePasskeyAction}>
              <input type="hidden" name="id" value={row.id} />
              <DeleteButton
                className="px-2 text-sm text-red-600 transition-opacity hover:opacity-70 dark:text-red-400"
                confirmMessage={`'${row.label}' 을 지울까요? 이 기기로는 더 들어올 수 없습니다.`}
              />
            </form>
          </div>

          <p className="mt-2 text-xs text-muted">
            {formatDateTime(row.createdAt)}에 등록
            {row.lastUsedAt
              ? ` · ${formatDateTime(row.lastUsedAt)}에 마지막으로 씀`
              : " · 아직 쓴 적 없음"}
          </p>
        </li>
      ))}
    </ul>
  );
}
