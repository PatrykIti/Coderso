import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemeTemplateDrawer } from "../../../core/admin/ui/themes/ThemeTemplateDrawer";

test("ThemeTemplateDrawer renders create form", () => {
  const html = renderToString(
    <ThemeTemplateDrawer open onOpenChange={() => undefined} />
  );

  expect(html).toContain("New Theme Template");
  expect(html).toContain("Theme tokens");
  expect(html).toContain("Base");
  expect(html).toContain("Typography");
  expect(html).toContain("Buttons");
  expect(html).toContain("Create Template");
});
