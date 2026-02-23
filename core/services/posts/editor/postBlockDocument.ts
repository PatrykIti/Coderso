export const POST_BLOCK_DOCUMENT_VERSION = 1 as const;

export const POST_BLOCK_TYPES = [
  "paragraph",
  "writing-canvas",
  "toc",
  "heading",
  "list",
  "quote",
  "code",
  "image",
  "separator",
  "callout",
  "button",
  "embed",
] as const;

export type PostBlockType = (typeof POST_BLOCK_TYPES)[number];

export const WRITING_CANVAS_VERSION = 1 as const;

export const WRITING_CANVAS_NODE_TYPES = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "image",
] as const;

export const WRITING_CANVAS_WRAP_VALUES = ["none", "left", "right"] as const;
export const WRITING_CANVAS_WIDTH_VALUES = [25, 33, 50, 66, 100] as const;

export type WritingCanvasNodeType = (typeof WRITING_CANVAS_NODE_TYPES)[number];
export type WritingCanvasWrap = (typeof WRITING_CANVAS_WRAP_VALUES)[number];
export type WritingCanvasWidth = (typeof WRITING_CANVAS_WIDTH_VALUES)[number];

export type WritingCanvasParagraphNode = {
  id: string;
  type: "paragraph";
  text: string;
};

export type WritingCanvasHeadingNode = {
  id: string;
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  anchorId?: string;
};

export type WritingCanvasListNode = {
  id: string;
  type: "list";
  ordered: boolean;
  items: string[];
};

export type WritingCanvasQuoteNode = {
  id: string;
  type: "quote";
  text: string;
};

export type WritingCanvasImageNode = {
  id: string;
  type: "image";
  mediaId: string | null;
  alt: string;
  caption?: string;
  wrap: WritingCanvasWrap;
  widthPercent: WritingCanvasWidth;
};

export type WritingCanvasNode =
  | WritingCanvasParagraphNode
  | WritingCanvasHeadingNode
  | WritingCanvasListNode
  | WritingCanvasQuoteNode
  | WritingCanvasImageNode;

export type WritingCanvasContent = {
  version: typeof WRITING_CANVAS_VERSION;
  nodes: WritingCanvasNode[];
};

export const createEmptyWritingCanvasContent = (): WritingCanvasContent => ({
  version: WRITING_CANVAS_VERSION,
  nodes: [
    {
      id: "node-1",
      type: "paragraph",
      text: "",
    },
  ],
});

export type PostBlockAttrs = Record<string, unknown>;

export type PostBlock = {
  id: string;
  type: PostBlockType;
  attrs: PostBlockAttrs;
  content: unknown;
};

export type PostBlockDocumentMeta = {
  title?: string;
  excerpt?: string;
  readingTimeMinutes?: number;
};

export type PostBlockDocument = {
  version: typeof POST_BLOCK_DOCUMENT_VERSION;
  blocks: PostBlock[];
  meta: PostBlockDocumentMeta;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const isPostBlockType = (value: unknown): value is PostBlockType =>
  typeof value === "string" &&
  (POST_BLOCK_TYPES as readonly string[]).includes(value);
