import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";

test("TwoFactorPage renders centered card + OTP cells", () => {
  const html = renderAdminUi(<TwoFactorPage />);

  expect(html).toContain("Two-factor authentication");
  // segmented OTP — 6 cells from OtpInput
  expect((html.match(/data-slot="input"/g) ?? []).length).toBeGreaterThanOrEqual(6);
  // preserved button copy (also asserted by authUi/twoFactorForm.test.tsx)
  expect(html).toContain("Verify &amp; Enable");
});
