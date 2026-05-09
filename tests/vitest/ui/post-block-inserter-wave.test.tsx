// @vitest-environment happy-dom

import React, { forwardRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { BlockInserter } from "../../../core/admin/ui/posts/editor/blocks/BlockInserter";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
    function MockButton({ children, onClick, onFocus, disabled, className, ...props }, ref) {
      return (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          onFocus={onFocus}
          disabled={disabled}
          className={className}
          {...props}
        >
          {children}
        </button>
      );
    }
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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("BlockInserter renders most-used section, category filters, and empty-search state", () => {
  const onInsertBlock = vi.fn();
  const view = mount(
    <BlockInserter
      onInsertBlock={onInsertBlock}
      showHeader={false}
      recentlyUsedTypes={["image", "button"]}
    />
  );

  try {
    expect(view.container.textContent).toContain("Most used");
    expect(view.container.textContent).toContain("All");
    expect(view.container.textContent).toContain("Media");
    expect(view.container.textContent).toContain("Interactive");

    clickByText(view.container, "Media");
    expect(view.container.textContent).toContain("Image");
    expect(view.container.textContent).toContain("Video");
    expect(view.container.textContent).toContain("Gallery");
    expect(view.container.textContent).toContain("Audio");
    expect(view.container.textContent).toContain("File");
    expect(view.container.textContent).not.toContain("Paragraph");

    const searchInput = view.container.querySelector('input[aria-label="Search Media blocks"]');
    expect(searchInput).toBeInstanceOf(HTMLInputElement);
    expect((searchInput as HTMLInputElement).placeholder).toBe("Search Media blocks...");
    setInputValue(searchInput, "zzz-no-match");

    expect(view.container.textContent).toContain("No block matches this search.");
  } finally {
    view.cleanup();
  }
});

test("BlockInserter supports keyboard insertion, direct insertion, and disabled mode", () => {
  const onInsertBlock = vi.fn();
  const view = mount(<BlockInserter onInsertBlock={onInsertBlock} />);

  try {
    const listbox = view.container.querySelector('[role="listbox"]');
    if (!(listbox instanceof HTMLDivElement)) {
      throw new Error("Missing listbox");
    }

    React.act(() => {
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onInsertBlock).toHaveBeenCalledTimes(1);

    clickByText(view.container, "Heading");
    expect(onInsertBlock).toHaveBeenCalledTimes(2);
  } finally {
    view.cleanup();
  }

  const disabledInsert = vi.fn();
  const disabledView = mount(
    <BlockInserter onInsertBlock={disabledInsert} disabled recentlyUsedTypes={["image"]} />
  );

  try {
    clickByText(disabledView.container, "Image");
    const listbox = disabledView.container.querySelector('[role="listbox"]');
    if (!(listbox instanceof HTMLDivElement)) {
      throw new Error("Missing disabled listbox");
    }

    React.act(() => {
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      listbox.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(disabledInsert).not.toHaveBeenCalled();
  } finally {
    disabledView.cleanup();
  }
});

test("BlockInserter scopes search copy and results to the active category", () => {
  const onInsertBlock = vi.fn();
  const view = mount(<BlockInserter onInsertBlock={onInsertBlock} showHeader={false} />);

  try {
    clickByText(view.container, "Media");

    const mediaSearch = view.container.querySelector('input[aria-label="Search Media blocks"]');
    expect(mediaSearch).toBeInstanceOf(HTMLInputElement);
    expect((mediaSearch as HTMLInputElement).placeholder).toBe("Search Media blocks...");

    setInputValue(mediaSearch, "cta");
    expect(view.container.textContent).toContain("No block matches this search.");
    expect(view.container.textContent).not.toContain("Button");

    clickByText(view.container, "Interactive");
    const interactiveSearch = view.container.querySelector(
      'input[aria-label="Search Interactive blocks"]'
    );
    expect(interactiveSearch).toBeInstanceOf(HTMLInputElement);
    expect((interactiveSearch as HTMLInputElement).placeholder).toBe(
      "Search Interactive blocks..."
    );
    expect(view.container.textContent).toContain("Button");
  } finally {
    view.cleanup();
  }
});
