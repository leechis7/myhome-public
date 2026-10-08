import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, uploads } from "@/lib/db";
import { readStoredFile, writeFileOnce } from "@/lib/storage";

export { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from "./upload-limits";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function extensionFor(mimeType: string) {
  return EXTENSIONS[mimeType] ?? "bin";
}

/** 글에 넣는 이미지가 이보다 클 이유가 없다 */
const MAX_WIDTH = 1600;

/**
 * 큰 이미지는 줄이고 webp 로 바꾼다. 휴대폰으로 찍은 사진을 그대로 올리면
 * 몇 MB 씩 되는데, 글에 넣을 때는 그만한 해상도가 필요 없다.
 *
 * **EXIF 방향을 먼저 푼다.** 폰은 세로로 찍어도 센서가 담은 대로(가로)
 * 저장하고 "90도 돌려서 봐라" 를 EXIF 에 따로 적는다. webp 로 바꾸면 그
 * 표시가 사라지므로, 표시를 버리기 전에 실제로 돌려 놓아야 한다. 안 그러면
 * 세로 사진이 누운 채로 올라간다(MYH-150).
 *
 * GIF 는 움직임이 사라지므로 건드리지 않는다.
 * 변환에 실패하면 원본을 그대로 쓴다.
 *
 * 비밀글 쪽(lib/secrets.ts)도 이 길을 쓴다. 담그기 전에 줄이는 것은 같고,
 * 어디에 어떻게 두는지만 다르다.
 */
export async function optimizeImage(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/gif") return { bytes, mimeType };

  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(bytes, { failOn: "none" });
    const { width = 0, height = 0, orientation } = await image.metadata();

    // 폭을 볼 때는 **돌린 뒤** 폭을 봐야 한다. EXIF 5~8 은 90도 계열이라
    // 돌리고 나면 가로세로가 바뀐다 — 담긴 대로 보면 세로 사진을 가로로
    // 착각해 엉뚱하게 줄인다.
    const 눕는다 = orientation !== undefined && orientation >= 5;
    const tooWide = (눕는다 ? height : width) > MAX_WIDTH;

    const converted = await image
      // 각도를 주지 않으면 EXIF 를 읽어 알아서 돌린다
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // 폭이 넘치면 용량과 상관없이 줄인다. 글에 2000px 짜리를 넣을 이유가 없다.
    if (tooWide) return { bytes: converted, mimeType: "image/webp" };

    // 폭이 괜찮으면 용량이 줄 때만 바꾼다
    if (converted.byteLength >= bytes.byteLength) return { bytes, mimeType };
    return { bytes: converted, mimeType: "image/webp" };
  } catch {
    return { bytes, mimeType };
  }
}

/**
 * 내용 해시를 id로 쓴다. 같은 파일을 다시 올려도 행이 늘지 않고,
 * 주소가 내용에 묶이므로 캐시를 길게 걸어도 안전하다.
 * 해시는 변환한 결과로 만든다. 주소와 내용이 어긋나지 않게 하기 위해서다.
 */
export async function saveUpload(file: File) {
  const original = Buffer.from(await file.arrayBuffer());
  const { bytes, mimeType } = await optimizeImage(original, file.type);
  const id = createHash("sha256").update(bytes).digest("hex").slice(0, 32);

  // 파일은 디스크에, DB 에는 "무엇이 어디 있다" 만 둔다(lib/storage.ts).
  // 디스크에 먼저 쓴다 — DB 행만 있고 파일이 없는 상태보다, 파일만 있고
  // 행이 없는 상태가 낫다. 뒤쪽은 아무 데서도 안 가리키는 파일일 뿐이다.
  await writeFileOnce(id, bytes);

  await getDb()
    .insert(uploads)
    .values({
      id,
      filename: file.name,
      mimeType,
      size: bytes.byteLength,
    })
    .onConflictDoNothing({ target: uploads.id });

  return {
    id,
    url: `/uploads/${id}.${extensionFor(mimeType)}`,
    originalSize: original.byteLength,
    size: bytes.byteLength,
  };
}

/**
 * 내려줄 파일을 찾는다. 내용은 디스크에서 읽는다.
 *
 * 디스크에 없으면 DB 의 옛 칸(data)을 본다. 디스크로 옮기기 전에 올린
 * 것들이 거기 있다. 옮기는 스크립트(scripts/uploads-to-disk.mjs)를 돌리면
 * 이 되돌아보기는 쓰이지 않게 된다.
 */
export async function findUpload(id: string) {
  const rows = await getDb()
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .limit(1);
  const row = rows.at(0);
  if (!row) return undefined;

  const fromDisk = await readStoredFile(id);
  if (fromDisk) return { ...row, data: fromDisk };

  return row.data ? row : undefined;
}

export async function listUploads(limit = 30) {
  return getDb()
    .select({
      id: uploads.id,
      filename: uploads.filename,
      mimeType: uploads.mimeType,
      size: uploads.size,
      createdAt: uploads.createdAt,
    })
    .from(uploads)
    .orderBy(uploads.createdAt)
    .limit(limit);
}

/**
 * 그림을 90도 돌린다. 형식은 그대로 둔다.
 *
 * 돌리는 것은 원본이 아니라 이미 줄여 둔 것이다. 90도 단위라 화질이 크게
 * 상하지는 않지만, 되풀이하면 조금씩 쌓인다.
 *
 * GIF 는 손대지 않는다 — 돌리면 움직임이 사라진다.
 */
export async function rotateBytes(
  bytes: Buffer,
  mimeType: string,
  turn: "left" | "right",
) {
  if (mimeType === "image/gif") return null;

  try {
    const sharp = (await import("sharp")).default;
    // 형식을 따로 말하지 않으면 들어온 것과 같은 형식으로 낸다
    return await sharp(bytes, { failOn: "none" })
      .rotate(turn === "right" ? 90 : -90)
      .toBuffer();
  } catch {
    return null;
  }
}
