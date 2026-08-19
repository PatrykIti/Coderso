// TASK-481-02-L02 facade split (Part A): document mutation commands and pure
// document helpers extracted verbatim from the former PageEditor.tsx body.
// Single writer: TASK-481-02-L02. No behavior change.

import { useCallback } from "react";
import { isApiClientError, isSessionExpiredApiError } from "@/services/apiClient";
import {
  applyBlockTextMark,
  clearBlockResponsiveOverride,
  clearResponsiveOverride,
  createPageBlockV2,
  createPageDocumentId,
  createPageSectionV2,
  normalizeBlockTextMarks,
  normalizeStoredPageDocumentV2ForRead,
  removeBlockTextMark,
  resolvePageSectionForBreakpoint,
  type PageBlockType,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSectionType,
  type PageSectionV2,
  type PageSectionVariant,
} from "../../../../services/pages/pageDocumentV2";
import {
  deletePageBlockAtPath,
  duplicatePageBlockAtPath,
  duplicatePageBlockTreeWithNewIds,
  getDefaultPageBlockInsertTarget,
  getPageBlockAfterInsertTarget,
  getPageBlockAdjacentColumnMoveTarget,
  getPageBlockAtPath,
  getPageBlockContainerLayout,
  getPageBlockEditorSlotKeys,
  getPageBlockListAtPath,
  getPageBlockSiblingMoveTarget,
  insertPageBlockAtTarget,
  insertPageBlockBeside,
  movePageBlockToTarget,
  movePageSectionBlockToAdjacentColumn,
  movePageSectionBlockWithinColumn,
  updatePageBlockAtPath,
  type PageBlockInsertTarget,
  type PageBlockPath,
} from "../../../../services/pages/pageBlockPaths";
import {
  patchBlockControlForDevice,
  patchBlockPropsForDevice,
  patchSectionControlForDevice,
  sanitizePageSectionStylePatch,
  setBlockVisibleForBreakpoint,
  setSectionVisibleForBreakpoint,
} from "../../../../services/pages/pageEditorMutationActions";
import {
  insertSectionAfter,
  parsePageEditorClipboardFragment,
  serializePageEditorClipboardPayload,
} from "../../../../services/pages/pageEditorClipboard";
import {
  commitInlineText,
  inlineEditableTargets,
  resolveInlineEditTarget,
} from "../../../../services/pages/pageInlineEditContract";
import {
  getPageSectionEffectiveColumns,
  getPageSectionFallbackVariant,
} from "../../../../services/pages/pageSectionTemplates";
import { pinUnassignedPageSectionBlocksToColumn } from "../../../../services/pages/pageSectionColumns";
import {
  isPageSectionVariantOption,
  type PageEditorControlDefinition,
} from "../../../../services/pages/pageEditorControlRegistry";
import { getBlockDisplayLabel } from "./pageEditorLabels";
import type {
  PageEditorInlineEditCommit,
  PageEditorInlineEditTarget,
  PageEditorTextMarkCommit,
} from "./PageAuthoringCanvas";

const PAGE_EDITOR_CLIPBOARD_SESSION_KEY = "coderso.pageEditor.clipboard";

const writeEditorClipboardText = async (text: string): Promise<void> => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(PAGE_EDITOR_CLIPBOARD_SESSION_KEY, text);
  }
  try {
    await navigator.clipboard?.writeText(text);
  } catch {
    // The sessionStorage fallback above remains available for paste.
  }
};
const readEditorClipboardText = async (): Promise<string | null> => {
  try {
    const text = await navigator.clipboard?.readText();
    if (text) return text;
  } catch {
    // Fall through to the in-session fallback.
  }
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PAGE_EDITOR_CLIPBOARD_SESSION_KEY);
};
export const normalizePageData = (data?: Record<string, unknown> | null): PageDocumentV2 =>
  normalizeStoredPageDocumentV2ForRead(data);
