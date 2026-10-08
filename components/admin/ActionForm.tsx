"use client";

import { useActionState } from "react";
import SaveNote from "@/components/admin/SaveNote";
import type { ActionState } from "@/app/admin/actions";

/**
 * 고치고 나서 고쳐졌다고 알리는 폼.
 *
 * 관리 화면의 목록들은 생김새가 제각각이지만 하는 일은 같다 — 칸을 채우고
 * 단추를 누르면 서버 액션이 돈다. 달라지는 것은 안에 든 칸뿐이라 그것만
 * `children` 으로 받는다.
 *
 * **줄마다 한 벌씩 쓴다.** 알림이 그 줄에 떠야 하기 때문이다(MYH-166).
 * 한 자리에서 알리면 목록에 줄이 여럿일 때 어느 것을 고친 것인지 모른다.
 * `useActionState` 는 훅이라 `map` 안에서 바로 걸 수도 없다.
 *
 * 서버 컴포넌트(`LinkEditor`)에서도 쓴다. 칸을 `children` 으로 받으므로
 * 그쪽은 클라이언트로 넘어오지 않아도 된다.
 */
export default function ActionForm({
  action,
  submit,
  children,
  extra,
  className,
  buttonClassName,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** 단추에 적을 말. 「수정」·「추가」 */
  submit: string;
  /** 이 폼의 칸들 */
  children: React.ReactNode;
  /** 단추 옆에 더 붙일 것. 지우기 단추가 여기 온다 */
  extra?: React.ReactNode;
  className?: string;
  buttonClassName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className={buttonClassName}>
          {submit}
        </button>
        {/* 지우기는 알리지 않는다. 줄이 사라지는 것이 곧 알림이고,
            누르기 전에 묻는 창도 이미 있다. */}
        {extra}
        <SaveNote state={state} />
      </div>
    </form>
  );
}
