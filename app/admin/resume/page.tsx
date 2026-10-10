import { redirect } from "next/navigation";

/**
 * 옛 이력서 관리 주소. 프로필 · 이력서 한 화면으로 합쳤다(MYH-218). 그 화면은 /admin/profile(MYH-234).
 * 즐겨찾기 · 공개 화면의 링크가 그대로 닿게 그 절로 넘긴다.
 */
export default function OldResumeAdmin() {
  redirect("/admin/profile#resume");
}
