import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";

test("TwoFactorPage renders headings", () => {
  const html = renderAdminUi(<TwoFactorPage />);

  expect(html).toContain("Two-factor authentication");
  expect(html).toContain("Verify &amp; Enable");
});
