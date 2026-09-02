// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AuditFilters } from "../../../core/admin/ui/audit/AuditFilters";
import type {
  AuditCategory,
  AuditDateRange,
  AuditSeverity,
} from "../../../core/admin/ui/audit/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
      const props = child.props as { value?: unknown; children?: React.ReactNode };
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
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

let cleanupFns: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanupFns.splice(0)) cleanup();
});

const mount = (node: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const changeInputValue = (container: HTMLElement, value: string) => {
  const input = container.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing query input");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const changeSelectValue = (container: HTMLElement, optionLabel: string, value: string) => {
  const selects = Array.from(container.querySelectorAll("select"));
  const select = selects.find((node) =>
    Array.from(node.querySelectorAll("option")).some((option) => option.textContent === optionLabel)
  );
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with option ${optionLabel}`);
  }
  select.value = value;
  React.act(() => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

test("AuditFilters forwards query and every filter control through its callbacks", () => {
  const onQueryChange = vi.fn();
  const onDateRangeChange = vi.fn<(value: AuditDateRange) => void>();
  const onEventTypeChange = vi.fn<(value: "all" | AuditCategory) => void>();
  const onSeverityChange = vi.fn<(value: "all" | AuditSeverity) => void>();

  const container = mount(
    <AuditFilters
      query=""
      dateRange="last-7-days"
      eventType="all"
      severity="all"
      onQueryChange={onQueryChange}
      onDateRangeChange={onDateRangeChange}
      onEventTypeChange={onEventTypeChange}
      onSeverityChange={onSeverityChange}
    />
  );

  changeInputValue(container, "home");
  expect(onQueryChange).toHaveBeenCalledWith("home");

  changeSelectValue(container, "This month", "this-month");
  expect(onDateRangeChange).toHaveBeenCalledWith("this-month");

  changeSelectValue(container, "Authentication", "authentication");
  expect(onEventTypeChange).toHaveBeenCalledWith("authentication");

  changeSelectValue(container, "Warning", "warning");
  expect(onSeverityChange).toHaveBeenCalledWith("warning");

  // The query input retains the controlled value supplied by the parent.
  expect(container.querySelector("input")?.value).toBe("");
});

test("AuditFilters renders every option label for the three filter selects", () => {
  const container = mount(
    <AuditFilters
      query="q"
      dateRange="last-30-days"
      eventType="content"
      severity="error"
      onQueryChange={() => undefined}
      onDateRangeChange={() => undefined}
      onEventTypeChange={() => undefined}
      onSeverityChange={() => undefined}
    />
  );

  const text = container.textContent ?? "";
  expect(text).toContain("Last 7 days");
  expect(text).toContain("Last 30 days");
  expect(text).toContain("This month");
  expect(text).toContain("All event types");
  expect(text).toContain("Authentication");
  expect(text).toContain("Content");
  expect(text).toContain("System");
  expect(text).toContain("All severities");
  expect(text).toContain("Info");
  expect(text).toContain("Warning");
  expect(text).toContain("Error");
});
