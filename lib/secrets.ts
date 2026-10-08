import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, secretAttachments, secrets } from "@/lib/db";
import {
  decryptBytes,
  decryptText,
  encryptBytes,
  encryptText,
} from "@/lib/secret-crypto";
import {
  readSecretFile,
  removeSecretFile,
  writeSecretFile,
} from "@/lib/storage";
import { findImageUsage, stripImage } from "@/lib/image-usage";
import { optimizeImage, rotateBytes } from "@/lib/uploads";

/**
 * 나만 보는 비밀글.
 *
 * DB 에 오가는 글자는 여기서 담그고 여기서 꺼낸다. 화면과 서버 액션은
 * 평문만 만지고, 테이블에는 평문이 닿지 않는다 — 담그는 자리가 여러 곳이면
 * 언젠가 한 곳이 빠진다.
 *
 * 꺼내다 실패하면 던지지 않고 `null` 을 준다. 열쇠를 바꿨거나 잃었을 때
 * 목록 전체가 죽는 대신 "열 수 없음" 으로 보이게 하려는 것이다. 그래야
 * 무슨 일이 난 건지 화면에서 알아볼 수 있다.
 */

/** 첨부파일인가 본문에 넣은 그림인가. attachments 쪽과 같은 값을 쓴다 */
export type SecretFileKind = "file" | "image";

function open(envelope: string) {
  try {
    return decryptText(envelope);
  } catch {
    return null;
  }
}

/** 태그는 JSON 배열 한 덩어리로 담근다. 없으면 null 로 둔다 */
function sealTags(tags: string[]) {
  return tags.length > 0 ? encryptText(JSON.stringify(tags)) : null;
}

