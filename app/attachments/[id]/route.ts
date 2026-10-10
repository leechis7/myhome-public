import { isAdmin } from "@/lib/security/auth";
import { findAttachment, isImageType } from "@/lib/uploads/attachments";
import { isScheduled } from "@/lib/posts/state";
import { readStoredFile } from "@/lib/uploads/storage";

export const dynamic = "force-dynamic";

/**
 * 글에 붙인 파일을 내려준다.
 *
 * 볼 수 있는 사람인지 글을 보고 가린다 — 나만 보는 글이나 임시저장 글에
 * 붙은 것은 관리자만 받는다. 파일 주소를 알아도 마찬가지다.
 *
 * 그림은 화면에 바로 보여주고 나머지는 내려받게 한다. **형식은 가리지
 * 않고 받으므로**(lib/uploads/limits.ts) 안전은 여기서 나온다 — 그림이
 * 아닌 것은 전부 `attachment` 로 내보내 브라우저가 열지 않게 하고,
 * 멋대로 해석하지도 않게 nosniff 를 붙인다. svg 는 그림이지만 안에
 * 스크립트가 들 수 있어 `isImageType` 이 빼 준다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attachment = Number.isInteger(Number(id))
    ? await findAttachment(Number(id))
    : undefined;

  if (!attachment) {
    return new Response("not found", { status: 404 });
  }

  // 예약 글(MYH-194)도 그 시각까지는 숨긴다
  const hidden =
    !attachment.published || attachment.private || isScheduled(attachment);
  if (hidden && !(await isAdmin())) {
    // 없는 것처럼 답한다. 있다는 것조차 알릴 이유가 없다.
    return new Response("not found", { status: 404 });
  }

  const bytes = await readStoredFile(attachment.uploadId);
  if (!bytes) {
    return new Response("not found", { status: 404 });
  }

  const disposition = isImageType(attachment.mimeType) ? "inline" : "attachment";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": attachment.mimeType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(
        attachment.filename,
      )}`,
      "x-content-type-options": "nosniff",
      // 주소가 글에 묶여 있어 내용이 바뀔 수 있다. 오래 캐시하지 않는다.
      "cache-control": hidden ? "private, no-store" : "public, max-age=300",
    },
  });
}
