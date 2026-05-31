// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { BlockLibrary } from "../../../core/admin/ui/pages/BlockLibrary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <input value={value} onChange={onChange} />
      <button
        type="button"
        data-input-action="match"
        onClick={() =>
          onChange?.({
            target: { value: "image" },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        match
      </button>
      <button
        type="button"
        data-input-action="empty"
        onClick={() =>
          onChange?.({
            target: { value: "missing" },
          } as React.ChangeEvent<HTMLInputElement>)
        }
      >
        empty
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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

test("BlockLibrary filters visible blocks from the search input", () => {
  const view = mount(<BlockLibrary />);

  try {
    expect(view.container.textContent).toContain("Container");
    expect(view.container.textContent).toContain("Image");

    React.act(() => {
      view.container
        .querySelector("button[data-input-action='match']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("Image");
    expect(view.container.textContent).not.toContain("Container");

    React.act(() => {
      view.container
        .querySelector("button[data-input-action='empty']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(view.container.textContent).toContain("No components match this search.");
  } finally {
    view.cleanup();
  }
});
