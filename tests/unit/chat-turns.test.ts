import { describe, expect, it } from "vitest";
import { turns } from "@/lib/ai/chat-turns";

const pic = (data = "QUJD") => ({ type: "image/png", data });

describe("turns (MYH-248)", () => {
  it("그림만 보낸 말도 받는다", () => {
    expect(turns([{ role: "user", content: "", images: [pic()] }])).toEqual([
      { role: "user", content: "", images: [pic()] },
    ]);
  });

  it("꼴이 틀린 그림 · AI 말의 그림은 버린다", () => {
    const list = turns([
      { role: "user", content: "a", images: [{ type: "text/html", data: "QUJD" }, { type: "image/png", data: "<x>" }] },
      { role: "assistant", content: "b", images: [pic()] },
      { role: "user", content: "c" },
    ]);
    expect(list).toEqual([
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
    ]);
  });

  it("한 마디에 4장까지", () => {
    const [one] = turns([{ role: "user", content: "", images: Array.from({ length: 6 }, () => pic()) }]);
    expect(one.images).toHaveLength(4);
  });

  it("그림은 뒤에서부터 8장만 넘기고 앞의 것은 말로 바꾼다", () => {
    const four = Array.from({ length: 4 }, () => pic());
    const list = turns([
      { role: "user", content: "처음", images: four },
      { role: "assistant", content: "응" },
      { role: "user", content: "", images: four },
      { role: "assistant", content: "응" },
      { role: "user", content: "마지막", images: four },
    ]);
    expect(list[0]).toEqual({ role: "user", content: "처음\n(그림 4장을 보냈다)" });
    expect(list[2].images).toHaveLength(4);
    expect(list[4].images).toHaveLength(4);
  });

  it("마지막이 사람의 말이 아니면 비운다", () => {
    expect(turns([{ role: "user", content: "a" }, { role: "assistant", content: "b" }])).toEqual([]);
  });
});
