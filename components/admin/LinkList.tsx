import { groupByCategory } from "@/lib/category";
import { hostOf, type LinkRow, type LinkStatus } from "@/lib/links";
import LinkStatusDot from "@/components/admin/LinkStatusDot";

/**
 * 보기만 하는 목록. 고치는 것은 "서비스 관리" 화면에서 한다.
 *
 * 평소에 이 화면을 여는 이유는 주소를 눌러 들어가려는 것이고, 그때 칸이
 * 가득한 편집 폼은 방해만 된다.
 */
export default function LinkList({
  rows,
  status,
}: {
  rows: LinkRow[];
  status: Map<number, LinkStatus>;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">
        여기에 보여줄 것이 없습니다. &ldquo;서비스 관리&rdquo; 에서 추가하세요.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {groupByCategory(rows).map(([category, list]) => (
        <div key={category}>
          {category ? (
            <p className="mb-2 text-sm text-muted">{category}</p>
          ) : null}
          <ul className="divide-y divide-border rounded-xl border border-border">
            {list.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3"
              >
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
                {row.note ? (
                  <span className="text-xs text-muted">{row.note}</span>
                ) : null}
                <span className="ml-auto">
                  <LinkStatusDot state={status.get(row.id)} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
