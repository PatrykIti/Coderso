import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormBuilderPage } from "../../../core/admin/ui/forms/FormBuilderPage";

test("FormBuilderPage renders skeleton", () => {
  const html = renderToString(<FormBuilderPage />);
  expect(html).toContain("Forms");
  expect(html).toContain("Loading form builder");
});
