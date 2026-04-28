import React from "react";
import { afterEach, expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import {
  useWidgetTemplates,
} from "../../../core/admin/ui/widgets/hooks/useWidgetTemplates";
import { clearWidgetTemplatesCache } from "../../../core/admin/services/widgetTemplatesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { normalizeWidgetTemplateSettings } from "../../../core/services/widgets/widgetTemplateSettings";

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

function TemplateCount() {
  const { items, isLoading } = useWidgetTemplates();
  return <div>{isLoading ? "loading" : `count:${items.length}`}</div>;
}

afterEach(() => {
  clearWidgetTemplatesCache();
});

test("useWidgetTemplates returns cached items when primed", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const cached = [
    {
      id: "tmpl-1",
      name: "Main Footer",
      description: null,
      category: "layout",
      status: "draft",
      blocks: [],
      settings: normalizeWidgetTemplateSettings(undefined),
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
    },
  ];
  storage.setItem(
    cacheKeys.widgetTemplatesList,
    JSON.stringify({ value: cached, savedAt: Date.now() })
  );

  const html = renderAdminUi(<TemplateCount />);
  expect(html).toContain("count:1");

  if (originalLocal === undefined) {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  } else {
    (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
  }
});

test("useWidgetTemplates reads from local cache", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    clearWidgetTemplatesCache();
    const cached = [
      {
        id: "tmpl-2",
        name: "Header",
        description: null,
        category: "layout",
        status: "draft",
        blocks: [],
        settings: normalizeWidgetTemplateSettings(undefined),
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.widgetTemplatesList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const html = renderAdminUi(<TemplateCount />);
    expect(html).toContain("count:1");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearWidgetTemplatesCache();
  }
});
