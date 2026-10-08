import { formatBytes, isImageType } from "@/lib/upload-limits";

export type PublicAttachment = {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * 글에 붙은 파일. 글 아래에 목록으로 둔다.
 *
 * 그림은 눌렀을 때 화면에 바로 뜨고 나머지는 내려받는다 — 어느 쪽인지는
 * 내려주는 쪽에서 정한다(app/attachments/[id]/route.ts). 여기서는 아이콘
 * 대신 형식과 크기를 글자로 적는다. 무엇을 받게 되는지 누르기 전에 알 수
 * 있어야 한다.
 */
export default function AttachmentList({
  rows,
}: {
  rows: PublicAttachment[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium">첨부파일</h2>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <a
              href={`/attachments/${row.id}`}
              className="text-sm underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
              // 그림이 아니면 내려받기다. 새 창으로 열지 않는다.
              download={isImageType(row.mimeType) ? undefined : row.filename}
            >
              {row.filename}
            </a>
            <span className="ml-2 text-xs text-faint">
              {formatBytes(row.size)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
