import type { ScreenBlockV1, ScreenDocumentV1, ScreenSectionV1 } from "./customScreenContracts";
import type { ScreenBlockLocation } from "./screenDocumentContracts";

export const visitBlocks = (
  blocks: ScreenBlockV1[],
  visitor: (block: ScreenBlockV1, index: number, siblings: ScreenBlockV1[]) => ScreenBlockV1
): ScreenBlockV1[] =>
  blocks.map((block, index, siblings) => {
    const slots = block.slots
      ? Object.fromEntries(
          Object.entries(block.slots).map(([slotId, items]) => [
            slotId,
            visitBlocks(items, visitor),
          ])
        )
      : undefined;
    const children = block.children ? visitBlocks(block.children, visitor) : undefined;
    return visitor(
      {
        ...block,
        ...(slots ? { slots } : {}),
        ...(children ? { children } : {}),
      },
      index,
      siblings
    );
  });

export const visitDocumentBlocks = (
  document: ScreenDocumentV1,
  visitor: (block: ScreenBlockV1, index: number, siblings: ScreenBlockV1[]) => ScreenBlockV1
): ScreenDocumentV1 => ({
  ...document,
  sections: document.sections.map((section) => ({
    ...section,
    blocks: visitBlocks(section.blocks, visitor),
  })),
});

export function findScreenBlockLocation(
  document: ScreenDocumentV1,
  blockId: string
): ScreenBlockLocation | null {
  const walkList = (
    blocks: ScreenBlockV1[],
    sectionId: string,
    parentId: string | null,
    slotId: string | null
  ): ScreenBlockLocation | null => {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index]!;
      if (block.id === blockId) return { sectionId, parentId, slotId, index };
      if (block.slots) {
        for (const [key, items] of Object.entries(block.slots)) {
          const match = walkList(items, sectionId, block.id, key);
          if (match) return match;
        }
      }
      if (block.children) {
        const match = walkList(block.children, sectionId, block.id, null);
        if (match) return match;
      }
    }
    return null;
  };
  for (const section of document.sections) {
    const match = walkList(section.blocks, section.id, null, null);
    if (match) return match;
  }
  return null;
}

export const collectScreenBlockIds = (block: ScreenBlockV1): string[] => {
  const childIds = block.children?.flatMap(collectScreenBlockIds) ?? [];
  const slotIds = block.slots
    ? Object.values(block.slots).flatMap((items) => items.flatMap(collectScreenBlockIds))
    : [];
  return [block.id, ...childIds, ...slotIds];
};

export const collectScreenDocumentBlocks = (document: ScreenDocumentV1): ScreenBlockV1[] => {
  const collect = (blocks: ScreenBlockV1[]): ScreenBlockV1[] =>
    blocks.flatMap((block) => [
      block,
      ...(block.children ? collect(block.children) : []),
      ...(block.slots ? Object.values(block.slots).flatMap((items) => collect(items)) : []),
    ]);
  return document.sections.flatMap((section) => collect(section.blocks));
};

export const findScreenSectionById = (
  document: ScreenDocumentV1,
  sectionId: string | null
): ScreenSectionV1 | null => {
  if (!sectionId) return null;
  return document.sections.find((section) => section.id === sectionId) ?? null;
};

export const findScreenBlockById = (
  document: ScreenDocumentV1,
  blockId: string | null
): ScreenBlockV1 | null => {
  if (!blockId) return null;
  const findInList = (blocks: ScreenBlockV1[]): ScreenBlockV1 | null => {
    for (const block of blocks) {
      if (block.id === blockId) return block;
      const childMatch = block.children ? findInList(block.children) : null;
      if (childMatch) return childMatch;
      if (block.slots) {
        for (const items of Object.values(block.slots)) {
          const slotMatch = findInList(items);
          if (slotMatch) return slotMatch;
        }
      }
    }
    return null;
  };
  for (const section of document.sections) {
    const match = findInList(section.blocks);
    if (match) return match;
  }
  return null;
};

export const getFirstScreenBlockId = (document: ScreenDocumentV1): string | null => {
  const first = (blocks: ScreenBlockV1[]): string | null => {
    for (const block of blocks) return block.id;
    return null;
  };
  for (const section of document.sections) {
    const id = first(section.blocks);
    if (id) return id;
  }
  return null;
};
