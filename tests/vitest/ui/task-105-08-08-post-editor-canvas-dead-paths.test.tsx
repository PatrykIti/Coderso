// @vitest-environment happy-dom

import React, { useState } from "react";
import { expect, test, vi } from "vitest";

import type {
  PostBlock,
  PostBlockDocument,
  PostBlockType,
} from "../../../core/services/posts/editor/postBlockDocument";
import type { PostInsertOptions } from "../../../core/admin/ui/posts/editor/postInsertFlow";
import { clickByText, flush, mount } from "./postEditorCanvasFixtures";

type PostEditorCanvasComponent = React.ComponentType<{
  document: PostBlockDocument;
  title: string;
  onTitleChange: (value: string) => void;
  selectedBlockId: string | null;
  insertFocusToken: number;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
}>;

const codeBlock = (id: string, content: string): PostBlock => ({
  id,
  type: "code",
  attrs: {},
  content,
});

type CanvasHarnessProps = {
  canvas: PostEditorCanvasComponent;
  blocks: PostBlock[];
  onSelectBlock: (blockId: string | null) => void;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
};

/**
 * Parent stand-in that owns selection and the insert-focus token exactly like
 * the editor shell: a selection change only moves `selectedBlockId`, while a
 * shell insert writes the new block into the document, selects it, and bumps
 * the token the canvas consumes to hand focus to the inserted block. Inserted
 * blocks are code blocks so they expose a real editable surface under the
 * mocked rich-text adapter.
 */
const CanvasSelectionHarness = ({
  canvas: Canvas,
  blocks: initialBlocks,
  onSelectBlock,
  onInsertBlock,
}: CanvasHarnessProps) => {
  const [blocks, setBlocks] = useState<PostBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [insertFocusToken, setInsertFocusToken] = useState(0);

  const writeInsertedBlock = (block: PostBlock, index: number, select: boolean) => {
    setBlocks((current) => {
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, block);
      return next;
    });
    if (select) {
      setSelectedBlockId(block.id);
      setInsertFocusToken((token) => token + 1);
    }
  };

  const nextInsertedBlock = () =>
    ({
      id: `inserted-${insertFocusToken + 1}`,
      type: "code",
      attrs: {},
      content: "const answer = 42;",
    }) satisfies PostBlock;

  const handleSelectBlock = (blockId: string | null) => {
    onSelectBlock(blockId);
    setSelectedBlockId(blockId);
  };

  const handleCanvasInsert = (type: PostBlockType, options?: PostInsertOptions) => {
    onInsertBlock(type, options);
    const index = options?.target?.mode === "index" ? options.target.index : blocks.length;
    writeInsertedBlock(nextInsertedBlock(), index, false);
  };

  return (
    <div>
      <button type="button" onClick={() => writeInsertedBlock(nextInsertedBlock(), 0, true)}>
        shell-insert
      </button>
      <Canvas
        document={{ version: 1, meta: {}, blocks }}
        title="Canvas"
        onTitleChange={() => undefined}
        selectedBlockId={selectedBlockId}
        insertFocusToken={insertFocusToken}
        onSelectBlock={handleSelectBlock}
        onUpdateBlockContent={() => undefined}
        onInsertBlock={handleCanvasInsert}
      />
    </div>
  );
};

const mountCanvasHarness = async (
  blocks: PostBlock[],
  handlers: {
    onSelectBlock?: (blockId: string | null) => void;
    onInsertBlock?: (type: PostBlockType, options?: PostInsertOptions) => void;
  } = {}
) => {
  const { PostEditorCanvas } = await import("../../../core/admin/ui/posts/editor/PostEditorCanvas");

  return mount(
    <CanvasSelectionHarness
      canvas={PostEditorCanvas}
      blocks={blocks}
      onSelectBlock={handlers.onSelectBlock ?? (() => undefined)}
      onInsertBlock={handlers.onInsertBlock ?? (() => undefined)}
    />
  );
};

const blockSections = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("section[data-post-editor-block-id]"));

const blockOrder = (container: HTMLElement) =>
  blockSections(container).map((section) => section.dataset.postEditorBlockId);

const blockSection = (container: HTMLElement, blockId: string) => {
  const section = container.querySelector<HTMLElement>(
    `section[data-post-editor-block-id='${blockId}']`
  );
  if (!section) {
    throw new Error(`Missing block section: ${blockId}`);
  }
  return section;
};

const blockEditable = (container: HTMLElement, blockId: string) => {
  const editable = blockSection(container, blockId).querySelector<HTMLElement>(
    "[data-post-editor-primary-editable='true']"
  );
  if (!editable) {
    throw new Error(`Missing primary editable for block: ${blockId}`);
  }
  return editable;
};

const expectDeselected = (container: HTMLElement) => {
  for (const section of blockSections(container)) {
    expect(section.className).toContain("ring-0");
    expect(section.className).not.toContain("ring-primary/30");
  }
};

