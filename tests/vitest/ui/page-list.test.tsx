import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageListPage } from "../../../core/admin/ui/pages/PageListPage";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

test("PageListPage renders header and table", () => {
  const html = renderAdminUi(<PageListPage />);

  expect(html).toContain("Pages");
  expect(html).toContain("New");
  expect(html).toContain("Loading pages");
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
