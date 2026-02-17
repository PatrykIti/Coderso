import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminLink } from "../../../core/admin/ui/shared/AdminLink";

test("AdminLink renders canonical coderso href for legacy paths", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="/admin/content-types">Engine</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("href=\"/admin/coderso/engine\"");
});

test("AdminLink keeps external href untouched", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin">
      <AdminBasePathProvider value="/admin">
        <AdminLink href="https://nextless.dev/docs">Docs</AdminLink>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("href=\"https://nextless.dev/docs\"");
});
