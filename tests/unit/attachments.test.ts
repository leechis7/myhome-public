import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  attachmentMimeType,
  formatBytes,
  isImageType,
} from "@/lib/upload-limits";

describe("첨부파일 규칙", () => {
  it("그림은 화면에 바로 보여 준다", () => {
    expect(isImageType("image/png")).toBe(true);
    expect(isImageType("image/jpeg")).toBe(true);
    expect(isImageType("application/pdf")).toBe(false);
    expect(isImageType("text/plain")).toBe(false);
  });

  // svg 안에는 <script> 를 넣을 수 있다. inline 으로 내보내면 주소를 직접
  // 열었을 때 우리 도메인에서 그 스크립트가 돈다 — CSP 가 'unsafe-inline'
  // 이라 막히지도 않는다. 첨부로 내려주면 브라우저가 열지 않는다.
  it("svg 는 그림이지만 내려받게 한다", () => {
    expect(isImageType("image/svg+xml")).toBe(false);
  });

  // 형식은 가리지 않는다. 윈도우가 zip 을 application/x-zip-compressed 로,
  // tar 를 빈 값으로 보내는 통에 압축 파일이 하나도 안 붙었다(MYH-161).
  // 안전은 목록이 아니라 내려주는 쪽에서 나온다.
  it("형식 이름을 안 알려 주면 octet-stream 으로 담는다", () => {
    expect(attachmentMimeType("")).toBe("application/octet-stream");
    expect(attachmentMimeType("   ")).toBe("application/octet-stream");
    expect(attachmentMimeType("application/x-zip-compressed")).toBe(
      "application/x-zip-compressed",
    );
  });

  it("크기 한도는 그림과 같다", () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(90 * 1024 * 1024);
  });

  it("크기를 사람이 읽는 말로 적는다", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0MB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5MB");
  });
});
