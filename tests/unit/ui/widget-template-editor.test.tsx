import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetTemplateEditorPage } from "../../../core/admin/ui/widgets/WidgetTemplateEditorPage";

test("WidgetTemplateEditorPage renders canvas placeholder", () => {
  const html = renderToString(<WidgetTemplateEditorPage />);

  expect(html).toContain("Build your template");
  expect(html).toContain("Save Template");
  expect(html).toContain("Template Details");
  expect(html).toMatch(
    /<div(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*border-b border-border bg-card px-6 py-4)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-72 min-h-0 flex-col border-r border-border bg-card lg:flex)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-80 min-h-0 flex-col border-l border-border bg-card lg:flex)[^>]*>/
  );
});
