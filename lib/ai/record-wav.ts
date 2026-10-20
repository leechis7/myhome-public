import { encodeWav, joinSamples } from "@/lib/ai/wav";

/**
 * 마이크를 16kHz WAV 하나로 녹음한다(일기를 말로, MYH-270). 회의(30초 조각)와 달리
 * 끝날 때 한 번에 돌려준다. 화면 쪽에서만 쓴다.
 */
export class WavRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private parts: Float32Array[] = [];

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    this.ctx = new AudioContext({ sampleRate: 16_000 });
    const source = this.ctx.createMediaStreamSource(this.stream);
    const proc = this.ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => this.parts.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    source.connect(proc);
    proc.connect(this.ctx.destination);
  }

  /** 녹음한 길이(초) */
  seconds() {
    return this.parts.reduce((n, p) => n + p.length, 0) / (this.ctx?.sampleRate ?? 16_000);
  }

  async stop() {
    const rate = this.ctx?.sampleRate ?? 16_000;
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    const samples = joinSamples(this.parts);
    this.parts = [];
    return new Blob([encodeWav(samples, rate)], { type: "audio/wav" });
  }
}
