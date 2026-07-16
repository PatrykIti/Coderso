import { expect, test } from "vitest";

import {
  createScreenBlock,
  duplicateScreenBlockWithBindings,
  reconcileScreenBindings,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
  removeScreenSection,
  updateScreenSection,
} from "../../../core/services/customScreens/screenDocumentOps";
import {
  buildDefaultListViewDefinition,
  buildScreenFieldBindingId,
  customScreenDefinitionSchema,
  normalizeCustomScreenDefinitionForWrite,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";

const document: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      data: { title: "Details" },
      blocks: [
        {
          id: "group-1",
          type: "field-group",
          data: { title: "Details" },
          slots: {
            content: [
              {
                id: "field-1",
                type: "field",
                data: { label: "Headline" },
              },
            ],
          },
        },
      ],
    },
  ],
};

const bindings: ScreenFieldBinding[] = [
  {
    id: "field-1-value",
    blockId: "field-1",
    propPath: "value",
    source: "entry",
    field: "headline",
    mode: "readwrite",
  },
];

test("removeScreenBindingsForBlockTree removes nested bindings with the deleted block", () => {
  const result = removeScreenBlock(document, "group-1");

  expect(result.document.sections[0]?.blocks).toEqual([]);
  expect(removeScreenBindingsForBlockTree(bindings, result.removed)).toEqual([]);
});

// TASK-498-02 B2: the data-oriented factory branches.
test("createScreenBlock emits typed data + gated read bindings per new kind", () => {
  // Chip inserts (no field) → NO placeholder-field binding on the bound kinds.
  for (const type of ["stat", "image", "related-list", "heading", "button"] as const) {
    const created = createScreenBlock({ type });
    expect(created.bindings).toEqual([]);
  }

  const text = createScreenBlock({ type: "text" });
  expect(text.block.data).toMatchObject({ content: "Add supporting text", tone: "default" });
  expect(text.bindings).toEqual([]);

  const divider = createScreenBlock({ type: "divider" });
  expect(divider.block.data).toMatchObject({ variant: "line" });
  expect(divider.bindings).toEqual([]);

  // Bound display kinds WITH a field → a single mode:"read" binding on the kind's propPath.
  const stat = createScreenBlock({ type: "stat", field: "score" });
  expect(stat.bindings).toEqual([
    expect.objectContaining({
      blockId: stat.block.id,
      propPath: "value",
      field: "score",
      mode: "read",
    }),
  ]);

  const image = createScreenBlock({ type: "image", field: "cover" });
  expect(image.bindings[0]).toMatchObject({ propPath: "src", field: "cover", mode: "read" });

  const heading = createScreenBlock({ type: "heading", field: "headline" });
  expect(heading.bindings[0]).toMatchObject({ propPath: "text", field: "headline", mode: "read" });
  expect(heading.block.data).toMatchObject({ level: 2, align: "left" });

  const button = createScreenBlock({ type: "button", field: "url" });
  expect(button.bindings[0]).toMatchObject({ propPath: "href", field: "url", mode: "read" });
});

test("createScreenBlock emits bounded, schema-valid binding IDs for maximum-length block IDs", () => {
  const prefix = `block-${"b".repeat(153)}`;
  const created = [
    createScreenBlock({ type: "field", id: `${prefix}1`, field: "title" }),
    createScreenBlock({ type: "field", id: `${prefix}2`, field: "summary" }),
    createScreenBlock({ type: "stat", id: `${prefix}3`, field: "score" }),
  ];
  expect(created.every(({ block }) => block.id.length === 160)).toBe(true);
  const generatedBindings = created.flatMap(({ bindings: nextBindings }) => nextBindings);
  expect(generatedBindings.every(({ id }) => id.length <= 120)).toBe(true);
  expect(new Set(generatedBindings.map(({ id }) => id)).size).toBe(generatedBindings.length);
  for (const binding of generatedBindings) {
    expect(binding.id).toBe(buildScreenFieldBindingId(binding.blockId, binding.propPath));
  }

  const definition = {
    schemaVersion: 4,
    listView: buildDefaultListViewDefinition(),
    editorView: {
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-default",
            type: "section",
            data: {},
            blocks: created.map(({ block }) => block),
          },
        ],
      },
      bindings: generatedBindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
  expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition }).editorView.bindings).toEqual(
    generatedBindings
  );
});

test("createScreenBlock related-list binds items + derives target from relationTarget", () => {
  const related = createScreenBlock({
    type: "related-list",
    field: "tasks",
    relationTarget: "task",
  });
  expect(related.block.data).toMatchObject({ target: "task", variant: "checklist" });
  expect(related.bindings).toEqual([
    expect.objectContaining({ propPath: "items", field: "tasks", mode: "read" }),
  ]);
});

