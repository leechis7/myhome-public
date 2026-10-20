import AiTabs from "@/components/admin/AiTabs";

/** AI 화면(MYH-274). 대화 · 회의 · 음성 · 설정을 한 탭 줄 아래에 모은다 */
export default function AiLayout({ children }: LayoutProps<"/admin/ai">) {
  return (
    <>
      <AiTabs />
      {children}
    </>
  );
}
