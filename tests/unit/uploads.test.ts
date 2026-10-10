import { describe, expect, it } from "vitest";
import {
  ALLOWED_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_UPLOAD_BYTES,
  oversizeMessage,
} from "@/lib/uploads/limits";
import { extensionFor } from "@/lib/uploads";

describe("업로드 제한", () => {
  it("이미지 형식만 허용한다", () => {
    expect(ALLOWED_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_TYPES.has("image/webp")).toBe(true);
    expect(ALLOWED_TYPES.has("text/html")).toBe(false);
    expect(ALLOWED_TYPES.has("image/svg+xml")).toBe(false);
  });

  it("크기 상한이 90MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(90 * 1024 * 1024);
  });

  /**
   * 브라우저에서 먼저 재지 않으면 큰 파일이 그대로 보내지고, 서버 액션 안의
   * 검사에 닿기도 전에 Next 가 끊는다. 화면 쪽 규칙을 여기서 묶어 둔다.
   */
  it("한도를 넘으면 보여 줄 말을 준다", () => {
    expect(oversizeMessage(1024, MAX_UPLOAD_BYTES)).toBeNull();
    expect(oversizeMessage(MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES)).toBeNull();
    expect(oversizeMessage(MAX_UPLOAD_BYTES + 1, MAX_UPLOAD_BYTES)).toContain(
      "파일이 너무 큽니다",
    );
    // 사람이 읽는 숫자로 적는다 — 바이트를 그대로 들이밀지 않는다
    expect(oversizeMessage(100 * 1024 * 1024, MAX_UPLOAD_BYTES)).toBe(
      "파일이 너무 큽니다 (100.0MB). 90.0MB까지 됩니다.",
    );
  });

  /**
   * 올리기와 붙이기는 서버 액션으로 간다. 본문이 Next 의 한도를 넘으면
   * 액션에 닿기도 전에 끊기고 "Body exceeded Nmb limit" 으로 터진다 —
   * 우리 안내 문구가 나올 자리가 없다. 2026-09-19 에 7MB 사진으로 겪었다.
   */
  it("서버 액션 본문 한도가 두 상한보다 크다", async () => {
    const { default: config } = await import("../../next.config");
    const limit = config.experimental?.serverActions?.bodySizeLimit;
    expect(typeof limit).toBe("string");

    const bytes = Number(String(limit).replace("mb", "")) * 1024 * 1024;
    expect(bytes).toBeGreaterThan(MAX_UPLOAD_BYTES);
    expect(bytes).toBeGreaterThan(MAX_ATTACHMENT_BYTES);
  });
});

describe("extensionFor", () => {
  it("형식에 맞는 확장자를 준다", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
  });

  it("모르는 형식은 bin", () => {
    expect(extensionFor("application/zip")).toBe("bin");
  });
});

/**
 * 폰으로 세로로 찍은 사진은 센서가 담은 대로(가로) 저장되고 "돌려서 봐라"
 * 를 EXIF 에 적어 둔다. webp 로 바꾸면 그 표시가 사라지므로, 표시를 버리기
 * 전에 실제로 돌려 놓지 않으면 누운 채로 올라간다(MYH-150).
 */
describe("optimizeImage 와 사진 방향", () => {
  /** 가로 그림에 "90도 돌려서 보라"(orientation 6)를 적어 둔 JPEG */
  async function 누운사진(width: number, height: number) {
    const sharp = (await import("sharp")).default;
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 10, g: 120, b: 200 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
  }

  async function 크기(bytes: Buffer) {
    const sharp = (await import("sharp")).default;
    const { width, height } = await sharp(bytes).metadata();
    return `${width}x${height}`;
  }

  it("EXIF 가 시키는 대로 세워서 저장한다", async () => {
    const { optimizeImage } = await import("@/lib/uploads");
    const { bytes, mimeType } = await optimizeImage(
      await 누운사진(400, 200),
      "image/jpeg",
    );
    expect(mimeType).toBe("image/webp");
    expect(await 크기(bytes)).toBe("200x400");
  });

  /**
   * 폭을 담긴 대로 보면 세로 사진을 가로로 착각한다. 3000×1500 에 "돌려서
   * 보라" 가 붙어 있으면 실제로는 1500 폭이라 줄일 것이 없다.
   */
  it("줄일지 말지를 돌린 뒤 폭으로 본다", async () => {
    const { optimizeImage } = await import("@/lib/uploads");
    const { bytes } = await optimizeImage(
      await 누운사진(3000, 1500),
      "image/jpeg",
    );
    // 돌리면 1500×3000 이다. 폭 1500 은 1600 아래라 줄이지 않는다.
    expect(await 크기(bytes)).toBe("1500x3000");
  });

  it("방향 표시가 없으면 그대로 둔다", async () => {
    const sharp = (await import("sharp")).default;
    const { optimizeImage } = await import("@/lib/uploads");
    const 원본 = await sharp({
      create: { width: 400, height: 200, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();

    const { bytes } = await optimizeImage(원본, "image/jpeg");
    expect(await 크기(bytes)).toBe("400x200");
  });
});
