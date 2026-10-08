import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  MenuAddForm,
  MenuPanel,
  MenuTree,
} from "@/components/admin/MenuEditor";
import { resetMenus } from "@/app/admin/menus/actions";
import { isAdmin } from "@/lib/auth";
import { listMenus } from "@/lib/menus";

export const metadata: Metadata = {
  title: "메뉴 관리",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * 메뉴를 고치는 화면(MYH-124).
 *
 * 왼쪽 트리에서 줄을 고르면(?id=번호) 오른쪽에 그 줄의 칸이 열린다.
 * 줄 더하기는 ?add=1, 어느 줄 아래에 더할지는 &parent=번호.
 *
 * 관리 메뉴에서 "메뉴" 줄을 지워도 이 주소로는 늘 들어온다. 지우는 것을
 * 막기보다 빠져나갈 길을 남긴다 — 막으면 막는 규칙이 또 하나 생기고, 그
 * 규칙도 언젠가 엉킨다.
 */
export default async function AdminMenusPage({
  searchParams,
}: PageProps<"/admin/menus">) {
  if (!(await isAdmin())) redirect("/admin");

  const params = await searchParams;
  const rows = await listMenus();
  const selected = rows.find((r) => String(r.id) === params.id) ?? null;
  const add = params.add === "1";
  const parentId = Number(params.parent) || null;

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">메뉴 관리</h1>
      <p className="mt-3 text-sm text-muted">
        고치면 다음 화면부터 바로 바뀝니다. 관리자만 보는 줄은 방문자가 받는
        화면에 아예 실리지 않습니다. 이 화면은 메뉴에서 지워도{" "}
        <code>/admin/menus</code> 로 들어올 수 있습니다.
      </p>

      <div className="mt-10 grid items-start gap-8 md:grid-cols-[15rem_1fr]">
        <MenuTree rows={rows} selected={selected?.id ?? null} />

        <div>
          {add ? (
            <MenuAddForm rows={rows} parentId={parentId} />
          ) : selected ? (
            <MenuPanel rows={rows} row={selected} />
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
              왼쪽 트리에서 고칠 줄을 누르세요.
            </p>
          )}

          <section className="mt-10 rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium">처음 상태로</h2>
            <p className="mt-1 text-sm text-muted">
              이리저리 옮기다 엉켰을 때 씁니다. 메뉴를 코드에 있는 기본
              구성으로 되돌립니다. 더한 줄은 사라집니다.
            </p>
            <form action={resetMenus} className="mt-3">
              <DeleteButton
                confirmMessage="메뉴를 처음 상태로 되돌릴까요? 더한 줄은 사라집니다."
                className="rounded-lg border border-border px-4 py-2 text-sm text-red-600 transition-colors hover:bg-foreground/5 dark:text-red-400"
              >
                처음 상태로 되돌리기
              </DeleteButton>
            </form>
          </section>
        </div>
      </div>
    </Container>
  );
}
