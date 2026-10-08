"use client";

import { useEffect, useState } from "react";
import type { ActionState } from "@/app/admin/actions";

/**
 * 고치고 나서 고쳐졌다고 한 번 알린다.
 *
 * 관리 화면의 「수정」 은 눌러도 보이는 변화가 없다 — 칸 안의 글자는 내가
 * 적어 둔 그대로다. 눌린 것인지, 저장된 것인지, 아무 일도 안 일어난 것인지
 * 구별할 수가 없었다(MYH-166). 「추가」 는 줄이 생기고 「삭제」 는 줄이
 * 사라지니 눈으로 알지만, 「수정」 만 그렇지 않다.
 *
 * **잠시 뒤 지운다.** 계속 남아 있으면 다음에 눌렀을 때 그것이 방금 뜬
 * 것인지 아까 것인지 알 수 없다. 그러면 없느니만 못하다.
 *
 * 줄마다 제 것을 들어야 한다 — 목록에 줄이 여럿인데 한 자리에서 알리면
 * 어느 줄을 고친 것인지 모른다. 그래서 줄 하나가 곧 컴포넌트 하나다.
 */
export default function SaveNote({ state }: { state: ActionState }) {
  // "보이나" 를 따로 담지 않고 "무엇을 지웠나" 만 담는다. 보일지는 거기서
  // 나온다 — 켜는 쪽을 담으면 새 상태가 올 때마다 그리는 중에 다시
  // 켜 줘야 해서 한 번 더 그리게 된다.
  //
  // state 는 누를 때마다 새 객체로 온다. 그래서 연달아 수정해 같은 말이
  // 두 번 떠야 할 때도 제대로 다시 뜬다.
  const [지운것, 지우기] = useState<ActionState | null>(null);
  const 보인다 = Boolean(state.ok || state.error) && state !== 지운것;

  useEffect(() => {
    if (!보인다) return;
    const 시계 = setTimeout(() => 지우기(state), 3000);
    return () => clearTimeout(시계);
  }, [보인다, state]);

  if (!보인다) return null;

  return state.error ? (
    <span role="alert" className="text-sm text-red-600 dark:text-red-400">
      {state.error}
    </span>
  ) : (
    <span className="text-sm text-foreground/60">{state.ok}</span>
  );
}
