export const POST_BLOCK_DOCUMENT_VERSION = 1 as const;

export const POST_BLOCK_TYPES = [
  "paragraph",
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
