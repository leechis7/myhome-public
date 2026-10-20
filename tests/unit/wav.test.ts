import { describe, expect, it } from "vitest";
import { encodeWav, isSilent, joinSamples } from "@/lib/ai/wav";

describe("회의 녹음 WAV (MYH-265)", () => {
  it("16비트 PCM WAV 머리를 쓴다", () => {
    const wav = new DataView(encodeWav(new Float32Array([0, 1, -1, 0.5]), 16000));
    const ascii = (o: number) => String.fromCharCode(...[0, 1, 2, 3].map((i) => wav.getUint8(o + i)));
    expect([ascii(0), ascii(8), ascii(12), ascii(36)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(wav.getUint32(24, true)).toBe(16000);
    expect(wav.getUint16(34, true)).toBe(16);
    expect(wav.getUint32(40, true)).toBe(8);
    expect([wav.getInt16(46, true), wav.getInt16(48, true)]).toEqual([32767, -32768]);
  });

  it("조각을 잇고, 조용한지 본다", () => {
    const joined = joinSamples([new Float32Array([0.001]), new Float32Array([0.002, 0.003])]);
    expect(Array.from(joined)).toEqual([0.001, 0.002, 0.003].map((v) => Math.fround(v)));
    expect(isSilent(joined)).toBe(true);
    expect(isSilent(new Float32Array([0, 0.2]))).toBe(false);
  });
});
