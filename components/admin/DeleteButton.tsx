import type { ComponentProps } from "react";

/**
 * 지우기 전에 한 번 묻는 단추.
 *
 * 글·짧은 글·메시지·댓글은 지우면 되돌릴 방법이 없다(백업 복원 말고는).
 * 그런데 삭제 단추가 저장·올리기 단추 옆에 나란히 있어 손이 미끄러지기
 * 쉽다. 그래서 한 번 묻는다.
 *
 * **묻는 것을 화면 안에서, 자바스크립트 없이 한다(MYH-110).** 전에는 브라우저
 * 확인창(confirm)이었다. 그건 화면의 스크립트가 살아 있어야 뜬다 — 하이드레이션이
 * 실패한 순간에는 화면은 멀쩡해 보이는데 확인 없이 그냥 지워졌다. 지금은
 * <details> 펼침이다. 「삭제」 를 누르면 그 자리에 묻는 말과 「예, 지웁니다」
 * 가 펼쳐지고, 그것을 한 번 더 눌러야 지워진다. 펼치는 것은 브라우저가 한다.
 *
 * 무엇을 지우는지 묻는 말에 담는다("이 글을 지울까요?" 가 아니라
 * "'제목' 을 지울까요?"). 여러 줄이 늘어선 화면에서 어느 줄을 눌렀는지
 * 다시 볼 수 있어야 한다.
 *
 * 단추에 주던 것(formAction · form · formNoValidate · name/value)은 「예,
 * 지웁니다」 에 그대로 간다. 실제로 폼을 보내는 것은 그 단추다. 저장 폼 안의
 * 삭제처럼 폼이 다른 액션을 쓰고 있을 때 그것만 갈아 끼울 수 있다.
 *
 * 펼치면 한 줄을 통째로 차지한다(open:basis-full). 단추가 나란한 줄(글 수정의
 * 「저장 · 글 내리기 · 나만 보기로 · 삭제」)에서 묻는 말이 옆 단추를 좁은 화면에서
 * 세로로 찌그러뜨렸다.
 *
 * `aria-label` 은 펼치는 쪽(「삭제」)의 이름이 된다. 같은 글자가 여럿인 줄에서
 * 읽어 주는 이름을 가를 때 쓴다(「첨부파일 삭제」).
 */
export default function DeleteButton({
  confirmMessage,
  children = "삭제",
  className,
  "aria-label": ariaLabel,
  ...rest
}: ComponentProps<"button"> & { confirmMessage: string }) {
  return (
    <details className="group inline-flex flex-wrap items-center gap-2 align-middle open:basis-full">
      <summary
        aria-label={ariaLabel}
        className={`inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden ${className ?? ""}`}
      >
        <span className="group-open:hidden">{children}</span>
        <span className="hidden group-open:inline">취소</span>
      </summary>
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground/80">{confirmMessage}</span>
        <button
          type="submit"
          {...rest}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          예, 지웁니다
        </button>
      </span>
    </details>
  );
}
