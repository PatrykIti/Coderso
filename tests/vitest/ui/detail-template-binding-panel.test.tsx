// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { PageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import type { DetailPageBinding } from "../../../core/services/content/detailPageTypes";
import { DetailTemplateBindingPanel } from "../../../core/admin/ui/content-types/DetailTemplateBindingPanel";
import type { ContentField } from "../../../core/admin/ui/content-types/SchemaBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ariaLabel,
    "aria-label": ariaLabelAttr,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    ariaLabel?: string;
    "aria-label"?: string;
  }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel ?? ariaLabelAttr}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
    >
      toggle
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.currentTarget.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
  vi.clearAllMocks();
});

const text = () => container!.textContent ?? "";

const headingBlock = (): PageBlockV2 =>
  createPageBlockV2("heading", { id: "block-heading", props: { text: "Hi", level: "h2" } });

const fields: ContentField[] = [
  { id: "f-title", name: "title", type: "text", label: "Title" },
  { id: "f-slug", name: "slug", type: "text", label: "Slug" },
  { id: "f-token", name: "apiToken", type: "text", label: "API Token" },
  { id: "f-author", name: "authorName", type: "text", label: "Author" },
];

const binding = (overrides: Partial<DetailPageBinding> = {}): DetailPageBinding => ({
  id: "binding-1",
  blockId: "block-heading",
  propPath: "text",
  source: { kind: "entry-field", field: "title" },
  transform: "text",
  ...overrides,
});

const mountPanel = (
  selectedBlock: PageBlockV2 | null,
  value: DetailPageBinding[],
  onChange = vi.fn(),
  focusedPropPath: string | null = null,
  onFocusedPropPathChange = vi.fn()
) => {
  const root = createRoot(container!);
  React.act(() => {
    root.render(
      <DetailTemplateBindingPanel
        selectedBlock={selectedBlock}
        value={value}
        fields={fields}
        onChange={onChange}
        focusedPropPath={focusedPropPath}
        onFocusedPropPathChange={onFocusedPropPathChange}
      />
    );
  });
  return { onChange, onFocusedPropPathChange, root };
};

const selects = () => Array.from(container!.querySelectorAll("select"));

const inputByPlaceholder = (placeholder: string) =>
  Array.from(container!.querySelectorAll("input")).find(
    (input) => input.getAttribute("placeholder") === placeholder
  );

