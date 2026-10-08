"use server";

import { increaseViewCount } from "@/lib/posts";

/**
 * 글을 열었을 때 조회수를 올린다.
 * 화면에서 방문자당 한 번만 부르므로 여기서는 따로 막지 않는다.
 */
export async function recordView(postId: number) {
  if (!Number.isInteger(postId)) return;
  await increaseViewCount(postId);
}
