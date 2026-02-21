import {
  isRecord,
  type PostBlock,
  type PostBlockDocument,
} from "./postBlockDocument";
import {
  createEmptyPostBlockDocument,
  normalizePostBlockDocument,
} from "./postBlockNormalizer";

const DEFAULT_PARAGRAPH_BLOCK: PostBlock = {
  id: "block-1",
  type: "paragraph",
  attrs: {},
  content: "",
};

const readOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildLegacyParagraphBlocks = (content: string | undefined, excerpt: string | undefined) => {
  const blocks: PostBlock[] = [];
  if (content) {
    blocks.push({
      id: "block-1",
      type: "paragraph",
      attrs: {},
      content,
    });
  }
  if (blocks.length === 0) {
    blocks.push({
      ...DEFAULT_PARAGRAPH_BLOCK,
      content: excerpt ?? "",
    });
  }
  return blocks;
};

const normalizeDocumentFromLegacyFields = (data: Record<string, unknown>) => {
  const content = readOptionalString(data.content);
  const excerpt = readOptionalString(data.excerpt);
  const title = readOptionalString(data.title);

  return normalizePostBlockDocument({
    version: 1,
    blocks: buildLegacyParagraphBlocks(content, excerpt),
    meta: {
      ...(title ? { title } : {}),
      ...(excerpt ? { excerpt } : {}),
    },
  });
};

const collectTextFromDocument = (document: PostBlockDocument) => {
  const parts = document.blocks
    .map((block) => {
      if (typeof block.content === "string") return block.content;
      if (Array.isArray(block.content)) {
        return block.content
          .filter((item): item is string => typeof item === "string")
          .join("\n");
      }
      return "";
    })
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.join("\n\n");
};

export function adaptLegacyPostDataToDocument(
  data: Record<string, unknown> | null | undefined
): PostBlockDocument {
  const source = isRecord(data) ? data : {};
  return normalizeDocumentFromLegacyFields(source);
}

export function ensurePostDocumentForRead(data: unknown): Record<string, unknown> {
  const source = isRecord(data) ? { ...data } : {};

  let document: PostBlockDocument;
  if (source.document !== undefined) {
    try {
      document = normalizePostBlockDocument(source.document);
    } catch {
      document = normalizeDocumentFromLegacyFields(source);
    }
  } else {
    document = normalizeDocumentFromLegacyFields(source);
  }

  return {
    ...source,
    document,
  };
}

export function ensurePostDocumentForWrite(data: unknown): Record<string, unknown> {
  if (!isRecord(data)) {
    throw new Error("post_data_invalid");
  }

  const source = { ...data };
  const hasExplicitDocument = source.document !== undefined;
  const document = hasExplicitDocument
    ? normalizePostBlockDocument(source.document)
    : normalizeDocumentFromLegacyFields(source);

  const contentFallback = collectTextFromDocument(document);
  const excerptFallback = readOptionalString(document.meta.excerpt);

  return {
    ...source,
    ...(contentFallback && !readOptionalString(source.content)
      ? { content: contentFallback }
      : {}),
    ...(excerptFallback && !readOptionalString(source.excerpt)
      ? { excerpt: excerptFallback }
      : {}),
    document,
  };
}

export function coercePostDocument(data: unknown): PostBlockDocument {
  if (!isRecord(data)) return createEmptyPostBlockDocument();
  if (data.document === undefined) {
    return adaptLegacyPostDataToDocument(data);
  }
  try {
    return normalizePostBlockDocument(data.document);
  } catch {
    return adaptLegacyPostDataToDocument(data);
  }
}
