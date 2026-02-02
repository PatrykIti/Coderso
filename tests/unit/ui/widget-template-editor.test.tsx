import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetTemplateEditorPage } from "../../../core/admin/ui/widgets/WidgetTemplateEditorPage";

test("WidgetTemplateEditorPage renders canvas placeholder", () => {
  const html = renderToString(<WidgetTemplateEditorPage />);

  expect(html).toContain("Build your template");
  expect(html).toContain("Save Template");
});
