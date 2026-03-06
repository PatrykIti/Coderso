import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminLink } from "../../../core/admin/ui/shared/AdminLink";

test("AdminLink resolves admin base path", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/panel/pages">
      <AdminBasePathProvider value="/panel">
        <AdminLink href="/pages">Pages</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="/panel/pages"');
});

test("AdminLink preserves external href", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="https://example.com">External</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="https://example.com"');
});
