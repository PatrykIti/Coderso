import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import type { DocumentInspectorProps } from "../../../core/admin/ui/posts/editor/inspector/DocumentInspector";
import { PostDetailsSidebar } from "../../../core/admin/ui/posts/editor/inspector/PostDetailsSidebar";

const baseDocumentProps: DocumentInspectorProps = {
  title: "Post title",
  status: "draft",
  slug: "post-title",
  excerpt: "",
  featuredImage: "",
  tagsInput: "",
  categoryId: "",
  seo: {
    title: "",
    description: "",
    canonicalUrl: "",
    robots: "index,follow",
  },
  taxonomySummary: {
    categoryName: null,
    tagCount: 0,
  },
  updatedAt: null,
  scheduledAt: null,
  publishedAt: null,
  moveToTrashPending: false,
  onMoveToTrash: () => undefined,
  onTitleChange: () => undefined,
  onSlugChange: () => undefined,
  onExcerptChange: () => undefined,
  onFeaturedImageChange: () => undefined,
  onTagsInputChange: () => undefined,
  onCategoryIdChange: () => undefined,
  onSeoChange: () => undefined,
};

test("PostDetailsSidebar falls back to document tab when no block is selected", () => {
  const html = renderToString(
    <PostDetailsSidebar
      activeTab="block"
      onTabChange={() => undefined}
      document={baseDocumentProps}
      block={null}
      onChangeBlockAttrs={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-details-tab=\"document\"");
  expect(html).toContain("data-post-editor-details-tab-trigger=\"block\"");
});

test("PostDetailsSidebar honors block tab when selection is available", () => {
  const html = renderToString(
    <PostDetailsSidebar
      activeTab="block"
      onTabChange={() => undefined}
      document={baseDocumentProps}
      block={{
        id: "block-1",
        type: "paragraph",
        attrs: {},
        content: "<p>Intro</p>",
      }}
      onChangeBlockAttrs={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-details-tab=\"block\"");
});
