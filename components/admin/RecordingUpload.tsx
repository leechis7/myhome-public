"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadRecordingAction } from "@/app/admin/ai/meetings/actions";

/** 녹음 파일 올리기(MYH-271). 올리면 그 회의 화면으로 가서 받아쓰기를 기다린다 */
export default function RecordingUpload({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      aria-label="녹음 파일 올리기"
      className="mt-3 flex flex-wrap items-center gap-2 text-sm"
      action={(form) =>
        start(async () => {
          setError(null);
          const r = await uploadRecordingAction(form);
          if (r.id) router.push(`/admin/ai/meetings/${r.id}`);
          else setError(r.error ?? "올리지 못했습니다.");
        })
      }
    >
      <input
        type="file"
        name="file"
        accept="audio/*,.m4a"
        required
        disabled={disabled || pending}
        aria-label="녹음 파일"
        className="max-w-full text-sm file:mr-2 file:rounded-lg file:border file:border-border file:bg-transparent file:px-3 file:py-1.5"
      />
      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {pending ? "올리는 중…" : "📁 받아쓰기"}
      </button>
      <span className="text-xs text-muted">휴대폰 · 통화 녹음(m4a · mp3 · wav …, 95MB 까지). 소리는 받아쓰고 버립니다.</span>
      {error ? (
        <span role="alert" className="basis-full text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </form>
  );
}
