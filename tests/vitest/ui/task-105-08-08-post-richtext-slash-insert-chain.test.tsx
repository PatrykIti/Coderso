// @vitest-environment happy-dom

// TASK-105 L08 s5 discriminator (unit reproduction; product files untouched).
// r37-diag proved in the real browser that the slash menu opens, the Heading
// option is unique and clicked, the menu closes — and the canvas block count
// never grows. This test mounts the REAL chain (PostEditorCanvas →
// postEditorCanvasBlockItem → PostRichTextAdapter → SlashCommandMenu, wired to
// the REAL usePostEditorState store) and records, at module boundaries only,
// the four discriminators the smoke diag could not reach:
//   (a) onSlashInsertBlock defined at the adapter at click time,
//   (b) editor.insertBlock invoked,
//   (c) machinery.dispatchEditorAction return values (identity guard),
//   (d) final canvas block count (the observable the smoke suite polls).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { flush, hookState, waitFor } from "./postEditorStateFixtures";
import { PostEditorCanvas } from "../../../core/admin/ui/posts/editor/PostEditorCanvas";
import { usePostEditorState } from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

type EditorApi = ReturnType<typeof usePostEditorState>;

const probe = vi.hoisted(() => ({
  adapterProps: [] as Array<{ onSlashInsertBlockDefined: boolean }>,
  insertCalls: [] as Array<{ type: string; options: unknown }>,
  dispatchReturns: [] as boolean[],
}));

vi.mock(
  "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter",
  async (importOriginal) => {
    const actual = await importOriginal<{
      PostRichTextAdapter: React.FC<Record<string, unknown>>;
    }>();
    return {
      PostRichTextAdapter: (props: Record<string, unknown>) => {
        probe.adapterProps.push({
          onSlashInsertBlockDefined: typeof props.onSlashInsertBlock === "function",
        });
        return React.createElement(actual.PostRichTextAdapter, props);
      },
    };
  }
);

vi.mock(
  "../../../core/admin/ui/posts/editor/hooks/postEditorStateSession",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../core/admin/ui/posts/editor/hooks/postEditorStateSession")
      >();
    return {
      ...actual,
      createEditorMachinery: (
        deps: Parameters<typeof actual.createEditorMachinery>[0]
      ): ReturnType<typeof actual.createEditorMachinery> => {
        const machinery = actual.createEditorMachinery(deps);
        const originalDispatch = machinery.dispatchEditorAction;
        machinery.dispatchEditorAction = (action: Parameters<typeof originalDispatch>[0]) => {
          const result = originalDispatch(action);
          probe.dispatchReturns.push(result);
          return result;
        };
        return machinery;
      },
    };
  }
);

vi.mock(
  "../../../core/admin/ui/posts/editor/hooks/postEditorStateDocument",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../../core/admin/ui/posts/editor/hooks/postEditorStateDocument")
      >();
    return {
      ...actual,
      createPostDocumentActions: (deps: Parameters<typeof actual.createPostDocumentActions>[0]) => {
        const actions = actual.createPostDocumentActions(deps);
        const originalInsert = actions.insertBlock.bind(actions);
        return {
          ...actions,
          insertBlock: (type: string, options?: Parameters<typeof originalInsert>[1]) => {
            probe.insertCalls.push({ type, options: options ?? null });
            return originalInsert(type, options);
          },
        };
      },
    };
  }
);

const mountEditorCanvasHarness = () => {
  const latest: { current: EditorApi | null } = { current: null };

  const Harness = () => {
    const editor = usePostEditorState();
    latest.current = editor;
    if (editor.loading || !editor.post) {
      return null;
    }
    return (
      <PostEditorCanvas
        document={editor.state.document}
        title={editor.title}
        onTitleChange={editor.setTitle}
        selectedBlockId={editor.state.selectedBlockId}
        insertFocusToken={editor.insertFocusToken}
        onSelectBlock={editor.selectBlock}
        onUpdateBlockContent={editor.updateBlockContent}
        onUpdateBlockAttrs={editor.updateBlockAttrs}
        onTransformBlock={editor.transformBlock}
        onUpdateDocumentTypography={editor.updateDocumentTypography}
        onInsertBlock={editor.insertBlock}
        onEnsureDynamicTocBlock={editor.ensureDynamicTocBlock}
      />
    );
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<Harness />);
  });

  return {
    current(): EditorApi {
      if (!latest.current) {
        throw new Error("Missing editor api.");
      }
      return latest.current;
    },
    container,
    cleanup() {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  probe.adapterProps.length = 0;
  probe.insertCalls.length = 0;
  probe.dispatchReturns.length = 0;
});

test("slash Heading selection grows the real canvas document blocks", async () => {
  hookState.path = "/admin/posts/post-1?editor=writing";
  hookState.cachedPost = hookState.createPost();
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountEditorCanvasHarness();

  try {
    await waitFor(() => view.current().loading === false && view.current().post !== null);

    const block = view.container.querySelector<HTMLElement>("[data-post-editor-block-id]");
    if (!block) throw new Error("Missing canvas block.");
    React.act(() => {
      block.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const editable = view.container.querySelector<HTMLDivElement>(
      "[data-post-editor-primary-editable='true']"
    );
    if (!editable) throw new Error("Missing primary editable after block selection.");

    React.act(() => {
      editable.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    });

    React.act(() => {
      editable.innerHTML = "<p>Body /heading</p>";
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      editable.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flush();

    const menuOpen = (view.container.textContent ?? "").includes("Slash command");
    const headingOption = Array.from(view.container.querySelectorAll("button")).find((candidate) =>
      (candidate.textContent ?? "").includes("Section heading (H1-H6) for document structure.")
    );
    if (!headingOption) {
      throw new Error(`Heading option not rendered (menuOpen=${String(menuOpen)}).`);
    }

    // happy-dom never fires blur for a synthetic click, so this chain cannot
    // observe the blur-unmount regression directly; pin the fix itself instead:
    // option buttons preventDefault() on mousedown to keep focus on the
    // editable, otherwise the adapter's onBlur unmounts the menu before the
    // click lands (SlashCommandMenu.tsx onMouseDown).
    const optionMousedown = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    React.act(() => {
      headingOption.dispatchEvent(optionMousedown);
    });
    expect(optionMousedown.defaultPrevented).toBe(true);

    const blocksBefore = view.current().state.document.blocks.length;
    const domBlocksBefore = view.container.querySelectorAll("[data-post-editor-block-id]").length;

    React.act(() => {
      headingOption.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const summary = JSON.stringify({
      a_onSlashInsertBlockDefinedAtAdapter: probe.adapterProps.map(
        (entry) => entry.onSlashInsertBlockDefined
      ),
      b_insertCalls: probe.insertCalls,
      c_dispatchReturns: probe.dispatchReturns,
      d_blocksBefore: blocksBefore,
      d_domBlocksBefore: domBlocksBefore,
      d_blocksAfter: view.current().state.document.blocks.length,
      d_domBlocksAfter: view.container.querySelectorAll("[data-post-editor-block-id]").length,
    });

    expect(view.current().state.document.blocks.length, summary).toBe(blocksBefore + 1);
    expect(view.container.querySelectorAll("[data-post-editor-block-id]").length, summary).toBe(
      domBlocksBefore + 1
    );
  } finally {
    view.cleanup();
  }
});
