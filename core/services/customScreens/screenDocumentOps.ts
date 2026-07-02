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

// TASK-500-02: a single deterministic insert target. NOT part of the stored
// document shape (no schema change); purely an argument to the ops below.
// `sectionId` is carried on the slot kinds too so the host can keep
// `selectedSectionId` in sync without a second lookup; the ops locate the
// parent container globally (ids are document-unique per normalizeUniqueIds)
// so a mismatched `sectionId` still resolves — deterministic and forgiving.
export type ScreenInsertTarget =
  | { kind: "section-end"; sectionId: string }
  | { kind: "section-index"; sectionId: string; index: number }
  | { kind: "slot-end"; sectionId: string; parentId: string; slotId: string }
  | { kind: "slot-index"; sectionId: string; parentId: string; slotId: string; index: number };

export type ScreenBlockLocation = {
  sectionId: string;
  parentId: string | null; // null ⇒ block is a top-level child of the section
  slotId: string | null; // null ⇒ top-level (or a children[] child of parentId)
  index: number; // index within its sibling list
};

// Deterministic pre-order traversal: for each section, walk section.blocks
// (parentId=null, slotId=null); for every block, check the block itself, then
// its slots in key order (parentId=block.id, slotId=key), then children[]
// (parentId=block.id, slotId=null). Returns the FIRST match, null when absent.
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

// internal — resolve the sibling list a target names, returning a write closure
// so add/move splice into the SAME list the target describes. Returns null when
// the section/parent/slot cannot be resolved (⇒ caller triggers fail-soft).
type SiblingResolution = {
  list: ScreenBlockV1[];
  write: (next: ScreenBlockV1[]) => ScreenDocumentV1;
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

// TASK-500-02: targeted insert — clamped index, FAIL-SOFT on an unresolvable
// target (falls back to the FIRST section's end; never throws in the editor
// path — normalizeScreenDocumentV1 on save stays the strict gate).
export function addScreenBlockAt(
  document: ScreenDocumentV1,
  block: ScreenBlockV1,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  const nextDocument = ensureSectionForInsert(document);
  const resolution = resolveInsertList(nextDocument, target);
  if (!resolution) {
    // Terminating recursion: sections[0] always resolves after ensureSectionForInsert.
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

// internal — true when a pre-removal location and an index-kind target name the
// SAME sibling list (same section top-level, or same parent+slot). Gates the
// removal-first index decrement in moveScreenBlockTo.
const sameSiblingList = (origin: ScreenBlockLocation, target: ScreenInsertTarget): boolean => {
  if (target.kind === "section-index") {
    return origin.parentId === null && origin.sectionId === target.sectionId;
  }
  if (target.kind === "slot-index") {
    return origin.parentId === target.parentId && origin.slotId === target.slotId;
  }
  return false;
};

// TASK-500-02: cross-section/slot MOVE — removal-first, cycle-guarded, and the
// SAME node is re-inserted (same id ⇒ bindings keyed by blockId stay valid; a
// move, NOT a clone — contrast duplicateScreenBlockWithBindings which remaps).
// This op is the SOLE owner of the same-sibling-list downward index DECREMENT:
// the canvas ALWAYS reports the gap index against the PRE-removal rendered list
// and must NOT pre-subtract (the op already decrements; doing both lands one
// slot too early). Cycle/unknown-block ⇒ returns the ORIGINAL document
// (referential equality so the host can `===` to skip a dirty mark).
export function moveScreenBlockTo(
  document: ScreenDocumentV1,
  blockId: string,
  target: ScreenInsertTarget
): ScreenDocumentV1 {
  // 1) Locate + detach the node WITHOUT losing it.
  const { document: stripped, removed } = removeScreenBlock(document, blockId);
  if (!removed) return document; // unknown block ⇒ no-op

  // 2) CYCLE GUARD: refuse to drop a container into its own subtree.
  if (target.kind === "slot-end" || target.kind === "slot-index") {
    const subtreeIds = new Set(collectScreenBlockIds(removed));
    if (subtreeIds.has(target.parentId)) return document; // no-op, ORIGINAL doc
  }

  // 3) SAME-LIST DOWNWARD ADJUSTMENT: removal happened FIRST, so an index-kind
  //    target naming the SAME sibling list the block left is shifted by one
  //    whenever the removed block sat BEFORE that index. clampIndex only bounds
  //    [0, len] — it does NOT decrement — so this step is REQUIRED.
  let adjusted = target;
  if (target.kind === "section-index" || target.kind === "slot-index") {
    const origin = findScreenBlockLocation(document, blockId); // PRE-removal location
    if (origin && sameSiblingList(origin, target) && origin.index < target.index) {
      adjusted = { ...target, index: target.index - 1 };
    }
  }

  // 4) Re-insert the SAME node; fail-soft/clamp handled by addScreenBlockAt
  //    against the STRIPPED doc.
  return addScreenBlockAt(stripped, removed, adjusted);
}

// TASK-500-02 legacy shim (NON-DESTRUCTIVE — existing tests and the Bun-lane
// assistant caller `actionExecutorService.ts` keep importing this).
// - No target: delegates to addScreenBlockAt (section-end of the first section;
//   ensureSectionForInsert re-seeds an empty doc) — identical legacy semantics.
//   The interactive editor host no longer calls this path (it resolves a
//   ScreenInsertTarget), so "always sections[0]" is gone at the host level; the
//   assistant no-target path legitimately still appends to sections[0].
// - With {parentId, slotId}: legacy semantics are PRESERVED verbatim (append
//   into parent.slots[slotId], CREATING the slot when absent; an unknown
//   parentId leaves the tree structurally unchanged). The assistant's
//   buildCustomScreenBlockAddPreview detects "target not found" via
//   isDeepStrictEqual on the returned document, so this branch must NOT adopt
//   addScreenBlockAt's fail-soft fallback (it would silently insert into the
//   first section instead of surfacing the conflict).
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

// TASK-500-01: sections as first-class, top-level only (sections CANNOT nest —
// ScreenSectionV1 lives flat in ScreenDocumentV1.sections). All editor-path
// helpers below FAIL SOFT (unknown ids no-op or fall back); the strict
// reject-unknown normalizers on SAVE stay the hard gate.
const clampIndex = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : max));

// Create + insert a real top-level section. atIndex clamps to [0, sections.length];
// default appends. Reuses createScreenSection (seeds data.title from label).
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

// Rename: set BOTH label and data.title (the renderer prefers data.title).
// Empty/blank label falls back to "Section"; unknown id no-ops via updateScreenSection.
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

// Reorder one section up/down; clamp at ends → boundary no-op (mirrors
// moveScreenBlock's guard). Unknown id → unchanged document.
export function moveScreenSection(
  document: ScreenDocumentV1,
  sectionId: string,
  direction: "up" | "down"
): ScreenDocumentV1 {
  const index = document.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return document;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= document.sections.length) return document; // boundary no-op
  const sections = [...document.sections];
  [sections[index], sections[target]] = [sections[target]!, sections[index]!];
  return { ...document, sections };
}

