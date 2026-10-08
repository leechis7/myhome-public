import {
  mkdir,
  readFile,
  rename,
  rmdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

/**
 * 올린 파일을 디스크에 둔다.
 *
 * 예전에는 DB(bytea)에 담았다. 백업(pg_dump) 한 번으로 파일까지 함께
 * 보관되기 때문이었다. 첨부파일이 생기면서 그 방식이 버겁다 — 몇 MB 짜리
 * 파일이 쌓이면 DB 덤프가 그만큼 커지고, 글 한 줄 고치는 백업에도 파일이
 * 통째로 다시 들어간다. 그래서 파일은 디스크, DB 에는 "무엇이 어디 있다"
 * 만 둔다.
 *
 * **대신 백업이 두 갈래가 된다.** infra/backup.sh 가 pg_dump 와 이
 * 디렉터리를 함께 담는다. 컨테이너 안에 두면 배포마다 날아가므로
 * compose 에서 볼륨으로 붙인다.
 */

/** 파일을 둘 곳. 컨테이너에서는 볼륨이 붙는 자리다 */
export function uploadDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage/uploads");
}

/**
 * 비밀글에 붙인 파일을 둘 곳. 올린 파일과 **다른 디렉터리**다.
 *
 * 섞어 두면 언젠가 하나를 다른 쪽 코드가 만진다 — 암호화한 파일을 그대로
 * 내려주거나, 암호화하지 않은 파일을 복호화하려다 던지거나. 디렉터리부터 갈라 두면
 * 그런 일이 안 생긴다. 백업도 같은 자리(storage/) 아래라 함께 담긴다.
 */
export function secretDir() {
  return (
    process.env.SECRET_UPLOAD_DIR ?? path.join(process.cwd(), "storage/secrets")
  );
}

/**
 * 해시를 경로로 바꾼다. 앞 두 글자로 디렉터리를 나눈다.
 *
 * 한 디렉터리에 파일이 수만 개 쌓이면 ls 도 느려지고 파일 시스템에 따라
 * 한도에 걸린다. 두 글자로 나누면 256 개 아래로 흩어진다. git 이 객체를
 * 저장하는 방식과 같다.
 */
export function pathFor(id: string) {
  return placeIn(uploadDir(), id);
}

/** 비밀글 쪽 자리. 이름 규칙은 같고 뿌리만 다르다 */
export function secretPathFor(id: string) {
  return placeIn(secretDir(), id);
}

function placeIn(root: string, id: string) {
  if (!/^[0-9a-f]{8,64}$/.test(id)) {
    throw new Error(`저장 이름이 16진수가 아니다: ${id}`);
  }
  return path.join(root, id.slice(0, 2), id);
}

/** 이미 있으면 다시 쓰지 않는다 — 이름이 내용 해시라 내용이 같다 */
export async function writeFileOnce(id: string, bytes: Buffer) {
  const target = pathFor(id);
  try {
    await stat(target);
    return { path: target, written: false };
  } catch {
    // 없으면 쓴다
  }
  await writeAtomically(target, bytes);
  return { path: target, written: true };
}

/**
 * 쓰다 만 파일이 남지 않게 임시 이름으로 쓰고 옮긴다.
 *
 * 디렉터리를 만든 뒤 쓰기 전에, 다른 요청이 그 디렉터리를 비었다고 지울 수
 * 있다(removeFile). 그러면 「없는 디렉터리」 로 실패하므로 다시 만들고 한 번
 * 더 쓴다. 임시 파일이 놓인 뒤에는 디렉터리가 비지 않아 지워지지 않는다.
 */
async function writeAtomically(target: string, bytes: Buffer) {
  const temp = `${target}.${process.pid}.part`;
  for (let attempt = 0; ; attempt++) {
    await mkdir(path.dirname(target), { recursive: true });
    try {
      await writeFile(temp, bytes);
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT" || attempt > 0) {
        throw err;
      }
    }
  }
  await rename(temp, target);
}

/**
 * 파일을 지우고, 그 디렉터리(앞 두 글자)가 비었으면 함께 지운다(MYH-197).
 * 안 비었으면 rmdir 이 거절하니 그대로 둔다.
 */
async function removeFile(target: string) {
  try {
    await unlink(target);
  } catch {
    return false;
  }
  await rmdir(path.dirname(target)).catch(() => {});
  return true;
}

export async function readStoredFile(id: string) {
  try {
    return await readFile(pathFor(id));
  } catch {
    return null;
  }
}

export async function removeStoredFile(id: string) {
  return removeFile(pathFor(id));
}

/** 비밀글 파일을 쓴다. 이름이 내용 해시가 아니라 난수라 겹칠 일이 없다 */
export async function writeSecretFile(id: string, bytes: Buffer) {
  const target = secretPathFor(id);
  await writeAtomically(target, bytes);
  return target;
}

export async function readSecretFile(id: string) {
  try {
    return await readFile(secretPathFor(id));
  } catch {
    return null;
  }
}

export async function removeSecretFile(id: string) {
  return removeFile(secretPathFor(id));
}
