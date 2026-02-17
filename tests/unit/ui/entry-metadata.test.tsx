import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { EntryMetadataPanel } from "../../../core/admin/ui/entries/EntryMetadataPanel";

test("EntryMetadataPanel renders author and taxonomy selections", () => {
  const html = renderAdminUi(
    <EntryMetadataPanel
      status="draft"
      onStatusChange={() => undefined}
      scheduledAt=""
      onScheduledAtChange={() => undefined}
      title="Hello"
      slug="hello"
      seoDescription="Meta description"
      onSeoDescriptionChange={() => undefined}
      taxonomy={{
        categoryEnabled: true,
        tagEnabled: true,
        selectedCategoryId: "cat-1",
        selectedTagIds: ["tag-1"],
        categories: [{ id: "cat-1", name: "News", slug: "news" }],
        tags: [{ id: "tag-1", name: "Launch", slug: "launch" }],
      }}
      onCategoryChange={() => undefined}
      onTagIdsChange={() => undefined}
      author={{ name: "Alex Doe", email: "alex@example.com" }}
      onSave={() => undefined}
      isSaving={false}
    />
  );

  expect(html).toContain("Alex Doe");
  expect(html).toContain("News");
  expect(html).toContain("Launch");
  expect(html).toContain("Save metadata");
});
