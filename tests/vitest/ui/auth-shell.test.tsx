import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AuthShell } from "../../../core/admin/ui/layouts/AuthShell";

test("AuthShell renders centered chrome + content", () => {
  const html = renderAdminUi(
    <AuthShell>
      <div>Content</div>
    </AuthShell>
  );

  expect(html).toContain("Content");
  // logo/product heading in the centered (default) layout
  expect(html).toContain("Coderso");
});

test("AuthShell still renders a brand split panel when passed (back-compat)", () => {
  const html = renderAdminUi(
    <AuthShell brand={<div>Brand</div>}>
      <div>Content</div>
    </AuthShell>
  );

  expect(html).toContain("Brand");
  expect(html).toContain("Content");
});
