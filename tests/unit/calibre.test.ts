import { afterEach, describe, expect, it, vi } from "vitest";
import { digestHeader, fromCalibre, parseDigest, plainText, searchCalibre } from "@/lib/books/calibre";

afterEach(() => vi.unstubAllGlobals());

describe("Calibre 서재(MYH-226)", () => {
  it("Digest 응답을 RFC 2617 예와 같게 만든다", () => {
    const challenge = parseDigest(
      'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"',
    );
    const header = digestHeader(
      { user: "Mufasa", password: "Circle Of Life" },
      challenge,
      "GET",
      "/dir/index.html",
      "0a4f113b",
    );
    expect(header).toContain('response="6629fae49393a05397450978507c4ef1"');
    expect(header).toContain("qop=auth, nc=00000001");
    expect(header).toContain('opaque="5ccc069c403ebaf9f0171e9517f40e41"');
  });

  it("소개 HTML 은 글자만", () => {
    expect(plainText("<p>A <b>great</b> book.</p><p>Second&nbsp;line &amp; more</p>")).toBe(
      "A great book. Second line & more",
    );
  });

  it("Calibre 책을 찾은 책 꼴로", () => {
    const book = fromCalibre(
      "42",
      {
        title: "Magical Haskell",
        authors: ["Anton Antich"],
        comments: "<p>Learn Haskell with magic.</p>",
        identifiers: { isbn: "979-8868812811" },
      },
      "https://books.example.com",
    );
    expect(book).toMatchObject({
      title: "Magical Haskell",
      author: "Anton Antich",
      isbn: "9798868812811",
      cover: "calibre:42",
      description: "Learn Haskell with magic.",
      source: "calibre",
    });
  });

  it("401 이면 Digest 로 다시 묻고, 찾은 번호로 책을 가져온다", async () => {
    const challenge = 'Digest realm="calibre", nonce="abc", algorithm="MD5", qop="auth"';
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 401, headers: { "www-authenticate": challenge } }))
      .mockResolvedValueOnce(Response.json({ book_ids: [7] }))
      .mockResolvedValueOnce(new Response("", { status: 401, headers: { "www-authenticate": challenge } }))
      .mockResolvedValueOnce(Response.json({ "7": { title: "책", authors: ["지은이"], comments: "<p>소개</p>" } }));
    vi.stubGlobal("fetch", fetch);
    const found = await searchCalibre(
      { url: "https://books.example.com", user: "app", password: "pw" },
      "책",
      null,
      6,
    );
    expect(found.map((b) => b.title)).toEqual(["책"]);
    // 두 번째 요청은 로그인 머리글을 실었다
    expect(fetch.mock.calls[1][1].headers.authorization).toMatch(/^Digest username="app"/);
    expect(String(fetch.mock.calls[1][0])).toBe("https://books.example.com/ajax/search?query=title%3A%22%EC%B1%85%22&num=6");
  });
});

describe("Calibre 검색어 - 제목만", () => {
  it("낱말마다 title: 을 and 로, ISBN 이면 isbn:", async () => {
    const { calibreQuery } = await import("@/lib/books/calibre");
    expect(calibreQuery("클린 코드", null)).toBe('title:"클린" and title:"코드"');
    expect(calibreQuery(' the "mythical" ', null)).toBe('title:"the" and title:"mythical"');
    expect(calibreQuery("9780201835953", "9780201835953")).toBe("isbn:9780201835953");
  });
});

describe("넓게 찾기", () => {
  it("wide 면 Calibre 의 보통 검색", async () => {
    const { calibreQuery } = await import("@/lib/books/calibre");
    expect(calibreQuery('클린 "코드"', null, true)).toBe("클린  코드");
  });
});
