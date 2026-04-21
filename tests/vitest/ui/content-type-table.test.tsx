import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { ContentTypeTable } from "../../../core/admin/ui/content-types/ContentTypeTable";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const row = {
  id: "type-1",
  name: "Blog",
  slug: "blog",
  schema: {},
  createdAt: "2026-02-14T00:00:00.000Z",
  updatedAt: "2026-02-14T00:00:00.000Z",
  fieldCount: 3,
  status: "published" as const,
};

test("ContentTypeTable renders name as edit link", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/coderso/engine">
      <AdminBasePathProvider value="/admin">
        <ContentTypeTable rows={[row] as unknown as Parameters<typeof ContentTypeTable>[0]["rows"]} basePath="/admin" />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Edit content type: Blog");
  expect(html).toContain("/admin/coderso/engine/type-1");
});
