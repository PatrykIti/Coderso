// @vitest-environment happy-dom
//
// TASK-105-08-04: ScreenBlockInspector render coverage for every block-type
// branch (record-header, field, field-group, columns, rich-text, heading, text,
// stat, divider, image, related-list, tabs, button, legacy-widget), the block
// action buttons, the slot-insert picker, and the shared style/layout group
// (width/align/min-height/box spacing commits through buildStylePatch).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenBlockInspector } from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import type {
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenContracts";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fields: ContentField[] = [
  { id: "f-title", name: "title", type: "text", label: "Title" },
  { id: "f-body", name: "body", type: "text", label: "Body" },
  { id: "f-price", name: "price", type: "number", label: "Price" },
  { id: "f-photo", name: "photo", type: "media", label: "Photo" },
  { id: "f-team", name: "team", type: "relation", label: "Team", relation: { target: "teams" } },
];

const block = (overrides: Partial<ScreenBlockV1> & { type: string }): ScreenBlockV1 => ({
  id: "block-1",
  label: "Label",
  style: { width: "auto", align: "start", minHeight: 40, margin: { top: 4 }, padding: {} },
  data: {},
  ...overrides,
});

const bindings: ScreenFieldBinding[] = [
  {
    id: "b-1",
    blockId: "block-1",
    propPath: "value",
    source: "entry",
    field: "price",
    mode: "read",
  },
];

