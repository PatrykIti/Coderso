import { normalizePageLayoutSettings } from "../../../services/pages/layoutSettings";
import {
  pageBlockCapabilities,
  type PageBlockPublicDataBinding,
  type PageBlockRuntimeRendererState,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../services/pages/pageDocumentV2";
import { normalizeDetailPageDocumentForRead } from "../../../services/content/detailPageSchema";
import type {
  DetailPageBinding,
  DetailPageDocument,
  DetailPageRelatedSource,
  DetailPageSeo,
} from "../../../services/content/detailPageTypes";
import type { AuthoringSelectionTarget } from "@/ui/authoring";
import type { DetailPageRecord } from "@/services/detailPagesClient";

export type DetailTemplateEditorRoute = {
  contentTypeId: string;
  detailPageId: string;
};

export type DetailTemplateDocumentDraft = {
  name: string;
  titlePattern: string;
  sections: PageSectionV2[];
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

export const buildDetailTemplateEditorHref = (contentTypeId: string, detailPageId: string) =>
  `/advanced/engine/${encodeURIComponent(contentTypeId)}/collection/detail-template/${encodeURIComponent(
    detailPageId
  )}`;

export const buildDefaultDetailTemplateDocument = (input: {
  contentTypeId: string;
  contentTypeSlug: string;
  contentTypeName: string;
}): DetailPageDocument => ({
  schemaVersion: 2,
  sections: [],
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

/**
 * Stored-read path for the detail-template editor. Every stored row restores
 * through the shared V2 read adapter: v1 documents (including un-backfilled
 * revisions) convert to v2 sections in memory, and v2 rows normalize
 * strictly. `legacy-widget` blocks inside converted sections stay in the
 * document and render read-only in the canvas.
 */
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
  const document = normalizeDetailPageDocumentForRead(currentDocument, {
    id: record.id,
    contentTypeId: record.contentTypeId,
    contentTypeSlug: record.contentTypeSlug,
    status: record.status,
  });
  return {
    ...document,
    name: normalizeText(currentDocument.name, record.name),
    titlePattern: normalizeText(currentDocument.titlePattern, "{title}"),
    ...(seo ? { seo } : {}),
    settings: {
      template: normalizeText(settings.template, "detail"),
      layout: normalizePageLayoutSettings(settings.layout),
    },
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
    sections: draft.sections,
    bindings: draft.bindings,
  };
};

// ── Editor-state helpers (TASK-580-03-L05) ────────────────────────────────
// Pure functions over the V2 draft model shared by the host page: block
// walking, binding pruning, assistant surface summaries, and selection
// reconciliation. Kept in the model module so the host page stays a thin
// orchestrator under the file-size gate.

const readBlockDataText = (block: PageBlockV2, key: string) => {
  const value = block.props[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

export const findBlockInSection = (section: PageSectionV2, blockId: string): PageBlockV2 | null => {
  const visit = (list: readonly PageBlockV2[]): PageBlockV2 | null => {
    for (const block of list) {
      if (block.id === blockId) return block;
      const child = visit(Object.values(block.slots ?? {}).flatMap((children) => children ?? []));
      if (child) return child;
    }
    return null;
  };
  return visit(section.blocks);
};

export const collectSectionBlockIds = (sections: PageSectionV2[]): string[] => {
  const ids: string[] = [];
  const visit = (list: readonly PageBlockV2[]) => {
    for (const block of list) {
      ids.push(block.id);
      visit(Object.values(block.slots ?? {}).flatMap((children) => children ?? []));
    }
  };
  sections.forEach((section) => visit(section.blocks));
  return ids;
};

export const summarizeDetailTemplateBlocksForAssistant = (
  sections: PageSectionV2[],
  options: { maxBlocks?: number } = {}
) => {
  const maxBlocks = options.maxBlocks ?? 80;
  const result: Array<{
    id: string;
    type: string;
    label: string | null;
    path: string;
    childCount: number;
    slotKeys: string[];
    templateId: string | null;
    templateName: string | null;
    capabilities: {
      editorInsertable: boolean;
      insertable: boolean;
      assistantEmittable: boolean;
      runtimeRenderer: PageBlockRuntimeRendererState;
      publicDataBinding: PageBlockPublicDataBinding;
      slots: string[];
      reason: string | null;
    };
  }> = [];

  const visit = (blocks: readonly PageBlockV2[], pathPrefix: string) => {
    blocks.forEach((block, index) => {
      if (result.length >= maxBlocks) return;
      const path = pathPrefix ? `${pathPrefix}.${index}` : String(index);
      const slotEntries = Object.entries(block.slots ?? {});
      const childBlocks = slotEntries.flatMap(([, value]) => value ?? []);
      const capability = pageBlockCapabilities[block.type];
      result.push({
        id: block.id,
        type: block.type,
        label:
          readBlockDataText(block, "text") ??
          readBlockDataText(block, "title") ??
          readBlockDataText(block, "label"),
        path,
        childCount: childBlocks.length,
        slotKeys: slotEntries.map(([key]) => key),
        templateId: null,
        templateName: null,
        capabilities: {
          editorInsertable: capability.editorInsertable,
          insertable: capability.insertable,
          assistantEmittable: capability.assistantEmittable,
          runtimeRenderer: capability.runtimeRenderer,
          publicDataBinding: capability.publicDataBinding,
          slots: [...capability.slots],
          reason: capability.reason ?? null,
        },
      });

      if (result.length >= maxBlocks) return;
      for (const [slotId, value] of slotEntries) {
        if (result.length >= maxBlocks) break;
        if (Array.isArray(value)) {
          visit(value, `${path}.slots.${slotId}`);
        }
      }
    });
  };

  sections.forEach((section, sectionIndex) => {
    if (result.length >= maxBlocks) return;
    visit(section.blocks, `sections.${sectionIndex}`);
  });
  return result;
};

export const summarizeDetailTemplateBindingsForAssistant = (
  bindings: DetailPageBinding[],
  options: { maxBindings?: number } = {}
) => {
  const maxBindings = options.maxBindings ?? 80;
  return bindings.slice(0, maxBindings).map((binding) => ({
    id: binding.id,
    blockId: binding.blockId,
    propPath: binding.propPath,
    source: binding.source,
    transform: binding.transform ?? null,
    required: binding.required === true,
  }));
};

export const defaultDetailTemplateSelection = (
  sections: PageSectionV2[]
): AuthoringSelectionTarget | null => {
  const firstSection = sections[0];
  if (!firstSection) return null;
  const firstBlock = firstSection.blocks[0];
  return firstBlock
    ? { kind: "block", sectionId: firstSection.id, id: firstBlock.id }
    : { kind: "section", id: firstSection.id };
};

export const detailTemplateSelectionTargetExists = (
  target: AuthoringSelectionTarget | null,
  sections: PageSectionV2[]
): boolean => {
  if (!target) return false;
  if (target.kind === "section") {
    return sections.some((section) => section.id === target.id);
  }
  const section = sections.find((candidate) => candidate.id === target.sectionId);
  return Boolean(section && findBlockInSection(section, target.id));
};

export const reconcileDetailTemplateSelection = (
  current: AuthoringSelectionTarget | null,
  sections: PageSectionV2[]
): AuthoringSelectionTarget | null =>
  detailTemplateSelectionTargetExists(current, sections)
    ? current
    : defaultDetailTemplateSelection(sections);
