/**
 * @toast-ui/editor 의 타입. 패키지에 types/index.d.ts 가 있지만 package.json
 * 의 exports 가 그 길을 막아 TypeScript 가 찾지 못한다(저장소가 보관 상태라
 * 고쳐지지 않는다). 우리가 쓰는 만큼만 적는다.
 */
declare module "@toast-ui/editor" {
  export interface EditorOptions {
    el: HTMLElement;
    initialValue?: string;
    initialEditType?: "markdown" | "wysiwyg";
    hideModeSwitch?: boolean;
    height?: string;
    minHeight?: string;
    language?: string;
    usageStatistics?: boolean;
    customHTMLSanitizer?: (html: string) => string;
    events?: Record<string, (...args: unknown[]) => void>;
    hooks?: {
      /** 그림을 넣을 때. done(주소, 설명) 을 부르면 그 그림이 들어간다 */
      addImageBlobHook?: (
        blob: Blob | File,
        done: (url: string, alt?: string) => void,
      ) => void;
    };
  }

  export default class Editor {
    constructor(options: EditorOptions);
    getMarkdown(): string;
    setMarkdown(markdown: string, cursorToEnd?: boolean): void;
    destroy(): void;
  }
}

/** 우리말 풀이 글자를 등록한다. 들이기만 하면 된다 */
declare module "@toast-ui/editor/dist/i18n/ko-kr";
