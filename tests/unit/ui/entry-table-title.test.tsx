import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryTable } from "../../../core/admin/ui/entries/EntryTable";

const entry = {
  id: "entry-1",
  title: "Hello",
  slug: "hello",
  status: "draft",
  updatedAt: "2026-02-14T00:00:00.000Z",
  author: null,
};

test("EntryTable renders entry title as edit button when onEdit provided", () => {
  const html = renderToString(
    <EntryTable
      entries={[entry]}
      selectedIds={[]}
      onEdit={() => undefined}
      onToggleEntry={() => undefined}
      onToggleAll={() => undefined}
      onDelete={() => undefined}
      contentTypeLabel="Posts"
    />
  );

  expect(html).toContain("Edit entry: Hello");
  expect(html).toContain(">Hello<");
});