const mountInspector = (
  selectedBlock: ScreenBlockV1 | null,
  props: Partial<Parameters<typeof ScreenBlockInspector>[0]> = {}
) => {
  const onPatchBlock = vi.fn();
  const onPatchBlockData = vi.fn();
  const onPatchBinding = vi.fn();
  const onMove = vi.fn();
  const onDuplicate = vi.fn();
  const onDelete = vi.fn();
  const onArmSlotInsert = vi.fn();

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <ScreenBlockInspector
        selectedBlock={selectedBlock}
        bindings={props.bindings ?? bindings}
        fields={props.fields ?? fields}
        showBlockActions={props.showBlockActions ?? true}
        onArmSlotInsert={props.onArmSlotInsert ?? onArmSlotInsert}
        armedInsertSlotId={props.armedInsertSlotId ?? null}
        onPatchBlock={props.onPatchBlock ?? onPatchBlock}
        onPatchBlockData={props.onPatchBlockData ?? onPatchBlockData}
        onPatchBinding={props.onPatchBinding ?? onPatchBinding}
        onMove={props.onMove ?? onMove}
        onDuplicate={props.onDuplicate ?? onDuplicate}
        onDelete={props.onDelete ?? onDelete}
      />
    );
  });

  return {
    container,
    onPatchBlock,
    onPatchBlockData,
    onPatchBinding,
    onMove,
    onDuplicate,
    onDelete,
    onArmSlotInsert,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const pointerClick = (element: Element | null | undefined) => {
  expect(element, "pointer click target missing").not.toBeNull();
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickElement = (element: Element | null) => {
  expect(element, "expected element to exist").not.toBeNull();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (input: HTMLInputElement | null, value: string) => {
  expect(input, "expected input to exist").not.toBeNull();
  React.act(() => {
    input?.focus();
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input as HTMLInputElement),
      "value"
    )?.set;
    setter?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const pickOption = (trigger: Element | null | undefined, label: string) => {
  pointerClick(trigger);
  const option = Array.from(document.body.querySelectorAll<HTMLElement>("[role='option']")).find(
    (node) => node.textContent?.trim() === label
  );
  expect(option, `expected option ${label}`).not.toBeNull();
  pointerClick(option);
};

const inputByPlaceholder = (container: ParentNode, placeholder: string) =>
  container.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("null selected block shows the dashed placeholder and no actions", () => {
  const view = mountInspector(null);
  try {
    expect(view.container.textContent).toContain(
      "Select a block on the canvas to edit its shared layout and field binding."
    );
    expect(view.container.querySelector('[aria-label="Move selected block up"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("block action buttons move, duplicate, and delete the block", () => {
  const view = mountInspector(block({ type: "text", data: { content: "Hi" } }));
  try {
    clickElement(view.container.querySelector('[aria-label="Move selected block up"]'));
    expect(view.onMove).toHaveBeenCalledWith("block-1", "up");
    clickElement(view.container.querySelector('[aria-label="Move selected block down"]'));
    expect(view.onMove).toHaveBeenCalledWith("block-1", "down");
    clickElement(view.container.querySelector('[aria-label="Duplicate selected block"]'));
    expect(view.onDuplicate).toHaveBeenCalledWith("block-1");
    clickElement(view.container.querySelector('[aria-label="Delete selected block"]'));
    expect(view.onDelete).toHaveBeenCalledWith("block-1");
  } finally {
    view.cleanup();
  }
});

test("block actions are hidden when showBlockActions is false", () => {
  const view = mountInspector(block({ type: "text", data: { content: "Hi" } }), {
    showBlockActions: false,
  });
  try {
    expect(view.container.querySelector('[aria-label="Move selected block up"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("record-header edits eyebrow and subtitle through patchData", () => {
  const view = mountInspector(
    block({ type: "record-header", data: { eyebrow: "Eyebrow", subtitle: "Sub" } })
  );
  try {
    expect(view.container.textContent).toContain("Header text");
    setInputValue(inputByPlaceholder(view.container, "Eyebrow"), "New eyebrow");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { eyebrow: "New eyebrow" });
    setInputValue(inputByPlaceholder(view.container, "Subtitle"), "New subtitle");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { subtitle: "New subtitle" });
  } finally {
    view.cleanup();
  }
});

test("field edits label and helper text", () => {
  const view = mountInspector(block({ type: "field", data: { label: "Label", helper: "Helper" } }));
  try {
    expect(view.container.textContent).toContain("Field presentation");
    setInputValue(inputByPlaceholder(view.container, "Label"), "New label");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { label: "New label" });
    setInputValue(inputByPlaceholder(view.container, "Helper text"), "New helper");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { helper: "New helper" });
  } finally {
    view.cleanup();
  }
});

test("field-group edits title and description", () => {
  const view = mountInspector(
    block({ type: "field-group", data: { title: "T", description: "D" } })
  );
  try {
    expect(view.container.textContent).toContain("Group presentation");
    setInputValue(inputByPlaceholder(view.container, "Group title"), "Group");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { title: "Group" });
    setInputValue(inputByPlaceholder(view.container, "Description"), "Desc");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { description: "Desc" });
  } finally {
    view.cleanup();
  }
});

test("columns edits the internal label", () => {
  const view = mountInspector(block({ type: "columns", data: { label: "Cols" } }));
  try {
    expect(view.container.textContent).toContain("Columns");
    setInputValue(inputByPlaceholder(view.container, "Internal label"), "Two cols");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { label: "Two cols" });
  } finally {
    view.cleanup();
  }
});

test("rich-text edits shared text content", () => {
  const view = mountInspector(block({ type: "rich-text", data: { content: "Body" } }));
  try {
    expect(view.container.textContent).toContain("Shared text");
    const textarea = view.container.querySelector<HTMLTextAreaElement>("textarea");
    React.act(() => {
      textarea?.focus();
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(textarea as HTMLTextAreaElement),
        "value"
      )?.set;
      setter?.call(textarea, "New body");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { content: "New body" });
  } finally {
    view.cleanup();
  }
});

test("heading edits text, level, and alignment", () => {
  const view = mountInspector(
    block({ type: "heading", data: { text: "Title", level: 2, align: "left" } })
  );
  try {
    expect(view.container.textContent).toContain("Heading text");
    setInputValue(inputByPlaceholder(view.container, "Static heading text"), "New heading");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { text: "New heading" });

    pickOption(view.container.querySelector('[aria-label="Level"]'), "Heading 3");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { level: 3 });
    pickOption(view.container.querySelector('[aria-label="Heading text alignment"]'), "Center");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { align: "center" });
  } finally {
    view.cleanup();
  }
});

