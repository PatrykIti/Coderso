import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormBuilderPage } from "../../../core/admin/ui/forms/FormBuilderPage";

test("FormBuilderPage renders form builder layout", () => {
  const html = renderToString(<FormBuilderPage />);

  expect(html).toContain("Contact Support Form");
  expect(html).toContain("Fields Library");
  expect(html).toContain("Field Settings");
  expect(html).toContain("Submit Message");
});
