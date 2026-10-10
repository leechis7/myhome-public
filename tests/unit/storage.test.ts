import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  pathFor,
  readStoredFile,
  removeStoredFile,
  uploadDir,
  writeFileOnce,
} from "@/lib/uploads/storage";

describe("파일 저장 자리", () => {
  it("앞 두 글자로 디렉터리를 나눈다", () => {
    const id = "161149f2958f344fff651db969ea14db";
    expect(pathFor(id)).toBe(path.join(uploadDir(), "16", id));
  });

  // 한 디렉터리에 수만 개가 쌓이면 느려진다. 256 개 아래로 흩어진다.
  it("다른 해시는 다른 자리에 간다", () => {
    const a = pathFor("aa11223344556677889900aabbccddee");
    const b = pathFor("bb11223344556677889900aabbccddee");
    expect(path.dirname(a)).not.toBe(path.dirname(b));
  });

  // 이름은 우리가 만든 해시다. 바깥에서 온 값을 그대로 쓰면 경로를 벗어난다.
  it("16진수가 아니면 막는다", () => {
    expect(() => pathFor("../../etc/passwd")).toThrow();
    expect(() => pathFor("../aa11223344556677889900aabbccddee")).toThrow();
    expect(() => pathFor("AA11")).toThrow();
    expect(() => pathFor("")).toThrow();
    expect(() => pathFor("zz11223344556677889900aabbccddee")).toThrow();
  });

  it("자리가 저장 디렉터리 안에 있다", () => {
    const id = "0011223344556677889900aabbccddee";
    expect(pathFor(id).startsWith(uploadDir() + path.sep)).toBe(true);
  });
});

describe("지우면 빈 디렉터리도 치운다(MYH-197)", () => {
  let root: string;
  const before = process.env.UPLOAD_DIR;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "myhome-storage-"));
    process.env.UPLOAD_DIR = root;
  });

  afterEach(async () => {
    process.env.UPLOAD_DIR = before;
    await rm(root, { recursive: true, force: true });
  });

  it("같은 디렉터리에 남은 것이 있으면 두고, 비면 지운다", async () => {
    const a = "ab000000000000000000000000000001";
    const b = "ab000000000000000000000000000002";
    await writeFileOnce(a, Buffer.from("a"));
    await writeFileOnce(b, Buffer.from("b"));
    const shard = path.join(root, "ab");

    expect(await removeStoredFile(a)).toBe(true);
    expect(existsSync(shard)).toBe(true);
    expect(await removeStoredFile(b)).toBe(true);
    expect(existsSync(shard)).toBe(false);

    // 지운 자리에 다시 쓸 수 있다
    await writeFileOnce(a, Buffer.from("again"));
    expect(String(await readStoredFile(a))).toBe("again");
  });

  it("없는 파일을 지우면 false 이고 아무것도 건드리지 않는다", async () => {
    expect(await removeStoredFile("cd000000000000000000000000000001")).toBe(false);
  });
});
