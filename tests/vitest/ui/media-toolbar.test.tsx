// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { MediaToolbar } from "../../../core/admin/ui/media/MediaToolbar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const filtersButton = (c: ParentNode) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.textContent?.includes("Filters"));

test("MediaToolbar fires onOpenFilters when the Filters button is clicked", () => {
  const onOpenFilters = vi.fn();
  const container = mount(
    <MediaToolbar
      search=""
      view="grid"
      onSearchChange={() => undefined}
      onViewChange={() => undefined}
      onOpenFilters={onOpenFilters}
    />
  );
  const button = filtersButton(container);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onOpenFilters).toHaveBeenCalledTimes(1);
});

test("MediaToolbar shows the active-filter count badge and hides it at 0", () => {
  const withCount = mount(
    <MediaToolbar
      search=""
      view="grid"
      onSearchChange={() => undefined}
      onViewChange={() => undefined}
      onOpenFilters={() => undefined}
      activeFilterCount={3}
    />
  );
  expect(filtersButton(withCount)?.textContent).toContain("3");

  const zeroCount = mount(
    <MediaToolbar
      search=""
      view="grid"
      onSearchChange={() => undefined}
      onViewChange={() => undefined}
      onOpenFilters={() => undefined}
      activeFilterCount={0}
    />
  );
  // "Filters" text remains, but no numeric badge is appended.
  expect(filtersButton(zeroCount)?.textContent?.trim()).toBe("Filters");
});

test("MediaToolbar hides the Filters button entirely when onOpenFilters is absent (back-compat)", () => {
  const container = mount(
    <MediaToolbar
      search=""
      view="grid"
      onSearchChange={() => undefined}
      onViewChange={() => undefined}
    />
  );
  expect(filtersButton(container)).toBeUndefined();
});
