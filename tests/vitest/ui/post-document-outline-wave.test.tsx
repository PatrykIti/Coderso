// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

import { PostDocumentOutline } from "../../../core/admin/ui/posts/editor/outline/PostDocumentOutline";

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

test("PostDocumentOutline renders warning labels, outline checks, and select callbacks", () => {
  const onSelectBlock = vi.fn();
  const view = mount(
    <PostDocumentOutline
      outline={{
        items: [
          {
            id: "heading-1",
            blockId: "block-1",
            level: 2,
            text: "Introduction",
            anchorId: "introduction",
            warnings: [{ code: "empty_heading", message: "Heading should not be empty" }],
          },
          {
            id: "heading-2",
            blockId: "block-2",
            level: 6,
            text: "Appendix",
            anchorId: "appendix",
            warnings: [
              { code: "multiple_h1", message: "Only one H1 is allowed" },
              { code: "skipped_heading_level", message: "Do not skip levels" },
            ],
          },
        ],
        warnings: [
          { code: "multiple_h1", message: "Only one H1 is allowed" },
          { code: "skipped_heading_level", message: "Do not skip levels" },
        ],
      }}
      selectedBlockId="block-1"
      onSelectBlock={onSelectBlock}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(view.container.textContent).toContain("Introduction");
    expect(view.container.textContent).toContain("Appendix");
    expect(view.container.textContent).toContain("H2");
    expect(view.container.textContent).toContain("H6");
    expect(view.container.textContent).toContain("1 warning");
    expect(view.container.textContent).toContain("2 warnings");
    expect(view.container.textContent).toContain("Outline checks");
    expect(buttons[0]?.className).toContain("border-primary/30");
    expect(buttons[1]?.className).toContain("pl-14");

    React.act(() => {
      buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onSelectBlock).toHaveBeenCalledWith("block-2");
  } finally {
    view.cleanup();
  }
});

test("PostDocumentOutline hides outline checks when hints are disabled and shows empty fallback", () => {
  const hiddenHintsView = mount(
    <PostDocumentOutline
      outline={{
        items: [
          {
            id: "heading-1",
            blockId: "block-1",
            level: 1,
            text: "Title",
            anchorId: "title",
            warnings: [],
          },
        ],
        warnings: [{ code: "multiple_h1", message: "Only one H1 is allowed" }],
      }}
      selectedBlockId={null}
      onSelectBlock={() => undefined}
      showHints={false}
    />
  );

  try {
    expect(hiddenHintsView.container.textContent).not.toContain("Outline checks");
  } finally {
    hiddenHintsView.cleanup();
  }

  const emptyView = mount(
    <PostDocumentOutline
      outline={{ items: [], warnings: [] }}
      selectedBlockId={null}
      onSelectBlock={() => undefined}
    />
  );

  try {
    expect(emptyView.container.textContent).toContain("No headings found.");
  } finally {
    emptyView.cleanup();
  }
});
