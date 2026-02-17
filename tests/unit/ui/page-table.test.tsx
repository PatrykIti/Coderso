import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageTable } from "../../../core/admin/ui/pages/PageTable";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const page = {
  id: "page-1",
  title: "Home",
  slug: "/",
  status: "draft",
  updatedAt: "2026-02-14T00:00:00.000Z",
  author: null,
};

test("PageTable renders page title link", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/pages">
      <AdminBasePathProvider value="/admin">
        <PageTable
          items={[page]}
          onEdit={() => undefined}
          onPreview={() => undefined}
          onPublish={() => undefined}
          onUnpublish={() => undefined}
          onDuplicate={() => undefined}
          onDelete={() => undefined}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Edit page: Home");
  expect(html).toContain('href="/admin/pages/page-1"');
});