export const getFirstInlineEditablePropPath = (block: PageBlockV2): string | null => {
  for (const target of inlineEditableTargets) {
    if (target.blockType !== block.type) continue;
    const propPath = target.propPath.endsWith(".*")
      ? `${target.propPath.slice(0, -1)}0`
      : target.propPath;
    if (resolveInlineEditTarget(block, propPath)) return propPath;
  }
  return null;
};
const findSectionBlockPathById = (
  blocks: readonly PageBlockV2[],
  blockId: string,
  ownerPath?: PageBlockPath,
  slotKey?: PageBlockPath[number]["slotKey"]
): PageBlockPath | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    const blockPath = (
      ownerPath ? [...ownerPath, { slotKey, index }] : [{ index }]
    ) as PageBlockPath;
    if (block.id === blockId) return blockPath;
    for (const childSlotKey of getPageBlockEditorSlotKeys(block)) {
      const found = findSectionBlockPathById(
        block.slots?.[childSlotKey] ?? [],
        blockId,
        blockPath,
        childSlotKey
      );
      if (found) return found;
    }
  }
  return null;
};
const readInlineTextPropValue = (block: PageBlockV2, propPath: string): string | null => {
  const [rootKey, indexSegment] = propPath.split(".");
  if (!rootKey) return null;
  const value = block.props[rootKey];
  if (indexSegment === undefined) return typeof value === "string" ? value : null;
  if (!Array.isArray(value)) return null;
  const item = value[Number(indexSegment)];
  return typeof item === "string" ? item : null;
};
const patchInlineTextPropForDevice = (
  block: PageBlockV2,
  device: PageBreakpoint,
  resolvedBlock: PageBlockV2,
  propPath: string,
  nextText: string
): PageBlockV2 => {
  const [rootKey, indexSegment] = propPath.split(".");
  if (!rootKey) return block;
  if (indexSegment === undefined) {
    return patchBlockPropsForDevice(block, device, { [rootKey]: nextText });
  }
  const items = resolvedBlock.props[rootKey];
  if (!Array.isArray(items)) return block;
  const index = Number(indexSegment);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return block;
  const nextItems = items.slice();
  nextItems[index] = nextText;
  return patchBlockPropsForDevice(block, device, { [rootKey]: nextItems });
};
const createStarterSection = (type: PageSectionType) => {
  const blocks =
    type === "hero"
      ? [
          createPageBlockV2("heading", {
            props: { text: "Build with Coderso", level: "h1", align: "center" },
          }),
          createPageBlockV2("text", {
            props: {
              text: "Compose sections and atomic blocks directly on the canvas.",
              format: "plain",
              align: "center",
            },
          }),
          createPageBlockV2("button", {
            props: {
              label: "Primary action",
              href: "/",
              target: "self",
              variant: "primary",
              size: "md",
            },
          }),
        ]
      : [
          createPageBlockV2("heading", {
            props: { text: `${type.replace(/-/g, " ")} section`, level: "h2", align: "left" },
          }),
          createPageBlockV2("text", {
            props: { text: "Add focused content blocks here.", format: "plain", align: "left" },
          }),
        ];
  return createPageSectionV2(type, {
    variant: getPageSectionFallbackVariant(type),
    blocks,
  });
};
const duplicateSectionWithIds = (section: PageSectionV2): PageSectionV2 => ({
  ...cloneDocument({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [section],
  }).sections[0]!,
  id: createPageDocumentId("sec"),
  name: `${section.name} copy`,
  blocks: section.blocks.map(duplicatePageBlockTreeWithNewIds),
});

export const resolveInlineError = (error: unknown, fallback: string) => {
  if (isSessionExpiredApiError(error)) return "Your admin session expired. Sign in again.";
  if (isApiClientError(error)) return error.message;
  return fallback;
};
export const cloneDocument = (document: PageDocumentV2): PageDocumentV2 =>
  JSON.parse(JSON.stringify(document)) as PageDocumentV2;
