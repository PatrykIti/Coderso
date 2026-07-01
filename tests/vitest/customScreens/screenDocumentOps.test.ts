import { expect, test } from "vitest";

import {
  createScreenBlock,
  duplicateScreenBlockWithBindings,
  removeScreenBindingsForBlockTree,
  removeScreenBlock,
} from "../../../core/services/customScreens/screenDocumentOps";
import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";

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
  expect(result.bindings[1]?.blockId).not.toBe("field-1");
});
