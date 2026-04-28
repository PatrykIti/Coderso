import type {
  PostBlock,
  PostBlockDocument,
} from "./postBlockDocument";
import { isRecord } from "./postBlockDocument";
import { postRichTextToPlainText } from "./postRichTextSerializer";

export type PostDocumentOutlineWarningCode =
  | "empty_heading"
  | "skipped_heading_level"
  | "multiple_h1";

export type PostDocumentOutlineWarning = {
  code: PostDocumentOutlineWarningCode;
  message: string;
  itemId: string;
};

export type PostDocumentOutlineItem = {
  id: string;
  blockId: string;
  nodeId?: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  anchorId: string;
  warnings: PostDocumentOutlineWarning[];
};

export type PostDocumentOutline = {
  items: PostDocumentOutlineItem[];
  warnings: PostDocumentOutlineWarning[];
};

type HeadingCandidate = {
  id: string;
  blockId: string;
  nodeId?: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  preferredAnchorId?: string;
  fallbackAnchorSeed: string;
};

const EMPTY_HEADING_LABEL = "Empty heading";

const toHeadingLevel = (value: unknown): 1 | 2 | 3 | 4 | 5 | 6 => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2;
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  if (rounded === 5) return 5;
  return 6;
};

const toNodeId = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeHeadingText = (value: unknown) =>
  postRichTextToPlainText(typeof value === "string" ? value : "").trim();

export const sanitizePostHeadingAnchorId = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized.length > 0 ? normalized : undefined;
};

export const toPostHeadingAnchorSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const ensureUniqueAnchorId = (base: string, used: Set<string>) => {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${base}-${suffix}`;
  used.add(unique);
  return unique;
};

export const resolvePostStableAnchorId = (
  preferred: unknown,
  text: string,
  fallback: string,
  used: Set<string>
) => {
  const preferredSanitized = sanitizePostHeadingAnchorId(preferred);
  if (preferredSanitized) {
    return ensureUniqueAnchorId(preferredSanitized, used);
  }

  const fromText = toPostHeadingAnchorSlug(text);
  if (fromText) {
    return ensureUniqueAnchorId(fromText, used);
  }

  const fromFallback = toPostHeadingAnchorSlug(fallback) || "section";
  return ensureUniqueAnchorId(fromFallback, used);
};

const collectHeadingCandidatesFromWritingCanvas = (block: PostBlock) => {
  if (!isRecord(block.content) || !Array.isArray(block.content.nodes)) return [];

  const candidates: HeadingCandidate[] = [];
  let ordinal = 1;

  for (const node of block.content.nodes) {
    if (!isRecord(node)) {
      ordinal += 1;
      continue;
    }
    const type = typeof node.type === "string" ? node.type.trim().toLowerCase() : "";
    if (type !== "heading") {
      ordinal += 1;
      continue;
    }

    const nodeId = toNodeId(node.id, `${block.id}-node-${ordinal}`);
    candidates.push({
      id: `${block.id}:${nodeId}`,
      blockId: block.id,
      nodeId,
      level: toHeadingLevel(node.level),
      text: normalizeHeadingText(node.text),
      preferredAnchorId: sanitizePostHeadingAnchorId(node.anchorId),
      fallbackAnchorSeed: `heading-${block.id}-${nodeId}`,
    });
    ordinal += 1;
  }

  return candidates;
};

const collectHeadingCandidatesFromBlock = (block: PostBlock) => {
  if (block.type !== "heading") return [];
  return [
    {
      id: block.id,
      blockId: block.id,
      level: toHeadingLevel(
        isRecord(block.attrs) ? (block.attrs.level as unknown) : undefined
      ),
      text: normalizeHeadingText(block.content),
      preferredAnchorId: sanitizePostHeadingAnchorId(
        isRecord(block.attrs) ? block.attrs.anchorId : undefined
      ),
      fallbackAnchorSeed: `heading-${block.id}`,
    } satisfies HeadingCandidate,
  ];
};

const collectHeadingCandidates = (document: PostBlockDocument) =>
  document.blocks.flatMap((block) =>
    block.type === "writing-canvas"
      ? collectHeadingCandidatesFromWritingCanvas(block)
      : collectHeadingCandidatesFromBlock(block)
  );

const createWarning = (
  code: PostDocumentOutlineWarningCode,
  itemId: string,
  level: number,
  previousLevel?: number
): PostDocumentOutlineWarning => {
  if (code === "empty_heading") {
    return {
      code,
      itemId,
      message: "Heading is empty.",
    };
  }
  if (code === "multiple_h1") {
    return {
      code,
      itemId,
      message: "Document should contain only one H1 heading.",
    };
  }
  return {
    code,
    itemId,
    message: `Heading level jumps from H${previousLevel ?? level - 1} to H${level}.`,
  };
};

export function buildPostDocumentOutline(
  document: PostBlockDocument
): PostDocumentOutline {
  const candidates = collectHeadingCandidates(document);
  const usedAnchors = new Set<string>();
  const items: PostDocumentOutlineItem[] = [];
  const warnings: PostDocumentOutlineWarning[] = [];

  let previousLevel: number | null = null;
  let h1Count = 0;

  for (const candidate of candidates) {
    const itemWarnings: PostDocumentOutlineWarning[] = [];
    const text = candidate.text;
    const isEmpty = text.length === 0;

    const anchorId = resolvePostStableAnchorId(
      candidate.preferredAnchorId,
      text,
      candidate.fallbackAnchorSeed,
      usedAnchors
    );

    if (isEmpty) {
      const warning = createWarning("empty_heading", candidate.id, candidate.level);
      itemWarnings.push(warning);
      warnings.push(warning);
    }

    if (previousLevel !== null && candidate.level > previousLevel + 1) {
      const warning = createWarning(
        "skipped_heading_level",
        candidate.id,
        candidate.level,
        previousLevel
      );
      itemWarnings.push(warning);
      warnings.push(warning);
    }

    if (candidate.level === 1) {
      h1Count += 1;
      if (h1Count > 1) {
        const warning = createWarning("multiple_h1", candidate.id, candidate.level);
        itemWarnings.push(warning);
        warnings.push(warning);
      }
    }

    items.push({
      id: candidate.id,
      blockId: candidate.blockId,
      ...(candidate.nodeId ? { nodeId: candidate.nodeId } : {}),
      level: candidate.level,
      text: isEmpty ? EMPTY_HEADING_LABEL : text,
      anchorId,
      warnings: itemWarnings,
    });

    previousLevel = candidate.level;
  }

  return {
    items,
    warnings,
  };
}
