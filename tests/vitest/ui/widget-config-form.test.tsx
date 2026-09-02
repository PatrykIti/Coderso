// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { WidgetConfigForm } from "../../../core/admin/ui/dashboard/WidgetConfigForm";
import type { WidgetConfigField } from "../../../core/admin/ui/dashboard/widgetRegistry";
import type {
  DashboardContentQueryConfig,
  DashboardQuickActionsConfig,
  DashboardWidgetConfig,
} from "../../../core/services/dashboard/dashboardTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => [
    { id: "ct-article", name: "Article" },
    { id: "ct-product", name: "Product" },
  ],
  listContentTypesCached: async () => [
    { id: "ct-article", name: "Article" },
    { id: "ct-product", name: "Product" },
  ],
}));

// Radix Select renders through a portal; swap it for a native <select> so
// onValueChange fires directly in happy-dom (lane-standard seam, same as the
// menu-editor-shell-wave suite).
vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) {
          return flattenText((child.props as { children?: React.ReactNode }).children);
        }
        return "";
      })
      .join("")
      .trim();
  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
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
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={String(value ?? "")} onChange={onChange} {...props} />,
}));

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

const mount = (fields: WidgetConfigField[], config: DashboardWidgetConfig, onChange = vi.fn()) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <WidgetConfigForm widgetId="widget-1" fields={fields} config={config} onChange={onChange} />
    );
  });
  return {
    container,
    onChange,
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

test("text and checkbox controls emit their raw values", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [
    { key: "title", control: "text", label: "Title", placeholder: "Panel title" },
    { key: "compact", control: "checkbox", label: "Compact mode" },
  ];
  const view = mount(fields, { kind: "content-type-counts", limit: 5 }, onChange);
  try {
    const title = view.container.querySelector<HTMLInputElement>(
      'input[placeholder="Panel title"]'
    );
    expect(title).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(title, "My panel");
      title?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("title", "My panel");

    const checkbox = Array.from(view.container.querySelectorAll('[role="checkbox"]')).find((node) =>
      node.closest("label")?.textContent?.includes("Compact mode")
    ) as HTMLElement | null;
    expect(checkbox).not.toBeNull();
    React.act(() => {
      checkbox?.click();
    });
    expect(onChange).toHaveBeenCalledWith("compact", true);
  } finally {
    view.cleanup();
  }
});

test("select with emptyOption clears to null and normal options emit raw values", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [
    {
      key: "contentTypeId",
      control: "select",
      label: "Content type",
      options: "contentTypes",
      emptyOption: { label: "All content types", value: null },
    },
    {
      key: "sort",
      control: "select",
      label: "Sort by",
      options: [
        { value: "updatedAt", label: "Updated" },
        { value: "title", label: "Title" },
      ],
    },
  ];
  const config: DashboardContentQueryConfig = {
    kind: "content-query",
    contentTypeId: "ct-article",
    sort: "updatedAt",
  };
  const view = mount(fields, config, onChange);

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    const contentTypeSelect = selects[0];
    expect(contentTypeSelect).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(contentTypeSelect, "__widget_config_clear__");
      contentTypeSelect?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("contentTypeId", null);

    const sortSelect = selects[1];
    React.act(() => {
      setter?.call(sortSelect, "title");
      sortSelect?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("sort", "title");
  } finally {
    view.cleanup();
  }
});

test("select with undefined emptyOption clears to undefined", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [
    {
      key: "status",
      control: "select",
      label: "Status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
      ],
      emptyOption: { label: "Any status", value: undefined },
    },
  ];
  const view = mount(fields, { kind: "content-query", contentTypeId: null }, onChange);
  try {
    const select = view.container.querySelector<HTMLSelectElement>("select");
    expect(select).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(select, "__widget_config_clear__");
      select?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("status", undefined);
  } finally {
    view.cleanup();
  }
});

test("number control clamps emitted values to the declared range", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [
    { key: "limit", control: "number", label: "Limit", min: 1, max: 50 },
  ];
  const view = mount(fields, { kind: "content-type-counts", limit: 10 }, onChange);
  try {
    const input = view.container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(input, "120");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("limit", 50);
  } finally {
    view.cleanup();
  }
});

test("slider control emits clamped values through keyboard input", () => {
  const onChange = vi.fn();
  const initialValue = 7;
  const expectedStep = 1;
  const fields: WidgetConfigField[] = [
    { key: "rangeDays", control: "slider", label: "Range (days)", min: 1, max: 365 },
  ];
  const view = mount(
    fields,
    { kind: "content-over-time", source: "content", rangeDays: initialValue },
    onChange
  );
  try {
    const slider = view.container.querySelector<HTMLElement>('[role="slider"]');
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute("aria-valuenow")).toBe(String(initialValue));
    React.act(() => {
      slider?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    // ArrowRight on a Radix slider bumps the value; the emitted value is clamped.
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][1] as number;
    expect(Number.isFinite(emitted)).toBe(true);
    expect(emitted).not.toBe(initialValue);
    expect(emitted).toBe(initialValue + expectedStep);
    expect(emitted).toBeGreaterThanOrEqual(1);
    expect(emitted).toBeLessThanOrEqual(365);
  } finally {
    view.cleanup();
  }
});

test("number control treats a non-numeric value as the range minimum", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [
    { key: "limit", control: "number", label: "Limit", min: 1, max: 50 },
  ];
  const view = mount(fields, { kind: "content-type-counts", limit: 10 }, onChange);
  try {
    const input = view.container.querySelector<HTMLInputElement>('input[type="number"]');
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(input, "-");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // A non-finite parsed value fails closed to the declared minimum.
    expect(onChange).toHaveBeenCalledWith("limit", 1);
  } finally {
    view.cleanup();
  }
});

test("an out-of-contract control fails closed instead of rendering a plain object", () => {
  const fields: WidgetConfigField[] = JSON.parse(
    '[{"key":"color","control":"color-picker","label":"Accent"}]'
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    expect(() =>
      React.act(() => {
        root.render(
          <WidgetConfigForm
            widgetId="widget-1"
            fields={fields}
            config={{ kind: "content-type-counts", limit: 5 }}
            onChange={vi.fn()}
          />
        );
      })
    ).toThrow();
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});

test("quick-actions editor supports target change, icon edit, and removal", () => {
  const onChange = vi.fn();
  const fields: WidgetConfigField[] = [{ key: "actions", control: "actions", label: "Actions" }];
  const config: DashboardQuickActionsConfig = {
    kind: "quick-actions",
    actions: [{ id: "qa-1", label: "Pages", target: "pages" }],
  };
  const view = mount(fields, config, onChange);
  try {
    const targetSelect = view.container.querySelector<HTMLSelectElement>("select");
    expect(targetSelect).not.toBeNull();
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    React.act(() => {
      selectSetter?.call(targetSelect, "media");
      targetSelect?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("actions", [
      { id: "qa-1", label: "Pages", target: "media" },
    ]);

    const iconInput = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Action icon"]'
    );
    expect(iconInput).not.toBeNull();
    const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      inputSetter?.call(iconInput, "settings");
      iconInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith("actions", [
      { id: "qa-1", label: "Pages", target: "media", icon: "settings" },
    ]);

    const remove = Array.from(view.container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Remove action"
    );
    expect(remove).not.toBeNull();
    React.act(() => {
      remove?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith("actions", undefined);
  } finally {
    view.cleanup();
  }
});
