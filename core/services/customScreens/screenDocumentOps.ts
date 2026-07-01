import type {
  CustomScreenBindingMode,
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
  ScreenSectionV1,
} from "./customScreenSchemas";
import { defaultScreenSectionId } from "./customScreenSchemas";

export type ScreenBlockKind =
  | "record-header"
  | "field"
  | "field-group"
  | "columns"
  | "rich-text"
  | "heading"
  | "text"
  | "stat"
  | "divider"
  | "image"
  | "related-list"
  | "tabs"
  | "button"
  | "legacy-widget";

export type ScreenBlockPatch = Partial<
  Pick<ScreenBlockV1, "label" | "variant" | "data" | "slots" | "children">
>;

export type ScreenSectionPatch = Partial<
  Pick<ScreenSectionV1, "label" | "data" | "layout" | "visibility">
>;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const screenBlockLabels: Record<ScreenBlockKind, string> = {
  "record-header": "Record Header",
  field: "Field",
  "field-group": "Field Group",
  columns: "Columns",
  "rich-text": "Rich Text",
  heading: "Heading",
  text: "Text",
  stat: "Stat",
  divider: "Divider",
  image: "Image",
  "related-list": "Related list",
  tabs: "Tabs",
  button: "Button",
  "legacy-widget": "Legacy Widget",
};

export function createScreenSection(
  input: {
    id?: string;
    label?: string;
    blocks?: ScreenBlockV1[];
  } = {}
): ScreenSectionV1 {
  const label = input.label ?? "Details";
  return {
    id: input.id ?? createId("section"),
    type: "section",
    label,
    data: { title: label },
    blocks: input.blocks ?? [],
  };
}

const createReadBinding = (
  blockId: string,
  propPath: string,
  field: string,
  mode: CustomScreenBindingMode = "read"
): ScreenFieldBinding => ({
  id: slugify(`${blockId}-${propPath}`) || `${blockId}-${propPath}`,
  blockId,
  propPath,
  source: "entry",
  field,
  mode,
});

