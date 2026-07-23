import type { ScreenBlockV1, ScreenDocumentV1, ScreenSectionV1 } from "./customScreenContracts";
import { defaultScreenSectionId } from "./customScreenContracts";
import type {
  ScreenBlockLocation,
  ScreenBlockPatch,
  ScreenInsertTarget,
  ScreenSectionPatch,
} from "./screenDocumentContracts";
import { createScreenNodeId, createScreenSection } from "./screenDocumentFactories";
import {
  collectScreenBlockIds,
  findScreenBlockById,
  findScreenBlockLocation,
  visitBlocks,
  visitDocumentBlocks,
} from "./screenDocumentTree";

type SiblingResolution = {
  list: ScreenBlockV1[];
  write: (next: ScreenBlockV1[]) => ScreenDocumentV1;
};

const clampIndex = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? Math.floor(value) : max));

const ensureSectionForInsert = (document: ScreenDocumentV1): ScreenDocumentV1 => {
  if (document.sections.length > 0) return document;
  return {
    ...document,
    sections: [
      {
        id: defaultScreenSectionId,
        type: "section",
        label: "Details",
        data: { title: "Details" },
        blocks: [],
      },
    ],
  };
};

const resolveInsertList = (
  document: ScreenDocumentV1,
  target: ScreenInsertTarget
): SiblingResolution | null => {
  if (target.kind === "section-end" || target.kind === "section-index") {
    const section = document.sections.find((item) => item.id === target.sectionId);
    if (!section) return null;
    return {
      list: section.blocks,
      write: (next) => ({
        ...document,
        sections: document.sections.map((item) =>
          item.id === section.id ? { ...item, blocks: next } : item
        ),
      }),
    };
  }
  const parent = findScreenBlockById(document, target.parentId);
  const list = parent?.slots?.[target.slotId];
  if (!list) return null;
  return {
    list,
    write: (next) => ({
      ...document,
      sections: document.sections.map((section) => ({
        ...section,
        blocks: visitBlocks(section.blocks, (current) =>
          current.id === target.parentId
            ? { ...current, slots: { ...(current.slots ?? {}), [target.slotId]: next } }
            : current
        ),
      })),
    }),
  };
};

const sameSiblingList = (origin: ScreenBlockLocation, target: ScreenInsertTarget): boolean => {
  if (target.kind === "section-index") {
    return origin.parentId === null && origin.sectionId === target.sectionId;
  }
  if (target.kind === "slot-index") {
    return origin.parentId === target.parentId && origin.slotId === target.slotId;
  }
  return false;
};

export function addScreenBlockAt(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  const nextDocument = ensureSectionForInsert(document);
  const resolution = resolveInsertList(nextDocument, target);
  if (!resolution) {
    return addScreenBlockAt(nextDocument, block, {
      kind: "section-end",
      sectionId: nextDocument.sections[0]!.id,
    });
  }
  const rawIndex =
    target.kind === "section-index" || target.kind === "slot-index"
      ? target.index
      : resolution.list.length;
  const index = clampIndex(rawIndex, 0, resolution.list.length);
  return resolution.write([
    ...resolution.list.slice(0, index),
    block,
    ...resolution.list.slice(index),
  ]);
}

export function moveScreenBlockTo(
  document: ScreenDocumentV1,
  blockId: string,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  const { document: stripped, removed } = removeScreenBlock(document, blockId);
  if (!removed) return document;

  if (target.kind === "slot-end" || target.kind === "slot-index") {
    const subtreeIds = new Set(collectScreenBlockIds(removed));
    if (subtreeIds.has(target.parentId)) return document;
  }

  let adjusted = target;
  if (target.kind === "section-index" || target.kind === "slot-index") {
    const origin = findScreenBlockLocation(document, blockId);
    if (origin && sameSiblingList(origin, target) && origin.index < target.index) {
      adjusted = { ...target, index: target.index - 1 };
    }
  }

  return addScreenBlockAt(stripped, removed, adjusted);
}

export function addScreenBlock(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target?: { parentId: string; slotId: string }
): ScreenDocumentV1 {
  if (!target) {
    return addScreenBlockAt(document, block, {
      kind: "section-end",
      sectionId: document.sections[0]?.id ?? "",
    });
  }
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      blocks: visitBlocks(section.blocks, (current) => {
        if (current.id !== target.parentId) return current;
        const slots = current.slots ?? {};
        return {
          ...current,
          slots: {
            ...slots,
            [target.slotId]: [...(slots[target.slotId] ?? []), block],
          },
        };
      }),
    })),
  };
}

export function updateScreenBlock(
  document: ScreenDocumentV1,
  blockId: string,
  patch: ScreenBlockPatch | ((block: ScreenBlockV1) => ScreenBlockV1)
): ScreenDocumentV1 {
  return visitDocumentBlocks(document, (block) => {
    if (block.id !== blockId) return block;
    if (typeof patch === "function") return patch(block);
    return { ...block, ...patch, data: patch.data ?? block.data };
  });
}

export function updateScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  patch: ScreenSectionPatch | ((section: ScreenSectionV1) => ScreenSectionV1)
): ScreenDocumentV1 {
  return {
    ...document,
    sections: document.sections.map((section) => {
      if (section.id !== sectionId) return section;
      if (typeof patch === "function") return patch(section);
      return { ...section, ...patch, data: patch.data ?? section.data };
    }),
  };
}

export function addScreenSection(
  document: ScreenDocumentV1,
  input: { label?: string; atIndex?: number } = {}
): { document: ScreenDocumentV1; sectionId: string } {
  const section = createScreenSection({ label: input.label ?? "Section" });
  const sections = [...document.sections];
  const at = clampIndex(input.atIndex ?? sections.length, 0, sections.length);
  sections.splice(at, 0, section);
  return { document: { ...document, sections }, sectionId: section.id };
}

