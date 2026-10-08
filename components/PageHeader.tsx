import type { ReactNode } from "react";

/**
 * 화면 제목. `action` 은 제목 오른쪽에 놓을 것(주로 단추)을 받는다.
 * 제목과 같은 줄에 두려고 설명은 그 아래로 내려 둔다.
 */
export default function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {action}
      </div>
      {description ? (
        <p className="mt-3 text-foreground/70">{description}</p>
      ) : null}
    </div>
  );
}
