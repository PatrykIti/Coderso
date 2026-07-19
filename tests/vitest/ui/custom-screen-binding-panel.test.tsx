// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import {
  createScreenFieldBinding,
  ScreenBlockInspector,
  ScreenSectionInspector,
} from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import {
  buildDefaultListViewDefinition,
  buildScreenFieldBindingId,
  customScreenDefinitionSchema,
  normalizeCustomScreenDefinitionForWrite,
  type ScreenBlockV1,
} from "../../../core/services/customScreens/customScreenSchemas";
import { validate } from "../../../core/server/validation/schemaValidator";
import {
  clickButton,
  mountReactNode,
  mountScreenBlockInspector as mountInspector,
  mountStatefulScreenBlockInspector,
  openSelectForLabel,
  selectBoundField,
  setInputValue,
} from "./support/screenBlockInspectorTestHarness";

/**
 * TASK-496-02: the standalone `FieldBindingPanel` (a 0-production-importer
 * orphan whose source is swept by TASK-496-03) is retired. The block binding UI
 * is rendered by `ScreenBlockInspector` via its `bindings` / `onPatchBinding`
 * path (mounted as the Editor-View `inspectorPanel` when `activePanel ===
 * "binding"`). These render tests are retargeted to that surviving surface so
 * binding-render coverage is preserved (the FieldBindingPanel-only
 * `buildBindingFieldOptions` `writable` util test was genuinely dead — its
 * helper dies with the file and has no `ScreenBlockInspector` equivalent — and
 * is dropped). The system-vs-schema field dedup behaviour still survives via
 * `ScreenBlockInspector`'s own `buildFieldOptions` and is asserted below.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

test("createScreenFieldBinding emits bounded, distinct IDs for valid maximum-length block IDs", () => {
  const prefix = `block-${"b".repeat(153)}`;
  const blockIds = [`${prefix}1`, `${prefix}2`];
  const bindings = blockIds.map((blockId, index) =>
    createScreenFieldBinding({
      blockId,
      propPath: "value",
      field: `field${index + 1}`,
    })
  );
  expect(blockIds.every((id) => id.length === 160)).toBe(true);
  expect(bindings.every(({ id }) => id.length <= 120)).toBe(true);
  expect(bindings[0]?.id).not.toBe(bindings[1]?.id);
  for (const binding of bindings) {
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
            blocks: blockIds.map((id) => ({ id, type: "field", data: {} })),
          },
        ],
      },
      bindings,
      saveMode: "entry",
      interactionMode: "inline",
    },
  };
  expect(() => validate(customScreenDefinitionSchema, definition)).not.toThrow();
  expect(normalizeCustomScreenDefinitionForWrite({ definition }).editorView.bindings).toEqual(
    bindings
  );
});

test("ScreenBlockInspector restores the latest committed Tab label after an invalid blur", () => {
  const onPatchBlock = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "tabs-1",
      type: "tabs",
      data: { tabs: [{ id: "overview", label: "Overview" }] },
      slots: { overview: [] },
    },
    onPatchBlock,
  });
  const input = view.container.querySelector<HTMLInputElement>(
    '[data-screen-tab-label="overview"]'
  );

  try {
    expect(input).not.toBeNull();
    setInputValue(input!, "   ");
    expect(input?.value).toBe("   ");
    React.act(() => {
      input?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(input?.value).toBe("Overview");
    expect(onPatchBlock).not.toHaveBeenCalled();

    setInputValue(input!, "x".repeat(121));
    expect(input?.value).toHaveLength(121);
    React.act(() => {
      input?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(input?.value).toBe("Overview");
    expect(onPatchBlock).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

const mountStatefulTabsInspector = (initialBlock: ScreenBlockV1) => {
  const onPatchBlock = vi.fn<(blockId: string, patch: Partial<ScreenBlockV1>) => void>();
  return {
    onPatchBlock,
    ...mountStatefulScreenBlockInspector({ initialBlock, onPatchBlock }),
  };
};

test("ScreenBlockInspector binds a display kind (stat) with mode 'read', not readwrite", () => {
  const onPatchBinding = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "stat-1",
      type: "stat",
      data: { label: "Stat", format: "number", trend: "auto" },
    } as ScreenBlockV1,
    fields: [{ id: "f-score", name: "score", type: "number", label: "Score" }],
    onPatchBinding,
  });
  try {
    selectBoundField(view.container, "Score");
    expect(onPatchBinding).toHaveBeenCalledWith("stat-1", "value", {
      field: "score",
      mode: "read",
    });
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector keeps a `field` binding readwrite (no explicit read mode)", () => {
  const onPatchBinding = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "field-1",
      type: "field",
      data: { label: "Title", field: "title" },
    } as ScreenBlockV1,
    fields: [{ id: "f-headline", name: "headline", type: "text", label: "Headline" }],
    onPatchBinding,
  });
  try {
    selectBoundField(view.container, "Headline");
    // `field` passes NO explicit mode → handlePatchBinding/createScreenFieldBinding
    // default it to readwrite (inline write-back stays on editable field/header only).
    expect(onPatchBinding).toHaveBeenCalledWith("field-1", "value", { field: "headline" });
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector binds related-list on propPath 'items' and syncs data.target", () => {
  const onPatchBinding = vi.fn();
  const onPatchBlockData = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "related-1",
      type: "related-list",
      data: { label: "Tasks", target: "", displayField: "", variant: "checklist", limit: 5 },
    } as ScreenBlockV1,
    fields: [
      {
        id: "f-tasks",
        name: "tasks",
        type: "relation",
        label: "Tasks",
        relation: { target: "task" },
      },
    ],
    onPatchBinding,
    onPatchBlockData,
  });
  try {
    selectBoundField(view.container, "Tasks");
    // Bound on `items` (NOT `value`) with read mode — matches the factory binding + the
    // 498-03 resolver lookup; a `value`-propPath binding would be orphaned.
    expect(onPatchBinding).toHaveBeenCalledWith("related-1", "items", {
      field: "tasks",
      mode: "read",
    });
    // handlePatchBinding never auto-syncs data for the `items` propPath, so the control
    // itself must mirror the relation target into data.target.
    expect(onPatchBlockData).toHaveBeenCalledWith("related-1", { target: "task" });
    expect(view.container.querySelector('input[type="number"]')?.getAttribute("aria-label")).toBe(
      "Limit"
    );
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector renders the empty binding state without a selected block", () => {
  const view = mountInspector({ selectedBlock: null });
  try {
    expect(view.container.textContent).toContain(
      "Select a block on the canvas to edit its shared layout and field binding."
    );
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector renders the bound-field control for a selected block", () => {
  const view = mountInspector({
    selectedBlock: {
      id: "field-1",
      type: "field",
      data: { label: "Headline", field: "headline" },
    } as ScreenBlockV1,
    bindings: [
      {
        id: "binding-1",
        blockId: "field-1",
        propPath: "value",
        source: "entry",
        field: "headline",
        mode: "readwrite",
      },
    ],
    fields: [{ id: "field-headline", name: "headline", type: "text", label: "Headline" }],
  });
  try {
    // TASK-498-01 A4: the flat inspector keeps the first-class "Bound field" row.
    // The "Interaction" mode Select is dropped (mode is set per-kind by the insert
    // wiring, TASK-498-02 B4).
    expect(view.container.textContent).toContain("Bound field");
    // The binding surface drives onPatchBinding through a field Select.
    expect(view.container.querySelector('[role="combobox"]')).not.toBeNull();
    const accessibleNames = Array.from(view.container.querySelectorAll('[role="combobox"]')).map(
      (combobox) => combobox.getAttribute("aria-label")
    );
    expect(accessibleNames).toEqual(["Bound field", "Width", "Block layout alignment"]);
    expect(accessibleNames.every((name) => Boolean(name?.trim()))).toBe(true);
    expect(
      view.container.querySelector('input[aria-label="Min height"]')?.getAttribute("type")
    ).toBe("number");
  } finally {
    view.cleanup();
  }

  const sectionView = mountReactNode(
    <ScreenSectionInspector
      section={{ id: "section-1", type: "section", data: {}, blocks: [] }}
      onPatchSection={vi.fn()}
    />
  );
  try {
    const columnGap = sectionView.container.querySelector<HTMLInputElement>(
      "[data-screen-section-gap]"
    );
    expect(columnGap?.getAttribute("aria-label")).toBe("Column gap");
    expect(
      Array.from(sectionView.container.querySelectorAll('[role="combobox"]')).map((combobox) =>
        combobox.getAttribute("aria-label")
      )
    ).toEqual(["Columns"]);
  } finally {
    sectionView.cleanup();
  }
});

test("ScreenBlockInspector binding options dedupe system and schema fields with the same name", () => {
  const view = mountInspector({
    selectedBlock: {
      id: "header-1",
      type: "record-header",
      data: {},
    } as ScreenBlockV1,
    bindings: [
      {
        id: "binding-1",
        blockId: "header-1",
        propPath: "title",
        source: "entry",
        field: "title",
        mode: "read",
      },
    ],
    fields: [
      { id: "field-title", name: "title", type: "text", label: "Project title" },
      { id: "field-description", name: "description", type: "text", label: "Description" },
    ],
  });
  try {
    // Target the Bound-field Select specifically (stable data hook) rather than the
    // first combobox, since the flat inspector may render additional controls.
    const trigger = view.container.querySelector(
      '[data-screen-bound-field="true"]'
    ) as HTMLElement | null;
    expect(trigger).not.toBeNull();
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const optionLabels = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent?.trim() ?? ""
    );
    // The same-named system "Title" is deduped in favour of the schema field.
    expect(optionLabels).not.toContain("Title (system)");
    expect(optionLabels).toContain("Project title (text)");
    expect(optionLabels).toContain("Description (text)");
    // System fields that do not collide remain available.
    expect(optionLabels).toContain("Slug (system)");
  } finally {
    view.cleanup();
  }
});

test("Button exposes the href binding and clears only an existing exact binding", () => {
  const onPatchBinding = vi.fn();
  const button: ScreenBlockV1 = {
    id: "button-1",
    type: "button",
    data: { action: "link", variant: "primary", href: "/fallback" },
  };
  const unboundView = mountInspector({
    selectedBlock: button,
    fields: [{ id: "f-destination", name: "destination", type: "text", label: "Destination" }],
    onPatchBinding,
  });
  try {
    expect(unboundView.container.textContent).not.toContain("Use static link");
    selectBoundField(unboundView.container, "Destination");
    expect(onPatchBinding).toHaveBeenCalledWith("button-1", "href", {
      field: "destination",
      mode: "read",
    });
  } finally {
    unboundView.cleanup();
  }

  onPatchBinding.mockClear();
  const boundView = mountInspector({
    selectedBlock: button,
    bindings: [
      {
        id: "button-1-href",
        blockId: "button-1",
        propPath: "href",
        source: "entry",
        field: "destination",
        mode: "read",
      },
    ],
    fields: [{ id: "f-destination", name: "destination", type: "text", label: "Destination" }],
    onPatchBinding,
  });
  try {
    clickButton(boundView.container, "Use static link");
    expect(onPatchBinding).toHaveBeenCalledTimes(1);
    expect(onPatchBinding).toHaveBeenCalledWith("button-1", "href", { field: "" });
  } finally {
    boundView.cleanup();
  }
});

test("the unbound Button binding row stays named and selectable from its first option", () => {
  const onPatchBinding = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "button-unbound",
      type: "button",
      data: { action: "link", variant: "primary", href: "/fallback" },
    },
    fields: [{ id: "f-destination", name: "destination", type: "text", label: "Destination" }],
    onPatchBinding,
  });
  try {
    const trigger = view.container.querySelector(
      '[data-screen-bound-field="true"]'
    ) as HTMLElement | null;
    expect(trigger).not.toBeNull();
    // An unbound Button must not render a blank, unnamed combobox: the control keeps a
    // programmatic accessible name and shows the explicit unbound placeholder.
    expect(trigger?.getAttribute("aria-label")).toBe("Bound field");
    expect(trigger?.textContent).toContain("Not bound");

    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    const options = Array.from(document.body.querySelectorAll('[role="option"]'));
    // The first eligible option is the leading system field, and it stays selectable
    // even though the unbound control value is the empty string.
    expect(options[0]?.textContent?.trim()).toBe("Title (system)");
    React.act(() => {
      options[0]?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      options[0]?.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
      options[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onPatchBinding).toHaveBeenCalledTimes(1);
    expect(onPatchBinding).toHaveBeenCalledWith("button-unbound", "href", {
      field: "title",
      mode: "read",
    });
  } finally {
    view.cleanup();
  }

  const authoredFieldBlock: ScreenBlockV1 = {
    id: "field-precedence",
    type: "field",
    data: { label: "Destination", field: "destination" },
  };
  const authoredView = mountInspector({
    selectedBlock: authoredFieldBlock,
    fields: [{ id: "f-destination", name: "destination", type: "text", label: "Destination" }],
    onPatchBinding,
  });
  try {
    const trigger = authoredView.container.querySelector(
      '[data-screen-bound-field="true"]'
    ) as HTMLElement | null;
    expect(trigger?.textContent).toContain("Destination");
  } finally {
    authoredView.cleanup();
  }

  const boundView = mountInspector({
    selectedBlock: authoredFieldBlock,
    bindings: [
      {
        id: "field-precedence-value",
        blockId: authoredFieldBlock.id,
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ],
    fields: [{ id: "f-destination", name: "destination", type: "text", label: "Destination" }],
    onPatchBinding,
  });
  try {
    const trigger = boundView.container.querySelector(
      '[data-screen-bound-field="true"]'
    ) as HTMLElement | null;
    expect(trigger?.textContent).toContain("Title");
    expect(trigger?.textContent).not.toContain("Destination");
    expect(onPatchBinding).toHaveBeenCalledTimes(1);
  } finally {
    boundView.cleanup();
  }
});

test("link-specific clear copy is absent from unrelated binding rows", () => {
  const view = mountInspector({
    selectedBlock: {
      id: "heading-1",
      type: "heading",
      data: { text: "Heading", level: 2, align: "left" },
    },
    bindings: [
      {
        id: "heading-1-text",
        blockId: "heading-1",
        propPath: "text",
        source: "entry",
        field: "title",
        mode: "read",
      },
    ],
  });
  try {
    expect(view.container.textContent).not.toContain("Use static link");
    const accessibleNames = Array.from(view.container.querySelectorAll('[role="combobox"]')).map(
      (combobox) => combobox.getAttribute("aria-label")
    );
    expect(accessibleNames).toEqual([
      "Bound field",
      "Level",
      "Heading text alignment",
      "Width",
      "Block layout alignment",
    ]);
    expect(new Set(accessibleNames).size).toBe(accessibleNames.length);
    expect(accessibleNames.every((name) => Boolean(name?.trim()))).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("Button Action authoring exposes only the supported Link option", () => {
  const view = mountInspector({
    selectedBlock: {
      id: "button-legacy",
      type: "button",
      data: { action: "custom", variant: "primary", href: "/fallback" },
    },
  });
  try {
    const trigger = openSelectForLabel(view.container, "Action");
    expect(trigger?.textContent).toBe("Link");
    expect(view.container.textContent).toContain("Link");
    const optionLabels = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent?.trim() ?? ""
    );
    expect(optionLabels).toEqual(["Link"]);
    expect(optionLabels).not.toContain("Publish");
    expect(optionLabels).not.toContain("Custom");
  } finally {
    view.cleanup();
  }
});

test("Tabs add a deterministic collision-free slot and arm that exact target", () => {
  const onPatchBlock = vi.fn();
  const onArmSlotInsert = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "tabs-1",
      type: "tabs",
      data: {
        tabs: [
          { id: "tab-1", label: "First" },
          { id: "tab-3", label: "Third" },
        ],
      },
      slots: { "tab-1": [], "tab-3": [] },
    },
    onPatchBlock,
    onArmSlotInsert,
  });
  try {
    expect(
      view.container.querySelector('[data-screen-insert-into="true"]')?.getAttribute("aria-label")
    ).toBe("Insert into");
    clickButton(view.container, "Add tab");
    expect(onPatchBlock).toHaveBeenCalledWith("tabs-1", {
      data: {
        tabs: [
          { id: "tab-1", label: "First" },
          { id: "tab-3", label: "Third" },
          { id: "tab-4", label: "Tab 3" },
        ],
      },
      slots: { "tab-1": [], "tab-3": [], "tab-4": [] },
    });
    expect(onArmSlotInsert).toHaveBeenCalledWith("tabs-1", "tab-4");
  } finally {
    view.cleanup();
  }

  const removeThenAddView = mountStatefulTabsInspector({
    id: "tabs-default-labels",
    type: "tabs",
    data: {
      tabs: [
        { id: "tab-1", label: "Tab 1" },
        { id: "tab-2", label: "Tab 2" },
        { id: "tab-3", label: "Tab 3" },
      ],
    },
    slots: { "tab-1": [], "tab-2": [], "tab-3": [] },
  });
  try {
    clickButton(removeThenAddView.container, "Remove Tab 2");
    clickButton(removeThenAddView.container, "Add tab");
    expect(removeThenAddView.currentBlock().data.tabs).toEqual([
      { id: "tab-1", label: "Tab 1" },
      { id: "tab-3", label: "Tab 3" },
      { id: "tab-4", label: "Tab 4" },
    ]);
    expect(removeThenAddView.currentBlock().slots).toEqual({
      "tab-1": [],
      "tab-3": [],
      "tab-4": [],
    });
    const tabActionNames = Array.from(
      removeThenAddView.container.querySelectorAll<HTMLButtonElement>(
        'button[aria-label^="Edit content for"], button[aria-label^="Remove"]'
      )
    ).map((button) => button.getAttribute("aria-label"));
    expect(tabActionNames).toContain("Edit content for Tab 4");
    expect(tabActionNames).toContain("Remove Tab 4");
    expect(new Set(tabActionNames).size).toBe(tabActionNames.length);
  } finally {
    removeThenAddView.cleanup();
  }
});

test("Tabs keep the insert-slot Select controlled while arming a newly added tab", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const initialBlock: ScreenBlockV1 = {
    id: "tabs-controlled-slot",
    type: "tabs",
    data: { tabs: [{ id: "tab-1", label: "First" }] },
    slots: { "tab-1": [] },
  };
  const Harness = () => {
    const [block, setBlock] = React.useState(initialBlock);
    const [armedSlotId, setArmedSlotId] = React.useState<string | null>(null);
    return (
      <ScreenBlockInspector
        selectedBlock={block}
        bindings={[]}
        fields={[]}
        showBlockActions={false}
        armedInsertSlotId={armedSlotId}
        onArmSlotInsert={(_blockId, slotId) => setArmedSlotId(slotId)}
        onPatchBlock={(_blockId, patch) => setBlock((current) => ({ ...current, ...patch }))}
        onPatchBlockData={() => undefined}
        onPatchBinding={() => undefined}
        onMove={() => undefined}
        onDuplicate={() => undefined}
        onDelete={() => undefined}
      />
    );
  };
  const view = mountReactNode(<Harness />);
  try {
    clickButton(view.container, "Add tab");
    expect(view.container.querySelector('[data-screen-insert-into="true"]')?.textContent).toContain(
      "tab-2"
    );
    expect(warn).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    warn.mockRestore();
  }
});

test("Tabs use Unicode boundaries and invalidate stale label drafts across parent rerenders", () => {
  const view = mountStatefulTabsInspector({
    id: "tabs-1",
    type: "tabs",
    data: { tabs: [{ id: "tab-1", label: "Original" }] },
    slots: { "tab-1": [] },
  });
  const readInput = () =>
    view.container.querySelector('[data-screen-tab-label="tab-1"]') as HTMLInputElement | null;
  try {
    expect(readInput()).not.toBeNull();
    expect(readInput()?.hasAttribute("maxlength")).toBe(false);
    expect(readInput()?.maxLength).toBe(-1);

    const unicodeBoundary = "😀".repeat(120);
    setInputValue(readInput()!, `  ${unicodeBoundary}  `);
    expect(view.onPatchBlock).not.toHaveBeenCalled();
    React.act(() => {
      readInput()?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });
    expect(view.onPatchBlock).toHaveBeenLastCalledWith("tabs-1", {
      data: { tabs: [{ id: "tab-1", label: unicodeBoundary }] },
      slots: { "tab-1": [] },
    });
    expect(readInput()?.value).toBe(unicodeBoundary);
    expect(view.currentBlock().data.tabs).toEqual([{ id: "tab-1", label: unicodeBoundary }]);

    view.onPatchBlock.mockClear();
    setInputValue(readInput()!, "😀".repeat(121));
    React.act(() => {
      readInput()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(view.onPatchBlock).not.toHaveBeenCalled();
    expect(readInput()?.value).toBe(unicodeBoundary);

    setInputValue(readInput()!, "  Latest committed  ");
    React.act(() => {
      readInput()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(view.onPatchBlock).toHaveBeenLastCalledWith("tabs-1", {
      data: { tabs: [{ id: "tab-1", label: "Latest committed" }] },
      slots: { "tab-1": [] },
    });
    expect(readInput()?.value).toBe("Latest committed");

    view.onPatchBlock.mockClear();
    setInputValue(readInput()!, "Discard me");
    React.act(() => {
      readInput()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(readInput()?.value).toBe("Latest committed");
    expect(view.onPatchBlock).not.toHaveBeenCalled();

    setInputValue(readInput()!, "Stale local draft");
    view.refresh({
      ...view.currentBlock(),
      data: { tabs: [{ id: "tab-1", label: "Remote committed" }] },
    });
    expect(readInput()?.value).toBe("Remote committed");

    view.refresh({
      ...view.currentBlock(),
      data: { tabs: [{ id: "tab-1", label: "Latest committed" }] },
    });
    expect(readInput()?.value).toBe("Latest committed");

    setInputValue(readInput()!, "Identity-scoped stale draft");
    view.refresh({
      id: "tabs-2",
      type: "tabs",
      data: { tabs: [{ id: "tab-1", label: "Different block" }] },
      slots: { "tab-1": [] },
    });
    expect(readInput()?.value).toBe("Different block");

    view.refresh({
      id: "tabs-1",
      type: "tabs",
      data: { tabs: [{ id: "tab-1", label: "Latest committed" }] },
      slots: { "tab-1": [] },
    });
    expect(readInput()?.value).toBe("Latest committed");
    expect(view.onPatchBlock).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Tabs remove exactly one slot, arm the nearest remaining slot, and protect the minimum", () => {
  const onPatchBlock = vi.fn();
  const onArmSlotInsert = vi.fn();
  const child: ScreenBlockV1 = { id: "text-child", type: "text", data: { content: "Keep" } };
  const view = mountInspector({
    selectedBlock: {
      id: "tabs-1",
      type: "tabs",
      data: {
        tabs: [
          { id: "tab-1", label: "First" },
          { id: "tab-2", label: "Second" },
        ],
      },
      slots: { "tab-1": [], "tab-2": [child] },
    },
    onPatchBlock,
    onArmSlotInsert,
  });
  try {
    clickButton(view.container, "Remove First");
    expect(onPatchBlock).toHaveBeenCalledWith("tabs-1", {
      data: { tabs: [{ id: "tab-2", label: "Second" }] },
      slots: { "tab-2": [child] },
    });
    expect(onArmSlotInsert).toHaveBeenCalledWith("tabs-1", "tab-2");
  } finally {
    view.cleanup();
  }

  onPatchBlock.mockClear();
  onArmSlotInsert.mockClear();
  const minimumView = mountInspector({
    selectedBlock: {
      id: "tabs-min",
      type: "tabs",
      data: { tabs: [{ id: "tab-1", label: "Only" }] },
      slots: { "tab-1": [child] },
    },
    onPatchBlock,
    onArmSlotInsert,
  });
  try {
    const remove = clickButton(minimumView.container, "Remove Only");
    expect(remove?.disabled).toBe(true);
    expect(onPatchBlock).not.toHaveBeenCalled();
    expect(onArmSlotInsert).not.toHaveBeenCalled();
  } finally {
    minimumView.cleanup();
  }
});

test("A valid Enter rename keeps keyboard focus on the same Tab label input", () => {
  const view = mountStatefulTabsInspector({
    id: "tabs-1",
    type: "tabs",
    data: { tabs: [{ id: "tab-1", label: "Original" }] },
    slots: { "tab-1": [] },
  });
  const readInput = () =>
    view.container.querySelector('[data-screen-tab-label="tab-1"]') as HTMLInputElement | null;
  try {
    const inputBefore = readInput();
    expect(inputBefore).not.toBeNull();
    setInputValue(inputBefore!, "Renamed by keyboard");
    expect(document.activeElement).toBe(inputBefore);

    React.act(() => {
      inputBefore?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(view.onPatchBlock).toHaveBeenLastCalledWith("tabs-1", {
      data: { tabs: [{ id: "tab-1", label: "Renamed by keyboard" }] },
      slots: { "tab-1": [] },
    });
    const inputAfter = readInput();
    expect(inputAfter).toBe(inputBefore);
    expect(inputAfter?.value).toBe("Renamed by keyboard");
    // The commit-driven parent patch must not remount the focused input: a
    // keyboard-only author keeps their place instead of being dropped to the body.
    expect(document.activeElement).toBe(inputBefore);
    expect(inputAfter?.getAttribute("aria-label")).toBe("Label for Renamed by keyboard");
  } finally {
    view.cleanup();
  }

  const droppedPatch = vi.fn();
  const droppedView = mountInspector({
    selectedBlock: {
      id: "tabs-dropped-patch",
      type: "tabs",
      data: { tabs: [{ id: "tab-1", label: "Committed" }] },
      slots: { "tab-1": [] },
    },
    onPatchBlock: droppedPatch,
  });
  const droppedInput = droppedView.container.querySelector<HTMLInputElement>(
    '[data-screen-tab-label="tab-1"]'
  );
  try {
    expect(droppedInput).not.toBeNull();
    setInputValue(droppedInput!, "Rejected rename");
    expect(document.activeElement).toBe(droppedInput);
    React.act(() => {
      droppedInput?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(droppedPatch).toHaveBeenCalledWith("tabs-dropped-patch", {
      data: { tabs: [{ id: "tab-1", label: "Rejected rename" }] },
      slots: { "tab-1": [] },
    });
    expect(droppedView.container.querySelector('[data-screen-tab-label="tab-1"]')).toBe(
      droppedInput
    );
    expect(droppedInput?.value).toBe("Committed");
    expect(droppedInput?.getAttribute("aria-label")).toBe("Label for Committed");
    expect(document.activeElement).toBe(droppedInput);
  } finally {
    droppedView.cleanup();
  }
});

test("Removing a Tab garbage-collects the bindings inside its slot subtree", () => {
  const onPatchBlock = vi.fn();
  const onPatchBinding = vi.fn();
  const onArmSlotInsert = vi.fn();
  const nestedHeading: ScreenBlockV1 = {
    id: "nested-heading",
    type: "heading",
    data: { text: "Nested", level: 2, align: "left" },
  };
  const removedGroup: ScreenBlockV1 = {
    id: "removed-group",
    type: "field-group",
    data: {},
    slots: { content: [nestedHeading] },
  };
  const keptField: ScreenBlockV1 = {
    id: "kept-field",
    type: "field",
    data: { label: "Kept", field: "title" },
  };
  const view = mountInspector({
    selectedBlock: {
      id: "tabs-1",
      type: "tabs",
      data: {
        tabs: [
          { id: "tab-1", label: "First" },
          { id: "tab-2", label: "Second" },
        ],
      },
      slots: { "tab-1": [removedGroup], "tab-2": [keptField] },
    },
    bindings: [
      {
        id: "binding-removed-group",
        blockId: "removed-group",
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
      {
        id: "binding-nested-heading",
        blockId: "nested-heading",
        propPath: "text",
        source: "entry",
        field: "title",
        mode: "read",
      },
      {
        id: "binding-kept-field",
        blockId: "kept-field",
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "readwrite",
      },
    ],
    onPatchBlock,
    onPatchBinding,
    onArmSlotInsert,
  });
  try {
    clickButton(view.container, "Remove First");
    expect(onPatchBlock).toHaveBeenCalledWith("tabs-1", {
      data: { tabs: [{ id: "tab-2", label: "Second" }] },
      slots: { "tab-2": [keptField] },
    });
    // Deleting the tab deletes its whole slot subtree, so every binding pointing into
    // it is cleared with the exact empty-field sentinel on the same gesture — no
    // orphan binding survives for the author to resolve. Nested slot children count.
    expect(onPatchBinding).toHaveBeenCalledWith("removed-group", "value", { field: "" });
    expect(onPatchBinding).toHaveBeenCalledWith("nested-heading", "text", { field: "" });
    // The surviving tab's binding is untouched.
    expect(onPatchBinding).toHaveBeenCalledTimes(2);
    expect(onArmSlotInsert).toHaveBeenCalledWith("tabs-1", "tab-2");
  } finally {
    view.cleanup();
  }
});

test("Tabs edit-content controls arm exact slots and the maximum prevents a 25th tab", () => {
  const onPatchBlock = vi.fn();
  const onArmSlotInsert = vi.fn();
  const view = mountInspector({
    selectedBlock: {
      id: "tabs-max",
      type: "tabs",
      data: {
        tabs: Array.from({ length: 24 }, (_, index) => ({
          id: `tab-${index + 1}`,
          label: `Tab ${index + 1}`,
        })),
      },
      slots: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`tab-${index + 1}`, []])),
    },
    onPatchBlock,
    onArmSlotInsert,
    armedInsertSlotId: "tab-2",
  });
  try {
    const activeEdit = view.container.querySelector(
      'button[aria-label="Edit content for Tab 2"]'
    ) as HTMLButtonElement | null;
    expect(activeEdit?.getAttribute("aria-pressed")).toBe("true");
    clickButton(view.container, "Edit content for Tab 24");
    expect(onArmSlotInsert).toHaveBeenCalledWith("tabs-max", "tab-24");

    const add = clickButton(view.container, "Add tab");
    expect(add?.disabled).toBe(true);
    expect(onPatchBlock).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
