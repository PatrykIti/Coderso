import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AuthShell } from "../../../core/admin/ui/layouts/AuthShell";

test("AuthShell renders brand and content", () => {
  const html = renderAdminUi(
    <AuthShell brand={<div>Brand</div>}>
      <div>Content</div>
    </AuthShell>
  );

  expect(html).toContain("Brand");
  expect(html).toContain("Content");
});
