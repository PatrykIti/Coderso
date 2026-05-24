// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

type TestPageSummary = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  updatedAt: string;
  author: null;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pageState = vi.hoisted(() => ({
  pages: [
    {
      id: "page-home",
      title: "Home",
      slug: "",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "page-pricing",
      title: "Pricing",
      slug: "pricing/",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "page-draft",
      title: "Draft page",
      slug: "draft",
      status: "draft",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ] satisfies TestPageSummary[],
  error: null as unknown,
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
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
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
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
  };
});

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => {
    await Promise.resolve();
    if (pageState.error) throw pageState.error;
    return pageState.pages;
  }),
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  pageState.error = null;
  vi.restoreAllMocks();
});

test("LinkDestinationField resolves selected pages to stable href strings", async () => {
  const { LinkDestinationField } =
    await import("../../../core/admin/ui/widgets/editors/LinkDestinationField");

  let latestValue = "";

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <LinkDestinationField
        fieldId="test-destination"
        label="Destination"
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const select = view.container.querySelector(
      '[data-link-destination-field="test-destination"] select'
    );
    expect(
      Array.from((select as HTMLSelectElement).options).map((option) => option.value)
    ).not.toContain("page-draft");
    setSelectValue(select, "page-pricing");

    expect(latestValue).toBe("/pricing");
    expect(view.container.textContent).toContain("Links to selected site page: Pricing.");
  } finally {
    view.cleanup();
  }
});

test("LinkDestinationField keeps custom legacy destinations read-only with clear/replace affordance", async () => {
  const { LinkDestinationField } =
    await import("../../../core/admin/ui/widgets/editors/LinkDestinationField");

  let latestValue = "https://example.com/pricing";

  const Harness = () => {
    const [value, setValue] = useState(latestValue);
    return (
      <LinkDestinationField
        fieldId="legacy-destination"
        label="Destination"
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Saved custom destination");
    expect(view.container.textContent).toContain("A custom destination is already configured.");

    const clearButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Clear destination")
    );
    React.act(() => {
      clearButton?.click();
    });

    expect(latestValue).toBe("");
  } finally {
    view.cleanup();
  }
});
