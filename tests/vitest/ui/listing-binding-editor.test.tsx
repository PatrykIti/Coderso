// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ListingTemplateField } from "../../../core/admin/services/listingsClient";

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    disabled,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} disabled={disabled} {...props} />,
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test("BindingEditor adds bindings and conditions, parses values, and updates ordering", async () => {
  const { BindingEditor } =
    await import("../../../core/admin/ui/listings/components/BindingEditor");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ListingTemplateField[]>([]);
    return (
      <BindingEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("No field bindings defined yet");

    clickButtonByText(view.container, "Add binding");

    let bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toEqual(
      expect.objectContaining({
        key: "",
        source: "",
        fallback: null,
        format: "text",
        conditions: [],
      })
    );

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Binding key (title, excerpt, image)"),
        "title"
      );
      setInputValue(
        findInputByPlaceholder(view.container, "Source path (data.title)"),
        "data.title"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["text", "date", "badge", "currency"])[0],
        "currency"
      );
      setInputValue(findInputByPlaceholder(view.container, "Fallback value (optional)"), "N/A");
    });

    clickButtonByText(view.container, "Add condition");

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Row field path (status, price, tags)"),
        "price"
      );
      setSelectValue(
        findSelectsByOptions(view.container, [
          "eq",
          "neq",
          "in",
          "contains",
          "exists",
          "gt",
          "gte",
          "lt",
          "lte",
        ]).at(-1),
        "in"
      );
    });

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "a, b, c"), "12, true, null");
    });

    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]).toEqual(
      expect.objectContaining({
        key: "title",
        source: "data.title",
        fallback: "N/A",
        format: "currency",
        conditions: [
          expect.objectContaining({
            field: "price",
            op: "in",
            value: [12, true, null],
          }),
        ],
      })
    );

    clickButtonByText(view.container, "Add binding");
    const sections = Array.from(
      view.container.querySelectorAll(".space-y-3.rounded-lg.border.p-3")
    );
    const firstSectionButtons = Array.from((sections[0] as HTMLElement).querySelectorAll("button"));
    clickElement(firstSectionButtons[1]);

    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[1]?.key).toBe("title");
  } finally {
    view.cleanup();
  }
});

test("BindingEditor handles exists conditions, condition removal, and binding deletion", async () => {
  const { BindingEditor } =
    await import("../../../core/admin/ui/listings/components/BindingEditor");

  const onChangeSpy = vi.fn();
  const initialValue: ListingTemplateField[] = [
    {
      key: "badge",
      source: "status",
      label: null,
      fallback: null,
      format: "badge",
      conditions: [
        {
          id: "cond-1",
          field: "status",
          op: "eq",
          value: "published",
        },
      ],
    },
  ];

  const Harness = () => {
    const [value, setValue] = useState<ListingTemplateField[]>(initialValue);
    return (
      <BindingEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, [
          "eq",
          "neq",
          "in",
          "contains",
          "exists",
          "gt",
          "gte",
          "lt",
          "lte",
        ])[0],
        "exists"
      );
    });

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["true", "false"])[0], "false");
    });

    let bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]?.conditions?.[0]).toEqual(
      expect.objectContaining({
        op: "exists",
        value: false,
      })
    );

    const section = view.container.querySelector(".space-y-3.rounded-lg.border.p-3") as HTMLElement;
    const buttons = Array.from(section.querySelectorAll("button"));
    clickElement(buttons.at(-1));

    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]?.conditions).toEqual([]);
    expect(view.container.textContent).toContain("No conditions. This binding is always visible.");

    clickElement(buttons[2]);
    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings).toEqual([]);
    expect(view.container.textContent).toContain("No field bindings defined yet");
  } finally {
    view.cleanup();
  }
});

test("BindingEditor reorders conditions and clears blank fallback values", async () => {
  const { BindingEditor } =
    await import("../../../core/admin/ui/listings/components/BindingEditor");

  const onChangeSpy = vi.fn();
  const initialValue: ListingTemplateField[] = [
    {
      key: "title",
      source: "data.title",
      label: null,
      fallback: "N/A",
      format: "text",
      conditions: [
        {
          id: "cond-1",
          field: "status",
          op: "eq",
          value: "published",
        },
        {
          id: "cond-2",
          field: "price",
          op: "gt",
          value: 10,
        },
      ],
    },
  ];

  const Harness = () => {
    const [value, setValue] = useState<ListingTemplateField[]>(initialValue);
    return (
      <BindingEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const section = view.container.querySelector(".space-y-3.rounded-lg.border.p-3") as HTMLElement;
    const fallbackInput = findInputByPlaceholder(view.container, "Fallback value (optional)");

    React.act(() => {
      setInputValue(fallbackInput, "   ");
    });

    let bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]?.fallback).toBeNull();

    const conditionRows = Array.from(
      section.querySelectorAll(
        ".grid.gap-2.md\\:grid-cols-\\[minmax\\(0\\,1fr\\)_180px_minmax\\(0\\,1fr\\)_auto\\]"
      )
    );
    const secondConditionButtons = Array.from(
      (conditionRows[1] as HTMLElement).querySelectorAll("button")
    );

    clickElement(secondConditionButtons[0]);

    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]?.conditions?.map((condition) => condition.id)).toEqual(["cond-2", "cond-1"]);

    const updatedConditionRows = Array.from(
      section.querySelectorAll(
        ".grid.gap-2.md\\:grid-cols-\\[minmax\\(0\\,1fr\\)_180px_minmax\\(0\\,1fr\\)_auto\\]"
      )
    );
    const firstConditionButtons = Array.from(
      (updatedConditionRows[0] as HTMLElement).querySelectorAll("button")
    );
    clickElement(firstConditionButtons[1]);

    bindings = onChangeSpy.mock.lastCall?.[0] as ListingTemplateField[];
    expect(bindings[0]?.conditions?.map((condition) => condition.id)).toEqual(["cond-1", "cond-2"]);
  } finally {
    view.cleanup();
  }
});
