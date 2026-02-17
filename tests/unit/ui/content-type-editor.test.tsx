import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("ContentTypeEditor renders editor shell", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  expect(html).toContain("Content Type Editor");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
});
