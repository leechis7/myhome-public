import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * OG 이미지를 그릴 때 쓰는 한글 폰트.
 * 이미지 생성기는 시스템 폰트를 쓰지 않으므로 파일을 직접 읽어 넘겨야 한다.
 * standalone 빌드에도 포함되도록 next.config.ts의 outputFileTracingIncludes에 넣어 두었다.
 */
export async function loadOgFont() {
  return readFile(
    path.join(process.cwd(), "assets", "fonts", "NanumSquare_acB.ttf"),
  );
}

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
