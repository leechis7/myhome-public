import Link from "next/link";
import {
  addMenu,
  deleteMenu,
  deleteMenuLiftingChildren,
  moveMenu,
  updateMenu,
} from "@/app/admin/menus/actions";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import type { Menu } from "@/lib/db";
import {
  audienceFromParent,
  descendantIds,
  MENU_PAGES,
  siblingsOf,
} from "@/lib/site/menu-edit";

/**
 * 메뉴를 고치는 화면의 두 쪽(MYH-124).
 *
 * 왼쪽은 트리, 오른쪽은 고른 줄 하나의 칸이다. 처음에는 줄마다 칸을 다
 * 펼쳐 놓았는데, 열여섯 줄이 되니 화면이 끝없이 길어져 트리 모양이 안
 * 보였다. 고르는 것은 링크(?id=번호)라 자바스크립트 없이도 된다.
 */

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const button =
  "rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5";
const danger = `${button} text-red-600 dark:text-red-400`;
const small =
  "rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-foreground/5 disabled:opacity-30";

type Placed = { row: Menu; depth: number };

/** 트리를 위에서 아래로 편다. 부모 고르는 칸에서 들여 보여 주려고 깊이를 함께 */
function flatten(rows: readonly Menu[]) {
  const out: Placed[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const row of siblingsOf(rows, parentId)) {
      out.push({ row, depth });
      walk(row.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

const isExternal = (href: string | null) => Boolean(href?.match(/^https?:/i));

/* ───────────────────────── 왼쪽: 트리 ───────────────────────── */

function Branch({
  rows,
  parentId,
  selected,
}: {
  rows: readonly Menu[];
  parentId: number | null;
  selected: number | null;
}) {
  const siblings = siblingsOf(rows, parentId);
  if (siblings.length === 0) return null;

  return (
    <ul
      className={
        parentId === null
          ? "space-y-0.5"
          : "ml-4 space-y-0.5 border-l border-border pl-2"
      }
    >
      {siblings.map((row) => {
        const current = row.id === selected;
        const adminParent = audienceFromParent(rows, row);
        const hasChildren = rows.some((r) => r.parentId === row.id);
        // 고른 줄이 이 그룹 안에 있으면(자기 자신 포함) 펼쳐 둔다
        const open =
          selected !== null &&
          (current || descendantIds(rows, row.id).has(selected));

        return (
          <li key={row.id} className="relative">
            <Link
              href={`/admin/menus?id=${row.id}`}
              aria-current={current ? "true" : undefined}
              className={`flex items-baseline gap-2 rounded-md py-1.5 pl-7 pr-2 text-sm transition-colors ${
                current
                  ? "bg-foreground/[0.07] font-medium"
                  : "hover:bg-foreground/5"
              }`}
            >
              <span>{row.label}</span>
              {row.href === null ? (
                <span className="text-xs text-faint">그룹</span>
              ) : null}
              {/* 부모를 따라 관리자만인 줄에는 붙이지 않는다. 그룹에 한 번이면 된다 */}
              {row.audience === "admin" && !adminParent ? (
                <span className="text-xs text-faint">관리자만</span>
              ) : null}
            </Link>
            {hasChildren ? (
              // 기본은 접어 둔다. 첫 단만 보여야 한눈에 들어온다. 펼치는
              // 단추는 줄 이름 왼쪽에 겹쳐 둔다 — 이름을 누르면 고르고,
              // 삼각형을 누르면 펼친다.
              //
              // 삼각형은 제 바로 위 <details> 가 열렸을 때만 돈다. 전에는
              // group-open 이었는데, 그건 어느 조상이든 열려 있으면 걸려
              // 바깥 그룹을 펴면 접힌 안쪽 그룹 삼각형까지 돌았다(MYH-185).
              <details open={open}>
                <summary
                  aria-label={`${row.label} 아래 줄`}
                  className="absolute left-1 top-1.5 grid size-5 cursor-pointer list-none place-items-center rounded text-muted hover:bg-foreground/5 [&::-webkit-details-marker]:hidden"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="size-3.5 transition-transform [details[open]>summary>&]:rotate-90"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </summary>
                <Branch rows={rows} parentId={row.id} selected={selected} />
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** 왼쪽 트리 */
export function MenuTree({
  rows,
  selected,
}: {
  rows: readonly Menu[];
  selected: number | null;
}) {
  return (
    <nav aria-label="메뉴 트리">
      <Branch rows={rows} parentId={null} selected={selected} />
      <Link
        href="/admin/menus?add=1"
        className="mt-1 block rounded-md px-2 py-1.5 text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        ＋ 첫 단에 줄 더하기
      </Link>
    </nav>
  );
}

/* ───────────────────────── 오른쪽: 고치는 칸 ───────────────────────── */

/** 이름을 위에 적은 칸 하나. 줄이 하나뿐이라 이름을 눈에 보이게 둔다 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * 갈 곳. 있는 화면 목록에서 고르고, 바깥 주소는 아래 칸에 적는다 — 적으면
 * 그것이 이긴다. 둘 다 비우면 순수한 그룹이다.
 */
function HrefPicker({ value }: { value: string | null }) {
  const internal = value && !isExternal(value) ? value : "";
  // 목록에 없는 값이 적혀 있을 수 있다(psql 로 넣은 것). 빠뜨리지 않는다.
  const unknown =
    internal && !MENU_PAGES.some((p) => p.href === internal) ? internal : null;

  return (
    <>
      <Field label="갈 곳">
        <select name="page" defaultValue={internal} className={field}>
          <option value="">그룹 (갈 곳 없음)</option>
          {unknown ? <option value={unknown}>{unknown}</option> : null}
          {MENU_PAGES.map((p) => (
            <option key={p.href} value={p.href}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="바깥 주소" hint="적으면 위에서 고른 것 대신 이리로 갑니다">
        <input
          name="external"
          defaultValue={isExternal(value) ? value! : ""}
          placeholder="예: books.example.com"
          className={field}
        />
      </Field>
    </>
  );
}

/** 부모. 자기 자신과 제 아래 줄은 고를 수 없다 — 고리가 된다 */
function ParentPicker({
  placed,
  row,
  value,
}: {
  placed: readonly Placed[];
  row: Menu | null;
  value: number | null;
}) {
  const blocked = row
    ? new Set([row.id, ...descendantIds(placed.map((p) => p.row), row.id)])
    : new Set<number>();

  return (
    <Field label="부모">
      <select name="parentId" defaultValue={value ?? ""} className={field}>
        <option value="">첫 단</option>
        {placed
          .filter((p) => !blocked.has(p.row.id))
          .map((p) => (
            <option key={p.row.id} value={p.row.id}>
              {`${"· ".repeat(p.depth)}${p.row.label} 아래`}
            </option>
          ))}
      </select>
    </Field>
  );
}

function AudiencePicker({
  value,
  locked,
}: {
  value: string;
  /** 부모 때문에 관리자만으로 묶였는가 */
  locked: boolean;
}) {
  if (locked) {
    return (
      <div>
        <p className="mb-1 text-xs text-muted">누가 보나</p>
        <input type="hidden" name="audience" value="admin" />
        <p className="py-2 text-sm">관리자만 · 부모를 따라갑니다</p>
      </div>
    );
  }
  return (
    <Field
      label="누가 보나"
      hint="관리 화면으로 가는 줄은 저장하면 관리자만이 됩니다"
    >
      <select name="audience" defaultValue={value} className={field}>
        <option value="all">모두</option>
        <option value="admin">관리자만</option>
      </select>
    </Field>
  );
}

/** 고른 줄 하나를 고친다 */
export function MenuPanel({
  rows,
  row,
}: {
  rows: readonly Menu[];
  row: Menu;
}) {
  const placed = flatten(rows);
  const siblings = siblingsOf(rows, row.parentId);
  const first = siblings[0]?.id === row.id;
  const last = siblings.at(-1)?.id === row.id;
  const hasChildren = rows.some((r) => r.parentId === row.id);

  return (
    <section
      aria-labelledby="menu-panel"
      className="rounded-xl border border-border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="menu-panel" className="text-lg font-semibold">
          {row.label}
        </h2>
        <form action={moveMenu} className="flex items-center gap-1">
          <input type="hidden" name="id" value={row.id} />
          <span className="mr-1 text-xs text-muted">형제 사이 순서</span>
          <button
            type="submit"
            name="direction"
            value="up"
            disabled={first}
            aria-label="위로"
            className={small}
          >
            ↑
          </button>
          <button
            type="submit"
            name="direction"
            value="down"
            disabled={last}
            aria-label="아래로"
            className={small}
          >
            ↓
          </button>
        </form>
      </div>

      {/* 줄을 바꾸면 칸을 새로 그린다. 그러지 않으면 앞 줄에 적던 값이 남는다 */}
      <ActionForm
        key={row.id}
        action={updateMenu}
        submit="수정"
        className="mt-5 space-y-4"
        buttonClassName={button}
        extra={
          hasChildren ? (
            <>
              <DeleteButton
                formAction={deleteMenuLiftingChildren}
                className={danger}
                confirmMessage={`"${row.label}" 를 지우고, 아래 줄들은 한 단 위로 올릴까요?`}
              >
                지우고 아래는 올리기
              </DeleteButton>
              <DeleteButton
                formAction={deleteMenu}
                className={danger}
                confirmMessage={`"${row.label}" 와 그 아래 줄을 모두 지울까요?`}
              >
                아래까지 지우기
              </DeleteButton>
            </>
          ) : (
            <DeleteButton
              formAction={deleteMenu}
              className={danger}
              confirmMessage={`"${row.label}" 를 지울까요?`}
            />
          )
        }
      >
        <input type="hidden" name="id" value={row.id} />
        <Field label="이름">
          <input name="label" defaultValue={row.label} className={field} />
        </Field>
        <HrefPicker value={row.href} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ParentPicker placed={placed} row={row} value={row.parentId} />
          <AudiencePicker
            value={row.audience}
            locked={audienceFromParent(rows, row)}
          />
        </div>
      </ActionForm>

      <Link
        href={`/admin/menus?add=1&parent=${row.id}`}
        className="mt-5 inline-block text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        ＋ 이 줄 아래에 더하기
      </Link>
    </section>
  );
}

/** 새 줄. 더하면 그 줄이 열린다(addMenu 가 ?id= 로 보낸다) */
export function MenuAddForm({
  rows,
  parentId,
}: {
  rows: readonly Menu[];
  parentId: number | null;
}) {
  const placed = flatten(rows);
  const parent = rows.find((r) => r.id === parentId);

  return (
    <section
      aria-labelledby="menu-add"
      className="rounded-xl border border-dashed border-border p-5"
    >
      <h2 id="menu-add" className="text-lg font-semibold">
        줄 더하기
      </h2>
      <ActionForm
        key={parentId ?? "root"}
        action={addMenu}
        submit="추가"
        className="mt-5 space-y-4"
        buttonClassName={button}
      >
        <Field label="이름">
          <input name="label" className={field} />
        </Field>
        <HrefPicker value={null} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ParentPicker
            placed={placed}
            row={null}
            value={parent?.id ?? null}
          />
          <AudiencePicker value="all" locked={false} />
        </div>
      </ActionForm>
    </section>
  );
}
