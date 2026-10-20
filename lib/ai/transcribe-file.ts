/**
 * 녹음 파일 하나를 통째로 받아쓴다(MYH-271). 30초 조각(lib/ai/transcribe.ts)과 달리
 * 길다 - 한 시간 회의면 받아쓴 글이 수만 자라 답 길이를 넉넉히 둔다. 18MB 가 넘으면
 * Gemini Files API 로 올려 쓰고, 다 쓰면 바로 지운다(소리를 남기지 않는다).
 */

const API = "https://generativelanguage.googleapis.com";
const INLINE_MAX = 18 * 1024 * 1024;
const MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];

const PROMPT = `이 녹음을 한국어로 들리는 그대로 받아써라. 다른 말은 붙이지 마라.
말하는 사람이 바뀌거나 이야기가 바뀌면 빈 줄로 나눠라. 알아들을 수 없는 곳은 (…) 로 둔다.`;

type Part = { inline_data: { mime_type: string; data: string } } | { file_data: { mime_type: string; file_uri: string } };

async function upload(bytes: Buffer, type: string, key: string) {
  const start = await fetch(`${API}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": type,
      "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "meeting" } }),
  });
  const url = start.headers.get("x-goog-upload-url");
  if (!start.ok || !url) throw new Error(`올리기 시작 실패 ${start.status}`);
  const done = await fetch(url, {
    method: "POST",
    headers: { "X-Goog-Upload-Command": "upload, finalize", "X-Goog-Upload-Offset": "0" },
    body: new Uint8Array(bytes),
  });
  const file = ((await done.json()) as { file?: { name: string; uri: string; state?: string } }).file;
  if (!done.ok || !file) throw new Error(`올리기 실패 ${done.status}`);
  // 소리 파일은 Google 이 잠깐 다듬은 뒤(PROCESSING) 쓸 수 있다
  for (let i = 0; i < 60 && file.state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(`${API}/v1beta/${file.name}`, { headers: { "x-goog-api-key": key } });
    file.state = ((await r.json()) as { state?: string }).state;
  }
  if (file.state === "FAILED") throw new Error("Google 이 파일을 읽지 못했다");
  return file;
}

async function remove(name: string, key: string) {
  await fetch(`${API}/v1beta/${name}`, { method: "DELETE", headers: { "x-goog-api-key": key } }).catch(() => {});
}

export async function transcribeFile(bytes: Buffer, type: string, key: string, inlineMax = INLINE_MAX) {
  let uploaded: { name: string; uri: string } | null = null;
  try {
    let part: Part;
    if (bytes.length <= inlineMax) {
      part = { inline_data: { mime_type: type, data: bytes.toString("base64") } };
    } else {
      uploaded = await upload(bytes, type, key);
      part = { file_data: { mime_type: type, file_uri: uploaded.uri } };
    }
    let last = "";
    for (const model of MODELS) {
      const res = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: PROMPT }, part] }],
          generationConfig: { temperature: 0, maxOutputTokens: 65_536 },
        }),
        signal: AbortSignal.timeout(15 * 60 * 1000),
      });
      if (!res.ok) {
        last = `${model} ${res.status}`;
        if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
        break;
      }
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (body.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    }
    throw new Error(`받아쓰기 실패 ${last}`);
  } finally {
    if (uploaded) await remove(uploaded.name, key);
  }
}

/** 받아쓴 글을 조각으로(빈 줄마다). 너무 긴 조각은 다시 자른다 */
export function splitTranscript(text: string, max = 2000) {
  const out: string[] = [];
  for (const para of text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    for (let i = 0; i < para.length; i += max) out.push(para.slice(i, i + max));
  }
  return out;
}
