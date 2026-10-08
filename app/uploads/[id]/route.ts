import { extensionFor, findUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/**
 * 업로드한 이미지를 내려준다. 주소의 id가 내용 해시라서
 * 같은 주소는 항상 같은 내용이다. 그래서 캐시를 길게 건다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // 주소에는 확장자가 붙어 있다. 실제 조회는 확장자를 뗀 해시로 한다.
  const key = id.replace(/\.[a-z0-9]+$/i, "");

  const upload = await findUpload(key);
  if (!upload?.data) {
    return new Response("not found", { status: 404 });
  }

  return new Response(new Uint8Array(upload.data), {
    headers: {
      "content-type": upload.mimeType,
      "content-length": String(upload.size),
      "cache-control": "public, max-age=31536000, immutable",
      "content-disposition": `inline; filename="${encodeURIComponent(
        upload.filename || `image.${extensionFor(upload.mimeType)}`,
      )}"`,
    },
  });
}
