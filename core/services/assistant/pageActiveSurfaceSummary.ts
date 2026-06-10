import type {
  AssistantActivePageSectionSummary,
  AssistantActiveSurfaceBlockCapabilities,
  AssistantActiveSurfaceBlockSummary,
  AssistantActiveSurfaceSectionCapabilities,
} from "./actionPlanTypes";
import {
  getPageBlockActiveSlotKeys,
  pageBlockCapabilities,
  pageSectionCapabilities,
  type PageBlockV2,
  type PageSectionType,
  type PageSectionV2,
} from "../pages/pageDocumentV2";

export type AssistantPageSelectionInput = {
  selectedSectionId?: string | null;
  selectedBlockId?: string | null;
  selectedBlockPath?: string | null;
};

export type AssistantResolvedPageSelection = {
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  selectedBlockPath: string | null;
};

type LocatedBlockSummary = {
  sectionId: string;
  block: AssistantActiveSurfaceBlockSummary;
};

const readTextProp = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const summarizeBlockCapabilities = (
  block: PageBlockV2
): AssistantActiveSurfaceBlockCapabilities => {
  const capabilities = pageBlockCapabilities[block.type];
  return {
    editorInsertable: capabilities.editorInsertable,
    insertable: capabilities.insertable,
    assistantEmittable: capabilities.assistantEmittable,
    runtimeRenderer: capabilities.runtimeRenderer,
    publicDataBinding: capabilities.publicDataBinding,
    slots: [...capabilities.slots],
    reason: capabilities.reason ?? null,
  };
};

const summarizeSectionCapabilities = (
  section: PageSectionV2
): AssistantActiveSurfaceSectionCapabilities => {
  const capabilities = pageSectionCapabilities[section.type];
  return {
    insertable: capabilities.insertable,
    assistantEmittable: capabilities.assistantEmittable,
    reason: capabilities.reason ?? null,
  };
};

const summarizePageBlockForAssistant = (
  block: PageBlockV2,
  path: string
): AssistantActiveSurfaceBlockSummary => {
  const slotKeys = getPageBlockActiveSlotKeys(block);
  const children = slotKeys.flatMap((slotKey) =>
    (block.slots?.[slotKey] ?? []).map((child, childIndex) =>
      summarizePageBlockForAssistant(child, `${path}.slots.${slotKey}.${childIndex}`)
    )
  );
  const label =
    readTextProp(block.props.text) ??
    readTextProp(block.props.label) ??
    readTextProp(block.props.title) ??
    null;
  return {
    id: block.id,
    type: block.type,
    label,
    path,
    childCount: children.length,
    slotKeys: [...slotKeys],
    templateId: null,
    templateName: null,
    capabilities: summarizeBlockCapabilities(block),
    children,
  };
};

export const summarizePageSectionsForAssistant = (
  sections: readonly PageSectionV2[]
): AssistantActivePageSectionSummary[] =>
  sections.map((section, sectionIndex) => {
    const blocks = section.blocks.map((block, blockIndex) =>
      summarizePageBlockForAssistant(block, `sections.${sectionIndex}.blocks.${blockIndex}`)
    );
    return {
      id: section.id,
      type: section.type,
      name: section.name,
      path: `sections.${sectionIndex}`,
      blockCount: section.blocks.length,
      blocks,
      capabilities: summarizeSectionCapabilities(section),
    };
  });

const collectBlocks = (
  sectionId: string,
  blocks: readonly AssistantActiveSurfaceBlockSummary[],
  collected: LocatedBlockSummary[]
) => {
  for (const block of blocks) {
    collected.push({ sectionId, block });
    collectBlocks(sectionId, block.children ?? [], collected);
  }
};

const flattenSectionBlocks = (
  sections: readonly AssistantActivePageSectionSummary[]
): LocatedBlockSummary[] => {
  const collected: LocatedBlockSummary[] = [];
  for (const section of sections) {
    collectBlocks(section.id, section.blocks, collected);
  }
  return collected;
};

const normalizeSelectionText = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveAssistantPageSelection = (
  sections: readonly AssistantActivePageSectionSummary[],
  input: AssistantPageSelectionInput
): AssistantResolvedPageSelection => {
  const requestedSectionId = normalizeSelectionText(input.selectedSectionId);
  const requestedBlockId = normalizeSelectionText(input.selectedBlockId);
  const requestedBlockPath = normalizeSelectionText(input.selectedBlockPath);
  const sectionIds = new Set(sections.map((section) => section.id));
  const blocks = flattenSectionBlocks(sections);
  const block =
    requestedBlockId && requestedBlockPath
      ? (blocks.find(
          (candidate) =>
            candidate.block.id === requestedBlockId && candidate.block.path === requestedBlockPath
        ) ?? null)
      : requestedBlockId
        ? (blocks.find((candidate) => candidate.block.id === requestedBlockId) ?? null)
        : requestedBlockPath
          ? (blocks.find((candidate) => candidate.block.path === requestedBlockPath) ?? null)
          : null;

  if (block) {
    return {
      selectedSectionId: block.sectionId,
      selectedBlockId: block.block.id,
      selectedBlockPath: block.block.path,
    };
  }

  return {
    selectedSectionId:
      requestedSectionId && sectionIds.has(requestedSectionId) ? requestedSectionId : null,
    selectedBlockId: null,
    selectedBlockPath: null,
  };
};

export const isExistingStaticAssistantPageBlockType = (type: string) => type === "gallery";

export const isAssistantPageBlockOutputAllowed = (type: string) => {
  if (!(type in pageBlockCapabilities)) return false;
  const blockType = type as keyof typeof pageBlockCapabilities;
  const capabilities = pageBlockCapabilities[blockType];
  return capabilities.assistantEmittable || isExistingStaticAssistantPageBlockType(type);
};

export const isAssistantPageSectionOutputAllowed = (type: string) => {
  if (!(type in pageSectionCapabilities)) return false;
  const sectionType = type as PageSectionType;
  const capabilities = pageSectionCapabilities[sectionType];
  return capabilities.assistantEmittable;
};
