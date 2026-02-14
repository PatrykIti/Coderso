import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  clearWidgetTemplatesCache,
  primeWidgetTemplatesCache,
  useWidgetTemplates,
} from "../../../core/admin/ui/widgets/hooks/useWidgetTemplates";
import { normalizeWidgetTemplateSettings } from "../../../core/services/widgets/widgetTemplateSettings";

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
