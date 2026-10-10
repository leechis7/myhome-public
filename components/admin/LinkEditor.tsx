import { addLink, deleteLink, updateLink } from "@/app/admin/links/actions";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import LinkStatusDot from "@/components/admin/LinkStatusDot";
import CodePicker from "@/components/admin/CodePicker";
import { codesHref, LINK_CATEGORY } from "@/lib/codes/groups";
import { hostOf, type LinkRow, type LinkStatus } from "@/lib/my-space/links";
import type { Code } from "@/lib/db";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5";

export default function LinkEditor({
  rows,
  status,
  codes,
  categoryCode,
}: {
  rows: LinkRow[];
  status: Map<number, LinkStatus>;
  /** 내 서비스 분류 코드 전부. 목록을 좁혀 봐도 고를 것은 그대로여야 한다 */
  codes: Code[];
  /** 지금 보고 있는 분류. 추가할 때 그 분류로 미리 채운다 */
  categoryCode?: string;
}) {
  return (
    <div className="mt-6 space-y-4">
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-border p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {row.name}
                <span className="ml-2 font-normal text-faint">
                  {hostOf(row.url)}
                </span>
              </a>
              {row.category ? (
                <span className="text-xs text-muted">{row.category}</span>
              ) : null}
              <LinkStatusDot state={status.get(row.id)} />
            </div>

            {/* 칸은 여기서 그대로 그린다. ActionForm 은 클라이언트지만
                children 으로 넘기므로 이 화면은 서버에 남는다. */}
            <ActionForm
              action={updateLink}
              submit="수정"
              className="space-y-3"
              buttonClassName={button}
              extra={
                <DeleteButton
                  formAction={deleteLink}
                  className={`${button} text-red-600 dark:text-red-400`}
                  confirmMessage={`"${row.name}" 링크를 지울까요?`}
                />
              }
            >
              <input type="hidden" name="id" value={row.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="name"
                  defaultValue={row.name}
                  aria-label="이름"
                  className={field}
                />
                <input
                  name="url"
                  defaultValue={row.url}
                  aria-label="주소"
                  className={field}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_14rem_8rem]">
                <input
                  name="note"
                  defaultValue={row.note ?? ""}
                  aria-label="설명"
                  placeholder="무엇에 쓰는 것인지"
                  className={field}
                />
                <CodePicker
                  codes={codes}
                  value={row.categoryCode}
                  className={field}
                />
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={row.sortOrder}
                  aria-label="정렬 순서"
                  className={field}
                />
              </div>
            </ActionForm>
          </li>
        ))}
      </ul>

      <ActionForm
        action={addLink}
        submit="추가"
        className="rounded-xl border border-dashed border-border p-4 space-y-3"
        buttonClassName={button}
      >
        <p className="text-sm font-medium text-muted">서비스 추가</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            aria-label="이름"
            placeholder="이름"
            className={field}
          />
          <input
            name="url"
            aria-label="주소"
            placeholder="예: books.example.com"
            className={field}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem_8rem]">
          <input
            name="note"
            aria-label="설명"
            placeholder="무엇에 쓰는 것인지"
            className={field}
          />
          <CodePicker
            codes={codes}
            value={categoryCode}
            editHref={codesHref(LINK_CATEGORY)}
            className={field}
          />
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            aria-label="정렬 순서"
            className={field}
          />
        </div>
      </ActionForm>
    </div>
  );
}