export function renameScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  label: string
): ScreenDocumentV1 {
  const clean = label.trim() || "Section";
  return updateScreenSection(document, sectionId, (section) => ({
    ...section,
    label: clean,
    data: { ...section.data, title: clean },
  }));
}

export function moveScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  direction: "up" | "down"
): ScreenDocumentV1 {
  const index = document.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return document;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= document.sections.length) return document;
  const sections = [...document.sections];
  [sections[index], sections[target]] = [sections[target]!, sections[index]!];
  return { ...document, sections };
}

export function removeScreenSection(
  document: ScreenDocumentV1,
  sectionId: string
): { document: ScreenDocumentV1; removed: ScreenSectionV1 | null } {
  const removed = document.sections.find((section) => section.id === sectionId) ?? null;
  if (!removed) return { document, removed: null };
  if (document.sections.length <= 1) return { document, removed: null };
  return {
    document: {
      ...document,
      sections: document.sections.filter((section) => section.id !== sectionId),
    },
    removed,
  };
}

export function appendScreenBlockToSection(
  document: ScreenDocumentV1,
  sectionId: string | null,
  block: ScreenBlockV1
): ScreenDocumentV1 {
  const base = ensureSectionForInsert(document);
  const exists = sectionId ? base.sections.some((section) => section.id === sectionId) : false;
  const targetId = exists ? sectionId : (base.sections[0]?.id ?? null);
  if (!targetId) return base;
  return {
    ...base,
    sections: base.sections.map((section) =>
      section.id === targetId ? { ...section, blocks: [...section.blocks, block] } : section
    ),
  };
}

const removeFromBlocks = (
  blocks: ScreenBlockV1[],
  blockId: string
): { blocks: ScreenBlockV1[]; removed: ScreenBlockV1 | null } => {
  let removed: ScreenBlockV1 | null = null;
  const next = blocks.flatMap((block) => {
    if (block.id === blockId) {
      removed = block;
      return [];
    }
    const slots = block.slots
      ? Object.fromEntries(
          Object.entries(block.slots).map(([slotId, items]) => {
            const result = removeFromBlocks(items, blockId);
            if (result.removed) removed = result.removed;
            return [slotId, result.blocks];
          })
        )
      : undefined;
    const children = block.children ? removeFromBlocks(block.children, blockId) : null;
    if (children?.removed) removed = children.removed;
    return [
      {
        ...block,
        ...(slots ? { slots } : {}),
        ...(children ? { children: children.blocks } : {}),
      },
    ];
  });
  return { blocks: next, removed };
};

export function removeScreenBlock(document: ScreenDocumentV1, blockId: string) {
  let removed: ScreenBlockV1 | null = null;
  const sections = document.sections.map((section) => {
    const result = removeFromBlocks(section.blocks, blockId);
    if (result.removed) removed = result.removed;
    return { ...section, blocks: result.blocks };
  });
  return {
    document: { ...document, sections },
    removed,
  };
}

const cloneScreenBlock = (block: ScreenBlockV1, idMap: Map<string, string>): ScreenBlockV1 => {
  const id = createScreenNodeId(block.type);
  idMap.set(block.id, id);
  const slots = block.slots
    ? Object.fromEntries(
        Object.entries(block.slots).map(([slotId, items]) => [
          slotId,
          items.map((item) => cloneScreenBlock(item, idMap)),
        ])
      )
    : undefined;
  return {
    ...block,
    id,
    ...(slots ? { slots } : {}),
    ...(block.children
      ? { children: block.children.map((child) => cloneScreenBlock(child, idMap)) }
      : {}),
  };
};

export function duplicateScreenBlockWithIdMap(
  document: ScreenDocumentV1,
  blockId: string
): {
  document: ScreenDocumentV1;
  idMap: Map<string, string>;
  duplicatedBlockId: string | null;
} {
  const idMap = new Map<string, string>();
  const insertDuplicate = (blocks: ScreenBlockV1[]): ScreenBlockV1[] => {
    const result: ScreenBlockV1[] = [];
    blocks.forEach((block) => {
      const slots = block.slots
        ? Object.fromEntries(
            Object.entries(block.slots).map(([slotId, items]) => [slotId, insertDuplicate(items)])
          )
        : undefined;
      result.push({
        ...block,
        ...(slots ? { slots } : {}),
      });
      if (block.id === blockId) result.push(cloneScreenBlock(block, idMap));
    });
    return result;
  };
  const nextDocument = {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      blocks: insertDuplicate(section.blocks),
    })),
  };
  return {
    document: nextDocument,
    idMap,
    duplicatedBlockId: idMap.get(blockId) ?? null,
  };
}

export function duplicateScreenBlock(
  document: ScreenDocumentV1,
  blockId: string
): ScreenDocumentV1 {
  return duplicateScreenBlockWithIdMap(document, blockId).document;
}

export function moveScreenBlock(
  document: ScreenDocumentV1,
  blockId: string,
  direction: "up" | "down"
): ScreenDocumentV1 {
  const moveInList = (blocks: ScreenBlockV1[]): ScreenBlockV1[] => {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index !== -1) {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    }
    return blocks.map((block) => ({
      ...block,
      ...(block.slots
        ? {
            slots: Object.fromEntries(
              Object.entries(block.slots).map(([slotId, items]) => [slotId, moveInList(items)])
            ),
          }
        : {}),
      ...(block.children ? { children: moveInList(block.children) } : {}),
    }));
  };
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      blocks: moveInList(section.blocks),
    })),
  };
}
