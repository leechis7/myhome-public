"use client";

import { useId } from "react";
import {
  addProject,
  deleteProject,
  updateProject,
} from "@/app/admin/projects/actions";
import ActionForm from "@/components/admin/ActionForm";
import DeleteButton from "@/components/admin/DeleteButton";
import type { Project } from "@/lib/db";
import type { ProjectKind } from "@/lib/projects";

const field =
  "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40";
const label = "block text-sm font-medium";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5";

/**
 * 제목이 붙은 칸 하나.
 *
 * 전에는 `placeholder` 만 있었다. 글자를 적어 넣는 순간 그것이 사라져서,
 * 지금 채우고 있는 것이 「사이트 주소」 인지 「저장소 주소」 인지 모르게
 * 됐다. 칸이 아홉이라 더 그랬다(MYH-163). 글 폼과 소개 폼이 이미 이 모양을
 * 쓰고 있다.
 *
 * `id` 는 밖에서 받는다 — 이 폼은 프로젝트 줄마다 한 벌씩, 거기에 추가 폼
 * 까지 여러 벌이 한 화면에 뜬다. 같은 `id` 가 겹치면 제목을 눌렀을 때
 * 엉뚱한 칸에 초점이 간다.
 */
function Field({
  id,
  name,
  label: 제목,
  children,
}: {
  id: string;
  name: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`${id}-${name}`} className={label}>
        {제목}
      </label>
      {children}
    </div>
  );
}

/** 추가 폼과 수정 폼이 같은 칸을 쓴다 */
function Fields({ project }: { project?: Project }) {
  // 한 화면에 여러 벌이 뜬다. 벌마다 다른 id 를 받는다.
  const id = useId();

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id} name="name" label="이름">
          <input
            id={`${id}-name`}
            name="name"
            defaultValue={project?.name}
            required
            className={field}
          />
        </Field>
        <Field id={id} name="stack" label="사용 기술">
          <input
            id={`${id}-stack`}
            name="stack"
            defaultValue={project?.stack.join(", ")}
            placeholder="쉼표로 구분"
            className={field}
          />
        </Field>
      </div>
      <Field id={id} name="summary" label="한 줄 요약">
        <input
          id={`${id}-summary`}
          name="summary"
          defaultValue={project?.summary ?? ""}
          className={field}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={id} name="url" label="사이트 주소">
          <input
            id={`${id}-url`}
            name="url"
            type="url"
            defaultValue={project?.url ?? ""}
            placeholder="https://"
            className={field}
          />
        </Field>
        <Field id={id} name="repoUrl" label="저장소 주소">
          <input
            id={`${id}-repoUrl`}
            name="repoUrl"
            type="url"
            defaultValue={project?.repoUrl ?? ""}
            placeholder="https://"
            className={field}
          />
          {/* 끄면 공개 화면에서 주소는 그대로 두고 링크만 안 건다.
              체크박스는 꺼져 있으면 아예 안 실려 온다 — 서버가 그것으로
              비공개를 읽는다. 새 줄은 켜 둔 채로 시작한다. */}
          <label className="mt-2 flex items-center gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              name="repoPublic"
              defaultChecked={project?.repoPublic ?? true}
              className="size-4 rounded border-border"
            />
            저장소 공개
          </label>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={id} name="startedOn" label="시작일">
          <input
            id={`${id}-startedOn`}
            name="startedOn"
            type="date"
            defaultValue={project?.startedOn ?? ""}
            className={field}
          />
        </Field>
        <Field id={id} name="endedOn" label="종료일 (비우면 진행 중)">
          <input
            id={`${id}-endedOn`}
            name="endedOn"
            type="date"
            defaultValue={project?.endedOn ?? ""}
            className={field}
          />
        </Field>
        <Field id={id} name="sortOrder" label="정렬 순서">
          <input
            id={`${id}-sortOrder`}
            name="sortOrder"
            type="number"
            defaultValue={project?.sortOrder ?? 0}
            className={field}
          />
        </Field>
      </div>
    </>
  );
}

/** 목록의 한 줄 */
function Row({ project }: { project: Project }) {
  return (
    <li className="rounded-xl border border-border p-4">
      <ActionForm
        action={updateProject}
        submit="수정"
        className="space-y-3"
        buttonClassName={button}
        extra={
          <DeleteButton
            formAction={deleteProject}
            className={`${button} text-red-600 dark:text-red-400`}
            confirmMessage={`"${project.name}" 을 지울까요?`}
          />
        }
      >
        <input type="hidden" name="id" value={project.id} />
        <Fields project={project} />
      </ActionForm>
    </li>
  );
}

function AddForm({ kind }: { kind: ProjectKind }) {
  return (
    <ActionForm
      action={addProject}
      submit="추가"
      className="mt-4 space-y-3 rounded-xl border border-dashed border-border p-4"
      buttonClassName={button}
    >
      {/* 프로젝트와 수행 업무가 같은 테이블을 쓴다. 어느 쪽에 담을지 알려 준다 */}
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-medium text-foreground/70">
        {kind === "project" ? "프로젝트 추가" : "수행 업무 추가"}
      </p>
      <Fields />
    </ActionForm>
  );
}

export default function ProjectEditor({
  rows,
  kind,
}: {
  rows: Project[];
  /** 새로 넣는 줄을 어느 쪽에 담을지 */
  kind: ProjectKind;
}) {
  return (
    <>
      <ul className="space-y-4">
        {rows.map((project) => (
          <Row key={project.id} project={project} />
        ))}
      </ul>

      <AddForm kind={kind} />
    </>
  );
}
