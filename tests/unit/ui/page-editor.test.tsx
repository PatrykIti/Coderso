import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";

test("PageEditorPage renders key panels", () => {
  const html = renderAdminUi(<PageEditorPage />);

  expect(html).toContain("Homepage");
  expect(html).toContain("Publish");
  expect(html).toContain("Find components");
  expect(html).toContain("Templates");
  expect(html).toContain("Runtime preview device");
  expect(html).toContain("Runtime preview");
});
