import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

test("PageEditor renders builder UI", () => {
  const html = renderAdminUi(<PageEditor />);

  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("Hero Content");
  expect(html).toContain("Page settings");
  expect(html).toContain("Runtime preview");
});
