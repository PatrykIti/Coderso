import {
  SCREEN_BLOCK_COLLECTION_MAX,
  SCREEN_DOCUMENT_SECTIONS_MAX,
  SCREEN_TABS_MAX,
  SCREEN_TABS_MIN,
  SCREEN_TAB_ID,
  SCREEN_TAB_LABEL_MAX,
  screenBlockDataAllowedKeys,
} from "./customScreenContracts";
import type { ScreenBlockV1, ScreenDocumentV1, ScreenTabItem } from "./customScreenContracts";
import {
  isFixedScreenBlockType,
  sameSet,
  screenCodePointLength,
  truncateScreenCodePoints,
} from "./screenDocumentDataNormalizer";
import {
  createDefaultScreenSection,
  normalizeScreenBlock,
  normalizeScreenSection,
  sectionsLookLikeLegacyBlockArray,
  visitScreenBlocks,
} from "./screenDocumentNormalizer";
import {
  isRecord,
  normalizeUniqueIds,
  rejectUnknownKeys,
} from "./customScreenNormalizationPrimitives";
import type { ScreenFieldPathSegment } from "./customScreenNormalizationPrimitives";

// TASK-498-04: READ-PATH-ONLY block repair — remap a stored `actions` placeholder block
// (dropped from the union and promoted to `button` in TASK-498-02) to the typed `button`
// kind so old screens upgrade VISUALLY on read without a write/migration. Applied ONLY inside
// the ...ForRead document normalizers, NEVER on the write path (`normalizeScreenDocumentV1` /
// `normalizeScreenBlock`), so it cannot widen the write contract. The remapped `button` data is
// intersected with the button allow-list so the per-kind reject-unknown normalizer cannot throw
// on a stray legacy `actions` data key — the block reads back usable instead of falling through
// to the neutral legacy placeholder. Non-`actions` records pass through byte-stable.
export const READ_REPAIR_BLOCK_TYPE = Object.freeze({
  actions: "button",
} as const) satisfies Readonly<Record<string, string>>;

// Own-property lookup only: a stored `type` equal to an Object.prototype member name
// (`constructor`, `toString`, ...) must stay an unrepaired legacy placeholder instead of
// resolving to an inherited function and failing the whole document read.
const isReadRepairBlockType = (value: string): value is keyof typeof READ_REPAIR_BLOCK_TYPE =>
  Object.prototype.hasOwnProperty.call(READ_REPAIR_BLOCK_TYPE, value);

