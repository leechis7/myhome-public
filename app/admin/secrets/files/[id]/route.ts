import { isAdmin } from "@/lib/security/auth";
import { isImageType } from "@/lib/uploads/limits";
import { hasSecretKey } from "@/lib/security/secret-crypto";
import { findSecretAttachment } from "@/lib/my-space/secrets";

export const dynamic = "force-dynamic";

/**
 * 비밀글에 붙인 파일을 내려준다. 복호화하는 자리는 여기 하나뿐이다.
 *
 * 관리자가 아니면 404 다. 있는지조차 알릴 이유가 없다.
 *
 * 그림은 화면에 바로 보여준다(`inline`). 본문에 넣은 그림이 이 길로 나오기
 * 때문이다 — 내려받게 하면 마크다운의 그림이 깨진다. svg 는 빼는데, 안에
 * 스크립트가 들 수 있어서다(`isImageType`). 나머지는 내려받게
 * 한다(`attachment`). 형식을 가리지 않고 받으므로 브라우저가 멋대로
 * 해석하지 않도록 nosniff 를 붙이고, 어느 쪽이든 캐시에 남기지 않는다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin()) || !hasSecretKey()) {
    return new Response("not found", { status: 404 });
  }

  const { id } = await params;
  const file = Number.isInteger(Number(id))
    ? await findSecretAttachment(Number(id))
    : null;

  if (!file) {
    return new Response("not found", { status: 404 });
  }

  const disposition = isImageType(file.mimeType) ? "inline" : "attachment";
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.bytes.byteLength),
      "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(
        file.filename,
      )}`,
      "x-content-type-options": "nosniff",
      // 복호화한 평문이다. 디스크·프록시 어디에도 남기지 않는다.
      "cache-control": "private, no-store",
    },
  });
}