const setInput = (input: HTMLInputElement, nextValue: string) => {
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
      input,
      nextValue
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const firstBindingRow = () => container!.querySelector<HTMLElement>("[data-prop-path]");

test("shows the empty state when no block is selected", () => {
  const { root } = mountPanel(null, []);
  try {
    expect(text()).toContain("Select a block to configure content field bindings.");
    expect(container!.querySelector("button")).toBeNull();
  } finally {
    React.act(() => root.unmount());
  }
});

test("shows the widget props and adds a binding via the add button", () => {
  const { onChange, root } = mountPanel(headingBlock(), []);
  try {
    expect(text()).toContain("Available widget props");
    expect(text()).toContain("No content field bindings are configured");

    const addButton = Array.from(container!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add binding")
    );
    React.act(() => {
      if (!addButton) throw new Error("Missing add binding button");
      addButton.click();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      blockId: "block-heading",
      propPath: "text",
      source: { kind: "entry-field", field: "title" },
      transform: "text",
    });
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds a binding through a widget-prop chip", () => {
  const { onChange, onFocusedPropPathChange, root } = mountPanel(headingBlock(), []);
  try {
    const chip = Array.from(container!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("text")
    );
    React.act(() => {
      if (!chip) throw new Error("Missing widget prop chip");
      chip.click();
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.propPath).toBe("text");
    expect(onFocusedPropPathChange).toHaveBeenCalledWith("text");
  } finally {
    React.act(() => root.unmount());
  }
});

test("focuses an already-bound prop chip instead of re-adding", () => {
  const value = [binding()];
  const { onChange, onFocusedPropPathChange, root } = mountPanel(headingBlock(), value);
  try {
    const chip = Array.from(container!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("text")
    );
    React.act(() => {
      if (!chip) throw new Error("Missing widget prop chip");
      chip.click();
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(onFocusedPropPathChange).toHaveBeenCalledWith("text");
  } finally {
    React.act(() => root.unmount());
  }
});

test("updates the prop path and focuses it while typing", () => {
  const value = [binding()];
  const focusChange = vi.fn();
  const { onChange, onFocusedPropPathChange, root } = mountPanel(
    headingBlock(),
    value,
    vi.fn(),
    null,
    focusChange
  );
  try {
    const pathInput = container!.querySelector<HTMLInputElement>('input[placeholder="headline"]');
    if (!pathInput) throw new Error("Missing prop path input");
    setInput(pathInput, "subtitle");
    expect(focusChange).toHaveBeenCalledWith("subtitle");
    expect(onFocusedPropPathChange).toBe(focusChange);
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.propPath).toBe("subtitle");
    expect(next[0]?.id).toBe("binding-1");
  } finally {
    React.act(() => root.unmount());
  }
});

test("changes the entry source and resets the transform to its default", () => {
  const value = [binding({ transform: "currency" })];
  const { onChange, root } = mountPanel(headingBlock(), value);
  try {
    const sourceSelect = selects()[0];
    React.act(() => {
      sourceSelect.value = "computed:relatedItems";
      sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.source).toEqual({ kind: "computed", resolver: "relatedItems" });
    expect(next[0]?.transform).toBe("list");
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes the transform when switching to a transform-less source", () => {
  const value = [binding({ transform: "text" })];
  const { onChange, root } = mountPanel(headingBlock(), value);
  try {
    const sourceSelect = selects()[0];
    React.act(() => {
      sourceSelect.value = "computed:formContext";
      sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.source).toEqual({ kind: "computed", resolver: "formContext" });
    expect(next[0]?.transform).toBeUndefined();
  } finally {
    React.act(() => root.unmount());
  }
});

test("changes the transform value through the transform select", () => {
  const value = [binding()];
  const { onChange, root } = mountPanel(headingBlock(), value);
  try {
    const transformSelect = selects()[1];
    React.act(() => {
      transformSelect.value = "currency";
      transformSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.transform).toBe("currency");
  } finally {
    React.act(() => root.unmount());
  }
});

test("clears the transform when selecting the none option", () => {
  const value = [binding({ transform: "image" })];
  const { onChange, root } = mountPanel(headingBlock(), value);
  try {
    const transformSelect = selects()[1];
    React.act(() => {
      transformSelect.value = "__none";
      transformSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next[0]?.transform).toBeUndefined();
  } finally {
    React.act(() => root.unmount());
  }
});

test("sets the fallback value and clears it when emptied", () => {
  const { onChange, root } = mountPanel(headingBlock(), [binding()]);
  try {
    const fallbackInput = inputByPlaceholder("Keep empty to use widget value");
    if (!fallbackInput) throw new Error("Missing fallback input");
    setInput(fallbackInput, "Default title");
    const withFallback = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(withFallback[0]?.fallback).toBe("Default title");

    setInput(fallbackInput, "   ");
    const cleared = onChange.mock.calls[1][0] as DetailPageBinding[];
    expect(cleared[0]?.fallback).toBeUndefined();
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders an object fallback as JSON", () => {
  const { root } = mountPanel(headingBlock(), [binding({ fallback: { label: "X", href: "/x" } })]);
  try {
    const fallbackInput = inputByPlaceholder("Keep empty to use widget value");
    expect(fallbackInput?.value).toBe('{"label":"X","href":"/x"}');
  } finally {
    React.act(() => root.unmount());
  }
});

test("toggles the required switch on and off", () => {
  const StatefulHarness = () => {
    const [value, setValue] = React.useState<DetailPageBinding[]>([binding()]);
    return (
      <DetailTemplateBindingPanel
        selectedBlock={headingBlock()}
        value={value}
        fields={fields}
        onChange={setValue}
      />
    );
  };
  const root = createRoot(container!);
  React.act(() => {
    root.render(<StatefulHarness />);
  });
  try {
    const requiredSwitch = container!.querySelector<HTMLButtonElement>('[role="switch"]');
    if (!requiredSwitch) throw new Error("Missing required switch");
    React.act(() => {
      requiredSwitch.click();
    });
    expect(requiredSwitch.getAttribute("aria-checked")).toBe("true");
    React.act(() => {
      requiredSwitch.click();
    });
    expect(requiredSwitch.getAttribute("aria-checked")).toBe("false");
  } finally {
    React.act(() => root.unmount());
  }
});

test("removes a binding with the remove button", () => {
  const { onChange, root } = mountPanel(headingBlock(), [binding()]);
  try {
    const removeButton = container!.querySelector<HTMLButtonElement>(
      'button[aria-label="Remove binding for text"]'
    );
    if (!removeButton) throw new Error("Missing remove button");
    React.act(() => {
      removeButton.click();
    });
    expect(onChange).toHaveBeenCalledWith([]);
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders a saved source option for sources missing from the field list", () => {
  const value = [binding({ source: { kind: "entry-field", field: "legacyField" } })];
  const { root } = mountPanel(headingBlock(), value);
  try {
    const sourceSelect = selects()[0];
    const options = Array.from(sourceSelect.options).map((option) => option.value);
    expect(options).toContain("entry-field:legacyField");
    expect(options).not.toContain("entry-field:apiToken");
  } finally {
    React.act(() => root.unmount());
  }
});

test("adds a second binding while one already exists", () => {
  const { onChange, root } = mountPanel(headingBlock(), [binding()]);
  try {
    const addButton = Array.from(container!.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Add binding")
    );
    React.act(() => {
      if (!addButton) throw new Error("Missing add binding button");
      addButton.click();
    });
    const next = onChange.mock.calls[0][0] as DetailPageBinding[];
    expect(next).toHaveLength(2);
    expect(next[1]?.id).not.toBe(next[0]?.id);
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders entry-meta and computed binding sources", () => {
  const value = [
    binding({
      id: "binding-meta",
      propPath: "eyebrow",
      source: { kind: "entry-meta", field: "publishedAt" },
    }),
    binding({
      id: "binding-computed",
      propPath: "href",
      source: { kind: "computed", resolver: "detailHref" },
      transform: "text",
    }),
  ];
  const { root } = mountPanel(headingBlock(), value);
  try {
    const sourceSelect = selects()[0];
    expect(sourceSelect.value).toBe("entry-meta:publishedAt");
    expect(text()).toContain("publishedAt");
    const computedSelect = selects()[2];
    expect(computedSelect.value).toBe("computed:detailHref");
    expect(text()).toContain("detailHref");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders a numeric fallback as a string", () => {
  const { root } = mountPanel(headingBlock(), [binding({ fallback: 42 })]);
  try {
    expect(inputByPlaceholder("Keep empty to use widget value")?.value).toBe("42");
  } finally {
    React.act(() => root.unmount());
  }
});

test("marks the focused binding row and highlights it", () => {
  const { root } = mountPanel(headingBlock(), [binding()], vi.fn(), "text");
  try {
    const row = firstBindingRow();
    expect(row?.getAttribute("data-focused")).toBe("true");
  } finally {
    React.act(() => root.unmount());
  }
});

test("renders non-focused bindings without the highlight", () => {
  const { root } = mountPanel(headingBlock(), [binding()], vi.fn(), "other-prop");
  try {
    expect(firstBindingRow()?.getAttribute("data-focused")).toBe("false");
  } finally {
    React.act(() => root.unmount());
  }
});
