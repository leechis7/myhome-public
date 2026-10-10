"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { codeGroups, codes, getDb } from "@/lib/db";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/errors";
import { requireAdmin } from "@/lib/security/auth";
import { CODE_PATTERN, isCodeGroup, nextCode } from "@/lib/codes/groups";
import { groupExists } from "@/lib/codes";
import type { ActionState } from "@/app/admin/actions";

/**
 * 코드 테이블을 고친다(MYH-131). 관리 › 설정 › 코드.
 *
 * 줄은 (그룹 번호, 코드)로 가리킨다. 이름을 바꾸면 그 코드를 쓰는 곳이 모두
 * 따라 바뀐다 - 쓰는 쪽은 코드만 들고 있기 때문이다. 코드를 바꿔도 DB 가 쓰는
 * 줄을 따라 고친다(ON UPDATE CASCADE). 지우기는 아무도 쓰지 않을 때만 된다(외래 키가 막는다).
 */

const MAX_LABEL = 40;

function readLabel(formData: FormData) {
  return String(formData.get("label") ?? "")
    .trim()
    .slice(0, MAX_LABEL);
}

/**
 * 줄 하나를 가리키는 것: 그룹 번호 + 코드 번호. 그룹은 DB 에 있어야 한다 -
 * 화면에서 더한 그룹도 있어 프로그램이 아는 둘만 보면 안 된다(MYH-183)
 */
async function readKey(formData: FormData) {
  const group = String(formData.get("group") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  return code && (await groupExists(group)) ? { group, code } : null;
}

/** 적어 넣은 코드. 비었으면 null, 모양이 틀리면 "invalid" */
function readNewCode(formData: FormData) {
  const code = String(formData.get("newCode") ?? "").trim();
  if (!code) return null;
  return CODE_PATTERN.test(code) ? code : "invalid";
}

const BAD_CODE = "코드는 영문 · 숫자 · _ · - 로 20자까지 적을 수 있습니다.";

async function codeTaken(group: string, code: string) {
  const [row] = await getDb()
    .select({ code: codes.code })
    .from(codes)
    .where(and(eq(codes.groupCode, group), eq(codes.code, code)));
  return Boolean(row);
}

function keyOf({ group, code }: { group: string; code: string }) {
  return and(eq(codes.groupCode, group), eq(codes.code, code));
}

/** 분류는 소개 · 관리 첫 화면 · 내 서비스에 나온다 */
function refresh() {
  revalidatePath("/about");
  revalidatePath("/admin/profile");
  revalidatePath("/admin/links");
  revalidatePath("/admin/codes");
}

/**
 * 더한다. 코드를 비워 두면 그 그룹의 숫자 코드 가운데 가장 큰 것 다음 번호가
 * 붙는다. 둘이 한꺼번에 더해 번호가 겹치면 기본 키가 막으니 다시 매겨 본다.
 */
export async function addCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const group = String(formData.get("group") ?? "");
  const label = readLabel(formData);
  const typed = readNewCode(formData);
  if (!(await groupExists(group))) return { error: "없는 그룹입니다." };
  if (!label) return { error: "이름을 적어 주세요." };
  if (typed === "invalid") return { error: BAD_CODE };

  const db = getDb();
  const [same] = await db
    .select({ code: codes.code })
    .from(codes)
    .where(and(eq(codes.groupCode, group), eq(codes.label, label)));
  if (same) return { error: `「${label}」 은 이미 있습니다.` };
  if (typed && (await codeTaken(group, typed))) {
    return { error: `코드 ${typed} 는 이미 있습니다.` };
  }

  // 적어 넣은 코드는 한 번만 해 본다. 겹치면 위에서 걸렀거나 그 사이에 생긴 것이다
  for (let attempt = 0; attempt < (typed ? 1 : 3); attempt += 1) {
    const rows = await db
      .select({ code: codes.code, sortOrder: codes.sortOrder })
      .from(codes)
      .where(eq(codes.groupCode, group));
    const sortOrder = Math.max(0, ...rows.map((r) => r.sortOrder)) + 10;
    try {
      await db.insert(codes).values({
        groupCode: group,
        code: typed ?? nextCode(rows.map((r) => r.code)),
        label,
        sortOrder,
      });
      refresh();
      return { ok: "추가했습니다." };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return { error: "더하지 못했습니다. 이미 있는 코드이거나 이름입니다." };
}

/**
 * 이름과 코드를 고친다. 코드를 바꾸면 쓰는 줄도 DB 가 따라 바꾼다
 * (외래 키 ON UPDATE CASCADE). 같은 그룹에 같은 코드나 이름이 있으면 막는다.
 */
export async function updateCode(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const key = await readKey(formData);
  const label = readLabel(formData);
  const typed = readNewCode(formData);
  if (!key) return { error: "없는 코드입니다." };
  if (!label) return { error: "이름은 비울 수 없습니다." };
  if (!typed) return { error: "코드는 비울 수 없습니다." };
  if (typed === "invalid") return { error: BAD_CODE };
  if (typed !== key.code && (await codeTaken(key.group, typed))) {
    return { error: `코드 ${typed} 는 이미 있습니다.` };
  }

  try {
    await getDb().update(codes).set({ label, code: typed }).where(keyOf(key));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "같은 코드나 이름이 이미 있습니다." };
    }
    throw err;
  }
  refresh();
  return { ok: "고쳤습니다." };
}

