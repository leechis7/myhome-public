import { describe, expect, it } from "vitest";
import { contactRows, prettyUrl, telHref } from "@/lib/profile/contact-info";

describe("telHref", () => {
  it("숫자가 열 자리는 돼야 걸어 준다", () => {
    expect(telHref("010-1234-5678")).toBe("tel:01012345678");
    expect(telHref("+82 10 1234 5678")).toBe("tel:821012345678");
  });

  it("아직 다 적지 않은 번호에는 걸지 않는다", () => {
    // "010-" 처럼 적어 둔 값에 링크를 걸면 눌러도 아무 일도 안 난다
    expect(telHref("010-")).toBeUndefined();
    expect(telHref("")).toBeUndefined();
  });
});

describe("contactRows", () => {
  it("적힌 것만 줄로 만든다", () => {
    const rows = contactRows({
      email: "a@b.c",
      workEmail: null,
      phone: "  ",
    });
    expect(rows.map((r) => r.label)).toEqual(["개인 메일"]);
    expect(rows[0].href).toBe("mailto:a@b.c");
  });

  it("다 있으면 연락 수단이 먼저, 바깥 주소가 뒤다", () => {
    const rows = contactRows({
      email: "a@b.c",
      workEmail: "d@e.f",
      phone: "010-1234-5678",
      homepageUrl: "https://example.com",
      githubUrl: "https://github.com/example",
    });
    expect(rows.map((r) => r.label)).toEqual([
      "개인 메일",
      "회사 메일",
      "휴대폰",
      "홈페이지",
      "GitHub",
    ]);
    expect(rows[2].href).toBe("tel:01012345678");
  });

  // 컬럼도 관리 화면 칸도 진작 있었는데 여기서 내놓지 않아 어디에도
  // 안 나오고 있었다(MYH-164).
  it("주소는 읽기 좋게 보여 주고 새 창으로 연다", () => {
    const rows = contactRows({
      email: null,
      workEmail: null,
      phone: null,
      githubUrl: "https://github.com/example",
    });
    expect(rows).toEqual([
      {
        label: "GitHub",
        value: "github.com/example",
        href: "https://github.com/example",
        external: true,
      },
    ]);
  });

  // 앞을 빼고 적어 두면 브라우저가 우리 사이트 안을 뒤진다
  it("주소에 https 가 없으면 붙여 준다", () => {
    const [row] = contactRows({
      email: null,
      workEmail: null,
      phone: null,
      homepageUrl: "example.com/나",
    });
    expect(row.href).toBe("https://example.com/나");
    expect(row.value).toBe("example.com/나");
  });

  it("메일과 전화는 새 창이 아니다", () => {
    const rows = contactRows({
      email: "a@b.c",
      workEmail: null,
      phone: "010-1234-5678",
    });
    expect(rows.every((r) => r.external === undefined)).toBe(true);
  });

  it("아무것도 없으면 빈 목록이다", () => {
    expect(contactRows(undefined)).toEqual([]);
  });
});

describe("prettyUrl", () => {
  it("앞과 끝을 다듬는다", () => {
    expect(prettyUrl("https://example.com/")).toBe("example.com");
    expect(prettyUrl("http://example.com/나")).toBe("example.com/나");
    expect(prettyUrl("example.com")).toBe("example.com");
  });
});
