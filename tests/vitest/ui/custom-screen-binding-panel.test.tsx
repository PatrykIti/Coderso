// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

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
      panel="binding"
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

test("ScreenBlockInspector renders bound-field + interaction controls for a selected block", () => {
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
    expect(view.container.textContent).toContain("Bound field");
    expect(view.container.textContent).toContain("Interaction");
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
    const trigger = view.container.querySelector('[role="combobox"]') as HTMLElement | null;
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
