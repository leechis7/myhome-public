import { describe, expect, it } from "vitest";
import {
  escapeLineStarts,
  fixTablePipes,
} from "@/components/admin/markdown/markdown-fixes";

describe("escapeLineStarts", () => {
  // 운영 글에 있던 모양: 줄바꿈(두 칸)으로 이은 「- 」 줄. 목록이 아니다
  it("줄머리의 목록 표시를 막는다", () => {
    expect(escapeLineStarts("- 서비스 방식  \n- 수신 주소")).toBe(
      "\\- 서비스 방식  \n\\- 수신 주소",
    );
    expect(escapeLineStarts("* 별\n+ 더하기")).toBe("\\* 별\n\\+ 더하기");
  });

  it("번호 목록은 점과 괄호 앞을 막는다", () => {
    expect(escapeLineStarts("1) 접속합니다\n2. 로그인합니다")).toBe(
      "1\\) 접속합니다\n2\\. 로그인합니다",
    );
  });

  it("제목 · 인용 표시도 막는다", () => {
    expect(escapeLineStarts("## 제목 아님\n> 인용 아님")).toBe(
      "\\## 제목 아님\n\\> 인용 아님",
    );
  });

  it("뒤에 빈칸이 없으면 그대로 둔다", () => {
    for (const line of ["-1도", "#태그", "1.5배", "2)번"]) {
      expect(escapeLineStarts(line)).toBe(line);
    }
  });

  it("이미 막힌 것은 두 번 막지 않는다", () => {
    expect(escapeLineStarts("\\- 이미 막음")).toBe("\\- 이미 막음");
  });
});

describe("fixTablePipes", () => {
  it("표 줄의 코드 안 | 를 막는다", () => {
    expect(fixTablePipes("| 가 | `a | b` |")).toBe("| 가 | `a \\| b` |");
  });

  it("이미 막힌 것과 표 밖의 코드는 그대로다", () => {
    expect(fixTablePipes("| `c \\| d` |")).toBe("| `c \\| d` |");
    expect(fixTablePipes("`x | y` 는 표가 아니다")).toBe(
      "`x | y` 는 표가 아니다",
    );
  });

  it("코드 밖의 | 는 칸 나눔이라 건드리지 않는다", () => {
    expect(fixTablePipes("| 가 | 나 |")).toBe("| 가 | 나 |");
  });
});
