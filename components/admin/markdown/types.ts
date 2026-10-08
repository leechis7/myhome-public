/**
 * 위지윅 편집기 하나가 지켜야 할 것(MYH-118).
 *
 * - initial 로 받은 마크다운을 그린다. 편집기를 새로 만들 때만 읽는다
 * - onReady: 다 그렸을 때 **손대지 않은 채 뽑은 마크다운**을 한 번 알린다.
 *   MarkdownField 는 이것을 기준으로 「실제로 고쳤는가」 를 가른다
 * - onChange: 사람이 고칠 때마다 뽑은 마크다운을 알린다
 * - onImage: 붙여넣거나 끌어놓은 그림을 올리고 넣을 주소를 돌려준다(MYH-192).
 *   없으면 그림을 받지 않는다(편집기 기본 동작에 맡긴다)
 */
export type EditorProps = {
  initial: string;
  onReady: (markdown: string) => void;
  onChange: (markdown: string) => void;
  onImage?: (file: File) => Promise<UploadedImage>;
};

export type UploadedImage = { url: string; alt: string };

/** 붙여넣거나 끌어놓은 것 가운데 그림 파일만 */
export function imageFiles(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
}
