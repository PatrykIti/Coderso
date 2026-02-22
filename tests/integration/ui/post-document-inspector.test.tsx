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
  expect(html).toContain("Title, URL and excerpt");
  expect(html).toContain("Featured image");
  expect(html).toContain("Taxonomy and tags");
  expect(html).toContain("SEO summary");
  expect(html).toContain("SEO fields completed");
  expect(html).toContain("Post title");
  expect(html).toContain("Slug");
});