test("text edits paragraph content and tone", () => {
  const view = mountInspector(block({ type: "text", data: { content: "P", tone: "default" } }));
  try {
    const textarea = view.container.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea?.getAttribute("placeholder")).toBe("Paragraph text");
    React.act(() => {
      textarea?.focus();
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(textarea as HTMLTextAreaElement),
        "value"
      )?.set;
      setter?.call(textarea, "New paragraph");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { content: "New paragraph" });
    pickOption(view.container.querySelector('[aria-label="Tone"]'), "Muted");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { tone: "muted" });
  } finally {
    view.cleanup();
  }
});

test("stat edits format, trend, and delta field", () => {
  const view = mountInspector(
    block({
      type: "stat",
      data: { format: "number", trend: "auto", deltaField: "" },
    })
  );
  try {
    pickOption(view.container.querySelector('[aria-label="Format"]'), "Percent");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { format: "percent" });
    pickOption(view.container.querySelector('[aria-label="Trend"]'), "Down");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { trend: "down" });
    setInputValue(inputByPlaceholder(view.container, "Optional field name"), "delta");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { deltaField: "delta" });
  } finally {
    view.cleanup();
  }
});

test("divider variant switches and shows the label input only for the label variant", () => {
  const view = mountInspector(block({ type: "divider", data: { variant: "line" } }));
  try {
    expect(inputByPlaceholder(view.container, "Divider label")).toBeNull();
    pickOption(view.container.querySelector('[aria-label="Variant"]'), "Label");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { variant: "label" });
  } finally {
    view.cleanup();
  }
});

test("divider with the label variant renders the label input", () => {
  const view = mountInspector(block({ type: "divider", data: { variant: "label" } }));
  try {
    setInputValue(inputByPlaceholder(view.container, "Divider label"), "New label");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { label: "New label" });
  } finally {
    view.cleanup();
  }
});

test("image edits fit, ratio, and a legacy ratio displays as Auto", () => {
  const view = mountInspector(
    block({ type: "image", data: { fit: "cover", ratio: "16:9", src: "/a.png" } })
  );
  try {
    const ratioTrigger = view.container.querySelector('[aria-label="Ratio"]');
    expect(ratioTrigger?.textContent?.trim()).toBe("Auto");
    pickOption(ratioTrigger, "16:9");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { ratio: "16/9" });
    pickOption(view.container.querySelector('[aria-label="Fit"]'), "Contain");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { fit: "contain" });
  } finally {
    view.cleanup();
  }
});

test("related-list edits display field, variant, and limit", () => {
  const view = mountInspector(
    block({
      type: "related-list",
      data: { target: "teams", displayField: "title", variant: "checklist", limit: 5 },
    })
  );
  try {
    const target = view.container.querySelector<HTMLInputElement>("input[readonly]");
    expect(target?.value).toBe("teams");
    pickOption(view.container.querySelector('[aria-label="Bound field"]'), "Team (relation)");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { target: "teams" });
    setInputValue(inputByPlaceholder(view.container, "title"), "name");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { displayField: "name" });
    pickOption(view.container.querySelector('[aria-label="Variant"]'), "Cards");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { variant: "cards" });
    const limit = view.container.querySelector<HTMLInputElement>('[aria-label="Limit"]');
    setInputValue(limit, "8");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { limit: 8 });
    setInputValue(limit, "");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { limit: 0 });
  } finally {
    view.cleanup();
  }
});

