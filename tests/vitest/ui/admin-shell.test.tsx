// SSR-path smoke (no window): verifies the no-js render path only. Behavior coverage
// for AdminShell navigation lives in admin-shell-nav.test.tsx. See TASK-105-08-09
// ownership notes.
import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { AdminShell } from "../../../core/admin/ui/layouts/AdminShell";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("AdminShell renders navigation", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/advanced/entries">
      <AdminBasePathProvider value="/admin">
        <AdminShell activeHref="/admin/advanced/entries">
          <div>Content</div>
        </AdminShell>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Dashboard");
  expect(html).toContain("Coderso");
  expect(html).toContain("Content");
});
