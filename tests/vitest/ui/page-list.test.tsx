import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageListPage } from "../../../core/admin/ui/pages/PageListPage";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearPagesCache } from "../../../core/admin/services/pagesClient";

test("PageListPage renders header and table", () => {
  const html = renderAdminUi(<PageListPage />);

  expect(html).toContain("Pages");
  expect(html).toContain("Templates");
  expect(html).toContain("New");
  expect(html).toContain("Loading pages");
  expect(html).toContain('href="/admin/advanced/page-templates"');
  expect(html.indexOf("Templates")).toBeLessThan(html.indexOf("New"));
});

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("PageListPage renders restyled header, description, and real status tabs", () => {
  // TASK-479-08-L01/L03: the redesigned list adds a description line and the
  // shared StatusTabs over the REAL PageStatus enum (no prototype "Trash"/
  // "Review", which are not in core). These render even while loading.
  const html = renderAdminUi(<PageListPage />);

  expect(html).toContain("Create, organize, and publish the pages of your site.");
  expect(html).toContain("All");
  expect(html).toContain("Published");
  expect(html).toContain("Drafts");
  expect(html).toContain("Scheduled");
  expect(html).toContain("Archived");
  // The dropped prototype statuses must not appear as tabs.
  expect(html).not.toContain("Trash");
  expect(html).not.toContain("Review");
});

test("PageListPage cached render shows columns, StatusBadge, and de-fabricated Views", () => {
  // TASK-479-08-L03: with a seeded cache the DataTable renders, so the new
  // column headers (Title/Status/Author/Updated/Views), the StatusBadge, and
  // the em-dash Views (no fabricated metric) are present without "Loading".
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  // pagesListCache is memory-backed; clear it so this seeded render neither
  // inherits nor leaks state into the other cached-render tests in this file.
  clearPagesCache();

  try {
    storage.setItem(
      cacheKeys.pagesList,
      JSON.stringify({
        value: [
          {
            id: "page-9",
            title: "Launch Page",
            slug: "/launch",
            status: "published",
            updatedAt: "2026-04-01T00:00:00.000Z",
            author: { id: "a1", name: "Ada Lovelace", email: "ada@example.com" },
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<PageListPage />);
    expect(html).not.toContain("Loading pages");
    expect(html).toContain("Launch Page");
    // New column headers.
    expect(html).toContain("Title");
    expect(html).toContain("Status");
    expect(html).toContain("Author");
    expect(html).toContain("Updated");
    expect(html).toContain("Views");
    // StatusBadge for the seeded page (raw status text rendered).
    expect(html).toContain("published");
    // Views is de-fabricated to an em-dash (PageSummary has no view count).
    expect(html).toContain("—");
  } finally {
    clearPagesCache();
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("PageListPage renders cached pages without loading", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.pagesList,
      JSON.stringify({
        value: [
          {
            id: "page-1",
            title: "Cached Page",
            slug: "/cached",
            status: "draft",
            updatedAt: "2026-02-15T00:00:00.000Z",
            author: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<PageListPage />);
    expect(html).toContain("Cached Page");
    expect(html).not.toContain("Loading pages");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
