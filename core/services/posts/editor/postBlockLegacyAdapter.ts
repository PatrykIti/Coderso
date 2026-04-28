import {
  isRecord,
  WRITING_CANVAS_VERSION,
  type WritingCanvasNode,
  type PostBlock,
  type PostBlockDocument,
} from "./postBlockDocument";
import {
  createEmptyPostBlockDocument,
  normalizePostBlockDocument,
} from "./postBlockNormalizer";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "./postRichTextSerializer";
import { resolvePostImageLayoutFromAttrs } from "../postImageWrapLayout";

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

const isConvertibleLegacyBlockType = (type: PostBlock["type"]) =>
  type === "paragraph" ||
  type === "heading" ||
  type === "list" ||
  type === "quote";

const clampHeadingLevel = (value: unknown): 1 | 2 | 3 | 4 | 5 | 6 => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2;
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  if (rounded === 5) return 5;
  return 6;
};

const normalizeRichTextString = (value: unknown) => {
  if (typeof value !== "string") return "";
  return serializePostRichText(value);
};

const normalizeNodeId = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeOptionalAnchorId = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized.length > 0 ? normalized : undefined;
};

const mapLegacyBlockToWritingNode = (
  block: PostBlock,
  nodeId: string
): { node: WritingCanvasNode | null; warning?: string } => {
  const attrs = isRecord(block.attrs) ? block.attrs : {};

  if (block.type === "paragraph") {
    return {
      node: {
        id: nodeId,
        type: "paragraph",
        text: normalizeRichTextString(block.content),
      },
    };
  }

  if (block.type === "heading") {
    const anchorId = normalizeOptionalAnchorId(attrs.anchorId);
    return {
      node: {
        id: nodeId,
        type: "heading",
        level: clampHeadingLevel(attrs.level),
        text: normalizeRichTextString(block.content),
        ...(anchorId ? { anchorId } : {}),
      },
    };
  }

  if (block.type === "quote") {
    return {
      node: {
        id: nodeId,
        type: "quote",
        text: normalizeRichTextString(block.content),
      },
    };
  }

  if (block.type === "list") {
    const items = Array.isArray(block.content)
      ? block.content
          .filter((item): item is string => typeof item === "string")
          .map((item) => serializePostRichText(item))
          .filter((item) => postRichTextToPlainText(item).trim().length > 0)
      : [];
    if (items.length === 0) {
      return {
        node: null,
        warning: `legacy_runtime_block_dropped:${block.id}:list_empty`,
      };
    }
    return {
      node: {
        id: nodeId,
        type: "list",
        ordered: attrs.ordered === true,
        items,
      },
    };
  }

  if (block.type === "image") {
    const mediaIdRaw =
      typeof attrs.mediaId === "string" && attrs.mediaId.trim().length > 0
        ? attrs.mediaId.trim()
        : null;
    const layout = resolvePostImageLayoutFromAttrs({
      wrap: attrs.wrap,
      widthPercent: attrs.widthPercent,
      marginPreset: attrs.marginPreset,
    });
    return {
      node: {
        id: nodeId,
        type: "image",
        mediaId: mediaIdRaw,
        alt: typeof attrs.alt === "string" ? attrs.alt : "",
        ...(typeof attrs.caption === "string" && attrs.caption.trim().length > 0
          ? { caption: attrs.caption.trim() }
          : {}),
        wrap: layout.wrap,
        widthPercent: layout.widthPercent,
      },
    };
  }

  return {
    node: null,
    warning: `legacy_runtime_block_unsupported:${block.id}:${block.type}`,
  };
};

const pushWarning = (warnings: string[], warning: string | undefined) => {
  if (!warning) return;
  if (warnings.includes(warning)) return;
  warnings.push(warning);
};