/** 한 칸 위나 아래와 자리를 바꾼다. 그룹 안에서만 움직인다 */
export async function moveCode(formData: FormData) {
  await requireAdmin();
  const key = await readKey(formData);
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!key) return;

  await getDb().transaction(async (tx) => {
    const list = (
      await tx
        .select({ code: codes.code })
        .from(codes)
        .where(eq(codes.groupCode, key.group))
        .orderBy(asc(codes.sortOrder), asc(codes.code))
    ).map((r) => r.code);
    const at = list.indexOf(key.code);
    const to = direction === "up" ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to], list[at]];
    // 순서를 새로 매긴다. 같은 순서 값이 둘 있어도 바뀐 대로 선다
    for (const [i, code] of list.entries()) {
      await tx
        .update(codes)
        .set({ sortOrder: (i + 1) * 10 })
        .where(keyOf({ group: key.group, code }));
    }
  });
  refresh();
}

/**
 * 쓰지 않기 / 다시 쓰기. 끄면 고르는 칸에서 빠진다. 이미 쓰고 있는 줄은
 * 그대로 두고 화면에도 그대로 나온다 - 지우지 않고 새로 고르지만 못하게 한다.
 */
export async function toggleCode(formData: FormData) {
  await requireAdmin();
  const key = await readKey(formData);
  if (!key) return;
  await getDb()
    .update(codes)
    .set({ active: formData.get("active") === "1" })
    .where(keyOf(key));
  refresh();
}

/**
 * 지운다. 쓰는 곳이 있으면 화면에 단추가 없지만, 그 사이에 누가 골랐을 수
 * 있다. 그때는 외래 키가 막는다 - 오류 대신 목록으로 돌아가 개수를 보인다.
 */
export async function deleteCode(formData: FormData) {
  await requireAdmin();
  const key = await readKey(formData);
  if (!key) return;
  try {
    await getDb().delete(codes).where(keyOf(key));
  } catch (err) {
    if (!isForeignKeyViolation(err)) throw err;
  }
  refresh();
}

/*
 * 그룹(MYH-183). 그룹은 어느 화면의 고르는 칸이 써야 쓸모가 있지만, 쓸 곳을
 * 만들기 전에 그룹과 코드를 먼저 정해 둘 수 있게 한다.
 *
 * 프로그램이 쓰는 그룹(lib/codes/groups.ts)은 그룹 코드를 바꾸거나 지울 수
 * 없다 - 프로그램은 그 코드로 그룹을 찾는다.
 */

const MAX_GROUP_NAME = 40;
const GROUP_IN_USE =
  "프로그램이 쓰는 그룹이라 코드를 바꾸거나 지울 수 없습니다.";

function readGroupName(formData: FormData) {
  return String(formData.get("name") ?? "")
    .trim()
    .slice(0, MAX_GROUP_NAME);
}

