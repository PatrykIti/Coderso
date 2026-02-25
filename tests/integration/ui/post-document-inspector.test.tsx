import { expect, test } from "bun:test";
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

  expect(html).toContain("Publishing");
  expect(html).toContain("Categories and tags");
  expect(html).toContain("Featured image");
  expect(html).toContain("Danger zone");
  expect(html).toContain("Move to trash");
  expect(html).toContain("Advanced");
  expect(html).toContain("Current category");
  expect(html).toContain("Last updated");
});
