// @vitest-environment happy-dom

import React from "react";

import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import { PostListViewPanel } from "../../../core/admin/ui/posts/editor/blocks/PostListViewPanel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("PostListViewPanel exposes drag-and-drop and keyboard fallback affordances", () => {
  const html = renderToString(
    <PostListViewPanel
      blocks={[
        { id: "a", type: "paragraph", attrs: {}, content: "Intro" },
        { id: "b", type: "heading", attrs: { level: 2 }, content: "Section" },
      ]}
      selectedBlockId="a"
      onSelectBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
    />
  );

  expect(html).toContain("List view");
  expect(html).toContain("Drag blocks to reorder");
  expect(html).toContain("Alt");
  expect(html).toContain("Arrow keys");
  expect(html).toContain('draggable="true"');
  expect(html).toContain("Paragraph");
  expect(html).toContain("Heading");
});

test("PostListViewPanel renders delete affordance when delete handler is provided", () => {
  const html = renderToString(
    <PostListViewPanel
      blocks={[
        { id: "a", type: "paragraph", attrs: {}, content: "Intro" },
        { id: "b", type: "heading", attrs: { level: 2 }, content: "Section" },
      ]}
      selectedBlockId="a"
      onSelectBlock={() => undefined}
      onDeleteBlock={() => undefined}
      onMoveBlockToIndex={() => undefined}
    />
  );

  expect(html).toContain('aria-label="Delete block 1: Paragraph"');
  expect(html).toContain('aria-label="Delete block 2: Heading"');
  expect(html).toContain("text-muted-foreground opacity-60 transition");
});

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

const createDataTransfer = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    effectAllowed: "move",
    dropEffect: "move",
    setData: (key: string, value: string) => {
      store.set(key, value);
    },
    getData: (key: string) => store.get(key) ?? "",
  };
};

const dispatchDragEvent = (
  node: Element,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  dataTransfer = createDataTransfer(),
  extras: Record<string, unknown> = {}
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  for (const [key, value] of Object.entries(extras)) {
    Object.defineProperty(event, key, { value });
  }
  React.act(() => {
    node.dispatchEvent(event);
  });
  return dataTransfer;
};

test("PostListViewPanel handles toc labels, no-hint mode, drag drop markers, and missing drop payloads", () => {
  const onSelectBlock = vi.fn();
  const onMoveBlockToIndex = vi.fn();
  const onDeleteBlock = vi.fn();

  const view = mount(
    <PostListViewPanel
      blocks={[
        { id: "block-1", type: "toc", attrs: {}, content: null },
        { id: "block-2", type: "paragraph", attrs: {}, content: "Body" },
      ]}
      selectedBlockId={null}
      onSelectBlock={onSelectBlock}
      onDeleteBlock={onDeleteBlock}
      onMoveBlockToIndex={onMoveBlockToIndex}
      showKeyboardHints={false}
    />
  );

  try {
    expect(view.container.textContent).toContain("Table of contents");
    expect(view.container.textContent).not.toContain("Drag blocks to reorder");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    const firstBlock = buttons.find((button) =>
      button.getAttribute("aria-label")?.includes("Select block 1")
    );
    const secondBlock = buttons.find((button) =>
      button.getAttribute("aria-label")?.includes("Select block 2")
    );
    const firstDelete = buttons.find((button) =>
      button.getAttribute("aria-label")?.includes("Delete block 1")
    );

    if (!(firstBlock instanceof HTMLButtonElement) || !(secondBlock instanceof HTMLButtonElement)) {
      throw new Error("missing block buttons");
    }

    React.act(() => {
      firstBlock.click();
      firstDelete?.click();
    });
    expect(onSelectBlock).toHaveBeenCalledWith("block-1");
    expect(onDeleteBlock).toHaveBeenCalledWith("block-1");

    firstBlock.getBoundingClientRect = () => ({ top: 10, height: 20 }) as DOMRect;

    const dragTransfer = dispatchDragEvent(firstBlock, "dragstart");
    expect(dragTransfer.getData("text/plain")).toBe("block-1");
    expect(firstBlock.className).toContain("opacity-60");

    dispatchDragEvent(secondBlock, "dragover", dragTransfer, { clientY: 12 });
    expect(view.container.querySelectorAll(".h-0\\.5.bg-primary")).toHaveLength(2);

    dispatchDragEvent(secondBlock, "drop", dragTransfer);
    expect(onMoveBlockToIndex).toHaveBeenCalledWith("block-1", 1);

    const emptyTransfer = createDataTransfer();
    dispatchDragEvent(firstBlock, "dragstart", emptyTransfer);
    dispatchDragEvent(secondBlock, "dragover", emptyTransfer, { clientY: 40 });
    dispatchDragEvent(firstBlock, "dragend", emptyTransfer);
    dispatchDragEvent(secondBlock, "drop", createDataTransfer());
    expect(onMoveBlockToIndex).toHaveBeenCalledTimes(1);
    expect(firstBlock.className).not.toContain("opacity-60");
  } finally {
    view.cleanup();
  }
});
