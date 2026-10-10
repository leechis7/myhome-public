/**
 * 올리기 전에 "줄이면 얼마나 될까" 를 브라우저에서 미리 재 본다.
 *
 * 어림짐작이 아니라 실제로 한 번 줄여 보고 나온 숫자다. 다만 브라우저의
 * webp 인코더와 서버의 sharp 는 같은 그림을 같은 크기로 만들지 않는다.
 * 그래서 화면에는 「약」 을 붙여 보여 준다.
 *
 * **줄이는 규칙은 lib/uploads/index.ts 의 optimizeImage 와 같아야 한다.**
 * 여기만 고치면 화면이 거짓말을 한다.
 */

/** 글에 넣는 그림이 이보다 클 이유가 없다. lib/uploads/index.ts 와 같은 값 */
export const MAX_WIDTH = 1600;
const QUALITY = 0.82;

/**
 * 이보다 큰 파일은 재 보지 않는다. 브라우저에서 통째로 디코딩하는 일이라
 * 큰 그림에서는 화면이 잠깐 멈춘다 — 재 보려다 쓰기 불편해지면 손해다.
 */
const MEASURE_LIMIT = 25 * 1024 * 1024;

export type Estimate = {
  width: number;
  height: number;
  /** 줄인 뒤 크기. 서버가 원본을 그대로 둘 상황이면 원본 크기 */
  bytes: number;
  /** 줄어드는가. 아니면 원본 그대로 저장된다 */
  shrinks: boolean;
};

/**
 * 잴 수 없는 경우가 여럿이다. 그때는 `null` 을 주고 화면은 아무 말도 하지
 * 않는다 — 틀린 숫자를 보여 주는 것보다 낫다.
 *
 *   - GIF: 서버가 손대지 않는다(움직임이 사라지므로)
 *   - 너무 큰 파일: 디코딩이 화면을 멈춘다
 *   - 캔버스를 못 쓰는 환경
 */
export async function estimateResized(file: File): Promise<Estimate | null> {
  if (file.type === "image/gif") return null;
  if (file.size > MEASURE_LIMIT) return null;

  const url = URL.createObjectURL(file);
  try {
    const image = await load(url);
    const tooWide = image.naturalWidth > MAX_WIDTH;
    const scale = tooWide ? MAX_WIDTH / image.naturalWidth : 1;
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);

    const blob = await toBlob(canvas);
    if (!blob) return null;

    // 서버 규칙과 같다(lib/uploads/index.ts). 폭이 넘치면 무조건 줄이고,
    // 폭이 괜찮으면 용량이 줄 때만 바꾼다.
    if (tooWide) return { width, height, bytes: blob.size, shrinks: true };
    if (blob.size >= file.size) {
      return { width, height, bytes: file.size, shrinks: false };
    }
    return { width, height, bytes: blob.size, shrinks: true };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function load(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("그림을 읽지 못했습니다"));
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", QUALITY);
  });
}