test("createScreenBlock tabs emits two slots matching data.tabs", () => {
  const tabs = createScreenBlock({ type: "tabs" });
  expect(tabs.block.data.tabs).toEqual([
    { id: "tab-1", label: "Tab 1" },
    { id: "tab-2", label: "Tab 2" },
  ]);
  expect(Object.keys(tabs.block.slots ?? {})).toEqual(["tab-1", "tab-2"]);
  expect(tabs.bindings).toEqual([]);
});

test("duplicateScreenBlockWithBindings clones nested bindings onto cloned block ids", () => {
  const result = duplicateScreenBlockWithBindings(document, bindings, "group-1");

  expect(result.document.sections).toHaveLength(1);
  expect(result.document.sections[0]?.blocks).toHaveLength(2);
  expect(result.bindings).toHaveLength(2);
  expect(result.bindings[1]).toMatchObject({
    propPath: "value",
    field: "headline",
    mode: "readwrite",
  });
  const duplicatedBinding = result.bindings[1]!;
  expect(duplicatedBinding.blockId).not.toBe("field-1");
  expect(duplicatedBinding.id).toBe(
    buildScreenFieldBindingId(duplicatedBinding.blockId, duplicatedBinding.propPath)
  );
  expect(duplicatedBinding.id.length).toBeLessThanOrEqual(120);
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item A: ScreenSectionPatch "style" round-trip + empty prune
// ---------------------------------------------------------------------------

test("TASK-505-01 updateScreenSection round-trips a style patch and can clear it", () => {
  const withStyle = updateScreenSection(document, "section-1", {
    style: { columns: "3-1", columnGap: 24 },
  });
  expect(withStyle.sections[0]?.style).toEqual({ columns: "3-1", columnGap: 24 });
  // A 505-03 "clear" patch prunes to absent (undefined) — spread verbatim by updateScreenSection.
  const cleared = updateScreenSection(withStyle, "section-1", { style: undefined });
  expect(cleared.sections[0]?.style).toBeUndefined();
});

// ---------------------------------------------------------------------------
// TASK-505-01 Item B: reconcileScreenBindings GC helper
// ---------------------------------------------------------------------------

const reconcileDoc: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      data: {},
      blocks: [
        { id: "block-a", type: "field", data: {} },
        {
          id: "group-1",
          type: "field-group",
          data: {},
          slots: { content: [{ id: "block-b", type: "field", data: {} }] },
        },
      ],
    },
    // Second section so removeScreenSection("section-1") is not a last-section no-op.
    { id: "section-2", type: "section", data: {}, blocks: [] },
  ],
};

const reconcileBindings: ScreenFieldBinding[] = [
  {
    id: "b1",
    blockId: "block-a",
    propPath: "value",
    source: "entry",
    field: "alpha",
    mode: "read",
  },
  { id: "b2", blockId: "ghost", propPath: "value", source: "entry", field: "beta", mode: "read" },
  {
    id: "b3",
    blockId: "block-b",
    propPath: "value",
    source: "entry",
    field: "gamma",
    mode: "read",
  },
];

test("TASK-505-01 reconcileScreenBindings prunes block-orphans, preserves valid order, reports fields", () => {
  const result = reconcileScreenBindings(reconcileDoc, reconcileBindings);
  expect(result.bindings.map((b) => b.field)).toEqual(["alpha", "gamma"]); // source order kept
  expect(result.removedBlockOrphans).toEqual(["beta"]);
});

test("TASK-505-01 reconcileScreenBindings is idempotent + non-destructive to a valid set", () => {
  const once = reconcileScreenBindings(reconcileDoc, reconcileBindings);
  const twice = reconcileScreenBindings(reconcileDoc, once.bindings);
  expect(twice.bindings).toEqual(once.bindings);
  expect(twice.removedBlockOrphans).toEqual([]);
  // A fully-valid set passes through byte-identical.
  const validOnly = reconcileBindings.filter((b) => b.blockId !== "ghost");
  const clean = reconcileScreenBindings(reconcileDoc, validOnly);
  expect(clean.bindings).toEqual(validOnly);
  expect(clean.removedBlockOrphans).toEqual([]);
});

test("TASK-505-01 reconcileScreenBindings after removeScreenBlock prunes exactly the dead subtree", () => {
  const { document: stripped } = removeScreenBlock(reconcileDoc, "group-1");
  const result = reconcileScreenBindings(stripped, reconcileBindings);
  expect(result.bindings.map((b) => b.field)).toEqual(["alpha"]);
  expect(result.removedBlockOrphans).toEqual(["beta", "gamma"]);
});

test("TASK-505-01 reconcileScreenBindings after removeScreenSection prunes the whole section", () => {
  const { document: stripped } = removeScreenSection(reconcileDoc, "section-1");
  const result = reconcileScreenBindings(stripped, reconcileBindings);
  expect(result.bindings).toEqual([]);
  expect(result.removedBlockOrphans).toEqual(["alpha", "beta", "gamma"]);
});
