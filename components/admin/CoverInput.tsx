"use client";

import { useEffect, useRef, useState } from "react";
import { imageFiles } from "./markdown/types";

/**
 * 책 표지 칸(MYH-199). 파일 고르기에 더해 붙여넣기(Ctrl+V) · 끌어놓기를
 * 받는다. 상자를 누르면 붙여넣을 자리만 잡고, 고르기 창은 열지 않는다. 받은 그림은 숨은 <input type="file" name="cover"> 에 넣어 두므로
 * 저장은 지금처럼 폼이 한다 - 서버 쪽은 바뀌지 않는다.
 */
export default function CoverInput({ current }: { current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [focused, setFocused] = useState(false);

  // 미리보기 주소는 다 쓰면 놓는다
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function take(files: File[]) {
    const file = files[0];
    if (!file || !input.current) return false;
    const data = new DataTransfer();
    data.items.add(file);
    input.current.files = data.files;
    setPreview(URL.createObjectURL(file));
    return true;
  }

  const shown = preview ?? current;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 누르면 고르기 창을 열지 않고 붙여넣을 자리를 잡기만 한다. 고르기는
          옆의 파일 칸이 한다 - 누르자마자 창이 뜨면 붙여넣기가 불편했다 */}
      <div
        tabIndex={0}
        aria-label="표지 붙여넣기"
        title="누른 뒤 붙여넣기(Ctrl+V) · 그림을 끌어다 놓기"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={(e) => {
          if (take(imageFiles(e.clipboardData.files))) e.preventDefault();
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          if (take(imageFiles(e.dataTransfer.files))) e.preventDefault();
        }}
        className={`flex h-24 w-[4.5rem] shrink-0 cursor-text items-center justify-center overflow-hidden rounded border border-dashed text-center text-[10px] leading-tight text-faint outline-none focus:border-foreground/60 ${
          over ? "border-foreground/60 bg-foreground/5" : "border-border"
        }`}
      >
        {shown && !focused ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>
            {focused ? (
              <>
                Ctrl+V
                <br />로 붙여넣기
              </>
            ) : (
              <>
                누르고
                <br />
                붙여넣기
                <br />· 끌어놓기
              </>
            )}
          </span>
        )}
      </div>
      <div className="text-xs text-muted">
        <p>
          표지 {current ? "바꾸기" : "(선택)"}
          {preview ? " · 새 그림이 저장할 때 올라갑니다" : ""}
        </p>
        <p className="mt-0.5 text-faint">
          상자를 누르고 붙여넣거나(Ctrl+V) 그림을 끌어다 놓으세요
        </p>
        {/* 브라우저의 파일 칸은 숨기고 단추 모양으로 연다 */}
        <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-foreground/5 focus-within:border-foreground/60">
          파일에서 고르기
          <input
            ref={input}
            name="cover"
            type="file"
            accept="image/*"
            aria-label="표지"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
