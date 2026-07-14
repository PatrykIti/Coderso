// @vitest-environment happy-dom

// TASK-500-04: the static "Image URL" inspector control for the image kind.
// Asserts the row renders ONLY for image blocks, typing patches data.src through
// onPatchBlockData, and the static-src input coexists with the Bound-field control
// (the placeholder copy states that a bound field overrides the static src).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  buildStylePatch,
  SCREEN_ALIGN_DEFAULT_OPTION,
  ScreenBlockInspector,
} from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import type {
  ScreenBlockV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenSchemas";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

afterEach(() => {
  document.body.innerHTML = "";
});

const fields: ContentField[] = [{ id: "f-cover", name: "cover", type: "media", label: "Cover" }];

const renderInspector = (
  selectedBlock: ScreenBlockV1,
  bindings: ScreenFieldBinding[] = [],
  onPatchBlockData = vi.fn(),
  onPatchBlock = vi.fn()
) => ({
  onPatchBlockData,
  onPatchBlock,
  ...mount(
    <ScreenBlockInspector
      selectedBlock={selectedBlock}
      bindings={bindings}
      fields={fields}
      panel="all"
      showBlockActions={false}
      onPatchBlock={onPatchBlock}
      onPatchBlockData={onPatchBlockData}
      onPatchBinding={vi.fn()}
      onMove={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
    />
  ),
});

const findImageUrlInput = (container: HTMLElement) =>
  container.querySelector(
    'input[placeholder="https://… or /media/… — used when no field is bound"]'
  ) as HTMLInputElement | null;

const setInputValue = (input: HTMLInputElement, next: string) => {
  React.act(() => {
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

// Radix Select trigger for a given InspectorRow label (the label span + trigger
// are siblings in the same InspectorRow div).
const triggerForLabel = (container: HTMLElement, label: string) =>
  (Array.from(container.querySelectorAll("span"))
    .find((span) => span.textContent === label)
    ?.parentElement?.querySelector('[role="combobox"]') ?? null) as HTMLElement | null;

// Open a Radix Select and click the option whose text matches — the same
// pointerdown → click / pointerup → click sequence Radix listens for; verified
// to fire onValueChange in happy-dom.
const chooseOption = (trigger: HTMLElement, optionText: string) => {
  React.act(() => {
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent === optionText
  ) as HTMLElement | undefined;
  React.act(() => {
    option?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

test("typing in the Image URL row patches data.src", () => {
  const view = renderInspector({
    id: "image-1",
    type: "image",
    data: { label: "Logo", fit: "cover", src: "/media/logo.png" },
  });
  try {
    expect(view.container.textContent).toContain("Image URL");
    const input = findImageUrlInput(view.container);
    expect(input).not.toBeNull();
    expect(input?.value).toBe("/media/logo.png");

    React.act(() => {
      input?.focus();
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
      setter?.call(input, "/media/next.png");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.onPatchBlockData).toHaveBeenCalledWith("image-1", { src: "/media/next.png" });
  } finally {
    view.cleanup();
  }
});

test("the Image URL row renders only for the image kind", () => {
  const view = renderInspector({
    id: "text-1",
    type: "text",
    data: { label: "Text", content: "Copy", tone: "default" },
  });
  try {
    expect(view.container.textContent).not.toContain("Image URL");
    expect(findImageUrlInput(view.container)).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a bound field and the static src control coexist in the image inspector", () => {
  const view = renderInspector(
    {
      id: "image-1",
      type: "image",
      data: { label: "Cover", fit: "cover", field: "cover", src: "/media/fallback.png" },
    },
    [
      {
        id: "image-1-src",
        blockId: "image-1",
        propPath: "src",
        source: "entry",
        field: "cover",
        mode: "read",
      },
    ]
  );
  try {
    // The bound-field control still shows the bound media field…
    expect(view.container.textContent).toContain("Bound field");
    // …and the static-src input keeps its value alongside it (bound overrides static —
    // stated by the input's placeholder copy).
    expect(findImageUrlInput(view.container)?.value).toBe("/media/fallback.png");
  } finally {
    view.cleanup();
  }
});

// --- TASK-503-03: Image URL src filter (draft + normalizeScreenImageSrc write) ---

test('typing an unsafe scheme keeps the draft visible but commits src: ""', () => {
  const view = renderInspector({
    id: "image-1",
    type: "image",
    data: { fit: "cover", src: "" },
  });
  try {
    const input = findImageUrlInput(view.container);
    expect(input).not.toBeNull();
    setInputValue(input!, "javascript:alert(1)");
    // The document only ever receives the filtered value…
    expect(view.onPatchBlockData).toHaveBeenLastCalledWith("image-1", { src: "" });
    // …while the raw draft stays visible in the input (no focus loss / destruction).
    expect(input!.value).toBe("javascript:alert(1)");
  } finally {
    view.cleanup();
  }
});

test('a partial https:/ commits src: "" until the safe prefix is complete', () => {
  const view = renderInspector({
    id: "image-1",
    type: "image",
    data: { fit: "cover", src: "" },
  });
  try {
    const input = findImageUrlInput(view.container);
    setInputValue(input!, "https:/");
    expect(view.onPatchBlockData).toHaveBeenLastCalledWith("image-1", { src: "" });
    expect(input!.value).toBe("https:/");
    // Completing the safe prefix commits verbatim.
    setInputValue(input!, "https://x/y.png");
    expect(view.onPatchBlockData).toHaveBeenLastCalledWith("image-1", {
      src: "https://x/y.png",
    });
    expect(input!.value).toBe("https://x/y.png");
  } finally {
    view.cleanup();
  }
});

test.each(["//evil.example/image.png", "https:\\\\evil.example\\image.png"])(
  "protocol-relative and backslash-confused input stays draft-only: %s",
  (unsafe) => {
    const view = renderInspector({
      id: "image-1",
      type: "image",
      data: { fit: "cover", src: "" },
    });
    try {
      const input = findImageUrlInput(view.container);
      setInputValue(input!, unsafe);
      expect(view.onPatchBlockData).toHaveBeenLastCalledWith("image-1", { src: "" });
      expect(input?.value).toBe(unsafe);
    } finally {
      view.cleanup();
    }
  }
);

test("the Image URL row uses the canonical Screen authoring URL wrapper", () => {
  const source = readFileSync(
    resolve(process.cwd(), "core/admin/ui/custom-screens/ScreenBlockInspector.tsx"),
    "utf8"
  );
  expect(source).toContain('sanitizeScreenAuthoringUrl(raw, "media")');
  expect(source).not.toContain("normalizeScreenImageSrc");
});

// --- TASK-503-03: Ratio EnumRow (enum select, legacy free text displays as Auto) ---

test("Ratio is an enum select — choosing 16:9 writes the 16/9 enum value", () => {
  const view = renderInspector({
    id: "image-1",
    type: "image",
    data: { fit: "cover", ratio: "auto", src: "" },
  });
  try {
    // The old free-text placeholder is gone (row is now a select).
    expect(view.container.querySelector('input[placeholder="e.g. 16/9 (optional)"]')).toBeNull();
    const trigger = triggerForLabel(view.container, "Ratio");
    expect(trigger).not.toBeNull();
    chooseOption(trigger!, "16:9");
    expect(view.onPatchBlockData).toHaveBeenLastCalledWith("image-1", { ratio: "16/9" });
  } finally {
    view.cleanup();
  }
});

test("a stored legacy free-text ratio displays as Auto and fires no stealth write", () => {
  const view = renderInspector({
    id: "image-1",
    type: "image",
    data: { fit: "cover", ratio: "16:9", src: "" },
  });
  try {
    const trigger = triggerForLabel(view.container, "Ratio");
    expect(trigger?.textContent).toBe("Auto");
    // No write on mount — the stored value is only rewritten on a user change.
    expect(view.onPatchBlockData).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

// --- TASK-503-03: Layout group + dead "Background" row removal ---

test("the Layout group renders for a field block and a columns container", () => {
  const fieldView = renderInspector({
    id: "field-1",
    type: "field",
    data: { label: "Name", field: "title" },
  });
  try {
    expect(fieldView.container.querySelector("[data-screen-layout-group]")).not.toBeNull();
  } finally {
    fieldView.cleanup();
  }

  const columnsView = renderInspector({
    id: "columns-1",
    type: "columns",
    data: {},
    slots: { "col-1": [], "col-2": [] },
  });
  try {
    expect(columnsView.container.querySelector("[data-screen-layout-group]")).not.toBeNull();
  } finally {
    columnsView.cleanup();
  }
});

test("the dead free-text Background row is gone while per-kind Variant rows remain", () => {
  const imageView = renderInspector({
    id: "image-1",
    type: "image",
    data: { fit: "cover", src: "" },
  });
  try {
    expect(imageView.container.textContent).not.toContain("Background");
  } finally {
    imageView.cleanup();
  }

  // The divider "Variant" EnumRow (writes data.variant — a DIFFERENT key) stays.
  const dividerView = renderInspector({
    id: "divider-1",
    type: "divider",
    data: { variant: "line" },
  });
  try {
    expect(dividerView.container.textContent).not.toContain("Background");
    expect(dividerView.container.textContent).toContain("Variant");
  } finally {
    dividerView.cleanup();
  }
});

test("Width EnumRow commits a pruning-aware style patch through onPatchBlock", () => {
  const view = renderInspector({
    id: "field-1",
    type: "field",
    data: { label: "Name", field: "title" },
  });
  try {
    const trigger = triggerForLabel(view.container, "Width");
    chooseOption(trigger!, "Half");
    expect(view.onPatchBlock).toHaveBeenLastCalledWith("field-1", {
      style: { width: "half" },
    });
  } finally {
    view.cleanup();
  }
});

test("the margin-top input commits the exact nested style shape and reverts to undefined", () => {
  const view = renderInspector({
    id: "field-1",
    type: "field",
    data: { label: "Name", field: "title" },
  });
  try {
    const marginTop = view.container.querySelector(
      'input[aria-label="Margin top"]'
    ) as HTMLInputElement | null;
    expect(marginTop).not.toBeNull();
    setInputValue(marginTop!, "24");
    expect(view.onPatchBlock).toHaveBeenLastCalledWith("field-1", {
      style: { margin: { top: 24 } },
    });
  } finally {
    view.cleanup();
  }

  // With a pre-set style, clearing the only side prunes back to an absent style.
  const revertView = renderInspector({
    id: "field-1",
    type: "field",
    data: { label: "Name", field: "title" },
    style: { margin: { top: 24 } },
  });
  try {
    const marginTop = revertView.container.querySelector(
      'input[aria-label="Margin top"]'
    ) as HTMLInputElement | null;
    expect(marginTop?.value).toBe("24");
    setInputValue(marginTop!, "");
    expect(revertView.onPatchBlock).toHaveBeenLastCalledWith("field-1", {
      style: undefined,
    });
  } finally {
    revertView.cleanup();
  }
});

// --- TASK-503-03: buildStylePatch pure merge/prune logic (exported) ---

test("buildStylePatch: width sets/prunes; align persists start but prunes on sentinel", () => {
  expect(buildStylePatch(undefined, { kind: "width", value: "half" })).toEqual({
    width: "half",
  });
  // "auto" is the no-op default → prunes the key.
  expect(buildStylePatch({ width: "half" }, { kind: "width", value: "auto" })).toBeUndefined();
  // align "start" (mr-auto) is NOT a no-op → persists explicitly.
  expect(buildStylePatch(undefined, { kind: "align", value: "start" })).toEqual({
    align: "start",
  });
  expect(buildStylePatch(undefined, { kind: "align", value: "center" })).toEqual({
    align: "center",
  });
  // sentinel prunes.
  expect(
    buildStylePatch({ align: "center" }, { kind: "align", value: SCREEN_ALIGN_DEFAULT_OPTION })
  ).toBeUndefined();
  // unknown enum prunes.
  expect(buildStylePatch({ width: "half" }, { kind: "width", value: "bogus" })).toBeUndefined();
});

test("buildStylePatch: minHeight floors + clamps; empty/NaN prune", () => {
  expect(buildStylePatch(undefined, { kind: "minHeight", value: "9999" })).toEqual({
    minHeight: 640,
  });
  expect(buildStylePatch(undefined, { kind: "minHeight", value: "12.7" })).toEqual({
    minHeight: 12,
  });
  expect(buildStylePatch({ minHeight: 12 }, { kind: "minHeight", value: "" })).toBeUndefined();
  expect(buildStylePatch({ minHeight: 12 }, { kind: "minHeight", value: "abc" })).toBeUndefined();
});

test("buildStylePatch: box clamps each side; clearing the last side prunes the record", () => {
  expect(
    buildStylePatch(undefined, { kind: "box", box: "margin", side: "top", value: "999" })
  ).toEqual({ margin: { top: 240 } });
  // clearing the only side removes the record entirely.
  expect(
    buildStylePatch({ margin: { top: 24 } }, { kind: "box", box: "margin", side: "top", value: "" })
  ).toBeUndefined();
});

test("buildStylePatch: two independent sub-keys accumulate (wholesale-replace guard)", () => {
  // Emulates the sequential onPatchBlock replace: buildStylePatch always reads
  // the CURRENT style, so a later padding edit does NOT wipe an earlier align.
  const afterAlign = buildStylePatch(undefined, { kind: "align", value: "center" });
  const afterPadding = buildStylePatch(afterAlign, {
    kind: "box",
    box: "padding",
    side: "top",
    value: "16",
  });
  expect(afterPadding).toEqual({ align: "center", padding: { top: 16 } });
});
