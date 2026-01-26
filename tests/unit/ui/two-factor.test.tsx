import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";

test("TwoFactorPage renders headings", () => {
  const html = renderToString(<TwoFactorPage />);

  expect(html).toContain("Two-factor authentication");
  expect(html).toContain("Verify &amp; Enable");
});
