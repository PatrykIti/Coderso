import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { DocumentInspector } from "../../../core/admin/ui/posts/editor/inspector/DocumentInspector";

test("DocumentInspector renders user-friendly document controls", () => {
  const html = renderToString(
    <DocumentInspector
      title="Hello world"
      status="draft"
      slug="hello-world"
      excerpt="Sample excerpt"
      featuredImage="media-123"
      tagsInput="news, release"
      categoryId="category-1"
      seo={{
        title: "SEO title",
        description: "SEO description",
        canonicalUrl: "https://example.com/hello-world",
        robots: "index,follow",
      }}
      taxonomySummary={{ categoryName: "Announcements", tagCount: 2 }}
      updatedAt="2026-02-25T10:00:00.000Z"
      scheduledAt={null}
      publishedAt={null}
      moveToTrashPending={false}
      onMoveToTrash={() => undefined}
      onTitleChange={() => undefined}
      onSlugChange={() => undefined}
      onExcerptChange={() => undefined}
      onFeaturedImageChange={() => undefined}
      onTagsInputChange={() => undefined}
      onCategoryIdChange={() => undefined}
      onSeoChange={() => undefined}
    />
  );

  // TASK-497-02 (B7): the heavy InspectorSection cards ("Publishing" / "Categories and
  // tags" / "Advanced" / "Current category") are flattened to the "Post settings" header
  // + light InspectorRow labels. Re-point the dropped chrome strings to the kept flat
  // labels; the kept controls below (Featured image / Danger zone / Move to trash / Last
  // updated) are unchanged.
  expect(html).toContain("Post settings");
  expect(html).toContain("Status");
  expect(html).toContain("Category");
  expect(html).toContain("Slug");
  expect(html).toContain("Featured image");
  expect(html).toContain("Danger zone");
  expect(html).toContain("Move to trash");
  expect(html).toContain("Last updated");
});
