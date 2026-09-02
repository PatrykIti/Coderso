// @vitest-environment happy-dom

// TASK-105-08-04 (Item F): useCustomScreenDocumentActions residual branches —
// no-op updateEditorView, slot-aware insert targets, duplicate/delete block
// selection recovery, patch handlers, and binding patch early returns.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  useCustomScreenDocumentActions,
  type CustomScreenDocumentActionsInput,
} from "../../../core/admin/ui/custom-screens/hooks/useCustomScreenDocumentActions";
import type {
  CustomScreenDefinition,
  ScreenBlockV1,
} from "../../../core/services/customScreens/customScreenSchemas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const makeBlock = (id: string, overrides: Partial<ScreenBlockV1> = {}): ScreenBlockV1 => ({
  id,
  type: "heading",
  data: { label: id },
  ...overrides,
});

const baseDefinition = (): CustomScreenDefinition => ({
  schemaVersion: 4,
  listView: {
    columns: [],
    filters: [],
    defaultSort: { field: "updatedAt", direction: "desc" },
    bulkActions: { delete: false, publish: false, unpublish: false },
  },
  editorView: {
    saveMode: "entry",
    interactionMode: "inline",
    document: {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          data: { title: "Details" },
          blocks: [
            makeBlock("block-a", {
              type: "field-group",
              data: { title: "Group", description: "" },
              slots: { content: [makeBlock("child-1", { type: "text", data: { label: "" } })] },
            }),
            makeBlock("block-columns", { type: "columns", data: {}, slots: { left: [] } }),
            makeBlock("block-text", { type: "text", data: { field: "city", label: "City" } }),
          ],
        },
      ],
    },
    bindings: [
      {
        id: "bind-1",
        blockId: "block-text",
        propPath: "value",
        source: "entry",
        field: "city",
        mode: "readwrite",
      },
    ],
  },
});

type HarnessProps = {
  input: Omit<CustomScreenDocumentActionsInput, "definitionRef" | "updateDefinition">;
  definition: CustomScreenDefinition;
  onDefinitionChange: (next: CustomScreenDefinition) => void;
  onRender: (actions: ReturnType<typeof useCustomScreenDocumentActions>) => void;
};

function Harness({ input, definition, onDefinitionChange, onRender }: HarnessProps) {
  const definitionRef = React.useRef(definition);
  const actions = useCustomScreenDocumentActions({
    ...input,
    definitionRef,
    updateDefinition: (next) => {
      definitionRef.current = next;
      onDefinitionChange(next);
      return true;
    },
  });
  onRender(actions);
  return null;
}

