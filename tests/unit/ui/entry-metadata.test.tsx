import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { EntryMetadataPanel } from "../../../core/admin/ui/entries/EntryMetadataPanel";

test("EntryMetadataPanel renders author and tags", () => {
  const html = renderToString(
    <EntryMetadataPanel
      status="draft"
      onStatusChange={() => undefined}
      scheduledAt=""
      onScheduledAtChange={() => undefined}
      title="Hello"
      slug="hello"
      seoDescription="Meta description"
      onSeoDescriptionChange={() => undefined}
      tags={["alpha", "beta"]}
      onTagsChange={() => undefined}
      author={{ name: "Alex Doe", email: "alex@example.com" }}
      onSave={() => undefined}
      isSaving={false}
    />
  );

  expect(html).toContain("Alex Doe");
  expect(html).toContain("alpha");
  expect(html).toContain("beta");
  expect(html).toContain("Save metadata");
});
