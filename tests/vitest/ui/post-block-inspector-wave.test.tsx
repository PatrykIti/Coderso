// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { BlockInspector } from "../../../core/admin/ui/posts/editor/inspector/BlockInspector";
import type { PostBlock, PostBlockType } from "../../../core/services/posts/editor/postBlockDocument";

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
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
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
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
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/collapsible", () => {
  const ReactLocal = React;
  const CollapsibleContext = ReactLocal.createContext<{
    open: boolean;
    setOpen: (value: boolean) => void;
  } | null>(null);

  return {
    Collapsible: ({
      children,
      defaultOpen = false,
    }: {
      children: React.ReactNode;
      defaultOpen?: boolean;
    }) => {
      const [open, setOpen] = ReactLocal.useState(defaultOpen);
      return (
        <CollapsibleContext.Provider value={{ open, setOpen }}>
          <div data-collapsible-open={String(open)}>{children}</div>
        </CollapsibleContext.Provider>
      );
    },
    CollapsibleTrigger: ({
      children,
      asChild,
    }: {
      children: React.ReactNode;
      asChild?: boolean;
    }) => {
      const context = ReactLocal.useContext(CollapsibleContext);
      if (!context) return <>{children}</>;
      if (asChild && ReactLocal.isValidElement(children)) {
        const child = children as React.ReactElement<{
          onClick?: () => void;
          "data-state"?: string;
        }>;
        return ReactLocal.cloneElement(child, {
          onClick: () => {
            child.props.onClick?.();
            context.setOpen(!context.open);
          },
          "data-state": context.open ? "open" : "closed",
        });
      }
      return (
        <button type="button" onClick={() => context.setOpen(!context.open)}>
          {children}
        </button>
      );
    },
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => {
      const context = ReactLocal.useContext(CollapsibleContext);
      if (!context?.open) return null;
      return <div>{children}</div>;
    },
  };
});

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ content }: { content: string }) => <span data-info-tip={content}>info</span>,
}));

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

const createBlock = (type: PostBlockType, attrs: Record<string, unknown> = {}): PostBlock => ({
  id: `${type}-1`,
  type,
  attrs,
  content: type === "writing-canvas" ? { version: 1, nodes: [] } : null,
});

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  React.act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  React.act(() => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Missing checkbox");
  }
  React.act(() => {
    element.click();
  });
};

