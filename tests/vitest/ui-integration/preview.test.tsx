import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { UiPreview } from "../../../core/admin/ui/debug/UiPreview";

test("UiPreview renders", () => {
  const html = renderAdminUi(<UiPreview />);
  expect(html).toContain("UI Preview");
});
