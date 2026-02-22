import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";

test("ContentTypeEditor renders editor shell", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  expect(html).toContain("Content Type Editor");
  expect(html).toContain("Save draft");
  expect(html).toContain("Publish");
  expect(html).toContain("sticky top-0 z-10 border-b bg-background/80 px-6 py-3 backdrop-blur");
  expect(html).toContain("flex flex-col gap-6 px-6 py-6");
  expect(html).not.toContain("overflow-y-auto overscroll-contain");
});
