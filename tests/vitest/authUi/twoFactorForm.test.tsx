import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";

test("TwoFactorPage renders error state", () => {
  const html = renderToString(
    <TwoFactorPage initialError="Invalid verification code" />
  );

  expect(html).toContain("Invalid verification code");
  expect(html).toContain("Verify &amp; Enable");
});
