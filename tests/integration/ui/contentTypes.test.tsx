import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import { ContentTypeList } from "../../../core/admin/ui/content-types/ContentTypeList";

test("ContentTypeList renders table view", () => {
  const html = renderAdminUi(<ContentTypeList />);

  expect(html).toContain("Content Types");
  expect(html).toContain("New type");
});

test("ContentTypeEditor renders schema preview and actions", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  expect(html).toContain("Schema Preview");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
});