test("button edits variant and href and offers the static-link clear", () => {
  const hrefBinding: ScreenFieldBinding = {
    id: "b-href",
    blockId: "block-1",
    propPath: "href",
    source: "entry",
    field: "url",
    mode: "read",
  };
  const view = mountInspector(
    block({ type: "button", data: { action: "link", variant: "primary", href: "/x" } }),
    { bindings: [...bindings, hrefBinding] }
  );
  try {
    pickOption(view.container.querySelector('[aria-label="Variant"]'), "Ghost");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", { variant: "ghost" });
    setInputValue(inputByPlaceholder(view.container, "https://…"), "https://example.com");
    expect(view.onPatchBlockData).toHaveBeenCalledWith("block-1", {
      href: "https://example.com",
    });
    expect(view.container.textContent).toContain("Use static link");
    const staticLinkButton = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.includes("Use static link"));
    expect(staticLinkButton, "expected static-link clear button").toBeTruthy();
    if (!staticLinkButton) throw new Error("expected static-link clear button");
    clickElement(staticLinkButton);
    expect(view.onPatchBinding).toHaveBeenCalledWith("block-1", "href", { field: "" });
  } finally {
    view.cleanup();
  }
});

test("tabs label input restores the committed label when the same label is submitted", () => {
  const view = mountInspector(
    block({
      type: "tabs",
      data: {
        label: "Tabs",
        tabs: [
          { id: "tab-1", label: "Overview" },
          { id: "tab-2", label: "Details" },
        ],
      },
      slots: { "tab-1": [], "tab-2": [] },
    })
  );
  try {
    const input = view.container.querySelector<HTMLInputElement>('[data-screen-tab-label="tab-1"]');
    expect(input).not.toBeNull();
    setInputValue(input, "Overview");
    React.act(() => {
      input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(view.onPatchBlock).not.toHaveBeenCalled();
    expect(input?.value).toBe("Overview");
  } finally {
    view.cleanup();
  }
});

test("tabs render the tabs editor surface", () => {
  const view = mountInspector(
    block({ type: "tabs", data: { label: "Tabs", tabs: [] }, slots: {} })
  );
  try {
    expect(view.container.textContent).toContain("Tabs");
  } finally {
    view.cleanup();
  }
});

test("slot containers render the insert-into picker", () => {
  const view = mountInspector(
    block({
      type: "columns",
      data: { label: "Cols" },
      slots: { main: [], aside: [] },
    })
  );
  try {
    const trigger = view.container.querySelector('[data-screen-insert-into="true"]');
    expect(trigger).not.toBeNull();
    pickOption(trigger, "aside");
    expect(view.onArmSlotInsert).toHaveBeenCalledWith("block-1", "aside");
  } finally {
    view.cleanup();
  }
});

test("legacy-widget shows the read-only placeholder", () => {
  const view = mountInspector(
    block({ type: "legacy-widget", legacyWidgetType: "legacy", data: {} })
  );
  try {
    expect(view.container.textContent).toContain(
      "Legacy widget content is preserved as a read-only placeholder"
    );
  } finally {
    view.cleanup();
  }
});

test("style group commits width, align, min height, and box spacing patches", () => {
  const view = mountInspector(block({ type: "text", data: { content: "Hi" } }));
  try {
    pickOption(view.container.querySelector('[aria-label="Width"]'), "Half");
    expect(view.onPatchBlock).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ style: expect.objectContaining({ width: "half" }) })
    );

    pickOption(view.container.querySelector('[aria-label="Block layout alignment"]'), "Center");
    expect(view.onPatchBlock).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ style: expect.objectContaining({ align: "center" }) })
    );

    const minHeight = view.container.querySelector<HTMLInputElement>('[aria-label="Min height"]');
    setInputValue(minHeight, "999");
    expect(view.onPatchBlock).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ style: expect.objectContaining({ minHeight: 640 }) })
    );

    const marginTop = view.container.querySelector<HTMLInputElement>('[aria-label="Margin top"]');
    setInputValue(marginTop, "500");
    expect(view.onPatchBlock).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ style: expect.objectContaining({ margin: { top: 240 } }) })
    );

    const paddingTop = view.container.querySelector<HTMLInputElement>('[aria-label="Padding top"]');
    setInputValue(paddingTop, "12");
    expect(view.onPatchBlock).toHaveBeenCalledWith(
      "block-1",
      expect.objectContaining({ style: expect.objectContaining({ padding: { top: 12 } }) })
    );
  } finally {
    view.cleanup();
  }
});
