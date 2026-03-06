import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PagePreview } from "../../../core/admin/ui/pages/PagePreview";

test("PagePreview renders placeholder copy", () => {
  const html = renderAdminUi(<PagePreview />);

  expect(html).toContain("Preview Mode");
  expect(html).toContain("Preview link details");
});
