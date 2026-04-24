// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ListPaginationFooter } from "../../../core/admin/ui/shared/ListPaginationFooter";
import {
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  normalizeAdminListPageSize,
  useListPagination,
} from "../../../core/admin/ui/shared/useListPagination";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
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
      disabled,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select
        aria-label="Rows"
        disabled={disabled}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => (
      <>{children}</>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

type HarnessProps = {
  rows: string[];
  resetKey?: string;
};

function Harness({ rows, resetKey }: HarnessProps) {
  const pagination = useListPagination(rows, { resetKey });

  return (
    <div>
      <span data-testid="visible-rows">{pagination.visibleRows.join(",")}</span>
      <span data-testid="page-size">{pagination.pageSize}</span>
      <ListPaginationFooter resourceLabel="records" pagination={pagination} />
    </div>
  );
}

const mount = (props: HarnessProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<Harness {...props} />);
  });

  return {
    container,
    rerender: (nextProps: HarnessProps) => {
      act(() => {
        root.render(<Harness {...nextProps} />);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("useListPagination defaults to the shared page-size options", () => {
  expect(DEFAULT_ADMIN_LIST_PAGE_SIZE).toBe(10);
  expect(ADMIN_LIST_PAGE_SIZE_OPTIONS).toEqual([10, 20, 30, 50, 100, 150, 200, 500]);
  expect(normalizeAdminListPageSize("999")).toBe(10);
  expect(normalizeAdminListPageSize("20")).toBe(20);
});

test("ListPaginationFooter reports range copy and drives previous and next pages", () => {
  const rows = Array.from({ length: 25 }, (_, index) => `Row ${index + 1}`);
  const view = mount({ rows });

  try {
    expect(view.container.textContent).toContain("Showing 1-10 of 25 records");
    expect(view.container.querySelector("[data-testid='visible-rows']")?.textContent).toContain("Row 10");
    expect(view.container.querySelector("[data-testid='visible-rows']")?.textContent).not.toContain("Row 11");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });

    expect(view.container.textContent).toContain("Showing 11-20 of 25 records");
    expect(view.container.querySelector("[data-testid='visible-rows']")?.textContent).toContain("Row 11");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Previous")
        ?.click();
    });

    expect(view.container.textContent).toContain("Showing 1-10 of 25 records");
  } finally {
    view.cleanup();
  }
});

test("useListPagination resets on page-size and reset-key changes", () => {
  const rows = Array.from({ length: 25 }, (_, index) => `Row ${index + 1}`);
  const view = mount({ rows, resetKey: "all" });

  try {
    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    expect(view.container.textContent).toContain("Showing 11-20 of 25 records");

    const pageSizeSelect = view.container.querySelector("select");
    act(() => {
      if (pageSizeSelect instanceof HTMLSelectElement) {
        pageSizeSelect.value = "20";
        pageSizeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(view.container.textContent).toContain("Showing 1-20 of 25 records");
    expect(view.container.querySelector("[data-testid='page-size']")?.textContent).toBe("20");

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Next")
        ?.click();
    });
    expect(view.container.textContent).toContain("Showing 21-25 of 25 records");

    view.rerender({ rows: rows.slice(0, 5), resetKey: "filtered" });
    expect(view.container.textContent).toContain("Showing 1-5 of 5 records");
  } finally {
    view.cleanup();
  }
});
