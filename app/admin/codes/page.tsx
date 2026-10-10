import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OpenFromHash from "@/components/admin/OpenFromHash";
import Container from "@/components/Container";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  addCode,
  addGroup,
  deleteCode,
  deleteGroup,
  moveGroup,
  updateGroup,
  moveCode,
  updateCode,
  toggleCode,
} from "@/app/admin/codes/actions";
import { isAdmin } from "@/lib/security/auth";
import {
  countUsage,
  isCodeGroup,
  LINK_CATEGORY,
  countCodesByGroup,
  listCodeGroups,
  listCodes,
  nextCode,
  BOOK_CATEGORY,
  BOOK_KIND,
  SERIES,
  SKILL_CATEGORY,
  type CodeGroup,
} from "@/lib/codes";

export const metadata: Metadata = {
  title: "코드",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** 코드 칸은 좁게, 이름 칸이 남은 자리를 채운다 */
const box =
  "rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const codeField = `${box} w-28 shrink-0 font-mono tabular-nums`;
const labelField = `${box} min-w-0 flex-1 basis-24`;
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent";

/** 이 그룹을 어디서 고르는지. 이름 밑에 적는다 */
const USED_IN: Record<CodeGroup, string> = {
  [LINK_CATEGORY]: "내 서비스 › 서비스 관리에서 고릅니다.",
  [SKILL_CATEGORY]:
    "관리 › 소개의 기술에서 고르고, 소개 화면에 이 순서로 나옵니다.",
  [SERIES]: "블로그 글 쓰기에서 고릅니다. 연재 안의 편은 발행일 순입니다.",
  [BOOK_KIND]: "관리 › 글 › 책에서 고릅니다.",
  [BOOK_CATEGORY]: "관리 › 글 › 책에서 고르고, 읽는 책 화면에서 이 분류만 볼 수 있습니다.",
};

/** 줄 하나를 가리키는 것(그룹 번호 + 코드). 폼마다 넣는다 */
function Key({ group, code }: { group: string; code: string }) {
  return (
    <>
      <input type="hidden" name="group" value={group} />
      <input type="hidden" name="code" value={code} />
    </>
  );
}

/**
 * 그룹 머리줄: 그룹 코드 · 이름 · 순서 고치기, 지우기(MYH-183).
 * 프로그램이 쓰는 그룹은 코드 칸을 잠그고 지우기가 없다.
 */
function GroupHeader({
  group,
  name,
  first,
  last,
  inUse,
  codeCount,
}: {
  group: string;
  name: string;
  first: boolean;
  last: boolean;
  inUse: boolean;
  codeCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionForm
        action={updateGroup}
        submit="저장"
        className="flex min-w-0 flex-1 basis-80 flex-wrap items-center gap-2"
        buttonClassName={button}
      >
        <input type="hidden" name="group" value={group} />
        <input
          name="newGroup"
          defaultValue={group}
          aria-label={`${name} 그룹 코드`}
          readOnly={inUse}
          title={
            inUse
              ? "프로그램이 쓰는 그룹이라 바꿀 수 없습니다"
              : "영문 · 숫자 · _ · -"
          }
          required
          maxLength={20}
          pattern="[A-Za-z0-9_\-]+"
          className={`${codeField} ${inUse ? "text-muted" : ""}`}
        />
        <input
          name="name"
          defaultValue={name}
          aria-label="그룹 이름"
          required
          maxLength={40}
          className={`${labelField} font-semibold`}
        />
      </ActionForm>
      <div className="flex flex-wrap items-center gap-2">
        <form action={moveGroup}>
          <input type="hidden" name="group" value={group} />
          <input type="hidden" name="direction" value="up" />
          <button
            disabled={first}
            aria-label={`${name} 그룹 위로`}
            className={button}
          >
            ↑
          </button>
        </form>
        <form action={moveGroup}>
          <input type="hidden" name="group" value={group} />
          <input type="hidden" name="direction" value="down" />
          <button
            disabled={last}
            aria-label={`${name} 그룹 아래로`}
            className={button}
          >
            ↓
          </button>
        </form>
        {inUse ? (
          <span className="text-xs text-faint">프로그램이 씀</span>
        ) : codeCount > 0 ? (
          <span className="text-xs text-faint">코드가 남아 못 지움</span>
        ) : (
          <form action={deleteGroup}>
            <input type="hidden" name="group" value={group} />
            <DeleteButton
              aria-label={`${name} 그룹 삭제`}
              className={`${button} text-red-600 dark:text-red-400`}
              confirmMessage={`「${name}」 그룹을 지울까요?`}
            />
          </form>
        )}
      </div>
    </div>
  );
}

async function GroupSection({
  group,
  name,
  first,
  last,
  codeCount,
}: {
  group: string;
  name: string;
  first: boolean;
  last: boolean;
  codeCount: number;
}) {
  const inUse = isCodeGroup(group);
  const [rows, usage] = await Promise.all([
    listCodes(group, { all: true }),
    // 쓰는 화면이 없는 그룹은 셀 것이 없다
    inUse ? countUsage(group) : Promise.resolve(new Map<string, number>()),
  ]);

  return (
    <section
      id={`g${group}`}
      aria-label={name}
      className="mt-10 scroll-mt-20 border-t border-border pt-6"
    >
      <GroupHeader
        group={group}
        name={name}
        first={first}
        last={last}
        inUse={inUse}
        codeCount={codeCount}
      />
      <p className="mt-2 text-sm text-muted">
        {inUse
          ? USED_IN[group]
          : "쓰는 화면 없음 — 코드를 모아 둘 수만 있습니다. 고르는 칸에서 쓰려면 개발이 필요합니다."}
      </p>

      {/* 그룹이 늘어나도 한눈에 보이게 코드는 접어 둔다. 머리줄은 늘 보인다.
          「분류 고치기 →」 로 들어오면 OpenFromHash 가 그 그룹을 편다 */}
      <details data-codes className="group/codes mt-3">
        <summary className="cursor-pointer list-none text-sm text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition-transform group-open/codes:rotate-90">
            ▸
          </span>{" "}
          코드 {rows.length}개
        </summary>
        <ul className="mt-3 space-y-2">
          {rows.map((row, i) => {
            const used = usage.get(row.code) ?? 0;
            return (
              <li
                key={row.code}
                className={`flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 ${row.active ? "" : "bg-foreground/[0.03]"}`}
              >
                <ActionForm
                  action={updateCode}
                  submit="저장"
                  className="flex min-w-0 flex-1 basis-80 flex-wrap items-center gap-2"
                  buttonClassName={button}
                >
                  <Key group={group} code={row.code} />
                  <input
                    name="newCode"
                    defaultValue={row.code}
                    aria-label={`${row.label} 코드`}
                    required
                    maxLength={20}
                    pattern="[A-Za-z0-9_\-]+"
                    title="영문 · 숫자 · _ · -"
                    className={codeField}
                  />
                  <input
                    name="label"
                    defaultValue={row.label}
                    aria-label="이름"
                    required
                    maxLength={40}
                    className={labelField}
                  />
                  {row.active ? null : (
                    <span className="text-xs text-faint">쓰지 않음</span>
                  )}
                </ActionForm>

                {/* 단추마다 폼을 따로 둔다. 서버 액션을 formAction 으로 건 단추는
                  React 가 name 을 제 것으로 바꿔 버려 direction · active 가
                  가지 않는다. */}
                <div className="flex flex-wrap items-center gap-2">
                  <form action={moveCode}>
                    <Key group={group} code={row.code} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      disabled={i === 0}
                      aria-label={`${row.label} 위로`}
                      className={button}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveCode}>
                    <Key group={group} code={row.code} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      disabled={i === rows.length - 1}
                      aria-label={`${row.label} 아래로`}
                      className={button}
                    >
                      ↓
                    </button>
                  </form>
                  <form action={toggleCode}>
                    <Key group={group} code={row.code} />
                    <input
                      type="hidden"
                      name="active"
                      value={row.active ? "0" : "1"}
                    />
                    <button className={button}>
                      {row.active ? "쓰지 않기" : "다시 쓰기"}
                    </button>
                  </form>
                  {used > 0 ? (
                    <span className="text-xs text-faint tabular-nums">
                      {used}곳에서 씀
                    </span>
                  ) : (
                    <form action={deleteCode}>
                      <Key group={group} code={row.code} />
                      <DeleteButton
                        aria-label={`${row.label} 삭제`}
                        className={`${button} text-red-600 dark:text-red-400`}
                        confirmMessage={`「${row.label}」 을 지울까요?`}
                      />
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">아직 없습니다.</p>
        ) : null}

        <ActionForm
          action={addCode}
          submit="추가"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
          buttonClassName={button}
        >
          <input type="hidden" name="group" value={group} />
          <input
            name="newCode"
            aria-label={`새 ${name} 코드`}
            placeholder={nextCode(rows.map((r) => r.code))}
            maxLength={20}
            pattern="[A-Za-z0-9_\-]+"
            title="비우면 다음 번호가 붙습니다. 영문 · 숫자 · _ · -"
            className={codeField}
          />
          <input
            name="label"
            aria-label={`새 ${name}`}
            placeholder="새 이름"
            required
            maxLength={40}
            className={labelField}
          />
        </ActionForm>
      </details>
    </section>
  );
}

/**
 * 코드 테이블(MYH-131). 관리 › 설정 › 코드.
 *
 * 고르는 칸에 나오는 것들을 한곳에서 고친다. 이름을 바꾸면 쓰는 곳이 모두
 * 따라 바뀐다. 쓰는 곳이 있는 코드는 지울 수 없고, 대신 「쓰지 않기」 로
 * 고르는 칸에서만 뺀다.
 *
 * 코드는 비워 두고 더하면 다음 번호(00001 …)가 붙고, 글자로 적어도 된다.
 * 나중에 바꿔도 쓰는 줄은 DB 가 따라 고친다.
 */
export default async function AdminCodesPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [groups, codeCounts] = await Promise.all([
    listCodeGroups(),
    countCodesByGroup(),
  ]);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight">코드</h1>
      <p className="mt-3 text-sm text-muted">
        고르는 칸에 나오는 분류입니다. 이름이나 코드를 고치면 쓰는 곳이 모두
        따라 바뀝니다. 코드를 비워 두고 더하면 다음 번호가 붙습니다. 쓰고 있는
        것은 지울 수 없으니, 더 고르지 않으려면 「쓰지 않기」 를 누르세요.
      </p>

      <OpenFromHash selector="details[data-codes]" />

      {/* DB 의 그룹을 모두 그린다. 화면에서 더한 그룹도 있다(MYH-183) */}
      {groups.map((g, i) => (
        <GroupSection
          key={g.groupCode}
          group={g.groupCode}
          name={g.name}
          first={i === 0}
          last={i === groups.length - 1}
          codeCount={codeCounts.get(g.groupCode) ?? 0}
        />
      ))}

      <section
        aria-label="그룹 추가"
        className="mt-10 border-t border-border pt-6"
      >
        <h2 className="text-lg font-semibold">그룹 추가</h2>
        <p className="mt-1 text-sm text-muted">
          코드를 비워 두면 다음 번호가 붙습니다. 새 그룹은 코드를 모아 둘 수만
          있고, 고르는 칸에서 쓰려면 개발이 필요합니다.
        </p>
        <ActionForm
          action={addGroup}
          submit="추가"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
          buttonClassName={button}
        >
          <input
            name="newGroup"
            aria-label="새 그룹 코드"
            placeholder={nextCode(groups.map((g) => g.groupCode))}
            maxLength={20}
            pattern="[A-Za-z0-9_\-]+"
            title="비우면 다음 번호가 붙습니다. 영문 · 숫자 · _ · -"
            className={codeField}
          />
          <input
            name="name"
            aria-label="새 그룹 이름"
            placeholder="그룹 이름"
            required
            maxLength={40}
            className={labelField}
          />
        </ActionForm>
      </section>
    </Container>
  );
}