const mount = (props: HarnessProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<Harness {...props} />);
  });
  return {
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const baseInput = (overrides: Partial<CustomScreenDocumentActionsInput> = {}) => ({
  contentFields: [],
  selectedId: null,
  selectedSectionId: "section-1",
  insertPoint: null,
  setSelectedId: vi.fn(),
  setSelectedSectionId: vi.fn(),
  setInsertPoint: vi.fn(),
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("patch handlers update the definition block data", () => {
  let actions: ReturnType<typeof useCustomScreenDocumentActions> | null = null;
  const update = vi.fn();
  const view = mount({
    definition: baseDefinition(),
    input: baseInput(),
    onDefinitionChange: update,
    onRender: (value) => {
      actions = value;
    },
  });
  try {
    React.act(() => {
      actions?.handlePatchBlock("block-text", { data: { label: "Updated" } });
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].editorView.document.sections[0].blocks[2].data.label).toBe(
      "Updated"
    );

    React.act(() => {
      actions?.handlePatchBlockData("block-text", { tone: "muted" });
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]?.[0].editorView.document.sections[0].blocks[2].data.tone).toBe(
      "muted"
    );
  } finally {
    view.cleanup();
  }
});

test("add block uses the selected container slot as insert target", () => {
  let actions: ReturnType<typeof useCustomScreenDocumentActions> | null = null;
  const update = vi.fn();
  const view = mount({
    definition: baseDefinition(),
    input: baseInput({ selectedId: "block-a" }),
    onDefinitionChange: update,
    onRender: (value) => {
      actions = value;
    },
  });
  try {
    React.act(() => {
      actions?.handleAddBlock("text");
    });
    const documentAfter = update.mock.calls[0]?.[0].editorView.document;
    const group = documentAfter?.sections[0].blocks[0];
    expect(group?.slots?.content?.length).toBe(2);
    expect(group?.slots?.content?.[1]?.type).toBe("text");
  } finally {
    view.cleanup();
  }
});

test("duplicate block carries bindings and selects the copy", () => {
  let actions: ReturnType<typeof useCustomScreenDocumentActions> | null = null;
  const setSelectedId = vi.fn();
  const setSelectedSectionId = vi.fn();
  const update = vi.fn();
  const view = mount({
    definition: baseDefinition(),
    input: baseInput({ selectedId: "block-text", setSelectedId, setSelectedSectionId }),
    onDefinitionChange: update,
    onRender: (value) => {
      actions = value;
    },
  });
  try {
    React.act(() => {
      actions?.handleDuplicateBlock("block-text");
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].editorView.bindings.length).toBe(2);
    const copyId = setSelectedId.mock.calls[0]?.[0] as string;
    expect(copyId).not.toBe("block-text");
    expect(setSelectedSectionId).toHaveBeenCalled();
    const documentAfter = update.mock.calls[0]?.[0].editorView.document;
    const blocks: ScreenBlockV1[] = documentAfter?.sections[0].blocks ?? [];
    expect(blocks.some((block) => block.id === copyId)).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("delete block removes bindings and recovers selection when needed", () => {
  let actions: ReturnType<typeof useCustomScreenDocumentActions> | null = null;
  const setSelectedId = vi.fn();
  const setSelectedSectionId = vi.fn();
  const update = vi.fn();
  const view = mount({
    definition: baseDefinition(),
    input: baseInput({ selectedId: "block-text", setSelectedId, setSelectedSectionId }),
    onDefinitionChange: update,
    onRender: (value) => {
      actions = value;
    },
  });
  try {
    React.act(() => {
      actions?.handleDeleteBlock("block-text");
    });
    expect(update).toHaveBeenCalledTimes(1);
    const documentAfter = update.mock.calls[0]?.[0].editorView.document;
    expect(documentAfter?.sections[0].blocks.length).toBe(2);
    expect(update.mock.calls[0]?.[0].editorView.bindings.length).toBe(0);
    expect(setSelectedId).toHaveBeenCalled();
    expect(setSelectedSectionId).toHaveBeenCalled();

    // Deleting a missing block is a no-op.
    React.act(() => {
      actions?.handleDeleteBlock("missing");
    });
    expect(update).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("binding patch returns early for unchanged field and updates document data", () => {
  let actions: ReturnType<typeof useCustomScreenDocumentActions> | null = null;
  const definition = baseDefinition();
  const update = vi.fn();
  const view = mount({
    definition,
    input: baseInput({
      contentFields: [{ id: "f", name: "city", type: "text", label: "City" }],
    }),
    onDefinitionChange: update,
    onRender: (value) => {
      actions = value;
    },
  });
  try {
    // Same field + same mode + no document delta → early return.
    React.act(() => {
      actions?.handlePatchBinding("block-text", "value", { field: "city" });
    });
    expect(update).not.toHaveBeenCalled();

    // Mode change updates bindings without touching block data.
    React.act(() => {
      actions?.handlePatchBinding("block-text", "value", { field: "city", mode: "write" });
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].editorView.bindings[0].mode).toBe("write");
    expect(update.mock.calls[0]?.[0].editorView.document).toBe(definition.editorView.document);

    // A genuinely new field requires the block data field/label sync.
    React.act(() => {
      actions?.handlePatchBinding("block-text", "value", { field: "other", mode: "read" });
    });
    expect(update).toHaveBeenCalledTimes(2);
    const updatedDefinition = update.mock.calls[1]?.[0];
    if (!updatedDefinition) throw new Error("Expected the second definition update");
    const { document: documentAfter, bindings } = updatedDefinition.editorView;
    expect(documentAfter.sections[0].blocks[2].data.field).toBe("other");
    expect(bindings[0].field).toBe("other");
  } finally {
    view.cleanup();
  }
});
