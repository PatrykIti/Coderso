// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    onFocus,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    onFocus?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} onFocus={onFocus} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

import { BlockInserter } from "../../../core/admin/ui/posts/editor/blocks/BlockInserter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.click();
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("BlockInserter filters by category and search, renders most-used, and respects disabled insertion", () => {
  const onInsertBlock = vi.fn();

  const view = mount(
    <BlockInserter
      onInsertBlock={onInsertBlock}
      disabled
      showHeader={false}
      recentlyUsedTypes={["heading", "image"]}
    />
  );

  try {
    expect(view.container.textContent).toContain("Most used");
    expect(view.container.textContent).toContain("Heading");
    expect(view.container.textContent).toContain("Image");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    act(() => {
      buttons.find((button) => button.textContent?.includes("Media"))?.click();
    });

    expect(view.container.textContent).toContain("Image");
    expect(view.container.textContent).not.toContain("Paragraph");

    act(() => {
      buttons.find((button) => button.textContent?.includes("Image"))?.click();
    });
    expect(onInsertBlock).not.toHaveBeenCalled();

    const input = view.container.querySelector('input[aria-label="Search blocks"]');
    setInputValue(input, "zzz");
    expect(view.container.textContent).toContain("No block matches this search.");
  } finally {
    view.cleanup();
  }
});

test("BlockInserter supports keyboard insertion from the current active option", () => {
  const onInsertBlock = vi.fn();

  const view = mount(<BlockInserter onInsertBlock={onInsertBlock} />);

  try {
    const listbox = view.container.querySelector('[role="listbox"]');
    if (!(listbox instanceof HTMLElement)) {
      throw new Error("Missing listbox");
    }

    act(() => {
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });

    expect(onInsertBlock).toHaveBeenNthCalledWith(1, "writing-canvas");
    expect(onInsertBlock).toHaveBeenNthCalledWith(2, "writing-canvas");
  } finally {
    view.cleanup();
  }
});

test("BlockInserter renders header mode and inserts from most-used when enabled", () => {
  const onInsertBlock = vi.fn();
  const view = mount(
    <BlockInserter
      onInsertBlock={onInsertBlock}
      recentlyUsedTypes={["image", "button"]}
    />
  );

  try {
    expect(view.container.textContent).toContain("Block inserter");
    expect(view.container.textContent).toContain("Most used");
    expect(view.container.querySelector('input[aria-label="Search blocks"]')).not.toBeNull();

    clickByText(view.container, "Image");
    expect(onInsertBlock).toHaveBeenCalledWith("image");

    const searchInput = view.container.querySelector('input[aria-label="Search blocks"]');
    setInputValue(searchInput, "button");

    expect(view.container.textContent).toContain("Button");
    expect(view.container.textContent).not.toContain("Image");
  } finally {
    view.cleanup();
  }
});
