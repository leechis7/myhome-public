"use client";

import { useEffect } from "react";
import { recordView } from "@/app/blog/view-actions";

/**
 * 조회수를 한 번만 올린다.
 * 같은 탭에서 새로고침해도 다시 세지 않도록 sessionStorage에 표시를 남긴다.
 * 화면을 그리지 않는 컴포넌트다.
 */
export default function ViewCounter({ postId }: { postId: number }) {
  useEffect(() => {
    const key = `viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 저장이 막힌 환경에서는 매번 센다
    }
    void recordView(postId);
  }, [postId]);

  return null;
}
