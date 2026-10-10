import {
  formatPeriod,
  listProjects,
  type ProjectKind,
} from "@/lib/profile/projects";

/**
 * 프로젝트·수행 업무 목록. 두 화면이 같은 것을 쓴다.
 *
 *   kind="project"  /projects — 지금 만들고 있는 것
 *   kind="work"     /about#work — 지나온 업무
 *
 * 담을 칸이 같아 화면도 같은 모양으로 둔다. 비었을 때 문구만 다르다.
 */
export default async function ProjectList({
  kind,
  empty,
}: {
  kind: ProjectKind;
  empty: string;
}) {
  const rows = await listProjects(kind);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        {empty}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((project) => {
        const period = formatPeriod(project.startedOn, project.endedOn);
        return (
          <li key={project.id} className="rounded-xl border border-border p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {/* 절 제목("수행 업무"·"프로젝트") 아래에 들어가므로 h3 이다 */}
              <h3 className="font-medium">{project.name}</h3>
              {period ? (
                <span className="text-sm text-muted tabular-nums">
                  {period}
                </span>
              ) : null}
            </div>

            {project.summary ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {project.summary}
              </p>
            ) : null}

            {project.stack.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <li
                    key={item}
                    className="rounded bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground/60"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            {project.url || project.repoUrl ? (
              <ul className="mt-4 flex flex-wrap gap-4 text-sm">
                {project.url ? (
                  <li>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground/60 transition-colors hover:text-foreground"
                    >
                      사이트 ↗
                    </a>
                  </li>
                ) : null}
                {/* 비공개 저장소에는 링크를 걸지 않는다. 눌러 봐야 404 다.
                    그래도 저장소가 있다는 것은 알린다 — 주소를 아예 안
                    적으면 있는지조차 모른다. */}
                {project.repoUrl ? (
                  <li>
                    {project.repoPublic ? (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground/60 transition-colors hover:text-foreground"
                      >
                        저장소 ↗
                      </a>
                    ) : (
                      <span className="text-faint">저장소 비공개</span>
                    )}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