export const cloneBlockPath = (path: PageBlockPath | null): PageBlockPath | null => {
  if (!path) return null;
  const [first, ...rest] = path.map((segment) => ({ ...segment }));
  if (!first) return null;
  return [first, ...rest];
};
export const documentsEqual = (left: PageDocumentV2, right: PageDocumentV2): boolean =>
  JSON.stringify(left) === JSON.stringify(right);
export type PageEditorHistorySnapshot = {
  document: PageDocumentV2;
  selectedSectionId: string | null;
  selectedBlockPath: PageBlockPath | null;
};

export const PAGE_EDITOR_HISTORY_LIMIT = 50;
export type PageOverrideBreakpoint = Exclude<PageBreakpoint, "desktop">;
export type ToolbarDeleteTarget =
  | {
      kind: "section";
      sectionId: string;
      label: string;
    }
  | {
      kind: "block";
      sectionId: string;
      blockPath: PageBlockPath;
      label: string;
    };

export type PageEditorDocumentCommandContext = {
  pageDocument: PageDocumentV2;
  selectedSectionId: string | null;
  selectedSection: PageSectionV2 | null;
  selectedBlock: PageBlockV2 | null;
  selectedBlockPath: PageBlockPath | null;
  resolvedSelectedSection: PageSectionV2 | null;
  device: PageBreakpoint;
  pendingBlockInsert: { target: PageBlockInsertTarget; column?: number } | null;
  pendingSectionInsertIndex: number | null;
  pendingBesideBlockPath: PageBlockPath | null;
  deleteSelectionTarget: ToolbarDeleteTarget | null;
  canCreateContentSectionFromUntargetedBlock: boolean;
  setDocumentDraft: (
    patch: (document: PageDocumentV2) => PageDocumentV2,
    options?: { selection?: Partial<{ sectionId: string | null; blockPath: PageBlockPath | null }> }
  ) => void;
  selectSection: (sectionId: string | null) => void;
  selectBlock: (sectionId: string, blockPath: PageBlockPath) => void;
  setCommandOpen: (open: boolean) => void;
  setCommandQuery: (query: string) => void;
  setCommandActiveIndex: (index: number | ((current: number) => number)) => void;
  setPendingBlockInsert: (
    target: { target: PageBlockInsertTarget; column?: number } | null
  ) => void;
  setPendingSectionInsertIndex: (index: number | null) => void;
  setPendingBesideBlockPath: (path: PageBlockPath | null) => void;
  setDeleteSelectionTarget: (target: ToolbarDeleteTarget | null) => void;
  setInlineEditTarget: (target: PageEditorInlineEditTarget | null) => void;
};

