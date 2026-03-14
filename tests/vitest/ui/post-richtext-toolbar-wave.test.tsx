// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostRichTextToolbar } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextToolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onSelect,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    "aria-label"?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onSelect}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => <option value={value}>{children}</option>,
  };
});

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
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickByAriaLabel = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!button) {
    throw new Error(`Missing button aria-label: ${label}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("PostRichTextToolbar dispatches grouped and inline commands for paragraph profile", () => {
  const onCommand = vi.fn();
  const view = mount(<PostRichTextToolbar profile="paragraph" onCommand={onCommand} />);

  try {
    clickByAriaLabel(view.container, "Bold");
    clickByAriaLabel(view.container, "Align left");
    clickByText(view.container, "Type");
    clickByText(view.container, "Section");
    clickByAriaLabel(view.container, "Clear formatting");

    expect(onCommand.mock.calls.map((call) => call[0])).toEqual([
      "bold",
      "align-left",
      "type-section",
      "clear-formatting",
    ]);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar typography selects normalize invalid values", () => {
  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();
  const view = mount(
    <PostRichTextToolbar
      profile="writing-canvas"
      onCommand={() => undefined}
      fontFamily="sans"
      baseTextScale="md"
      onFontFamilyChange={onFontFamilyChange}
      onBaseTextScaleChange={onBaseTextScaleChange}
    />
  );

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));

    act(() => {
      setSelectValue(selects[0], "serif");
      setSelectValue(selects[0], "weird-font");
      setSelectValue(selects[1], "xl");
      setSelectValue(selects[1], "weird-size");
    });

    expect(onFontFamilyChange).toHaveBeenNthCalledWith(1, "serif");
    expect(onFontFamilyChange).toHaveBeenNthCalledWith(2, "sans");
    expect(onBaseTextScaleChange).toHaveBeenNthCalledWith(1, "xl");
    expect(onBaseTextScaleChange).toHaveBeenNthCalledWith(2, "md");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar hides advanced row when profile has no advanced actions and respects disabled state", () => {
  const onCommand = vi.fn();
  const view = mount(
    <PostRichTextToolbar profile="callout" onCommand={onCommand} disabled />
  );

  try {
    const boldButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Bold"
    ) as HTMLButtonElement | undefined;
    const alignLeftButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Align left"
    ) as HTMLButtonElement | undefined;

    expect(boldButton?.disabled).toBe(true);
    expect(alignLeftButton?.disabled).toBe(true);
    expect(onCommand).not.toHaveBeenCalled();
    expect(view.container.textContent).not.toContain("Underline");
    expect(view.container.textContent).not.toContain("More formatting");
    expect(view.container.textContent).not.toContain("List");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar exposes profile-specific dropdown groups and advanced formatting toggles", () => {
  const onCommand = vi.fn();
  const view = mount(
    <PostRichTextToolbar
      profile="writing-canvas"
      onCommand={onCommand}
      fontFamily="mono"
      baseTextScale="lg"
    />
  );

  try {
    expect(view.container.textContent).toContain("Type");
    expect(view.container.textContent).toContain("Text");
    expect(view.container.textContent).toContain("List");
    expect(view.container.textContent).toContain("Code");
    expect(view.container.textContent).toContain("More formatting");
    expect(view.container.textContent).not.toContain("Typography reads from block.");

    clickByText(view.container, "More formatting");
    clickByAriaLabel(view.container, "Underline");
    clickByText(view.container, "Code");
    clickByText(view.container, "Code block");
    clickByAriaLabel(view.container, "Align right");

    expect(onCommand.mock.calls.map((call) => call[0])).toEqual([
      "underline",
      "code-block",
      "align-right",
    ]);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar renders heading-only groups without writing-canvas text group", () => {
  const onCommand = vi.fn();
  const view = mount(<PostRichTextToolbar profile="heading" onCommand={onCommand} />);

  try {
    expect(view.container.textContent).toContain("Type");
    expect(view.container.textContent).toContain("Headings");
    expect(view.container.textContent).not.toContain("Text");
    expect(view.container.textContent).not.toContain("List");

    clickByText(view.container, "Headings");
    clickByText(view.container, "Heading 6");

    expect(onCommand).toHaveBeenCalledWith("heading-6");
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar uses inline layout controls for quote profile", () => {
  const onCommand = vi.fn();
  const view = mount(<PostRichTextToolbar profile="quote" onCommand={onCommand} />);

  try {
    expect(view.container.textContent).toContain("Type");
    expect(view.container.textContent).not.toContain("Text");
    expect(view.container.textContent).not.toContain("Headings");
    expect(view.container.textContent).not.toContain("List");

    clickByAriaLabel(view.container, "Align center");
    clickByAriaLabel(view.container, "Clear formatting");

    expect(onCommand.mock.calls.map((call) => call[0])).toEqual([
      "align-center",
      "clear-formatting",
    ]);
  } finally {
    view.cleanup();
  }
});

test("PostRichTextToolbar disables typography controls when disabled", () => {
  const onFontFamilyChange = vi.fn();
  const onBaseTextScaleChange = vi.fn();
  const view = mount(
    <PostRichTextToolbar
      profile="writing-canvas"
      onCommand={() => undefined}
      disabled
      fontFamily="sans"
      baseTextScale="md"
      onFontFamilyChange={onFontFamilyChange}
      onBaseTextScaleChange={onBaseTextScaleChange}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const boldButton = buttons.find((button) => button.getAttribute("aria-label") === "Bold");
    expect(
      buttons.find((button) => button.textContent?.includes("More formatting"))?.hasAttribute(
        "disabled"
      )
    ).toBe(true);
    expect(boldButton?.hasAttribute("disabled")).toBe(true);

    expect(onFontFamilyChange).not.toHaveBeenCalled();
    expect(onBaseTextScaleChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
