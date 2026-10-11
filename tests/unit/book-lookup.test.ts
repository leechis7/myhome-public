import { describe, expect, it, vi } from "vitest";
import { asIsbn, fromKakao, fromOpenLibrary, isCoverUrl, summarize } from "@/lib/books/lookup";

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
      summary: null,
      description: null,
      published: null,
      source: "kakao",
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

describe("카카오 키 모양(MYH-231)", () => {
  it("영숫자 20~64자만 받는다", async () => {
    const { isKakaoKey } = await import("@/lib/books/lookup-key");
    expect(isKakaoKey("a".repeat(32))).toBe(true);
    expect(isKakaoKey("짧다")).toBe(false);
    expect(isKakaoKey("a".repeat(32) + " ")).toBe(false);
    expect(isKakaoKey("KakaoAK " + "a".repeat(32))).toBe(false);
  });
});

describe("소개 밑그림(카카오 소개 앞부분)", () => {
  it("문장 끝에서 120자 안으로 끊는다", () => {
    const text =
      "1980년 5월 광주를 그린 소설이다. 열다섯 살 동호의 눈으로 그날을 따라간다. 이어지는 여섯 장은 그 뒤에 남은 사람들의 이야기를 저마다의 목소리로 들려주며 오래 이어진다 그리고 계속";
    expect(summarize(text)).toBe("1980년 5월 광주를 그린 소설이다. 열다섯 살 동호의 눈으로 그날을 따라간다.");
  });

  it("끊을 자리가 없으면 낱말 사이에서 자르고 … 를 붙인다", () => {
    const out = summarize("가나다라 ".repeat(40));
    expect(out!.endsWith("…")).toBe(true);
    expect(out!.length).toBeLessThanOrEqual(121);
  });

  it("비었으면 null, 짧은 한 문장은 그대로", () => {
    expect(summarize("")).toBeNull();
    expect(summarize(undefined)).toBeNull();
    expect(summarize("  짧은 책이다.  ")).toBe("짧은 책이다.");
  });
});

describe("찾은 책 합치기(카카오 → 내 서재 → Open Library)", () => {
  const base = { publisher: null, url: null, summary: null, description: null, cover: null, published: null };
  it("같은 ISBN 은 앞의 것을 두고 빈 소개 · 표지를 뒤의 것으로 채운다", async () => {
    const { mergeFound, lookupSource } = await import("@/lib/books/lookup");
    const merged = mergeFound([
      { ...base, title: "원서", author: "", isbn: "9780201835953", source: "kakao" },
      { ...base, title: "다른 책", author: "B", isbn: null, source: "kakao" },
      { ...base, title: "원서(서재)", author: "A", isbn: "9780201835953", source: "calibre", description: "Essays…", cover: "calibre:695" },
      { ...base, title: "원서(OL)", author: "A", isbn: "9780201835953", source: "openlibrary" },
    ]);
    expect(merged.map((b) => b.title)).toEqual(["원서", "다른 책"]);
    // 카카오 줄에 비어 있던 지은이도 서재 것으로
    expect(merged[0]).toMatchObject({
      author: "A",
      description: "Essays…",
      cover: "calibre:695",
      sources: ["kakao", "calibre", "openlibrary"],
    });
    expect(lookupSource(["kakao", "calibre", "openlibrary"])).toBe("카카오 · 내 서재 · Open Library");
    expect(lookupSource(["openlibrary"])).toBe("Open Library");
  });
});

describe("출판일 보이기", () => {
  it("아는 만큼 「해.달.날」 로, 모르는 값은 버린다", async () => {
    const { publishedLabel } = await import("@/lib/books/lookup");
    expect(publishedLabel("2014-05-19T00:00:00.000+09:00")).toBe("2014.5.19");
    expect(publishedLabel("1995-08")).toBe("1995.8");
    expect(publishedLabel(1975)).toBe("1975");
    expect(publishedLabel("0101-01-01T00:00:00+00:00")).toBeNull();
    expect(publishedLabel("")).toBeNull();
    expect(publishedLabel(null)).toBeNull();
  });
});

describe("책 찾기 - 제목만 · 넓게", () => {
  it("기본은 카카오 target=title · Open Library title=, 넓게면 둘 다 뺀다", async () => {
    const { searchBooks } = await import("@/lib/books/lookup");
    const fetch = vi.fn().mockImplementation(async () => Response.json({ documents: [], docs: [] }));
    vi.stubGlobal("fetch", fetch);
    await searchBooks("클린 코드", { kakaoKey: "k", calibre: null, order: ["kakao", "openlibrary"] });
    const urls = fetch.mock.calls.map(([u]) => String(u));
    expect(urls.find((u) => u.includes("kakao"))).toContain("target=title");
    expect(urls.find((u) => u.includes("openlibrary"))).toContain("title=");
    fetch.mockClear();
    await searchBooks("클린 코드", { kakaoKey: "k", calibre: null, order: ["kakao", "openlibrary"], wide: true });
    const wide = fetch.mock.calls.map(([u]) => String(u));
    expect(wide.find((u) => u.includes("kakao"))).not.toContain("target=");
    expect(wide.find((u) => u.includes("openlibrary"))).toMatch(/[?&]q=/);
    vi.unstubAllGlobals();
  });
});
