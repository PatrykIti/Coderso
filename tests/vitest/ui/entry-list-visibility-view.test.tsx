// @vitest-environment happy-dom
//
// TASK-514-06 closure coverage: the region-owned entries/SEO leaf test exercises
// only PUBLIC entries and never clicks the list/grid toggle. These assertions
// close that gap — the non-public visibility BADGE (Private/Password) and the
// list<->grid view toggle wiring (514-05), plus the real short-id sub-line.

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { EntryFilters } from "../../../core/admin/ui/entries/EntryFilters";
import { EntryGrid } from "../../../core/admin/ui/entries/EntryGrid";
import type { EntryListItem } from "../../../core/admin/services/entriesClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (element: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const makeEntry = (overrides: Partial<EntryListItem>): EntryListItem => ({
  id: "0f21a0d3-1111-2222-3333-444455556666",
  typeId: "type-1",
  title: "Sample entry",
  slug: "sample-entry",
  status: "published",
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-03-06T12:00:00.000Z",
  updatedAt: "2026-03-06T12:00:00.000Z",
  author: { id: "author-1", name: "Ada Lovelace", email: "ada@example.com" },
  contentType: { id: "ct-1", slug: "articles", name: "Article", status: "published" },
  ...overrides,
});

test("EntryGrid renders the visibility badge only for non-public entries", () => {
  const publicView = mount(
    <EntryGrid
      entries={[makeEntry({ id: "pub-abcdef01", visibility: "public" })]}
      onEdit={vi.fn()}
    />
  );
  try {
    expect(publicView.container.textContent).not.toContain("Private");
    expect(publicView.container.textContent).not.toContain("Password");
    // Real short-id sub-line (514-05 §4a), not the prototype's title.length mock hash.
    expect(publicView.container.textContent).toContain("pub-abcd");
  } finally {
    publicView.cleanup();
  }

  const privateView = mount(
    <EntryGrid entries={[makeEntry({ visibility: "private" })]} onEdit={vi.fn()} />
  );
  try {
    expect(privateView.container.textContent).toContain("Private");
  } finally {
    privateView.cleanup();
  }

  const passwordView = mount(
    <EntryGrid
      entries={[makeEntry({ visibility: "password", hasPassword: true })]}
      onEdit={vi.fn()}
    />
  );
  try {
    expect(passwordView.container.textContent).toContain("Password");
  } finally {
    passwordView.cleanup();
  }
});

test("EntryFilters list/grid toggle fires onViewChange in both directions", () => {
  const onViewChange = vi.fn();
  const filtersProps = {
    search: "",
    typeValue: "all",
    typeOptions: [{ value: "all", label: "All" }],
    author: "any",
    authorOptions: [{ value: "any", label: "Any" }],
    updatedFrom: "",
    updatedTo: "",
    advancedOpen: false,
    onViewChange,
    onSearchChange: vi.fn(),
    onTypeChange: vi.fn(),
    onAuthorChange: vi.fn(),
    onUpdatedFromChange: vi.fn(),
    onUpdatedToChange: vi.fn(),
    onAdvancedOpenChange: vi.fn(),
    onClear: vi.fn(),
  };

  const listView = mount(<EntryFilters {...filtersProps} view="list" />);
  try {
    const gridButton = listView.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Grid view"]'
    );
    const listButton = listView.container.querySelector<HTMLButtonElement>(
      'button[aria-label="List view"]'
    );
    expect(gridButton).not.toBeNull();
    expect(listButton).not.toBeNull();
    // aria-pressed reflects the active view (visible-effect assertion, not mere presence).
    expect(listButton?.getAttribute("aria-pressed")).toBe("true");
    expect(gridButton?.getAttribute("aria-pressed")).toBe("false");
    act(() => {
      gridButton?.click();
    });
    expect(onViewChange).toHaveBeenCalledWith("grid");
  } finally {
    listView.cleanup();
  }

  const gridView = mount(<EntryFilters {...filtersProps} view="grid" />);
  try {
    const listButton = gridView.container.querySelector<HTMLButtonElement>(
      'button[aria-label="List view"]'
    );
    expect(listButton?.getAttribute("aria-pressed")).toBe("false");
    act(() => {
      listButton?.click();
    });
    expect(onViewChange).toHaveBeenCalledWith("list");
  } finally {
    gridView.cleanup();
  }
});

test("EntryFilters advanced panel fires updated-from and updated-to changes", () => {
  const onUpdatedFromChange = vi.fn();
  const onUpdatedToChange = vi.fn();
  const filtersProps = {
    search: "",
    typeValue: "all",
    typeOptions: [{ value: "all", label: "All" }],
    author: "any",
    authorOptions: [{ value: "any", label: "Any" }],
    updatedFrom: "",
    updatedTo: "",
    advancedOpen: true,
    view: "list" as const,
    onViewChange: vi.fn(),
    onSearchChange: vi.fn(),
    onTypeChange: vi.fn(),
    onAuthorChange: vi.fn(),
    onUpdatedFromChange,
    onUpdatedToChange,
    onAdvancedOpenChange: vi.fn(),
    onClear: vi.fn(),
  };

  const view = mount(<EntryFilters {...filtersProps} />);
  try {
    const fromInput = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Updated from"]'
    );
    const toInput = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Updated to"]'
    );
    expect(fromInput).not.toBeNull();
    expect(toInput).not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    act(() => {
      setter?.call(fromInput, "2026-03-01");
      fromInput?.dispatchEvent(new Event("input", { bubbles: true }));
      fromInput?.dispatchEvent(new Event("change", { bubbles: true }));
      setter?.call(toInput, "2026-03-31");
      toInput?.dispatchEvent(new Event("input", { bubbles: true }));
      toInput?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onUpdatedFromChange).toHaveBeenCalledWith("2026-03-01");
    expect(onUpdatedToChange).toHaveBeenCalledWith("2026-03-31");
  } finally {
    view.cleanup();
  }
});

test("EntryGrid formatDate falls back to the raw value when toLocaleDateString throws", () => {
  const spy = vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementation(() => {
    throw new Error("boom");
  });
  try {
    const view = mount(
      <EntryGrid
        entries={[makeEntry({ updatedAt: "2026-03-06T12:00:00.000Z" })]}
        onEdit={vi.fn()}
      />
    );
    try {
      expect(view.container.textContent).toContain("2026-03-06T12:00:00.000Z");
    } finally {
      view.cleanup();
    }
  } finally {
    spy.mockRestore();
  }
});
