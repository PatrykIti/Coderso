import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminLink } from "../../../core/admin/ui/shared/AdminLink";

test("AdminLink renders canonical advanced href for legacy paths", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="/admin/content-types">Engine</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="/admin/advanced/engine"');
});

test("AdminLink keeps external href untouched", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="https://coderso.dev/docs">Docs</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain('href="https://coderso.dev/docs"');
});
