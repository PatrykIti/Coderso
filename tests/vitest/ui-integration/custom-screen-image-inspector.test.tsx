// @vitest-environment happy-dom

// TASK-500-04: the static "Image URL" inspector control for the image kind.
// Asserts the row renders ONLY for image blocks, typing patches data.src through
// onPatchBlockData, and the static-src input coexists with the Bound-field control
// (the placeholder copy states that a bound field overrides the static src).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenBlockInspector } from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
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
  onPatchBlockData = vi.fn()
) => ({
  onPatchBlockData,
  ...mount(
    <ScreenBlockInspector
      selectedBlock={selectedBlock}
      bindings={bindings}
      fields={fields}
      panel="all"
      showBlockActions={false}
      onPatchBlock={vi.fn()}
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
