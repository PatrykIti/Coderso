import { normalizePageLayoutSettings } from "../../../services/pages/layoutSettings";
import type {
  DetailPageBinding,
  DetailPageDocument,
  DetailPageRelatedSource,
  DetailPageSeo,
  DetailPageStatus,
} from "../../../services/content/detailPageTypes";
import { normalizeWidgetBlock } from "../../../widgets/validator";
import { createBlock, resolveLoadedWidgetEditorState } from "@/ui/pages/builder/blockUtils";
import type { Block } from "@/ui/pages/builder/types";
import type { DetailPageRecord } from "@/services/detailPagesClient";

export type DetailTemplateEditorRoute = {
  contentTypeId: string;
  detailPageId: string;
};

export type DetailTemplateDocumentDraft = {
  name: string;
  titlePattern: string;
  blocks: Block[];
  bindings: DetailPageBinding[];
};

const decodePathSegment = (value: string | undefined) => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneRecord = <T>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const normalizeDetailPageStatus = (value: unknown, fallback: DetailPageStatus): DetailPageStatus =>
  value === "published" || value === "draft" ? value : fallback;

export const buildDetailTemplateEditorHref = (contentTypeId: string, detailPageId: string) =>
  `/advanced/engine/${encodeURIComponent(contentTypeId)}/collection/detail-template/${encodeURIComponent(
    detailPageId
  )}`;

export const buildDefaultDetailTemplateDocument = (input: {
  contentTypeId: string;
  contentTypeSlug: string;
  contentTypeName: string;
}): DetailPageDocument => ({
  schemaVersion: 1,
  id: crypto.randomUUID(),
  name: `${normalizeText(input.contentTypeName, input.contentTypeSlug)} detail template`,
  contentTypeId: input.contentTypeId,
  contentTypeSlug: input.contentTypeSlug,
  status: "draft",
  titlePattern: "{title}",
  settings: {
    template: "detail",
    layout: normalizePageLayoutSettings(undefined),
  },
  blocks: [],
  bindings: [],
});

export const resolveDetailTemplateEditorRoute = (
  pathname: string
): DetailTemplateEditorRoute | null => {
  const parts = pathname.split("/").filter(Boolean);
  const advancedIndex = parts.findIndex(
    (segment) => segment === "advanced" || segment === "coderso"
  );
  if (advancedIndex === -1) return null;
  if (parts[advancedIndex + 1] !== "engine") return null;
  if (parts[advancedIndex + 3] !== "collection") return null;
  if (parts[advancedIndex + 4] !== "detail-template") return null;

  const contentTypeId = decodePathSegment(parts[advancedIndex + 2]);
  const detailPageId = decodePathSegment(parts[advancedIndex + 5]);
  if (!contentTypeId || !detailPageId) return null;
  return { contentTypeId, detailPageId };
};

export const normalizeDetailTemplateBlocks = (value: unknown): Block[] => {
  if (!Array.isArray(value)) return [];

  try {
    const normalizeTree = (block: Block): Block => {
      const normalized = normalizeWidgetBlock(block);
      const base = createBlock(normalized.type);
      const slots =
        normalized.slots &&
        Object.fromEntries(
          Object.entries(normalized.slots).map(([key, slotValue]) => [
            key,
            Array.isArray(slotValue) ? slotValue.map((child) => normalizeTree(child as Block)) : [],
          ])
        );
      const children =
        normalized.slots || !Array.isArray(normalized.children)
          ? undefined
          : normalized.children.map((child) => normalizeTree(child as Block));

      return {
        ...base,
        ...normalized,
        slots,
        children,
        layout: normalized.layout ?? base.layout,
        visibility: normalized.visibility ?? base.visibility,
        editor: resolveLoadedWidgetEditorState(normalized.editor),
      };
    };

    return value.map((block) => normalizeTree(block as Block));
  } catch {
    return [];
  }
};

export const normalizeDetailTemplateDocument = (record: DetailPageRecord): DetailPageDocument => {
  const currentDocument: Record<string, unknown> = isRecord(record.currentDocument)
    ? record.currentDocument
    : {};
  const settings: Record<string, unknown> = isRecord(currentDocument.settings)
    ? currentDocument.settings
    : {};
  const seo = isRecord(currentDocument.seo)
    ? (cloneRecord(currentDocument.seo) as DetailPageSeo)
    : undefined;
  const related = Array.isArray(currentDocument.related)
    ? (cloneRecord(currentDocument.related) as DetailPageRelatedSource[])
    : undefined;

  return {
    schemaVersion: 1,
    id: normalizeText(currentDocument.id, record.id),
    name: normalizeText(currentDocument.name, record.name),
    contentTypeId: normalizeText(currentDocument.contentTypeId, record.contentTypeId),
    contentTypeSlug: normalizeText(currentDocument.contentTypeSlug, record.contentTypeSlug),
    status: normalizeDetailPageStatus(currentDocument.status, record.status),
    titlePattern: normalizeText(currentDocument.titlePattern, "{title}"),
    ...(seo ? { seo } : {}),
    settings: {
      template: normalizeText(settings.template, "detail"),
      layout: normalizePageLayoutSettings(settings.layout),
    },
    blocks: normalizeDetailTemplateBlocks(currentDocument.blocks),
    bindings: Array.isArray(currentDocument.bindings)
      ? (cloneRecord(currentDocument.bindings) as DetailPageBinding[])
      : [],
    ...(related ? { related } : {}),
  };
};

export const buildDetailTemplateDocumentUpdate = (
  record: DetailPageRecord,
  draft: DetailTemplateDocumentDraft
): DetailPageDocument => {
  const current = normalizeDetailTemplateDocument(record);
  return {
    ...current,
    name: normalizeText(draft.name, current.name),
    status: "draft",
    titlePattern: normalizeText(draft.titlePattern, current.titlePattern),
    blocks: draft.blocks,
    bindings: draft.bindings,
  };
};
