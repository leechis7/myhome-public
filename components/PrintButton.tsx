"use client";

/**
 * 브라우저 인쇄 창을 연다(MYH-195). 거기서 「PDF로 저장」 을 고르면 이력서가
 * PDF 가 된다. 서버에서 PDF 를 만들지 않는다 - 그러려면 무거운 브라우저를
 * 서버에 둬야 한다. 인쇄할 때는 이 단추도 빠진다(data-print-hide).
 */
export default function PrintButton({ label = "PDF로 저장" }: { label?: string }) {
  return (
    <button
      type="button"
      data-print-hide
      onClick={() => window.print()}
      title="인쇄 창에서 「PDF로 저장」 을 고르세요"
      className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-foreground/5"
    >
      {label}
    </button>
  );
}
