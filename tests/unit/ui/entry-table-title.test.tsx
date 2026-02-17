import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryTable } from "../../../core/admin/ui/entries/EntryTable";
import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

const entry = {
  id: "entry-1",
  title: "Hello",
  slug: "hello",
  status: "draft",
  updatedAt: "2026-02-14T00:00:00.000Z",
  author: null,
};

test("EntryTable renders entry title link when entryTypeSlug provided", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/coderso/entries">
      <AdminBasePathProvider value="/admin">
        <EntryTable
          entries={[entry]}
          selectedIds={[]}
          onEdit={() => undefined}
          onToggleEntry={() => undefined}
          onToggleAll={() => undefined}
          onDelete={() => undefined}
          entryTypeSlug="posts"
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Edit entry: Hello");
  expect(html).toContain('href="/admin/coderso/entries/posts/entry-1"');
});
