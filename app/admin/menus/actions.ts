"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb, menus, type Menu } from "@/lib/db";
import { requireAdmin } from "@/lib/security/auth";
import { defaultRows, invalidateMenus } from "@/lib/site/menus";
import {
  audienceFixes,
  liftedOrder,
  movedOrder,
  numbered,
  resolveHref,
  siblingsOf,
  wouldCycle,
} from "@/lib/site/menu-edit";
import type { ActionState } from "@/app/admin/actions";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * 고친 것을 마무리한다. 모든 쓰기는 이것을 거친다.
 *
 * 보는 사람을 맞춘다 — 관리자만인 부모 아래 줄, 관리 화면으로 가는 줄은
 * 관리자만으로 적는다(lib/site/menu-edit.ts 의 audienceFixes). 어느 액션에서
 * 고쳤든 여기서 한 번에 맞추니 빠뜨릴 데가 없다.
 */
async function settle(tx: Tx) {
  const fixes = audienceFixes(await tx.select().from(menus));
  if (fixes.length) {
    await tx
      .update(menus)
      .set({ audience: "admin" })
      .where(inArray(menus.id, fixes));
  }
}

/** 한 단의 순서를 10, 20, 30 … 으로 다시 매긴다 */
async function renumber(tx: Tx, ids: readonly number[]) {
  for (const { id, sortOrder } of numbered(ids)) {
    await tx.update(menus).set({ sortOrder }).where(eq(menus.id, id));
  }
}

/** 메뉴는 모든 화면에 붙는다. 캐시를 비우면 다음 화면부터 새 메뉴가 보인다 */
function refresh() {
  invalidateMenus();
  revalidatePath("/admin/menus");
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parentOf(formData: FormData) {
  const raw = text(formData, "parentId");
  return raw ? Number(raw) : null;
}

/** 이름·갈 곳·부모·보는 사람을 읽고 맞는지 본다. 더하기와 고치기가 같이 쓴다 */
function readFields(
  formData: FormData,
  rows: readonly Menu[],
  current: Menu | null,
) {
  const label = text(formData, "label");
  if (!label) return { error: "이름은 비울 수 없습니다." } as const;

  const href = resolveHref(
    text(formData, "page"),
    text(formData, "external"),
    current?.href ?? null,
  );
  if ("error" in href) return href;

  const parentId = parentOf(formData);
  if (parentId !== null) {
    const parent = rows.find((r) => r.id === parentId);
    if (!parent) {
      return { error: "부모를 찾을 수 없습니다." } as const;
    }
    if (current && wouldCycle(rows, current.id, parentId)) {
      return { error: "자기 자신이나 제 아래 줄 밑으로는 옮길 수 없습니다." } as const;
    }
  }

  const audience = text(formData, "audience") === "admin" ? "admin" : "all";
  return { values: { label, href: href.href, parentId, audience } } as const;
}

export async function addMenu(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const result = await getDb().transaction(async (tx) => {
    const rows = await tx.select().from(menus);
    const read = readFields(formData, rows, null);
    if ("error" in read) return { error: read.error };

    // 형제들 맨 뒤에 붙인다
    const last = siblingsOf(rows, read.values.parentId).at(-1);
    const [added] = await tx
      .insert(menus)
      .values({ ...read.values, sortOrder: (last?.sortOrder ?? 0) + 10 })
      .returning({ id: menus.id });
    await settle(tx);
    return { id: added.id };
  });

  if ("error" in result) return result;
  refresh();
  // 더한 줄을 곧바로 고를 수 있게 그 줄을 연다
  redirect(`/admin/menus?id=${result.id}`);
}

export async function updateMenu(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "고칠 줄을 모릅니다." };

  const result = await getDb().transaction(async (tx) => {
    const rows = await tx.select().from(menus);
    const row = rows.find((r) => r.id === id);
    if (!row) return { error: "이미 지워진 줄입니다." };

    const read = readFields(formData, rows, row);
    if ("error" in read) return { error: read.error };

    const moving = read.values.parentId !== row.parentId;
    const last = siblingsOf(rows, read.values.parentId).at(-1);
    await tx
      .update(menus)
      .set({
        ...read.values,
        // 단을 옮기면 새 단의 맨 뒤로 간다
        ...(moving ? { sortOrder: (last?.sortOrder ?? 0) + 10 } : {}),
      })
      .where(eq(menus.id, id));
    if (moving) {
      await renumber(
        tx,
        siblingsOf(rows, row.parentId)
          .filter((r) => r.id !== id)
          .map((r) => r.id),
      );
    }
    await settle(tx);
    return { ok: "수정했습니다." };
  });

  refresh();
  return result;
}

/**
 * 지운다. 자식이 딸려 있으면 같이 지운다 (외래 키의 cascade 가 한다).
 *
 * 자식을 살리는 쪽(deleteMenuLiftingChildren)은 액션을 따로 둔다. 단추의
 * name/value 로 가르면 안 된다 — 단추에 formAction 을 달면 React 가 그
 * 단추의 name/value 를 폼 자료에 넣지 않는다. 가르는 값이 빠진 채 오니
 * "올리기" 를 눌러도 자식까지 지워졌다.
 */
export async function deleteMenu(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().transaction(async (tx) => {
    await tx.delete(menus).where(eq(menus.id, id));
    await settle(tx);
  });

  refresh();
  // 고르고 있던 줄이 사라졌다. 주소에 남은 번호를 뗀다
  redirect("/admin/menus");
}

/** 지우되, 자식은 한 단 위로 올려 지운 줄의 자리에 세운다 */
export async function deleteMenuLiftingChildren(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await getDb().transaction(async (tx) => {
    const rows = await tx.select().from(menus);
    const row = rows.find((r) => r.id === id);
    if (!row) return;

    const order = liftedOrder(rows, id) ?? [];
    await tx
      .update(menus)
      .set({ parentId: row.parentId })
      .where(eq(menus.parentId, id));
    await tx.delete(menus).where(eq(menus.id, id));
    await renumber(tx, order);
    await settle(tx);
  });

  refresh();
  redirect("/admin/menus");
}

/** 형제 사이에서 한 칸 위나 아래로. 끌어 옮기기는 자바스크립트가 있어야 해서 단추로 한다 */
export async function moveMenu(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (!Number.isInteger(id)) return;

  await getDb().transaction(async (tx) => {
    const order = movedOrder(await tx.select().from(menus), id, direction);
    if (order) await renumber(tx, order);
  });

  refresh();
}

/**
 * 처음 상태로. 이리저리 옮기다 엉켰을 때 코드에 있는 구성(DEFAULT_MENUS)으로
 * 되돌린다. 번호까지 0029 가 넣은 것과 같게 넣는다.
 */
export async function resetMenus() {
  await requireAdmin();

  await getDb().transaction(async (tx) => {
    await tx.delete(menus);
    await tx.insert(menus).values(defaultRows());
    // 번호를 손으로 넣었으니 다음 번호를 그 뒤로 맞춘다
    await tx.execute(
      sql`select setval(pg_get_serial_sequence('menus', 'id'), (select max(id) from menus))`,
    );
  });

  refresh();
  // 고르고 있던 번호가 이제 다른 줄이거나 없는 줄이다
  redirect("/admin/menus");
}
