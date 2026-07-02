// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  EditorFrame,
  EditorRailGroup,
  EditorRailItem,
} from "../../../core/admin/ui/shared/EditorFrame";

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

test("EditorFrame renders chrome slots and all three panes", () => {
  const view = mount(
    <EditorFrame
      title="Menu editor"
      toolbar={<span>3 items</span>}
      actions={<button type="button">Publish</button>}
      left={<div>left rail</div>}
      canvas={<div>canvas body</div>}
      right={<div>inspector body</div>}
    />
  );

  try {
    expect(view.container.querySelector('[data-editor-frame="true"]')).not.toBeNull();
    expect(view.container.textContent).toContain("Menu editor");
    expect(view.container.textContent).toContain("3 items");
    expect(view.container.textContent).toContain("Publish");
    expect(view.container.textContent).toContain("left rail");
    expect(view.container.textContent).toContain("canvas body");
    expect(view.container.textContent).toContain("inspector body");
  } finally {
    view.cleanup();
  }
});

test("EditorRailItem fires onClick for enabled items and never for disabled ones", () => {
  const onAdd = vi.fn();
  const onDisabled = vi.fn();
  const view = mount(
    <EditorRailGroup label="Add items">
      <EditorRailItem onClick={onAdd}>Pages</EditorRailItem>
      <EditorRailItem onClick={onDisabled} disabled>
        Custom link
      </EditorRailItem>
    </EditorRailGroup>
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "Pages")?.click();
      buttons.find((button) => button.textContent === "Custom link")?.click();
    });
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onDisabled).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("EditorRailItem renders a handler-less disabled+title item as a dimmed control, not a live div", () => {
  const view = mount(
    <EditorRailGroup label="Add items">
      <EditorRailItem disabled title="Coming soon">
        Posts
      </EditorRailItem>
    </EditorRailGroup>
  );

  try {
    const button = Array.from(view.container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Posts"
    );
    // Guards the div-branch drop: a handler-less deferred item must still be a
    // REAL disabled control (dimmed + aria-disabled + surfacing the title), NOT
    // a live-looking clickable <div>.
    expect(button).toBeTruthy();
    expect(button?.hasAttribute("disabled")).toBe(true);
    expect(button?.getAttribute("aria-disabled")).toBe("true");
    expect(button?.getAttribute("title")).toBe("Coming soon");
    expect(button?.className).toContain("disabled:opacity-50");
    // The "Posts" leaf itself must be a <button>, never a decorative <div> that
    // silently drops disabled/title.
    expect(button?.tagName).toBe("BUTTON");
  } finally {
    view.cleanup();
  }
});