/** 적어 넣은 그룹 코드. 비었으면 null, 모양이 틀리면 "invalid" */
function readNewGroup(formData: FormData) {
  const code = String(formData.get("newGroup") ?? "").trim();
  if (!code) return null;
  return CODE_PATTERN.test(code) ? code : "invalid";
}

/** 같은 이름이나 코드의 그룹이 이미 있나. 자기 자신은 뺀다 */
async function groupClash(name: string, code: string | null, self?: string) {
  const rows = await getDb()
    .select({ groupCode: codeGroups.groupCode, name: codeGroups.name })
    .from(codeGroups);
  const others = rows.filter((r) => r.groupCode !== self);
  if (others.some((r) => r.name === name))
    return `「${name}」 그룹이 이미 있습니다.`;
  if (code && others.some((r) => r.groupCode === code)) {
    return `그룹 코드 ${code} 는 이미 있습니다.`;
  }
  return null;
}

/** 그룹을 더한다. 코드를 비우면 숫자 코드 가운데 가장 큰 것 다음 번호 */
export async function addGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const name = readGroupName(formData);
  const typed = readNewGroup(formData);
  if (!name) return { error: "그룹 이름을 적어 주세요." };
  if (typed === "invalid") return { error: BAD_CODE };
  const clash = await groupClash(name, typed);
  if (clash) return { error: clash };

  const db = getDb();
  const rows = await db
    .select({
      groupCode: codeGroups.groupCode,
      sortOrder: codeGroups.sortOrder,
    })
    .from(codeGroups);
  try {
    await db.insert(codeGroups).values({
      groupCode: typed ?? nextCode(rows.map((r) => r.groupCode)),
      name,
      sortOrder: Math.max(0, ...rows.map((r) => r.sortOrder)) + 10,
    });
  } catch (err) {
    if (isUniqueViolation(err))
      return { error: "같은 코드의 그룹이 이미 있습니다." };
    throw err;
  }
  refresh();
  return { ok: "그룹을 더했습니다." };
}

/**
 * 그룹 이름과 코드를 고친다. 코드를 바꾸면 그 안의 코드들이 따라간다
 * (codes.group_code 외래 키 ON UPDATE CASCADE, 마이그레이션 0033).
 */
export async function updateGroup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const group = String(formData.get("group") ?? "");
  const name = readGroupName(formData);
  const typed = readNewGroup(formData);
  if (!(await groupExists(group))) return { error: "없는 그룹입니다." };
  if (!name) return { error: "그룹 이름은 비울 수 없습니다." };
  if (typed === "invalid") return { error: BAD_CODE };
  const next = typed ?? group;
  if (next !== group && isCodeGroup(group)) return { error: GROUP_IN_USE };
  const clash = await groupClash(name, next, group);
  if (clash) return { error: clash };

  await getDb()
    .update(codeGroups)
    .set({ name, groupCode: next })
    .where(eq(codeGroups.groupCode, group));
  refresh();
  return { ok: "고쳤습니다." };
}

/** 그룹 순서를 한 칸 옮긴다 */
export async function moveGroup(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";

  await getDb().transaction(async (tx) => {
    const list = (
      await tx
        .select({ groupCode: codeGroups.groupCode })
        .from(codeGroups)
        .orderBy(asc(codeGroups.sortOrder), asc(codeGroups.groupCode))
    ).map((r) => r.groupCode);
    const at = list.indexOf(group);
    const to = direction === "up" ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to], list[at]];
    for (const [i, code] of list.entries()) {
      await tx
        .update(codeGroups)
        .set({ sortOrder: (i + 1) * 10 })
        .where(eq(codeGroups.groupCode, code));
    }
  });
  refresh();
}

/**
 * 그룹을 지운다. 프로그램이 쓰는 그룹은 안 되고, 코드가 남아 있으면 외래 키가
 * 막는다(화면에는 그때 단추가 없지만 그 사이에 누가 더했을 수 있다).
 */
export async function deleteGroup(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "");
  if (!group || isCodeGroup(group)) return;
  try {
    await getDb().delete(codeGroups).where(eq(codeGroups.groupCode, group));
  } catch (err) {
    if (!isForeignKeyViolation(err)) throw err;
  }
  refresh();
}