export const usePageEditorDocumentCommands = (ctx: PageEditorDocumentCommandContext) => {
  const {
    pageDocument,
    selectedSectionId,
    selectedSection,
    selectedBlock,
    selectedBlockPath,
    resolvedSelectedSection,
    device,
    pendingBlockInsert,
    pendingSectionInsertIndex,
    pendingBesideBlockPath,
    deleteSelectionTarget,
    canCreateContentSectionFromUntargetedBlock,
    setDocumentDraft,
    selectSection,
    selectBlock,
    setCommandOpen,
    setCommandQuery,
    setCommandActiveIndex,
    setPendingBlockInsert,
    setPendingSectionInsertIndex,
    setPendingBesideBlockPath,
    setDeleteSelectionTarget,
    setInlineEditTarget,
  } = ctx;

  const updateSelectedSection = useCallback(
    (updater: (section: PageSectionV2) => PageSectionV2) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? updater(section) : section
        ),
      }));
    },
    [selectedSectionId, setDocumentDraft]
  );

  const updateSectionGroup = useCallback(
    <Key extends "layout" | "style" | "spacing" | "visibility">(
      key: Key,
      patch: Partial<PageSectionV2[Key]>
    ) => {
      const safePatch =
        key === "style"
          ? (sanitizePageSectionStylePatch(patch as Partial<PageSectionV2["style"]>) as Partial<
              PageSectionV2[Key]
            >)
          : patch;
      updateSelectedSection((section) => {
        if (device === "desktop") {
          return { ...section, [key]: { ...section[key], ...safePatch } };
        }
        return {
          ...section,
          responsive: {
            ...section.responsive,
            [device]: {
              ...(section.responsive[device] ?? {}),
              [key]: {
                ...((section.responsive[device]?.[key] as Record<string, unknown> | undefined) ??
                  {}),
                ...safePatch,
              },
            },
          },
        };
      });
    },
    [device, updateSelectedSection]
  );

  const updateSelectedBlockControl = useCallback(
    (control: PageEditorControlDefinition, value: unknown) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            patchBlockControlForDevice(block, device, control, value)
          ).section;
        }
        return {
          ...section,
          blocks: section.blocks.map((block, index) =>
            index === 0 ? patchBlockControlForDevice(block, device, control, value) : block
          ),
        };
      });
    },
    [device, selectedBlockPath, updateSelectedSection]
  );

  const updateSelectedSectionControl = useCallback(
    (control: PageEditorControlDefinition, value: unknown) => {
      updateSelectedSection((section) => {
        const next = patchSectionControlForDevice(section, device, control, value);
        // Column-switch bridge (owner finding #5, round 3): when the COLUMNS
        // control takes the desktop base from one effective column to N >= 2,
        // every still-unassigned root block is pinned to column 1 in the same
        // deliberate (and undoable) write, so existing content stays visually
        // stacked together instead of scattering through auto-flow — the new
        // columns start empty with their own add tiles. The bridge is scoped
        // to the columns control on the desktop base: variant switches keep
        // their template-designed auto-flow, stackVertical only collapses and
        // restores the existing grid, and tablet/mobile column overrides stay
        // editor-resolved auto-flow (stackVertical is the supported collapse).
        if (
          control.id === "section.layout.columns" &&
          device === "desktop" &&
          next.blocks.length > 0 &&
          getPageSectionEffectiveColumns(section) < 2 &&
          getPageSectionEffectiveColumns(next) >= 2
        ) {
          return { ...next, blocks: pinUnassignedPageSectionBlocksToColumn(next.blocks, 1) };
        }
        return next;
      });
    },
    [device, updateSelectedSection]
  );

  const startInlineEdit = useCallback(
    (target: PageEditorInlineEditTarget) => {
      setInlineEditTarget(target);
    },
    [setInlineEditTarget]
  );

  const commitInlineEdit = useCallback(
    (commit: PageEditorInlineEditCommit) => {
      setInlineEditTarget(null);
      // Unchanged canvas text is a strict no-op: no document write, no
      // dirty-state churn, and renderer fallback text (e.g. "Heading" for an
      // empty prop) is never promoted into stored props.
      if (commit.text === commit.renderedText) return;
      for (const section of pageDocument.sections) {
        const blockPath = findSectionBlockPathById(section.blocks, commit.blockId);
        if (!blockPath) continue;
        const resolvedBlock =
          getPageBlockAtPath(resolvePageSectionForBreakpoint(section, device), blockPath) ??
          getPageBlockAtPath(section, blockPath);
        if (!resolvedBlock) return;
        const target = resolveInlineEditTarget(resolvedBlock, commit.propPath);
        if (!target) return;
        const previous = readInlineTextPropValue(resolvedBlock, commit.propPath);
        if (previous === null) return;
        const next = commitInlineText(target, previous, commit.text);
        if (next === previous) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === section.id
              ? updatePageBlockAtPath(entry, blockPath, (block) =>
                  patchInlineTextPropForDevice(block, device, resolvedBlock, commit.propPath, next)
                ).section
              : entry
          ),
        }));
        return;
      }
      // The edited block no longer exists (deleted while editing): never write.
    },
    [device, pageDocument, setDocumentDraft, setInlineEditTarget]
  );

  const applyInlineTextMark = useCallback(
    (commit: PageEditorTextMarkCommit) => {
      if (device !== "desktop" || commit.propPath !== "text") return;
      for (const section of pageDocument.sections) {
        const blockPath = findSectionBlockPathById(section.blocks, commit.blockId);
        if (!blockPath) continue;
        const block = getPageBlockAtPath(section, blockPath);
        if (!block) return;
        const previous = readInlineTextPropValue(block, commit.propPath);
        if (previous === null) return;
        const currentMarks = normalizeBlockTextMarks(previous, block.props.marks);
        // `action: "remove"` is an explicit unlink/strip over the range (audit M7 /
        // TASK-478-02); everything else is the value-aware apply/replace/toggle.
        const nextMarks =
          commit.action === "remove"
            ? removeBlockTextMark(previous, currentMarks, commit)
            : applyBlockTextMark(previous, currentMarks, commit);
        if (JSON.stringify(currentMarks) === JSON.stringify(nextMarks)) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === section.id
              ? updatePageBlockAtPath(entry, blockPath, (currentBlock) =>
                  patchBlockPropsForDevice(currentBlock, "desktop", { marks: nextMarks })
                ).section
              : entry
          ),
        }));
        return;
      }
    },
    [device, pageDocument, setDocumentDraft]
  );

  const updateSelectedSectionVariant = useCallback(
    (variant: PageSectionVariant) => {
      updateSelectedSection((section) =>
        isPageSectionVariantOption(section.type, variant) ? { ...section, variant } : section
      );
    },
    [updateSelectedSection]
  );

  const clearSelectedBlockOverride = useCallback(
    (path: readonly string[]) => {
      if (device === "desktop") return;
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            clearBlockResponsiveOverride(block, device, path)
          ).section;
        }
        return {
          ...section,
          blocks: section.blocks.map((block, index) =>
            index === 0 ? clearBlockResponsiveOverride(block, device, path) : block
          ),
        };
      });
    },
    [device, selectedBlockPath, updateSelectedSection]
  );

  // Responsive-panel target = the selected block when one is selected,
  // otherwise the selected section (never a first-block fallback).
  const setResponsiveTargetVisible = useCallback(
    (breakpoint: PageBreakpoint, visible: boolean) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            setBlockVisibleForBreakpoint(block, breakpoint, visible)
          ).section;
        }
        return setSectionVisibleForBreakpoint(section, breakpoint, visible);
      });
    },
    [selectedBlockPath, updateSelectedSection]
  );

  const clearResponsiveTargetOverride = useCallback(
    (breakpoint: PageOverrideBreakpoint, path: readonly string[]) => {
      updateSelectedSection((section) => {
        if (selectedBlockPath) {
          return updatePageBlockAtPath(section, selectedBlockPath, (block) =>
            clearBlockResponsiveOverride(block, breakpoint, path)
          ).section;
        }
        return clearResponsiveOverride(section, breakpoint, path);
      });
    },
    [selectedBlockPath, updateSelectedSection]
  );

  const addSection = useCallback(
    (type: PageSectionType) => {
      const section = createStarterSection(type);
      setDocumentDraft((current) => {
        const sections = [...current.sections];
        const insertIndex =
          pendingSectionInsertIndex === null
            ? sections.length
            : Math.max(0, Math.min(pendingSectionInsertIndex, sections.length));
        sections.splice(insertIndex, 0, section);
        return { ...current, sections };
      });
      selectSection(section.id);
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsert(null);
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
    },
    [
      pendingSectionInsertIndex,
      selectSection,
      setDocumentDraft,
      setCommandActiveIndex,
      setCommandOpen,
      setCommandQuery,
      setPendingBesideBlockPath,
      setPendingBlockInsert,
      setPendingSectionInsertIndex,
    ]
  );

  const addBlock = useCallback(
    (type: PageBlockType) => {
      // Column-targeted ghost tiles (owner finding #5, round 3) stamp the
      // section column assignment onto the new block at creation time, so the
      // insert itself stays the plain append the target describes.
      const block = createPageBlockV2(
        type,
        pendingBlockInsert?.column !== undefined
          ? { style: { column: pendingBlockInsert.column } }
          : undefined
      );
      if (!selectedSectionId) {
        if (!canCreateContentSectionFromUntargetedBlock) {
          const fallbackSection = pageDocument.sections[0];
          if (!fallbackSection) return;
          const result = insertPageBlockAtTarget(
            fallbackSection,
            getDefaultPageBlockInsertTarget(fallbackSection, null),
            block
          );
          if (result.status !== "ok" || !result.path) return;
          setDocumentDraft((current) => ({
            ...current,
            sections: current.sections.map((section) =>
              section.id === fallbackSection.id ? result.section : section
            ),
          }));
          selectBlock(fallbackSection.id, result.path);
          setCommandOpen(false);
          setCommandQuery("");
          setCommandActiveIndex(0);
          setPendingBlockInsert(null);
          setPendingSectionInsertIndex(null);
          setPendingBesideBlockPath(null);
          return;
        }
        const section = createPageSectionV2("content", { blocks: [block] });
        setDocumentDraft((current) => ({ ...current, sections: [...current.sections, section] }));
        selectBlock(section.id, [{ index: 0 }]);
        setCommandOpen(false);
        setCommandQuery("");
        setCommandActiveIndex(0);
        setPendingBlockInsert(null);
        setPendingSectionInsertIndex(null);
        setPendingBesideBlockPath(null);
        return;
      }
      if (!selectedSection) return;
      // "Add block beside" defers the row-group wrap/append to pick-time so a
      // cancelled palette never mutates the document (owner finding #7).
      const result = pendingBesideBlockPath
        ? insertPageBlockBeside(selectedSection, pendingBesideBlockPath, block)
        : insertPageBlockAtTarget(
            selectedSection,
            pendingBlockInsert?.target ??
              getDefaultPageBlockInsertTarget(selectedSection, selectedBlockPath),
            block
          );
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => {
        const sections = current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        );
        return { ...current, sections };
      });
      selectBlock(selectedSectionId, result.path);
      setCommandOpen(false);
      setCommandQuery("");
      setCommandActiveIndex(0);
      setPendingBlockInsert(null);
      setPendingSectionInsertIndex(null);
      setPendingBesideBlockPath(null);
    },
    [
      canCreateContentSectionFromUntargetedBlock,
      pageDocument.sections,
      pendingBesideBlockPath,
      pendingBlockInsert,
      selectBlock,
      selectedBlockPath,
      selectedSection,
      selectedSectionId,
      setDocumentDraft,
      setCommandActiveIndex,
      setCommandOpen,
      setCommandQuery,
      setPendingBesideBlockPath,
      setPendingBlockInsert,
      setPendingSectionInsertIndex,
    ]
  );

  const moveSelectedSection = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId) return;
      setDocumentDraft((current) => {
        const index = current.sections.findIndex((section) => section.id === selectedSectionId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.sections.length) return current;
        const sections = [...current.sections];
        const [section] = sections.splice(index, 1);
        if (!section) return current;
        sections.splice(target, 0, section);
        return { ...current, sections };
      });
    },
    [selectedSectionId, setDocumentDraft]
  );

  // Sibling move by an arbitrary signed offset (owner finding #6): ±1 for
  // left/right (and single-column up/down), ±effectiveColumns for vertical
  // moves inside a multi-column section grid. Out-of-range targets are strict
  // no-ops — clamping would teleport the block into a different grid column.
  const moveSelectedBlockBy = useCallback(
    (offset: number) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const target = getPageBlockSiblingMoveTarget(selectedBlockPath, offset);
      if (!target) return;
      const listResult = getPageBlockListAtPath(selectedSection, target.listPath);
      if (listResult.status !== "ok") return;
      const targetIndex = target.index ?? 0;
      if (targetIndex < 0 || targetIndex > listResult.blocks.length - 1) return;
      const result = movePageBlockToTarget(selectedSection, selectedBlockPath, target);
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  const moveSelectedBlockToTarget = useCallback(
    (target: PageBlockInsertTarget) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const result = movePageBlockToTarget(selectedSection, selectedBlockPath, target);
      if (result.status !== "ok" || !result.path) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  // Horizontal Left/Right move (owner finding #6): ±1 sibling move inside a
  // row group, adjacent-slot move inside a columns block (the geometry the
  // user actually sees). At the section root of a multi-column section
  // (owner finding #5, round 3) Left/Right SET the column assignment instead
  // of swapping indices: the block moves into the adjacent column stack and
  // every other block keeps its cell. Out-of-range moves are strict no-ops.
  const moveSelectedBlockHorizontally = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSection || !selectedBlockPath || !resolvedSelectedSection || !selectedSectionId)
        return;
      const layout = getPageBlockContainerLayout(resolvedSelectedSection, selectedBlockPath);
      if (layout.kind === "columns-slot") {
        const target = getPageBlockAdjacentColumnMoveTarget(
          resolvedSelectedSection,
          selectedBlockPath,
          direction
        );
        if (!target) return;
        moveSelectedBlockToTarget(target);
        return;
      }
      if (layout.kind === "grid" || layout.kind === "section-column") {
        // The assignment write lands on the BASE section (column composition
        // is structural and breakpoint-invariant on the public front); the
        // block keeps its path, so the selection stays put.
        const result = movePageSectionBlockToAdjacentColumn(
          selectedSection,
          selectedBlockPath,
          direction
        );
        if (!result) return;
        setDocumentDraft((current) => ({
          ...current,
          sections: current.sections.map((section) =>
            section.id === selectedSectionId ? result : section
          ),
        }));
        return;
      }
      if (layout.kind === "stack") return;
      moveSelectedBlockBy(direction);
    },
    [
      moveSelectedBlockBy,
      moveSelectedBlockToTarget,
      resolvedSelectedSection,
      selectedBlockPath,
      selectedSection,
      selectedSectionId,
      setDocumentDraft,
    ]
  );

  // Vertical Up/Down while per-column composition is active (owner finding
  // #5, round 3): reorder the selected block within its column stack.
  const moveSelectedBlockWithinColumnStack = useCallback(
    (direction: -1 | 1) => {
      if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
      const result = movePageSectionBlockWithinColumn(
        selectedSection,
        selectedBlockPath,
        direction
      );
      if (!result) return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === selectedSectionId ? result.section : section
        ),
      }));
      selectBlock(selectedSectionId, result.path);
    },
    [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]
  );

  const duplicateSelectedSection = useCallback(() => {
    if (!selectedSection) return;
    const duplicate = duplicateSectionWithIds(selectedSection);
    setDocumentDraft((current) => {
      const index = current.sections.findIndex((section) => section.id === selectedSection.id);
      const sections = [...current.sections];
      sections.splice(index + 1, 0, duplicate);
      return { ...current, sections };
    });
    selectSection(duplicate.id);
  }, [selectSection, selectedSection, setDocumentDraft]);

  const duplicateSelectedBlock = useCallback(() => {
    if (!selectedSectionId || !selectedSection || !selectedBlockPath) return;
    const result = duplicatePageBlockAtPath(selectedSection, selectedBlockPath);
    if (result.status !== "ok" || !result.path) return;
    setDocumentDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSectionId ? result.section : section
      ),
    }));
    selectBlock(selectedSectionId, result.path);
  }, [selectBlock, selectedBlockPath, selectedSection, selectedSectionId, setDocumentDraft]);

  const deleteSectionById = useCallback(
    (sectionId: string) => {
      setDocumentDraft((current) => {
        const sections = current.sections.filter((section) => section.id !== sectionId);
        return { ...current, sections };
      });
      selectSection(null);
    },
    [selectSection, setDocumentDraft]
  );

  const deleteBlockByPath = useCallback(
    (sectionId: string, blockPath: PageBlockPath) => {
      const section = pageDocument.sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      const result = deletePageBlockAtPath(section, blockPath);
      if (result.status !== "ok") return;
      setDocumentDraft((current) => ({
        ...current,
        sections: current.sections.map((entry) =>
          entry.id === sectionId ? result.section : entry
        ),
      }));
      if (result.fallbackPath) {
        selectBlock(sectionId, result.fallbackPath);
      } else {
        selectSection(sectionId);
      }
    },
    [pageDocument.sections, selectBlock, selectSection, setDocumentDraft]
  );

  const requestDeleteSelection = useCallback(() => {
    if (selectedSectionId && selectedBlockPath && selectedBlock) {
      setDeleteSelectionTarget({
        kind: "block",
        sectionId: selectedSectionId,
        blockPath: selectedBlockPath,
        label: getBlockDisplayLabel(selectedBlock),
      });
      return;
    }
    if (!selectedSectionId || !selectedSection) return;
    setDeleteSelectionTarget({
      kind: "section",
      sectionId: selectedSectionId,
      label: selectedSection.name,
    });
  }, [
    selectedBlock,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    setDeleteSelectionTarget,
  ]);

  const confirmDeleteSelection = useCallback(() => {
    if (!deleteSelectionTarget) return;
    if (deleteSelectionTarget.kind === "block") {
      deleteBlockByPath(deleteSelectionTarget.sectionId, deleteSelectionTarget.blockPath);
    } else {
      deleteSectionById(deleteSelectionTarget.sectionId);
    }
    setDeleteSelectionTarget(null);
  }, [deleteBlockByPath, deleteSectionById, deleteSelectionTarget, setDeleteSelectionTarget]);

  const copySelectedFragment = useCallback(async () => {
    if (!selectedSection) return;
    if (selectedBlock) {
      await writeEditorClipboardText(serializePageEditorClipboardPayload("block", selectedBlock));
      return;
    }
    await writeEditorClipboardText(serializePageEditorClipboardPayload("section", selectedSection));
  }, [selectedBlock, selectedSection]);

  const pasteClipboardFragment = useCallback(async () => {
    const text = await readEditorClipboardText();
    if (!text) return;
    const fragment = parsePageEditorClipboardFragment(text);
    if (!fragment) return;

    if (fragment.kind === "section") {
      setDocumentDraft((current) =>
        insertSectionAfter(current, selectedSectionId, fragment.section)
      );
      selectSection(fragment.section.id);
      return;
    }

    const targetSection = selectedSection ?? pageDocument.sections[0] ?? null;
    if (!targetSection) return;
    const target =
      selectedBlockPath && selectedSection
        ? getPageBlockAfterInsertTarget(selectedBlockPath)
        : { listPath: {}, index: targetSection.blocks.length };
    if (!target) return;
    const result = insertPageBlockAtTarget(targetSection, target, fragment.block);
    if (result.status !== "ok" || !result.path) return;
    setDocumentDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === targetSection.id ? result.section : section
      ),
    }));
    selectBlock(targetSection.id, result.path);
  }, [
    pageDocument.sections,
    selectBlock,
    selectSection,
    selectedBlockPath,
    selectedSection,
    selectedSectionId,
    setDocumentDraft,
  ]);

  return {
    updateSelectedSection,
    updateSelectedSectionControl,
    updateSelectedSectionVariant,
    updateSectionGroup,
    updateSelectedBlockControl,
    setResponsiveTargetVisible,
    clearSelectedBlockOverride,
    clearResponsiveTargetOverride,
    addSection,
    addBlock,
    moveSelectedBlockBy,
    moveSelectedBlockHorizontally,
    moveSelectedBlockWithinColumnStack,
    moveSelectedBlockToTarget,
    duplicateSelectedBlock,
    duplicateSelectedSection,
    deleteSectionById,
    deleteBlockByPath,
    copySelectedFragment,
    pasteClipboardFragment,
    requestDeleteSelection,
    confirmDeleteSelection,
    moveSelectedSection,
    startInlineEdit,
    commitInlineEdit,
    applyInlineTextMark,
  };
};