function openTags(envelope: string | null) {
  if (!envelope) return [];
  const plain = open(envelope);
  if (!plain) return [];
  try {
    const parsed: unknown = JSON.parse(plain);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * 목록. 본문은 꺼내지 않는다 — 제목·태그·날짜만 있으면 된다.
 *
 * 태그로 거르는 것도 여기서 한다. SQL 로는 못 한다 — 담겨 있어서 DB 는
 * 무슨 글자인지 모른다. 꺼내서 메모리에서 거른다. 글이 몇 만 편이 되면
 * 다시 생각할 일이지만, 일기가 그렇게 쌓일 일은 없다.
 */
export async function listSecrets(tag?: string) {
  const rows = await getDb()
    .select({
      id: secrets.id,
      title: secrets.title,
      tags: secrets.tags,
      writtenAt: secrets.writtenAt,
      updatedAt: secrets.updatedAt,
    })
    .from(secrets)
    .orderBy(desc(secrets.writtenAt), desc(secrets.id));

  const opened = rows.map((row) => ({
    ...row,
    title: open(row.title),
    tags: openTags(row.tags),
  }));

  return tag ? opened.filter((row) => row.tags.includes(tag)) : opened;
}

/** 쓰인 태그를 모아 준다. 많이 쓴 것부터 */
export async function listSecretTags() {
  const rows = await listSecrets();
  const count = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) count.set(tag, (count.get(tag) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([name, n]) => ({ name, count: n }));
}

export async function findSecret(id: number) {
  const [row] = await getDb()
    .select()
    .from(secrets)
    .where(eq(secrets.id, id))
    .limit(1);
  if (!row) return null;

  return {
    ...row,
    title: open(row.title),
    content: open(row.content),
    tags: openTags(row.tags),
  };
}

export async function createSecret(input: {
  title: string;
  content: string;
  tags: string[];
  writtenAt: Date;
}) {
  const [row] = await getDb()
    .insert(secrets)
    .values({
      title: encryptText(input.title),
      content: encryptText(input.content),
      tags: sealTags(input.tags),
      writtenAt: input.writtenAt,
    })
    .returning({ id: secrets.id });
  return row.id;
}

/**
 * 빈 초안을 만든다. 새 글 화면에서 저장하기 전에 이미지를 올릴 때 쓴다.
 *
 * 이미지는 어느 글에 딸린 것인지가 있어야 담아 둘 수 있다(공개 이미지처럼
 * 주인 없는 자리에 두지 않는다). 그래서 번호가 필요한데, 새 글에는 번호가
 * 없다. 그때 여기서 한 줄을 먼저 만들고 화면이 그 번호를 이어받는다.
 *
 * 올리다 말고 창을 닫으면 빈 글이 남는다. 목록에 "제목 없음" 으로 보이니
 * 지우면 된다.
 */
export async function createDraftSecret() {
  const [row] = await getDb()
    .insert(secrets)
    .values({
      title: encryptText(""),
      content: encryptText(""),
      writtenAt: new Date(),
    })
    .returning({ id: secrets.id });
  return row.id;
}

export async function updateSecret(
  id: number,
  input: { title: string; content: string; tags: string[]; writtenAt: Date },
) {
  await getDb()
    .update(secrets)
    .set({
      title: encryptText(input.title),
      content: encryptText(input.content),
      tags: sealTags(input.tags),
      writtenAt: input.writtenAt,
      updatedAt: new Date(),
    })
    .where(eq(secrets.id, id));
}

/** 글과 붙은 파일을 함께 지운다. 디스크에 남기지 않는다 */
export async function removeSecret(id: number) {
  const db = getDb();
  const files = await db
    .select({ storageId: secretAttachments.storageId })
    .from(secretAttachments)
    .where(eq(secretAttachments.secretId, id));

  // 테이블은 cascade 로 따라 지워지지만 디스크는 따라오지 않는다
  await db.delete(secrets).where(eq(secrets.id, id));
  for (const file of files) {
    await removeSecretFile(file.storageId);
  }
}

/** 파일을 붙인다. 디스크에 놓이는 것은 담근 바이트다 */
export async function addSecretAttachment(secretId: number, file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return storeSecretFile(
    secretId,
    file.name,
    file.type || "application/octet-stream",
    bytes,
    "file",
  );
}

/**
 * 붙임 파일과 본문 그림이 함께 지나는 자리. 담그고 쓰는 일은 여기 한 곳이다.
 *
 * 자리는 같아도 쓰임새는 다르다. `kind` 로 갈라 두지 않으면 본문에 넣은
 * 그림이 아래 첨부파일 목록에 그대로 나온다(MYH-144).
 */
async function storeSecretFile(
  secretId: number,
  filename: string,
  mimeType: string,
  bytes: Buffer,
  kind: SecretFileKind,
) {
  // 이름은 내용과 아무 상관이 없는 난수다. 내용 해시를 쓰면 같은 파일을
  // 가진 사람이 "이 파일이 여기 있다" 를 확인할 수 있다.
  const storageId = randomBytes(16).toString("hex");

  await writeSecretFile(storageId, encryptBytes(bytes));

  const [row] = await getDb()
    .insert(secretAttachments)
    .values({
      secretId,
      storageId,
      filename: encryptText(filename),
      mimeType: encryptText(mimeType),
      size: bytes.byteLength,
      kind,
    })
    .returning({ id: secretAttachments.id });

  return row.id;
}

/**
 * 본문에 넣을 그림을 올린다. 붙임 파일과 같은 자리에 담가서 둔다.
 *
 * 공개 그림(lib/uploads.ts)처럼 `/uploads/<해시>` 에 두면 주소를 아는
 * 사람이 그대로 받는다. 그래서 이쪽으로 따로 올리고, 줄이는 길만 같이 쓴다.
 */
export async function addSecretImage(secretId: number, file: File) {
  const original = Buffer.from(await file.arrayBuffer());
  const { bytes, mimeType } = await optimizeImage(original, file.type);
  const name = mimeType === file.type ? file.name : `${file.name}.webp`;

  const id = await storeSecretFile(secretId, name, mimeType, bytes, "image");
  return { id, markdown: `![${name}](/admin/secrets/files/${id})` };
}

/** 첨부파일만. 본문에 넣은 그림은 여기 안 나온다 */
export async function listSecretAttachments(secretId: number) {
  const rows = await getDb()
    .select()
    .from(secretAttachments)
    .where(
      and(
        eq(secretAttachments.secretId, secretId),
        eq(secretAttachments.kind, "file"),
      ),
    )
    .orderBy(secretAttachments.id);

  return rows.map((row) => ({
    id: row.id,
    size: row.size,
    filename: open(row.filename),
    mimeType: open(row.mimeType),
  }));
}

/**
 * 본문에 넣은 그림. 넣은 순서대로.
 *
 * 붙임 파일 목록(listSecretAttachments)과 짝이다 — 같은 테이블을 쓰임새로
 * 갈라 본다. 마크다운 줄은 올릴 때 준 것과 같게 다시 만든다(MYH-145).
 */
export async function listSecretImages(secretId: number) {
  const db = getDb();

  const [row0] = await db
    .select({ content: secrets.content })
    .from(secrets)
    .where(eq(secrets.id, secretId))
    .limit(1);
  // 본문을 풀어야 어디에 쓰는지 볼 수 있다. 못 풀면 쓰임을 모르는 채로 둔다 —
  // 그때 "안 쓴다" 고 답하면 쓰고 있는 그림을 지우게 된다(MYH-148).
  const content = row0 ? open(row0.content) : null;

  const rows = await db
    .select()
    .from(secretAttachments)
    .where(
      and(
        eq(secretAttachments.secretId, secretId),
        eq(secretAttachments.kind, "image"),
      ),
    )
    .orderBy(secretAttachments.id);

  return rows.map((row) => {
    const filename = open(row.filename);
    const url = `/admin/secrets/files/${row.id}`;
    return {
      id: row.id,
      url,
      filename,
      size: row.size,
      markdown: `![${filename ?? "그림"}](${url})`,
      usage: content === null ? null : findImageUsage(content, url),
      needle: url,
    };
  });
}

/**
 * 비밀글 본문 그림을 90도 돌린다.
 *
 * 블로그 쪽과 달리 **자리를 그대로 두고 덮어쓴다.** 이름이 난수라 내용과
 * 묶여 있지 않고, 내려줄 때도 `private, no-store` 라 캐시가 물고 있을
 * 일이 없다. 주소가 안 변하니 본문도 손댈 것이 없다.
 */
export async function rotateSecretImage(id: number, turn: "left" | "right") {
  const db = getDb();

  const [row] = await db
    .select()
    .from(secretAttachments)
    .where(and(eq(secretAttachments.id, id), eq(secretAttachments.kind, "image")))
    .limit(1);
  if (!row) return null;

  const stored = await readSecretFile(row.storageId);
  if (!stored) return null;

  let before: Buffer;
  let mimeType: string;
  try {
    before = decryptBytes(stored);
    mimeType = decryptText(row.mimeType);
  } catch {
    return null;
  }

  const after = await rotateBytes(before, mimeType, turn);
  if (!after) return null;

  await writeSecretFile(row.storageId, encryptBytes(after));
  await db
    .update(secretAttachments)
    .set({ size: after.byteLength })
    .where(eq(secretAttachments.id, id));

  return row.secretId;
}

/** 내려줄 것 하나. 파일 내용까지 꺼내서 준다 */
export async function findSecretAttachment(id: number) {
  const [row] = await getDb()
    .select()
    .from(secretAttachments)
    .where(eq(secretAttachments.id, id))
    .limit(1);
  if (!row) return null;

  const stored = await readSecretFile(row.storageId);
  if (!stored) return null;

  try {
    return {
      id: row.id,
      filename: decryptText(row.filename),
      mimeType: decryptText(row.mimeType),
      bytes: decryptBytes(stored),
    };
  } catch {
    return null;
  }
}

/**
 * 본문 그림을 지운다(MYH-197). 본문에서 그 그림을 먼저 빼고 줄과 파일을
 * 지운다 - 전에는 본문에 깨진 그림으로 남았다. 본문을 못 풀면 본문은
 * 그대로 두고 그림만 지운다(지금까지처럼).
 */
export async function removeSecretImage(id: number) {
  const db = getDb();
  const [row] = await db
    .select({ secretId: secretAttachments.secretId, content: secrets.content })
    .from(secretAttachments)
    .innerJoin(secrets, eq(secrets.id, secretAttachments.secretId))
    .where(eq(secretAttachments.id, id))
    .limit(1);
  if (!row) return null;

  const before = open(row.content);
  if (before !== null) {
    const after = stripImage(before, `/admin/secrets/files/${id}`);
    if (after !== before) {
      await db
        .update(secrets)
        .set({ content: encryptText(after), updatedAt: new Date() })
        .where(eq(secrets.id, row.secretId));
    }
  }
  return removeSecretAttachment(id);
}

export async function removeSecretAttachment(id: number) {
  const [gone] = await getDb()
    .delete(secretAttachments)
    .where(eq(secretAttachments.id, id))
    .returning({
      storageId: secretAttachments.storageId,
      secretId: secretAttachments.secretId,
    });
  if (!gone) return null;

  await removeSecretFile(gone.storageId);
  return gone.secretId;
}
