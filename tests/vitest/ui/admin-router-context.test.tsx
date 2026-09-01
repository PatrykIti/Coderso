import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";

const Probe = () => {
  const router = useAdminRouter();
  return <span>{router.path}</span>;
};

test("useAdminRouter throws when provider is missing", () => {
  expect(() => renderToString(<Probe />)).toThrow("AdminRouterContext is missing");
});

test("useAdminRouter resolves provider path when context exists", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/advanced/forms">
      <Probe />
    </AdminRouterProvider>
  );
  expect(html).toContain("/admin/advanced/forms");
});

test("useAdminRouter falls back to DEFAULT_ADMIN_PATH without initialPath and no window", () => {
  // Node env has no `window`, so resolveInitialPath must take the SSR branch
  // and return DEFAULT_ADMIN_PATH rather than reading window.location.
  const html = renderToString(
    <AdminRouterProvider>
      <Probe />
    </AdminRouterProvider>
  );
  expect(html).toContain("/admin");
});
