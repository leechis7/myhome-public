"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 뒤에서 하는 일(녹음 파일 받아쓰기, MYH-271)이 끝날 때까지 화면을 다시 읽는다 */
export default function RefreshWhile({ every = 10_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [router, every]);
  return null;
}