export function createScreenBlock(input: {
  type: ScreenBlockKind;
  id?: string;
  field?: string;
  label?: string;
  mode?: CustomScreenBindingMode;
  // TASK-498-02 B2: the sole caller (CustomScreenEditorPage.handleAddBlock) passes
  // `field.relation.target` so the `related-list` factory can seed `data.target`
  // without re-deriving relation metadata (which `field` — a NAME string — lacks).
  relationTarget?: string;
}): { block: ScreenBlockV1; bindings: ScreenFieldBinding[] } {
  const id = input.id ?? createId(input.type);
  const label = input.label ?? (input.field ? input.field : screenBlockLabels[input.type]);
  const base = {
    id,
    type: input.type,
    data: {
      label,
      ...(input.field ? { field: input.field } : {}),
    },
  } satisfies ScreenBlockV1;

  if (input.type === "field") {
    const field = input.field ?? "title";
    return {
      block: {
        ...base,
        type: "field",
        data: {
          label,
          helper: "",
          display: "stacked",
          field,
        },
      },
      bindings: [
        {
          id: slugify(`${id}-value`) || `${id}-value`,
          blockId: id,
          propPath: "value",
          source: "entry",
          field,
          mode: input.mode ?? "readwrite",
        },
      ],
    };
  }

  if (input.type === "field-group") {
    return {
      block: {
        ...base,
        type: "field-group",
        data: {
          title: label,
          description: "",
        },
        slots: { content: [] },
      },
      bindings: [],
    };
  }

  if (input.type === "columns") {
    return {
      block: {
        ...base,
        type: "columns",
        data: {
          label,
          columns: 2,
        },
        slots: { left: [], right: [] },
      },
      bindings: [],
    };
  }

  if (input.type === "record-header") {
    return {
      block: {
        ...base,
        type: "record-header",
        data: {
          eyebrow: "",
          title: label,
          subtitle: "",
        },
      },
      bindings: [
        {
          id: slugify(`${id}-title`) || `${id}-title`,
          blockId: id,
          propPath: "title",
          source: "entry",
          field: input.field ?? "title",
          mode: input.mode ?? "read",
        },
      ],
    };
  }

  if (input.type === "rich-text") {
    return {
      block: {
        ...base,
        type: "rich-text",
        data: {
          content: "Add supporting text",
          tone: "muted",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "heading") {
    return {
      block: {
        ...base,
        type: "heading",
        data: {
          label,
          text: input.field ? "" : label,
          level: 2,
          align: "left",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "text", input.field)] : [],
    };
  }

  if (input.type === "text") {
    return {
      block: {
        ...base,
        type: "text",
        data: {
          label,
          content: "Add supporting text",
          tone: "default",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "stat") {
    return {
      block: {
        ...base,
        type: "stat",
        data: {
          label,
          format: "number",
          trend: "auto",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "value", input.field)] : [],
    };
  }

  if (input.type === "divider") {
    return {
      block: {
        ...base,
        type: "divider",
        data: {
          label,
          variant: "line",
        },
      },
      bindings: [],
    };
  }

  if (input.type === "image") {
    return {
      block: {
        ...base,
        type: "image",
        data: {
          label,
          fit: "cover",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "src", input.field)] : [],
    };
  }

  if (input.type === "related-list") {
    return {
      block: {
        ...base,
        type: "related-list",
        data: {
          label,
          target: input.relationTarget ?? "",
          displayField: "",
          variant: "checklist",
          limit: 5,
          ...(input.field ? { field: input.field } : {}),
        },
      },
      // TASK-498-03 resolves these `items` into RelatedEntrySummary[].
      bindings: input.field ? [createReadBinding(id, "items", input.field)] : [],
    };
  }

  if (input.type === "tabs") {
    return {
      block: {
        ...base,
        type: "tabs",
        data: {
          label,
          tabs: [
            { id: "tab-1", label: "Tab 1" },
            { id: "tab-2", label: "Tab 2" },
          ],
        },
        slots: { "tab-1": [], "tab-2": [] },
      },
      bindings: [],
    };
  }

  if (input.type === "button") {
    return {
      block: {
        ...base,
        type: "button",
        data: {
          label,
          action: "link",
          variant: "primary",
          ...(input.field ? { field: input.field } : {}),
        },
      },
      bindings: input.field ? [createReadBinding(id, "href", input.field)] : [],
    };
  }

  return { block: base, bindings: [] };
}

const visitBlocks = (
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

const visitDocumentBlocks = (
  document: ScreenDocumentV1,
  visitor: (block: ScreenBlockV1, index: number, siblings: ScreenBlockV1[]) => ScreenBlockV1
): ScreenDocumentV1 => ({
  ...document,
  sections: document.sections.map((section) => ({
    ...section,
    blocks: visitBlocks(section.blocks, visitor),
  })),
});

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

export function addScreenBlock(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target?: { parentId: string; slotId: string }
): ScreenDocumentV1 {
  if (!target) {
    const nextDocument = ensureSectionForInsert(document);
    const [firstSection, ...remainingSections] = nextDocument.sections;
    if (!firstSection) return nextDocument;
    return {
      ...nextDocument,
      sections: [
        { ...firstSection, blocks: [...firstSection.blocks, block] },
        ...remainingSections,
      ],
    };
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
    for (const block of blocks) {
      return block.id;
    }
    return null;
  };
  for (const section of document.sections) {
    const id = first(section.blocks);
    if (id) return id;
  }
  return null;
};

const cloneBlock = (
  block: ScreenBlockV1,
  idMap: Map<string, string> = new Map()
): ScreenBlockV1 => {
  const id = createId(block.type);
  idMap.set(block.id, id);
  const slots = block.slots
    ? Object.fromEntries(
        Object.entries(block.slots).map(([slotId, items]) => [
          slotId,
          items.map((item) => cloneBlock(item, idMap)),
        ])
      )
    : undefined;
  return {
    ...block,
    id,
    ...(slots ? { slots } : {}),
    ...(block.children
      ? { children: block.children.map((child) => cloneBlock(child, idMap)) }
      : {}),
  };
};

export function duplicateScreenBlock(
  document: ScreenDocumentV1,
  blockId: string
): ScreenDocumentV1 {
  const insertDuplicate = (blocks: ScreenBlockV1[]): ScreenBlockV1[] => {
    const result: ScreenBlockV1[] = [];
    blocks.forEach((block) => {
      const slots = block.slots
        ? Object.fromEntries(
            Object.entries(block.slots).map(([slotId, items]) => [slotId, insertDuplicate(items)])
          )
        : undefined;
      const nextBlock = {
        ...block,
        ...(slots ? { slots } : {}),
      };
      result.push(nextBlock);
      if (block.id === blockId) result.push(cloneBlock(block));
    });
    return result;
  };
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      blocks: insertDuplicate(section.blocks),
    })),
  };
}

export function duplicateScreenBlockWithBindings(
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[],
  blockId: string
): {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
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
      if (block.id === blockId) {
        result.push(cloneBlock(block, idMap));
      }
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
  const duplicatedBindings = bindings.flatMap((binding) => {
    const nextBlockId = idMap.get(binding.blockId);
    if (!nextBlockId) return [];
    return [
      {
        ...binding,
        id: slugify(`${nextBlockId}-${binding.propPath}`) || `${nextBlockId}-${binding.propPath}`,
        blockId: nextBlockId,
      },
    ];
  });
  return {
    document: nextDocument,
    bindings: [...bindings, ...duplicatedBindings],
    duplicatedBlockId: idMap.get(blockId) ?? null,
  };
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

export function removeScreenBindingsForBlock(bindings: ScreenFieldBinding[], blockId: string) {
  return bindings.filter((binding) => binding.blockId !== blockId);
}

export function removeScreenBindingsForBlockTree(
  bindings: ScreenFieldBinding[],
  block: ScreenBlockV1 | null
) {
  if (!block) return bindings;
  const removedIds = new Set(collectScreenBlockIds(block));
  return bindings.filter((binding) => !removedIds.has(binding.blockId));
}
