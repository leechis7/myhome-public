import type { LinkStatus } from "@/lib/my-space/links";

/**
 * 살아 있는지 한 점으로 보여준다. 보기 목록과 관리 화면이 같이 쓴다.
 *
 * 오류 응답과 닿지 않음은 고칠 곳이 다르지만, 눈에는 똑같이 "문제" 로
 * 보이면 된다.
 */
export default function LinkStatusDot({
  state,
}: {
  state: LinkStatus | undefined;
}) {
  if (!state) return null;
  const alive = state === "살아 있음";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        alive ? "text-muted" : "text-red-600 dark:text-red-400"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${
          alive ? "bg-current opacity-60" : "bg-current"
        }`}
      />
      {state}
    </span>
  );
}
