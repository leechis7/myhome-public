"use client";

import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import {
  remarkPluginsCtx,
  remarkStringifyOptionsCtx,
} from "@milkdown/kit/core";
import { remarkGFMPlugin } from "@milkdown/kit/preset/gfm";
import { upload, uploadConfig } from "@milkdown/kit/plugin/upload";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "./milkdown.css";
import { imageFiles, type EditorProps } from "./types";

type Node = { type: string; title?: string | null; children?: Node[] };

/**
 * 제목 없는 그림의 title 을 "" 로 채운다. Milkdown 의 그림 노드는 title 을
 * 글자로만 받는데 remark 는 제목이 없으면 null 을 준다 - 그대로 두면 오류가
 * 나고 그림이 <br /> 로 바뀐다. 우리 그림은 모두 제목이 없다
 */
function imageTitles() {
  return (tree: Node) => {
    const walk = (n: Node) => {
      if (n.type === "image" && n.title == null) n.title = "";
      n.children?.forEach(walk);
    };
    walk(tree);
  };
}

/**
 * Milkdown(Crepe). 마크다운이 본래 자료형이라 왕복이 셋 가운데 가장 곱다.
 * 운영 글 12편 중 11편이 화면까지 그대로 돌아왔다(MYH-118 비교).
 */
export default function MilkdownEditor({
  initial,
  onReady,
  onChange,
  onImage,
}: EditorProps) {
  const root = useRef<HTMLDivElement>(null);
  // 편집기는 처음 한 번만 만든다. 부모가 다시 그려져 함수가 바뀌어도
  // 편집기를 다시 만들지 않도록 최신 것을 effect 안에서 읽는다
  const handlers = useRef({ onReady, onChange, onImage });
  // initial 은 만들 때만 읽는다. 바뀌면 부모가 key 로 새로 만든다
  const start = useRef(initial);
  useEffect(() => {
    handlers.current = { onReady, onChange, onImage };
  });

  useEffect(() => {
    if (!root.current) return;
    // 한 번 만들 때마다 새 자리를 준다. destroy 는 비동기라, 개발 모드처럼
    // effect 가 두 번 돌면 옛 편집기가 사라지기 전에 새 것이 같은 자리에
    // 붙어 편집기가 둘이 됐다
    const host = document.createElement("div");
    root.current.append(host);
    const crepe = new Crepe({
      root: host,
      defaultValue: start.current,
      features: {
        // 그림 블록은 설명(caption) 없는 그림에서 오류를 내고 그림을 빠뜨린다.
        // 끄면 그림은 여느 인라인 그림(![](...))으로 남는다
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
        [Crepe.Feature.AI]: false,
        // 위쪽 도구 줄. 기본은 꺼져 있다 - 고르지 않아도 단추가 보이게 켠다
        [Crepe.Feature.TopBar]: true,
      },
      // 안내 글자와 「/」 메뉴를 우리말로. 우리 글에 쓰지 않는 것(제목 4~6,
      // 할 일 목록, 수식)은 메뉴에서 뺀다. 그림은 올리기 칸으로 넣는다
      featureConfigs: {
        [Crepe.Feature.TopBar]: {
          headingOptions: [
            { label: "문단", level: null },
            { label: "제목 1", level: 1 },
            { label: "제목 2", level: 2 },
            { label: "제목 3", level: 3 },
          ],
        },
        [Crepe.Feature.Placeholder]: {
          text: "여기에 씁니다. / 를 치면 제목 · 목록 · 표 따위를 넣을 수 있습니다",
          mode: "doc",
        },
        [Crepe.Feature.BlockEdit]: {
          textGroup: {
            label: "글",
            text: { label: "문단" },
            h1: { label: "제목 1" },
            h2: { label: "제목 2" },
            h3: { label: "제목 3" },
            h4: null,
            h5: null,
            h6: null,
            quote: { label: "인용" },
            divider: { label: "가로줄" },
          },
          listGroup: {
            label: "목록",
            bulletList: { label: "점 목록" },
            orderedList: { label: "번호 목록" },
            taskList: null,
          },
          advancedGroup: {
            label: "그 밖",
            image: null,
            codeBlock: { label: "코드 블록" },
            table: { label: "표" },
            math: null,
          },
        },
      },
    });
    // 뽑는 모양을 우리 글에 맞춘다: - 목록, --- 가로줄, 표 칸은 줄 맞추지 않음
    crepe.editor.config((ctx) => {
      ctx.update(remarkStringifyOptionsCtx, (prev) => ({
        ...prev,
        bullet: "-" as const,
        rule: "-" as const,
      }));
      ctx.set(remarkGFMPlugin.options.key, { tablePipeAlign: false });
      ctx.update(remarkPluginsCtx, (prev) => [
        ...prev,
        { plugin: imageTitles, options: {} },
      ]);
    });
    // 붙여넣거나 끌어놓은 그림을 올려 그 자리에 넣는다(MYH-192). 올릴 길이
    // 없는 칸에서는 이 기능을 붙이지 않는다
    if (handlers.current.onImage) {
      crepe.editor
        .config((ctx) => {
          ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            // HTML 로 붙여넣은 그림(웹에서 복사한 것)도 파일이면 올린다
            enableHtmlFileUploader: true,
            uploader: async (files, schema) => {
              const send = handlers.current.onImage;
              const nodes = [];
              for (const file of imageFiles(files)) {
                if (!send) break;
                // 하나가 실패해도 나머지는 넣는다. 까닭은 본문 칸 아래에 뜬다
                const image = await send(file).catch(() => null);
                const node =
                  image &&
                  schema.nodes.image?.createAndFill({
                    src: image.url,
                    alt: image.alt,
                    title: "",
                  });
                if (node) nodes.push(node);
              }
              return nodes;
            },
          }));
        })
        .use(upload);
    }
    let ready = false;
    crepe.on((l) =>
      l.markdownUpdated((_ctx, md) => {
        if (ready) handlers.current.onChange(md);
      }),
    );
    let alive = true;
    crepe.create().then(() => {
      if (!alive) return;
      ready = true;
      handlers.current.onReady(crepe.getMarkdown());
    });
    return () => {
      alive = false;
      host.remove();
      crepe.destroy();
    };
  }, []);

  return <div ref={root} data-editor="milkdown" className="min-h-60" />;
}
