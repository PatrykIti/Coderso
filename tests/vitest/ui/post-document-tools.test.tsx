// @vitest-environment happy-dom

import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { PostEditorDocumentTools } from "../../../core/admin/ui/posts/editor/header/PostEditorDocumentTools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, onClick, disabled, ...props }, ref) => (
    <button type="button" ref={ref} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

test("PostEditorDocumentTools exposes actions and forwards callbacks", () => {
  const onToggleInserter = vi.fn();
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  const onToggleOutline = vi.fn();
  const addButtonRef = createRef<HTMLButtonElement>();

  const view = mount(
    <PostEditorDocumentTools
      addButtonRef={addButtonRef}
      inserterVisible
      onToggleInserter={onToggleInserter}
      canUndo
      canRedo={false}
      onUndo={onUndo}
      onRedo={onRedo}
      outlineVisible={false}
      onToggleOutline={onToggleOutline}
    />
  );

  try {
    expect(addButtonRef.current).not.toBeNull();
    expect(view.container.querySelector("[aria-label='Document tools']")).not.toBeNull();

    const byLabel = (label: string) =>
      view.container.querySelector(`button[aria-label='${label}']`);

    act(() => {
      byLabel("Toggle block inserter")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      byLabel("Undo last change")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      byLabel("Redo last change")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      byLabel("Toggle document overview")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(onToggleInserter).toHaveBeenCalledOnce();
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).not.toHaveBeenCalled();
    expect(onToggleOutline).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
