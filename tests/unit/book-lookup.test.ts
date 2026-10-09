import { describe, expect, it } from "vitest";
import { asIsbn, fromKakao, fromOpenLibrary, isCoverUrl } from "@/lib/book-lookup";

describe("책 찾기(MYH-226)", () => {
  it("10 · 13자리 숫자는 ISBN 으로 본다", () => {
    expect(asIsbn("978-89-364-3412-0")).toBe("9788936434120");
    expect(asIsbn("89 364 3412 x")).toBe("893643412X");
    expect(asIsbn("소년이 온다")).toBeNull();
    expect(asIsbn("12345")).toBeNull();
  });

  it("카카오 응답에서 13자리 ISBN 과 원본 표지 주소를 쓴다", () => {
    const [book] = fromKakao({
      documents: [
        {
          title: "소년이 온다 ",
          authors: ["한강"],
          publisher: "창비",
          isbn: "8936434128 9788936434120",
          url: "https://search.daum.net/search?q=x",
          thumbnail:
            "https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F1467038",
        },
      ],
    });
    expect(book).toEqual({
      title: "소년이 온다",
      author: "한강",
      publisher: "창비",
      isbn: "9788936434120",
      url: "https://search.daum.net/search?q=x",
      cover: "https://t1.daumcdn.net/lbook/image/1467038",
    });
  });

  it("Open Library 응답을 같은 모양으로 바꾼다", () => {
    const [book] = fromOpenLibrary({
      docs: [{ title: "소년이 온다", author_name: ["Han Kang"], key: "/works/OL1W", cover_i: 8047485 }],
    });
    expect(book.cover).toBe("https://covers.openlibrary.org/b/id/8047485-L.jpg");
    expect(book.url).toBe("https://openlibrary.org/works/OL1W");
    expect(book.author).toBe("Han Kang");
  });

  it("표지는 정해 둔 곳에서 https 로만 받는다", () => {
    expect(isCoverUrl("https://t1.daumcdn.net/lbook/image/1")).toBe(true);
    expect(isCoverUrl("https://ia800100.us.archive.org/view/a.jpg")).toBe(true);
    expect(isCoverUrl("http://t1.daumcdn.net/lbook/image/1")).toBe(false);
    expect(isCoverUrl("https://evil.example/t1.daumcdn.net")).toBe(false);
    expect(isCoverUrl("https://t1.daumcdn.net.evil.example/a")).toBe(false);
    expect(isCoverUrl("https://127.0.0.1/a")).toBe(false);
    expect(isCoverUrl("https://user@t1.daumcdn.net/a")).toBe(false);
    expect(isCoverUrl("https://t1.daumcdn.net:8443/a")).toBe(false);
    expect(isCoverUrl("아무 글")).toBe(false);
  });
});
