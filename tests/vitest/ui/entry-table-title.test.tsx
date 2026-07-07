import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { EntryTable } from "../../../core/admin/ui/entries/EntryTable";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const entry = {
  id: "entry-1",
  typeId: "type-1",
  title: "Hello",
  slug: "hello",
  status: "draft" as const,
  visibility: "public" as const,
  hasPassword: false,
  data: {},
  createdAt: "2026-02-14T00:00:00.000Z",
  updatedAt: "2026-02-14T00:00:00.000Z",
  author: null,
  contentType: {
    id: "type-posts",
    slug: "posts",
    name: "Posts",
    status: "published",
  },
};

test("EntryTable renders entry title link from row content type", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/advanced/entries">
      <AdminBasePathProvider value="/admin">
        <EntryTable
          entries={[entry]}
          selectedIds={[]}
          onEdit={() => undefined}
          onToggleEntry={() => undefined}
          onToggleAll={() => undefined}
          onDelete={() => undefined}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Edit entry: Hello");
  expect(html).toContain('href="/admin/advanced/entries/posts/entry-1"');
});
