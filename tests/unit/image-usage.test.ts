import { describe, expect, it } from "vitest";
import {
  describeUsage,
  findImageUsage,
  stripImage,
} from "@/lib/uploads/image-usage";

const HASH = "c414cd0e204de974f73753c7e28d7abc";

describe("findImageUsage", () => {
  it("본문에 없으면 0 이다", () => {
    expect(findImageUsage("그림이 없는 글이다.", HASH)).toEqual({
      count: 0,
      lines: [],
      excerpt: null,
    });
  });

  it("몇 번째 줄인지 1부터 센다", () => {
    const content = ["첫 줄", "", `![사진](/uploads/${HASH}.webp)`].join("\n");
    const usage = findImageUsage(content, HASH);
    expect(usage.count).toBe(1);
    expect(usage.lines).toEqual([3]);
  });

  it("여러 번 쓰면 모두 센다", () => {
    const content = [
      `![하나](/uploads/${HASH}.webp)`,
      "가운데",
      `또 ![둘](/uploads/${HASH}.webp) 그리고 ![셋](/uploads/${HASH}.webp)`,
    ].join("\n");
    const usage = findImageUsage(content, HASH);
    expect(usage.count).toBe(3);
    expect(usage.lines).toEqual([1, 3]);
  });

  // 마크다운을 파싱하지 않고 주소만 찾는다. img 태그로 넣어도 걸려야 한다.
  it("마크다운이 아니어도 주소만 있으면 찾는다", () => {
    const content = `<img src="/uploads/${HASH}.webp" alt="사진">`;
    expect(findImageUsage(content, HASH).count).toBe(1);
  });

  // 비밀글은 번호로 끝나는 주소다. files/3 이 files/31 에 걸리면 안 된다.
  it("뒤에 숫자가 이어지면 다른 것이다", () => {
    const content = "![가](/admin/secrets/files/31)\n![나](/admin/secrets/files/3)";
    expect(findImageUsage(content, "/admin/secrets/files/3").lines).toEqual([2]);
    expect(findImageUsage(content, "/admin/secrets/files/31").lines).toEqual([1]);
  });

  it("주소 안의 점을 정규식으로 읽지 않는다", () => {
    // `.` 를 그대로 두면 아무 글자나 맞는다. 32자를 흉내 낸 다른 줄이 걸리면 안 된다.
    const content = "![가](/uploads/ax.webp)";
    expect(findImageUsage(content, "/uploads/a.webp").count).toBe(0);
  });

  it("긴 줄은 찾은 자리만 잘라 준다", () => {
    const filler = "가".repeat(120);
    const content = `${filler} ![사진](/uploads/${HASH}.webp) ${filler}`;
    const { excerpt } = findImageUsage(content, HASH);
    expect(excerpt).toContain("…");
    expect(excerpt!.length).toBeLessThan(80);
  });

  // 그림만 있는 줄은 발췌가 마크다운과 똑같아진다. 화면은 그때 발췌를
  // 감추는데, 그 판단을 하려면 여기서 줄을 그대로 돌려줘야 한다.
  it("짧은 줄은 그대로 준다", () => {
    const content = `  ![사진](/uploads/${HASH}.webp)  `;
    expect(findImageUsage(content, HASH).excerpt).toBe(
      `![사진](/uploads/${HASH}.webp)`,
    );
  });
});

describe("describeUsage", () => {
  it("안 쓰면 그렇게 적는다", () => {
    expect(describeUsage({ count: 0, lines: [], excerpt: null })).toBe(
      "본문에 없음",
    );
  });

  it("한 번이면 줄 번호만", () => {
    expect(describeUsage({ count: 1, lines: [7], excerpt: null })).toBe(
      "본문 7번째 줄",
    );
  });

  it("여러 번이면 횟수까지", () => {
    expect(describeUsage({ count: 3, lines: [1, 3], excerpt: null })).toBe(
      "본문 1, 3번째 줄 (3번)",
    );
  });
});

describe("본문에서 그림 빼기(MYH-197)", () => {
  const hash = "37eee1f0089afdf83971083976c21822";
  const img = `![스크린샷.png](/uploads/${hash}.webp)`;

  it("그림만 있던 줄은 줄째 빼고 빈 줄이 겹치지 않게 한다", () => {
    expect(stripImage(`앞\n\n${img}\n\n뒤`, hash)).toBe("앞\n\n뒤");
    expect(stripImage(`${img}\n\n뒤`, hash)).toBe("뒤");
    expect(stripImage(`앞\n\n${img}`, hash)).toBe("앞");
    expect(stripImage(`앞\r\n\r\n${img}`, hash)).toBe("앞");
  });

  it("글 안에 섞인 그림은 그림만 뺀다", () => {
    expect(stripImage(`${img}헐 글이`, hash)).toBe("헐 글이");
    expect(stripImage(`가 ${img} 나`, hash)).toBe("가  나");
  });

  it("img 태그도 빼고, 다른 그림과 그냥 링크는 둔다", () => {
    expect(stripImage(`<img src="/uploads/${hash}.webp" width="300">`, hash)).toBe(
      "",
    );
    const other = "![딴](/uploads/3cd6d1d357a79b42502ee938f4775cd8.webp)";
    const link = `[원본](/uploads/${hash}.webp)`;
    expect(stripImage(`${other}\n${img}\n${link}`, hash)).toBe(
      `${other}\n${link}`,
    );
  });

  it("비밀글 주소는 뒤에 숫자가 이어지면 다른 것이다", () => {
    const a = "![a](/admin/secrets/files/3)";
    const b = "![b](/admin/secrets/files/31)";
    expect(stripImage(`${a}\n${b}`, "/admin/secrets/files/3")).toBe(b);
  });

  it("\\r\\n 으로 담긴 본문도 줄을 뺀다", () => {
    expect(stripImage(`앞\r\n\r\n${img}\r\n\r\n뒤`, hash)).toBe("앞\r\n\r\n뒤");
  });
});