// Delete a section; return the removed record so the host can prune its bindings.
// LAST-SECTION RULE (deterministic): with only ONE section left this NO-OPS —
// returns { document: unchanged, removed: null }. The document always keeps at
// least one section for the canvas to steer insertion into; there is no
// zero-sections editor state and no lazy re-seed.
export function removeScreenSection(
  document: ScreenDocumentV1,
  sectionId: string
): { document: ScreenDocumentV1; removed: ScreenSectionV1 | null } {
  const removed = document.sections.find((section) => section.id === sectionId) ?? null;
  if (!removed) return { document, removed: null };
  if (document.sections.length <= 1) return { document, removed: null }; // last-section no-op
  return {
    document: {
      ...document,
      sections: document.sections.filter((section) => section.id !== sectionId),
    },
    removed,
  };
}

// TASK-500-01 minimal targeting foundation (500-02 REPLACES this with
// addScreenBlockAt + the ScreenInsertTarget union). Appends `block` to the named
// section's top-level blocks; unknown/null sectionId FAILS SOFT to the first
// section (never throws in the editor path). This kills "always sections[0]".
export function appendScreenBlockToSection(
  document: ScreenDocumentV1,
  sectionId: string | null,
  block: ScreenBlockV1
): ScreenDocumentV1 {
  const base = ensureSectionForInsert(document); // reuse existing empty-doc guard
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
