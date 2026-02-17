import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DesignTokensPreview } from "../../../core/admin/ui/settings/DesignTokensPreview";

test("DesignTokensPreview renders tabs", () => {
  const html = renderAdminUi(<DesignTokensPreview />);

  expect(html).toContain("All Components");
  expect(html).toContain("Typography");
  expect(html).toContain("Buttons");
});
