import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DesignTokensPreview } from "../../../core/admin/ui/settings/DesignTokensPreview";

test("DesignTokensPreview renders tabs", () => {
  const html = renderAdminUi(<DesignTokensPreview />);

  expect(html).toContain("All Components");
  expect(html).toContain("Typography");
  expect(html).toContain("Buttons");
});
