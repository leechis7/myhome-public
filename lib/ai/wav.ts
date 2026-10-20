/**
 * 녹음한 소리를 WAV 로(MYH-265). 브라우저마다 MediaRecorder 의 꼴이 달라
 * (크롬 webm, 사파리 mp4) Gemini 가 확실히 받는 16비트 PCM WAV 로 직접 만든다.
 * 브라우저 · 시험이 함께 쓴다.
 */
export function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt 길이
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 한 소리길
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/** 조각들을 하나로 */
export function joinSamples(parts: Float32Array[]) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** 소리가 거의 없는가(가장 큰 소리가 문턱 아래). 조용한 조각은 보내지 않는다 */
export function isSilent(samples: Float32Array, threshold = 0.01) {
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) >= threshold) return false;
  return true;
}
