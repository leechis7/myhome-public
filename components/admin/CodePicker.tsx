import Link from "next/link";
import type { Code } from "@/lib/db";

/**
 * 코드 테이블에서 하나를 고르는 칸(MYH-131). 보내는 값은 코드 번호다.
 *
 * 전에는 옆에 「새 분류」 칸이 있어 적는 대로 분류가 생겼다. 이제 분류는
 * 관리 › 설정 › 코드에서 만든다 - 잘못 적은 글자 하나로 분류가 둘로 갈라지지
 * 않게 하려는 것이다. 그리로 가는 길을 바로 밑에 둔다.
 *
 * 쓰지 않기로 한 코드는 고를 수 없다. 다만 지금 그것을 쓰고 있으면 칸에
 * 남긴다 - 빼 버리면 저장할 때 모르는 사이에 분류가 비워진다.
 */
export default function CodePicker({
  codes,
  value,
  name = "categoryCode",
  label = "분류",
  editHref,
  className,
}: {
  /** 한 그룹의 코드 전부(꺼 둔 것까지). 순서대로 */
  codes: Code[];
  value?: string | null;
  name?: string;
  label?: string;
  /** 「분류 고치기」 가 갈 곳. 없으면 그리지 않는다 */
  editHref?: string;
  className?: string;
}) {
  const shown = codes.filter((c) => c.active || c.code === value);
  return (
    <div className="grid gap-1">
      <select
        name={name}
        defaultValue={value ?? ""}
        aria-label={label}
        className={className}
      >
        <option value="">{label} 없음</option>
        {shown.map((c) => (
          <option key={c.code} value={c.code}>
            {c.active ? c.label : `${c.label} (쓰지 않음)`}
          </option>
        ))}
      </select>
      {editHref ? (
        <Link
          href={editHref}
          className="text-xs text-faint underline-offset-4 hover:text-muted hover:underline"
        >
          {label} 고치기 →
        </Link>
      ) : null}
    </div>
  );
}