export const nextRepairedTabId = (index: number, used: ReadonlySet<string>) => {
  const base = `tab-${index + 1}`;
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export const hasCanonicalStoredTabs = (data: Record<string, unknown>, slots: unknown) => {
  if (
    !Array.isArray(data.tabs) ||
    data.tabs.length < SCREEN_TABS_MIN ||
    data.tabs.length > SCREEN_TABS_MAX ||
    !isRecord(slots)
  ) {
    return false;
  }
  const seen = new Set<string>();
  const tabIds: string[] = [];
  for (const item of data.tabs) {
    if (!isRecord(item)) return false;
    const keys = Object.keys(item);
    if (
      keys.length !== 2 ||
      !Object.prototype.hasOwnProperty.call(item, "id") ||
      !Object.prototype.hasOwnProperty.call(item, "label") ||
      typeof item.id !== "string" ||
      typeof item.label !== "string"
    ) {
      return false;
    }
    if (
      item.id !== item.id.trim() ||
      !SCREEN_TAB_ID.test(item.id) ||
      seen.has(item.id) ||
      item.label !== item.label.trim() ||
      !item.label ||
      screenCodePointLength(item.label) > SCREEN_TAB_LABEL_MAX
    ) {
      return false;
    }
    seen.add(item.id);
    tabIds.push(item.id);
  }
  const slotIds = Object.keys(slots);
  return sameSet(tabIds, slotIds) && Object.values(slots).every(Array.isArray);
};

export const repairStoredTabsForRead = (
  data: Record<string, unknown>,
  slots: unknown
): { data: Record<string, unknown>; slots: Record<string, unknown[]>; repaired: boolean } => {
  if (hasCanonicalStoredTabs(data, slots)) {
    return {
      data,
      slots: slots as Record<string, unknown[]>,
      repaired: false,
    };
  }
  const rawSlots = isRecord(slots) ? slots : {};
  const rawTabs = Array.isArray(data.tabs) ? data.tabs.slice(0, SCREEN_TABS_MAX) : [];
  const slotDerivedTabs = Object.keys(rawSlots)
    .sort()
    .slice(0, SCREEN_TABS_MAX)
    .map((id, index) => ({ id, label: `Tab ${index + 1}` }));
  const tabs =
    rawTabs.length > 0
      ? rawTabs
      : slotDerivedTabs.length > 0
        ? slotDerivedTabs
        : [{ id: "tab-1", label: "Tab 1" }];
  const consumedSlotIds = new Set<string>();
  const usedIds = new Set<string>();
  const repairedSlots: Record<string, unknown[]> = {};
  const repairedTabs: ScreenTabItem[] = tabs.map((rawTab, index) => {
    const rawItem = isRecord(rawTab) ? rawTab : {};
    const rawId = typeof rawItem.id === "string" ? rawItem.id : "";
    const trimmedId = rawId.trim();
    const id =
      SCREEN_TAB_ID.test(trimmedId) && !usedIds.has(trimmedId)
        ? trimmedId
        : nextRepairedTabId(index, usedIds);
    usedIds.add(id);

    const trimmedLabel = typeof rawItem.label === "string" ? rawItem.label.trim() : "";
    const label = trimmedLabel
      ? truncateScreenCodePoints(trimmedLabel, SCREEN_TAB_LABEL_MAX)
      : `Tab ${index + 1}`;
    const sourceSlotId =
      rawId && Object.prototype.hasOwnProperty.call(rawSlots, rawId)
        ? rawId
        : Object.prototype.hasOwnProperty.call(rawSlots, trimmedId)
          ? trimmedId
          : null;
    const sourceItems = sourceSlotId ? rawSlots[sourceSlotId] : undefined;
    repairedSlots[id] =
      sourceSlotId && !consumedSlotIds.has(sourceSlotId) && Array.isArray(sourceItems)
        ? sourceItems
        : [];
    if (sourceSlotId) consumedSlotIds.add(sourceSlotId);
    return { id, label };
  });
  return {
    data: { ...data, tabs: repairedTabs },
    slots: repairedSlots,
    repaired: true,
  };
};

export type ScreenReadRepairContext = {
  unsupportedButtonNodes: WeakSet<Record<string, unknown>>;
};

export const repairLegacyScreenRecordForRead = (
  node: unknown,
  context: ScreenReadRepairContext
): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => repairLegacyScreenRecordForRead(item, context));
  }
  if (!isRecord(node)) return node;
  const next: Record<string, unknown> = { ...node };
  let changed = false;
  const repairedType =
    typeof node.type === "string" && isReadRepairBlockType(node.type)
      ? READ_REPAIR_BLOCK_TYPE[node.type]
      : undefined;
  if (repairedType) {
    next.type = repairedType;
    const allowed = isFixedScreenBlockType(repairedType)
      ? screenBlockDataAllowedKeys[repairedType]
      : null;
    if (allowed && isRecord(node.data)) {
      const allowedSet = new Set<string>(allowed);
      next.data = Object.fromEntries(
        Object.entries(node.data).filter(([key]) => allowedSet.has(key))
      );
    }
    changed = true;
  }
  const effectiveType = repairedType ?? (typeof node.type === "string" ? node.type : undefined);
  const hasUnsupportedButtonAction =
    effectiveType === "button" &&
    isRecord(node.data) &&
    Object.prototype.hasOwnProperty.call(node.data, "action") &&
    node.data.action !== "link";
  if (effectiveType === "tabs") {
    const repairedTabs = repairStoredTabsForRead(isRecord(next.data) ? next.data : {}, node.slots);
    if (repairedTabs.repaired) {
      next.data = repairedTabs.data;
      next.slots = repairedTabs.slots;
      changed = true;
    }
  }
  for (const key of ["blocks", "children"] as const) {
    if (Array.isArray(node[key])) {
      next[key] = node[key].map((item) => repairLegacyScreenRecordForRead(item, context));
      changed = true;
    }
  }
  const repairedSlotSource = isRecord(next.slots) ? next.slots : node.slots;
  if (isRecord(repairedSlotSource)) {
    next.slots = Object.fromEntries(
      Object.entries(repairedSlotSource).map(([slot, items]) => [
        slot,
        Array.isArray(items)
          ? items.map((item) => repairLegacyScreenRecordForRead(item, context))
          : items,
      ])
    );
    changed = true;
  }
  const repairedNode = changed ? next : node;
  if (hasUnsupportedButtonAction) {
    context.unsupportedButtonNodes.add(repairedNode);
  }
  return repairedNode;
};

