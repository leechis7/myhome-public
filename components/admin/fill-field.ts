/**
 * React 가 쥔 칸에 밖에서 값을 넣는다. 브라우저의 value 설정기로 넣고 input
 * 사건을 보내야 그 칸의 상태가 따라온다 - el.value = … 만 하면 React 가
 * 다음에 그릴 때 옛 값으로 되돌린다.
 *
 * 보관본 되살리기(MYH-193)와 지운 그림 빼기(MYH-197)가 쓴다.
 */
export function fillField(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