const normalizeDocumentFromLegacyFields = (data: Record<string, unknown>) => {
  const content = readOptionalString(data.content);
  const excerpt = readOptionalString(data.excerpt);
  const title = readOptionalString(data.title);

  if (!content && !excerpt) {
    const emptyDocument = createEmptyPostBlockDocument();
    return normalizePostBlockDocument({
      ...emptyDocument,
      meta: {
        ...emptyDocument.meta,
        ...(title ? { title } : {}),
      },
    });
  }

  return normalizePostBlockDocument({
    version: 1,
    blocks: buildLegacyParagraphBlocks(content, excerpt),
    meta: {
      ...(title ? { title } : {}),
      ...(excerpt ? { excerpt } : {}),
    },
  });
};

const readWritingCanvasPlainText = (content: unknown) => {
  if (!isRecord(content) || !Array.isArray(content.nodes)) return "";
  return content.nodes
    .map((node) => {
      if (!isRecord(node)) return "";
      const type = typeof node.type === "string" ? node.type.trim().toLowerCase() : "";
      if (type === "paragraph" || type === "heading" || type === "quote") {
        return postRichTextToPlainText(typeof node.text === "string" ? node.text : "");
      }
      if (type === "list" && Array.isArray(node.items)) {
        return node.items
          .filter((item): item is string => typeof item === "string")
          .map((item) => postRichTextToPlainText(item))
          .join(" ");
      }
      if (type === "image") {
        const alt = typeof node.alt === "string" ? node.alt : "";
        const caption = typeof node.caption === "string" ? node.caption : "";
        return `${alt} ${caption}`.trim();
      }
      return "";
    })
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
};

const collectTextFromDocument = (document: PostBlockDocument) => {
  const parts = document.blocks
    .map((block) => {
      if (typeof block.content === "string") return postRichTextToPlainText(block.content);
      if (Array.isArray(block.content)) {
        return block.content
          .filter((item): item is string => typeof item === "string")
          .join("\n");
      }
      if (block.type === "writing-canvas") {
        return readWritingCanvasPlainText(block.content);
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

export type RuntimeLegacyAdaptationResult = {
  document: PostBlockDocument;
  warnings: string[];
};

export function adaptLegacyDocumentForRuntime(
  document: PostBlockDocument
): RuntimeLegacyAdaptationResult {
  if (document.blocks.length === 0) {
    return { document, warnings: [] };
  }

  const warnings: string[] = [];
  const nextBlocks: PostBlock[] = [];
  let pendingNodes: WritingCanvasNode[] = [];
  let segmentAnchorId = "";
  let segmentIndex = 0;
  let nextNodeOrdinal = 1;
  let hasConversions = false;

  const flushPendingNodes = () => {
    if (pendingNodes.length === 0) return;
    segmentIndex += 1;
    const fallbackId = `legacy-writing-canvas-${segmentIndex}`;
    nextBlocks.push({
      id:
        segmentAnchorId.length > 0
          ? `${segmentAnchorId}-writing-canvas-${segmentIndex}`
          : fallbackId,
      type: "writing-canvas",
      attrs: {},
      content: {
        version: WRITING_CANVAS_VERSION,
        nodes: pendingNodes,
      },
    });
    pendingNodes = [];
    segmentAnchorId = "";
  };

  for (const block of document.blocks) {
    if (!isConvertibleLegacyBlockType(block.type)) {
      flushPendingNodes();
      nextBlocks.push(block);
      continue;
    }

    const nodeId = normalizeNodeId(block.id, `legacy-node-${nextNodeOrdinal}`);
    nextNodeOrdinal += 1;
    const mapped = mapLegacyBlockToWritingNode(block, nodeId);
    if (!mapped.node) {
      pushWarning(warnings, mapped.warning);
      continue;
    }

    if (pendingNodes.length === 0) {
      segmentAnchorId = normalizeNodeId(block.id, `legacy-segment-${segmentIndex + 1}`);
    }

    pendingNodes.push(mapped.node);
    hasConversions = true;
  }

  flushPendingNodes();

  if (!hasConversions) {
    return { document, warnings };
  }

  const normalized = normalizePostBlockDocument({
    version: document.version,
    blocks: nextBlocks,
    meta: document.meta,
  });

  return {
    document: normalized,
    warnings,
  };
}