const openAdvanced = (container: HTMLElement) => {
  const toggle = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Toggle")
  );
  if (!(toggle instanceof HTMLButtonElement)) {
    throw new Error("Missing advanced toggle");
  }
  React.act(() => {
    toggle.click();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("BlockInspector routes heading, toc, and list controls", () => {
  const onHeadingChange = vi.fn();
  const headingView = mount(
    <BlockInspector
      block={createBlock("heading", { level: 2, width: "auto", spacingTop: "md", spacingBottom: "md" })}
      onChangeAttrs={onHeadingChange}
    />
  );

  try {
    const selects = Array.from(headingView.container.querySelectorAll("select"));
    const numberInput = headingView.container.querySelector('input[type="number"]');

    setSelectValue(selects[0], "wide");
    setSelectValue(selects[1], "lg");
    setSelectValue(selects[2], "sm");
    setInputValue(numberInput, "9");
    openAdvanced(headingView.container);
    const advancedInputs = Array.from(headingView.container.querySelectorAll("input"));
    setInputValue(
      advancedInputs.find((input) => input.placeholder === "section-id"),
      "hero-title"
    );
    setInputValue(
      advancedInputs.find((input) => input.placeholder === "custom-css-class"),
      "hero-title-block"
    );
    toggleCheckbox(
      Array.from(headingView.container.querySelectorAll('input[type="checkbox"]')).at(-1)
    );

    expect(onHeadingChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onHeadingChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onHeadingChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onHeadingChange).toHaveBeenCalledWith({ level: 6 });
    expect(onHeadingChange).toHaveBeenCalledWith({ anchorId: "hero-title" });
    expect(onHeadingChange).toHaveBeenCalledWith({ className: "hero-title-block" });
    expect(onHeadingChange).toHaveBeenCalledWith({ hideOnMobile: true });
  } finally {
    headingView.cleanup();
  }

  const onTocChange = vi.fn();
  const tocView = mount(
    <BlockInspector
      block={createBlock("toc", { minLevel: 1, maxLevel: 3, ordered: false, hideIfEmpty: true })}
      onChangeAttrs={onTocChange}
    />
  );

  try {
    const tocNumberInputs = Array.from(tocView.container.querySelectorAll('input[type="number"]'));
    setInputValue(tocView.container.querySelector('input:not([type="number"])'), "Outline");
    setInputValue(tocNumberInputs[0], "0");
    setInputValue(tocNumberInputs[1], "8");
    const toggles = Array.from(tocView.container.querySelectorAll('input[type="checkbox"]'));
    toggleCheckbox(toggles[0]);
    toggleCheckbox(toggles[1]);

    expect(onTocChange).toHaveBeenCalledWith({ title: "Outline" });
    expect(onTocChange).toHaveBeenCalledWith({ minLevel: 1 });
    expect(onTocChange).toHaveBeenCalledWith({ maxLevel: 6 });
    expect(onTocChange).toHaveBeenCalledWith({ ordered: true });
    expect(onTocChange).toHaveBeenCalledWith({ hideIfEmpty: false });
  } finally {
    tocView.cleanup();
  }

  const onListChange = vi.fn();
  const listView = mount(
    <BlockInspector
      block={createBlock("list", { ordered: false, compact: false, width: "auto", spacingTop: "md", spacingBottom: "md" })}
      onChangeAttrs={onListChange}
    />
  );

  try {
    const listSelects = Array.from(listView.container.querySelectorAll("select"));
    setSelectValue(listSelects[0], "center");
    setSelectValue(listSelects[1], "wide");
    setSelectValue(listSelects[2], "lg");
    setSelectValue(listSelects[3], "sm");
    const toggles = Array.from(listView.container.querySelectorAll('input[type="checkbox"]'));
    toggleCheckbox(toggles[0]);
    toggleCheckbox(toggles[1]);

    expect(onListChange).toHaveBeenCalledWith({ align: "center" });
    expect(onListChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onListChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onListChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onListChange).toHaveBeenCalledWith({ ordered: true });
    expect(onListChange).toHaveBeenCalledWith({ compact: true });
  } finally {
    listView.cleanup();
  }
});

test("BlockInspector routes image, callout, and separator controls", () => {
  const onImageChange = vi.fn();
  const imageView = mount(
    <BlockInspector
      block={createBlock("image", {
        align: "left",
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        mediaId: "media-1",
        wrap: "none",
        widthPercent: 50,
        marginPreset: "md",
        alt: "",
        caption: "",
      })}
      onChangeAttrs={onImageChange}
    />
  );

  try {
    const selects = Array.from(imageView.container.querySelectorAll("select"));
    const inputs = Array.from(imageView.container.querySelectorAll("input"));

    setSelectValue(selects[0], "center");
    setSelectValue(selects[1], "wide");
    setSelectValue(selects[2], "lg");
    setSelectValue(selects[3], "sm");
    setSelectValue(selects[4], "left");
    setSelectValue(selects[5], "66");
    setSelectValue(selects[6], "lg");
    setInputValue(inputs[0], "media-2");
    setInputValue(inputs[1], "Hero alt");
    setInputValue(inputs[2], "Hero caption");

    expect(onImageChange).toHaveBeenCalledWith({ align: "center" });
    expect(onImageChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onImageChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onImageChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onImageChange).toHaveBeenCalledWith({ wrap: "left" });
    expect(onImageChange).toHaveBeenCalledWith({ widthPercent: 66 });
    expect(onImageChange).toHaveBeenCalledWith({ marginPreset: "lg" });
    expect(onImageChange).toHaveBeenCalledWith({ mediaId: "media-2" });
    expect(onImageChange).toHaveBeenCalledWith({ alt: "Hero alt" });
    expect(onImageChange).toHaveBeenCalledWith({ caption: "Hero caption" });
  } finally {
    imageView.cleanup();
  }

  const onCalloutChange = vi.fn();
  const calloutView = mount(
    <BlockInspector
      block={createBlock("callout", {
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        tone: "info",
        showIcon: true,
      })}
      onChangeAttrs={onCalloutChange}
    />
  );

  try {
    const selects = Array.from(calloutView.container.querySelectorAll("select"));
    setSelectValue(selects[0], "wide");
    setSelectValue(selects[1], "lg");
    setSelectValue(selects[2], "sm");
    setSelectValue(selects[3], "danger");
    toggleCheckbox(calloutView.container.querySelector('input[type="checkbox"]'));

    expect(onCalloutChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onCalloutChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onCalloutChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onCalloutChange).toHaveBeenCalledWith({ tone: "danger" });
    expect(onCalloutChange).toHaveBeenCalledWith({ showIcon: false });
  } finally {
    calloutView.cleanup();
  }

  const onSeparatorChange = vi.fn();
  const separatorView = mount(
    <BlockInspector
      block={createBlock("separator", {
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        style: "solid",
        thickness: 1,
      })}
      onChangeAttrs={onSeparatorChange}
    />
  );

  try {
    const selects = Array.from(separatorView.container.querySelectorAll("select"));
    const thicknessInput = separatorView.container.querySelector('input[type="number"]');

    setSelectValue(selects[0], "wide");
    setSelectValue(selects[1], "lg");
    setSelectValue(selects[2], "sm");
    setSelectValue(selects[3], "dotted");
    setInputValue(thicknessInput, "12");

    expect(onSeparatorChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onSeparatorChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onSeparatorChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onSeparatorChange).toHaveBeenCalledWith({ style: "dotted" });
    expect(onSeparatorChange).toHaveBeenCalledWith({ thickness: 8 });
  } finally {
    separatorView.cleanup();
  }
});

test("BlockInspector routes button, embed, code, paragraph, and fixed-layout guidance states", () => {
  const onButtonChange = vi.fn();
  const buttonView = mount(
    <BlockInspector
      block={createBlock("button", {
        align: "left",
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        label: "Button",
        url: "/",
        variant: "primary",
        size: "md",
        newTab: false,
      })}
      onChangeAttrs={onButtonChange}
    />
  );

  try {
    const selects = Array.from(buttonView.container.querySelectorAll("select"));
    const inputs = Array.from(buttonView.container.querySelectorAll("input"));

    setSelectValue(selects[0], "center");
    setSelectValue(selects[1], "wide");
    setSelectValue(selects[2], "lg");
    setSelectValue(selects[3], "sm");
    setSelectValue(selects[4], "secondary");
    setSelectValue(selects[5], "lg");
    setInputValue(inputs[0], "Read more");
    setInputValue(inputs[1], "https://example.com");
    toggleCheckbox(buttonView.container.querySelector('input[type="checkbox"]'));

    expect(onButtonChange).toHaveBeenCalledWith({ align: "center" });
    expect(onButtonChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onButtonChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onButtonChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onButtonChange).toHaveBeenCalledWith({ variant: "secondary" });
    expect(onButtonChange).toHaveBeenCalledWith({ size: "lg" });
    expect(onButtonChange).toHaveBeenCalledWith({ label: "Read more" });
    expect(onButtonChange).toHaveBeenCalledWith({ url: "https://example.com" });
    expect(onButtonChange).toHaveBeenCalledWith({ newTab: true });
  } finally {
    buttonView.cleanup();
  }

  const onEmbedChange = vi.fn();
  const embedView = mount(
    <BlockInspector
      block={createBlock("embed", {
        align: "left",
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        provider: "custom",
        url: "",
        aspect: "16:9",
        lazy: true,
      })}
      onChangeAttrs={onEmbedChange}
    />
  );

  try {
    const selects = Array.from(embedView.container.querySelectorAll("select"));
    const urlInput = embedView.container.querySelector('input:not([type="checkbox"])');

    setSelectValue(selects[0], "center");
    setSelectValue(selects[1], "wide");
    setSelectValue(selects[2], "lg");
    setSelectValue(selects[3], "sm");
    setSelectValue(selects[4], "youtube");
    setSelectValue(selects[5], "4:3");
    setInputValue(urlInput, "https://youtube.com/watch?v=abc123");
    toggleCheckbox(embedView.container.querySelector('input[type="checkbox"]'));

    expect(onEmbedChange).toHaveBeenCalledWith({ align: "center" });
    expect(onEmbedChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onEmbedChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onEmbedChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onEmbedChange).toHaveBeenCalledWith({ provider: "youtube" });
    expect(onEmbedChange).toHaveBeenCalledWith({ aspect: "4:3" });
    expect(onEmbedChange).toHaveBeenCalledWith({ url: "https://youtube.com/watch?v=abc123" });
    expect(onEmbedChange).toHaveBeenCalledWith({ lazy: false });
  } finally {
    embedView.cleanup();
  }

  const onCodeChange = vi.fn();
  const codeView = mount(
    <BlockInspector
      block={createBlock("code", {
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        language: "",
        showLineNumbers: false,
      })}
      onChangeAttrs={onCodeChange}
    />
  );

  try {
    const selects = Array.from(codeView.container.querySelectorAll("select"));
    const languageInput = codeView.container.querySelector('input[placeholder="js, ts, css..."]');

    setSelectValue(selects[0], "wide");
    setSelectValue(selects[1], "lg");
    setSelectValue(selects[2], "sm");
    setInputValue(languageInput, "ts");
    toggleCheckbox(codeView.container.querySelector('input[type="checkbox"]'));

    expect(onCodeChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onCodeChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onCodeChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onCodeChange).toHaveBeenCalledWith({ language: "ts" });
    expect(onCodeChange).toHaveBeenCalledWith({ showLineNumbers: true });
  } finally {
    codeView.cleanup();
  }

  const onParagraphChange = vi.fn();
  const paragraphView = mount(
    <BlockInspector
      block={createBlock("paragraph", {
        width: "auto",
        spacingTop: "md",
        spacingBottom: "md",
        highlight: false,
      })}
      onChangeAttrs={onParagraphChange}
    />
  );

  try {
    const paragraphSelects = Array.from(paragraphView.container.querySelectorAll("select"));
    setSelectValue(paragraphSelects[0], "wide");
    setSelectValue(paragraphSelects[1], "lg");
    setSelectValue(paragraphSelects[2], "sm");
    toggleCheckbox(paragraphView.container.querySelector('input[type="checkbox"]'));

    expect(onParagraphChange).toHaveBeenCalledWith({ width: "wide" });
    expect(onParagraphChange).toHaveBeenCalledWith({ spacingTop: "lg" });
    expect(onParagraphChange).toHaveBeenCalledWith({ spacingBottom: "sm" });
    expect(onParagraphChange).toHaveBeenCalledWith({ highlight: true });
  } finally {
    paragraphView.cleanup();
  }

  const fixedLayoutView = mount(
    <BlockInspector block={createBlock("writing-canvas")} onChangeAttrs={() => undefined} />
  );

  try {
    expect(fixedLayoutView.container.textContent).toContain(
      "This block uses a fixed layout. Edit content directly on the canvas."
    );
    expect(fixedLayoutView.container.textContent).toContain(
      "Use the canvas editor to format paragraphs, headings, lists, and inline images."
    );
  } finally {
    fixedLayoutView.cleanup();
  }
});
