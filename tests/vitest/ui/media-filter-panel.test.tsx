// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  EMPTY_MEDIA_FILTER,
  MediaFilterPanel,
  countActiveFilters,
  type MediaFilterState,
} from "../../../core/admin/ui/media/MediaFilterPanel";
import type { MediaFolder } from "../../../core/admin/ui/media/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cleanupFns: Array<() => void> = [];

afterEach(() => {
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
});

const folders: MediaFolder[] = [
  { id: "f1", name: "Marketing", slug: "marketing", parentId: null, orderIndex: 0, createdAt: "" },
];

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

const click = (el: Element | null | undefined) => {
  React.act(() => {
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSelect = (el: HTMLSelectElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setInput = (el: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const buttonByText = (c: ParentNode, text: string) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.textContent?.trim() === text);

const render = (value: MediaFilterState, onChange = vi.fn(), onReset = vi.fn()) => {
  const container = mount(
    <MediaFilterPanel
      tags={["hero", "banner"]}
      folders={folders}
      value={value}
      onChange={onChange}
      onReset={onReset}
    />
  );
  return { container, onChange, onReset };
};

test("countActiveFilters counts one per non-empty facet", () => {
  expect(countActiveFilters(EMPTY_MEDIA_FILTER)).toBe(0);
  expect(
    countActiveFilters({
      types: ["image"],
      tags: ["hero"],
      folderId: "f1",
      alt: "missing",
      dateFrom: "2026-01-01",
      dateTo: null,
    })
  ).toBe(5);
});

test("toggling a type chip emits a new state with only types changed", () => {
  const { container, onChange } = render(EMPTY_MEDIA_FILTER);
  click(buttonByText(container, "Images"));
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, types: ["image"] });
});

test("toggling a tag chip emits a new state with only tags changed", () => {
  const { container, onChange } = render(EMPTY_MEDIA_FILTER);
  click(buttonByText(container, "hero"));
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, tags: ["hero"] });
});

test("selecting a folder emits a new state with only folderId changed", () => {
  const { container, onChange } = render(EMPTY_MEDIA_FILTER);
  const select = container.querySelector("#media-filter-folder") as HTMLSelectElement;
  setSelect(select, "f1");
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, folderId: "f1" });
});

test("flipping the alt tri-state emits a new state with only alt changed", () => {
  const { container, onChange } = render(EMPTY_MEDIA_FILTER);
  click(buttonByText(container, "Missing alt"));
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, alt: "missing" });
});

test("setting a from-date emits a new state with only dateFrom changed", () => {
  const { container, onChange } = render(EMPTY_MEDIA_FILTER);
  const from = container.querySelector('input[aria-label="From date"]') as HTMLInputElement;
  setInput(from, "2026-07-05");
  expect(onChange).toHaveBeenCalledWith({ ...EMPTY_MEDIA_FILTER, dateFrom: "2026-07-05" });
});

test("Reset is disabled when no facet is active", () => {
  const { container } = render(EMPTY_MEDIA_FILTER);
  const reset = buttonByText(container, "Clear all") as HTMLButtonElement;
  expect(reset.disabled).toBe(true);
});

test("Reset fires onReset when a facet is active", () => {
  const { container, onReset } = render({ ...EMPTY_MEDIA_FILTER, types: ["video"] });
  const reset = buttonByText(container, "Clear all") as HTMLButtonElement;
  expect(reset.disabled).toBe(false);
  click(reset);
  expect(onReset).toHaveBeenCalledTimes(1);
});