export const collectRepairedScreenBlocksInReadOrder = (
  repairedSections: unknown[]
): Record<string, unknown>[] => {
  const blocks: Record<string, unknown>[] = [];
  const visit = (items: unknown[]) => {
    items.forEach((node) => {
      if (!isRecord(node)) return;
      blocks.push(node);
      if (Array.isArray(node.children)) visit(node.children);
      if (isRecord(node.slots)) {
        Object.values(node.slots).forEach((slotItems) => {
          if (Array.isArray(slotItems)) visit(slotItems);
        });
      }
    });
  };
  if (sectionsLookLikeLegacyBlockArray(repairedSections)) {
    visit(repairedSections);
  } else {
    repairedSections.forEach((section) => {
      if (isRecord(section) && Array.isArray(section.blocks)) visit(section.blocks);
    });
  }
  return blocks;
};

export const collectNormalizedUnsupportedButtonIds = (
  repairedSections: unknown[],
  normalizedDocument: ScreenDocumentV1,
  context: ScreenReadRepairContext
): Set<string> => {
  const repairedBlocks = collectRepairedScreenBlocksInReadOrder(repairedSections);
  const normalizedBlocks: ScreenBlockV1[] = [];
  normalizedDocument.sections.forEach((section) =>
    visitScreenBlocks(section.blocks, (block) => normalizedBlocks.push(block))
  );
  if (repairedBlocks.length !== normalizedBlocks.length) {
    throw new Error("custom_screen_definition_invalid");
  }
  const ids = new Set<string>();
  repairedBlocks.forEach((repairedBlock, index) => {
    if (context.unsupportedButtonNodes.has(repairedBlock)) {
      const normalizedBlock = normalizedBlocks[index];
      if (!normalizedBlock) throw new Error("custom_screen_definition_invalid");
      ids.add(normalizedBlock.id);
    }
  });
  return ids;
};

export type NormalizedScreenDocumentRead = {
  document: ScreenDocumentV1;
  unsupportedButtonIds: Set<string>;
};

export const normalizeScreenDocumentV1ForReadWithRepairAtPath = (
  input: unknown,
  documentPath: readonly ScreenFieldPathSegment[]
): NormalizedScreenDocumentRead => {
  if (input === undefined || input === null) {
    return {
      document: { schemaVersion: 1, sections: [] },
      unsupportedButtonIds: new Set<string>(),
    };
  }
  if (!isRecord(input)) throw new Error("custom_screen_definition_invalid");
  rejectUnknownKeys(input, ["schemaVersion", "sections"]);
  const schemaVersion = input.schemaVersion ?? 1;
  if (schemaVersion !== 1) throw new Error("custom_screen_definition_invalid");
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    throw new Error("custom_screen_definition_invalid");
  }
  const rawSections = input.sections ?? [];
  const legacyFlatSections = sectionsLookLikeLegacyBlockArray(rawSections);
  if (
    rawSections.length >
    (legacyFlatSections ? SCREEN_BLOCK_COLLECTION_MAX : SCREEN_DOCUMENT_SECTIONS_MAX)
  ) {
    throw new Error("custom_screen_definition_invalid");
  }
  const repairContext: ScreenReadRepairContext = {
    unsupportedButtonNodes: new WeakSet<Record<string, unknown>>(),
  };
  const repairedSections = repairLegacyScreenRecordForRead(rawSections, repairContext) as unknown[];
  const document: ScreenDocumentV1 = sectionsLookLikeLegacyBlockArray(repairedSections)
    ? {
        schemaVersion: 1,
        sections:
          repairedSections.length > 0
            ? [
                createDefaultScreenSection(
                  normalizeUniqueIds(
                    repairedSections.map((item, index) =>
                      normalizeScreenBlock(item, index, "stored-read", [
                        ...documentPath,
                        "sections",
                        0,
                        "blocks",
                        index,
                      ])
                    )
                  )
                ),
              ]
            : [],
      }
    : {
        schemaVersion: 1,
        sections: normalizeUniqueIds(
          repairedSections.map((item, index) =>
            normalizeScreenSection(item, index, "stored-read", [...documentPath, "sections", index])
          )
        ),
      };
  return {
    document,
    unsupportedButtonIds: collectNormalizedUnsupportedButtonIds(
      repairedSections,
      document,
      repairContext
    ),
  };
};

export const normalizeScreenDocumentV1ForReadAtPath = (
  input: unknown,
  documentPath: readonly ScreenFieldPathSegment[]
): ScreenDocumentV1 => {
  return normalizeScreenDocumentV1ForReadWithRepairAtPath(input, documentPath).document;
};

export function normalizeScreenDocumentV1ForRead(input: unknown): ScreenDocumentV1 {
  return normalizeScreenDocumentV1ForReadAtPath(input, ["definition", "editorView", "document"]);
}
