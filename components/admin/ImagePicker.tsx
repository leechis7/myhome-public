"use client";

import { useEffect, useState } from "react";
import { estimateResized, type Estimate } from "@/lib/uploads/image-estimate";
import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  oversizeMessage,
} from "@/lib/uploads/limits";

const ACCEPT = "image/png,image/jpeg,image/gif,image/webp,image/avif";
/** 미리보기 한 변. CSS 와 HTML 속성 양쪽에 같은 값을 쓴다 */
const THUMB = 48;

type Picked = { url: string; name: string; size: number };

/**
 * 올릴 그림을 고르는 칸.
 *
 * 고르면 바로 작은 미리보기를 보여 준다. 파일 이름만으로는 내가 고른 것이
 * 그 그림이 맞는지 알 수 없다 — 「스크린샷 2026-07-25 090827.png」 이 셋쯤
 * 있는 폴더에서는 더욱 그렇다.
 *
 * 미리보기는 브라우저 안에서 만든다(`URL.createObjectURL`). 아직 올리기
 * 전이라 서버에 주소가 없고, 올려 놓고 확인하면 늦다.
 *
 * 무엇을 받는지 적는 줄도 여기서 그린다. 고른 파일의 이름과 크기가 그 줄
 * 뒤에 붙으므로 한 곳에서 다루는 편이 낫다.
 *
 * **크기는 여기서 먼저 잰다.** 서버 액션 안에도 같은 검사가 있지만, 너무
 * 큰 파일은 그 검사에 닿지도 못한다 — Next 가 본문 크기 제한에서 먼저
 * 끊고 "Body exceeded 6mb limit" 으로 터진다. 우리 안내 문구를 보여 주려면
 * 애초에 보내지 않아야 한다.
 *
 * 블로그 쪽(ImageUpload)과 비밀글 쪽(SecretImageUpload)이 같이 쓴다.
 */
export default function ImagePicker({ note }: { note?: string }) {
  const [picked, setPicked] = useState<Picked | null>(null);
  // null 은 두 가지 뜻이 될 수 있다 — 아직 안 쟀거나, 잴 수 없거나.
  // 화면에 다른 말을 해야 하므로 재는 중인지를 따로 둔다.
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 만든 주소는 거두어야 한다. 안 그러면 고를 때마다 메모리에 쌓인다.
  useEffect(() => {
    if (!picked) return;
    return () => URL.revokeObjectURL(picked.url);
  }, [picked]);

  return (
    <>
      <p className="mt-1 text-xs text-muted">
        PNG, JPEG, GIF, WebP, AVIF · 최대{" "}
        {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB
        {note ? ` · ${note}` : null}
      </p>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept={ACCEPT}
          required
          aria-label="올릴 이미지"
          className="max-w-full text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setError(null);
            setPicked(null);
            setEstimate(null);
            setMeasuring(false);
            if (!file) return;

            const 큼 = oversizeMessage(file.size, MAX_UPLOAD_BYTES);
            if (큼) {
              // 고른 것을 비운다. 안 그러면 그대로 보내진다.
              event.target.value = "";
              setError(큼);
              return;
            }

            setPicked({
              url: URL.createObjectURL(file),
              name: file.name,
              size: file.size,
            });

            // 줄이면 얼마나 될지 실제로 재 본다. 오래 걸리거나 잴 수 없는
            // 것(GIF·아주 큰 파일)은 null 이고, 그때는 아무 말도 안 한다.
            setEstimate(null);
            setMeasuring(true);
            void estimateResized(file).then((result) => {
              setEstimate(result);
              setMeasuring(false);
            });
          }}
        />

        {picked ? (
          <span className="flex min-w-0 items-center gap-2">
            {/* 브라우저 안에서 만든 주소라 next/image 가 다룰 수 없다.
                width·height 를 속성으로도 준다 — 스타일이 늦게 붙는 순간에
                원본 크기로 한 번 그려졌다 줄어드는 것을 막는다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={picked.url}
              alt={`고른 그림: ${picked.name}`}
              width={THUMB}
              height={THUMB}
              className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
            />
            <span className="min-w-0 text-xs text-faint">
              <span className="block truncate text-foreground/70">
                {picked.name} · {formatBytes(picked.size)}
              </span>
              <span className="block">{줄인뒤(estimate, measuring)}</span>
            </span>
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </>
  );
}

/**
 * 줄인 뒤 어떻게 되는지 한 줄.
 *
 * 브라우저에서 실제로 한 번 줄여 보고 나온 값이지만, 서버의 sharp 와 같은
 * 인코더가 아니라 숫자가 조금 다르다. 그래서 「약」 을 붙인다.
 */
function 줄인뒤(estimate: Estimate | null, measuring: boolean) {
  if (measuring) return "줄인 뒤 크기를 재는 중…";
  // 못 재는 것들이 있다 — GIF 는 서버가 손대지 않고, 아주 큰 파일은
  // 브라우저에서 디코딩하다 화면이 멈춘다. 틀린 숫자 대신 아무 말도 안 한다.
  if (!estimate) return "";
  const 크기 = `${estimate.width}×${estimate.height}`;
  return estimate.shrinks
    ? `줄이면 ${크기} · 약 ${formatBytes(estimate.bytes)}`
    : `${크기} · 그대로 저장됩니다`;
}