const awaitAnimationFrame = async () => {
  await React.act(async () => {
    await new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve(null));
    });
  });
};

test("canvas keeps active state, block order, and scroll seam when selection moves through real controls", async () => {
  const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
  const onSelectBlock = vi.fn();

  const view = await mountCanvasHarness(
    [codeBlock("block-a", "const a = 1;"), codeBlock("block-b", "const b = 2;")],
    { onSelectBlock }
  );

  try {
    expect(blockOrder(view.container)).toEqual(["block-a", "block-b"]);
    expectDeselected(view.container);
    expect(view.container.querySelector("[data-post-editor-primary-editable='true']")).toBeNull();
    expect(document.activeElement).toBe(document.body);

    React.act(() => {
      blockSection(view.container, "block-b").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onSelectBlock).toHaveBeenCalledTimes(1);
    expect(onSelectBlock).toHaveBeenCalledWith("block-b");
    expect(blockSection(view.container, "block-b").className).toContain("ring-primary/30");
    expect(blockSection(view.container, "block-a").className).toContain("ring-0");
    // A plain selection never takes focus: only the insert-focus token does.
    expect(document.activeElement).toBe(document.body);

    const editable = blockEditable(view.container, "block-b");
    expect(editable.tagName).toBe("TEXTAREA");

    const [firstWrapper, secondWrapper] = Array.from(
      view.container.querySelectorAll<HTMLElement>("[data-post-editor-flow='unified'] > div")
    );
    expect(
      (firstWrapper?.compareDocumentPosition(secondWrapper as Node) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
  } finally {
    view.cleanup();
  }
});

test("canvas root click-away and title focus deselect the active block", async () => {
  const onSelectBlock = vi.fn();

  const view = await mountCanvasHarness([codeBlock("block-a", "const a = 1;")], { onSelectBlock });

  try {
    React.act(() => {
      blockSection(view.container, "block-a").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(blockSection(view.container, "block-a").className).toContain("ring-primary/30");

    const titleInput = view.container.querySelector(
      "[data-post-editor-title-input='true']"
    ) as HTMLTextAreaElement | null;
    if (!titleInput) throw new Error("missing title input");

    React.act(() => {
      titleInput.focus();
    });

    expect(onSelectBlock).toHaveBeenLastCalledWith(null);
    expectDeselected(view.container);

    React.act(() => {
      blockSection(view.container, "block-a").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(blockSection(view.container, "block-a").className).toContain("ring-primary/30");

    React.act(() => {
      (view.container.querySelector("[data-post-editor-canvas='article']") as HTMLElement).click();
    });

    expect(onSelectBlock).toHaveBeenLastCalledWith(null);
    expectDeselected(view.container);
    expect(onSelectBlock.mock.calls.filter(([blockId]) => blockId === null)).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("shell insert hands focus to the inserted block on a later animation frame", async () => {
  const focusSpy = vi.spyOn(HTMLTextAreaElement.prototype, "focus");

  const view = await mountCanvasHarness([codeBlock("block-a", "const a = 1;")]);

  try {
    React.act(() => {
      blockSection(view.container, "block-a").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);

    clickByText(view.container, "shell-insert");

    expect(blockOrder(view.container)).toEqual(["inserted-1", "block-a"]);
    expect(blockSection(view.container, "inserted-1").className).toContain("ring-primary/30");
    expect(blockSection(view.container, "block-a").className).toContain("ring-0");

    // The handoff is scheduled on an animation frame, so nothing owns focus
    // synchronously after the insert.
    expect(document.activeElement).toBe(document.body);

    await awaitAnimationFrame();
    await flush();

    const editable = blockEditable(view.container, "inserted-1");
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(editable);
    expect(editable.dataset.postEditorPrimaryEditable).toBe("true");
    expect(blockSection(view.container, "inserted-1").contains(document.activeElement)).toBe(true);

    await awaitAnimationFrame();
    await flush();
    expect(document.activeElement).toBe(editable);
  } finally {
    view.cleanup();
    await flush();
  }
});

test("empty-canvas appender routes the outline-plus literal at index 0", async () => {
  const onInsertBlock = vi.fn();
  const onSelectBlock = vi.fn();

  const view = await mountCanvasHarness([], { onInsertBlock, onSelectBlock });

  try {
    expect(view.container.textContent).toContain("No blocks yet.");
    expect(document.activeElement).toBe(document.body);

    clickByText(view.container, "Add section");

    expect(onInsertBlock).toHaveBeenCalledTimes(1);
    expect(onInsertBlock).toHaveBeenCalledWith("writing-canvas", {
      source: "outline-plus",
      target: { mode: "index", index: 0 },
    });
    expect(blockOrder(view.container)).toEqual(["inserted-1"]);
    // The appender click bubbles to the canvas root, so the preserved
    // click-away contract clears the selection the insert produced.
    expect(onSelectBlock).toHaveBeenLastCalledWith(null);
    expectDeselected(view.container);
  } finally {
    view.cleanup();
  }
});
