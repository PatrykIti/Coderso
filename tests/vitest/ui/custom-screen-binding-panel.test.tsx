// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenBlockInspector } from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import type {
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

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

const noop = () => undefined;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const renderInspector = (props: {
  selectedBlock: ScreenBlockV1 | null;
  bindings?: ScreenFieldBinding[];
  fields?: ContentField[];
}) =>
  mount(
    <ScreenBlockInspector
      selectedBlock={props.selectedBlock}
      bindings={props.bindings ?? []}
      fields={props.fields ?? []}
      panel="all"
      showBlockActions={false}
      onPatchBlock={noop}
      onPatchBlockData={noop}
      onPatchBinding={noop}
      onMove={noop}
      onDuplicate={noop}
      onDelete={noop}
    />
  );

afterEach(() => {
  document.body.innerHTML = "";
});

// TASK-498-02 B4: open the flat "Bound field" Select and pick the option whose text
// contains `optionText`, firing the kind-specific onPatchBinding / onPatchBlockData wiring.
const selectBoundField = (container: ParentNode, optionText: string) => {
  const trigger = container.querySelector('[data-screen-bound-field="true"]') as HTMLElement | null;
  expect(trigger).not.toBeNull();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((item) =>
    item.textContent?.includes(optionText)
  ) as HTMLElement | undefined;
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const mountInspector = (props: {
  selectedBlock: ScreenBlockV1;
  bindings?: ScreenFieldBinding[];
  fields?: ContentField[];
  onPatchBinding?: (...args: unknown[]) => void;
  onPatchBlockData?: (...args: unknown[]) => void;
}) =>
  mount(
    <ScreenBlockInspector
      selectedBlock={props.selectedBlock}
      bindings={props.bindings ?? []}
      fields={props.fields ?? []}
      panel="all"
      showBlockActions={false}
      onPatchBlock={noop}
      onPatchBlockData={props.onPatchBlockData ?? noop}
      onPatchBinding={props.onPatchBinding ?? noop}
      onMove={noop}
      onDuplicate={noop}
      onDelete={noop}
    />
  );

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
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector renders the empty binding state without a selected block", () => {
  const view = renderInspector({ selectedBlock: null });
  try {
    expect(view.container.textContent).toContain(
      "Select a block on the canvas to edit its shared layout and field binding."
    );
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector renders the bound-field control for a selected block", () => {
  const view = renderInspector({
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
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector binding options dedupe system and schema fields with the same name", () => {
  const view = renderInspector({
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
