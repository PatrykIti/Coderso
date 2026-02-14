import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  clearWidgetTemplatesCache,
  primeWidgetTemplatesCache,
  useWidgetTemplates,
} from "../../../core/admin/ui/widgets/hooks/useWidgetTemplates";
import { normalizeWidgetTemplateSettings } from "../../../core/services/widgets/widgetTemplateSettings";

const createSessionStorage = () => {
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
  primeWidgetTemplatesCache([
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
  ]);

  const html = renderToString(<TemplateCount />);
  expect(html).toContain("count:1");
});

test("useWidgetTemplates reads from session cache", () => {
  const originalSession = (globalThis as { sessionStorage?: unknown }).sessionStorage;
  const storage = createSessionStorage();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = storage as unknown;

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
      "nextless.widgetTemplatesCache",
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const html = renderToString(<TemplateCount />);
    expect(html).toContain("count:1");
  } finally {
    if (originalSession === undefined) {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    } else {
      (globalThis as { sessionStorage?: unknown }).sessionStorage = originalSession;
    }
    clearWidgetTemplatesCache();
  }
});
