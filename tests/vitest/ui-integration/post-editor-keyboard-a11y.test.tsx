import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import type { DocumentInspectorProps } from "../../../core/admin/ui/posts/editor/inspector/DocumentInspector";
import { PostDetailsSidebar } from "../../../core/admin/ui/posts/editor/inspector/PostDetailsSidebar";
import { PostEditorHeader } from "../../../core/admin/ui/posts/editor/header/PostEditorHeader";
import { PostEditorLayout } from "../../../core/admin/ui/posts/editor/layout/PostEditorLayout";
import { PostInserterSidebar } from "../../../core/admin/ui/posts/editor/sidebars/PostInserterSidebar";
import { PostListViewSidebar } from "../../../core/admin/ui/posts/editor/sidebars/PostListViewSidebar";
import { renderAdminUi } from "../../utils/adminRouterRender";

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

test("PostEditorHeader exposes shortcuts and sidebar controls", () => {
  const html = renderToString(
    <PostEditorHeader
      title="Test"
      status="draft"
      dirty={false}
      saving={false}
      lastSavedAt="2026-02-25T10:00:00.000Z"
      onClose={() => undefined}
      outlineVisible={false}
      onToggleOutline={() => undefined}
      onToggleDetails={() => undefined}
      detailsOpen={false}
      onOpenRevisions={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onToggleInserter={() => undefined}
      inserterVisible={false}
      onToggleFocusMode={() => undefined}
      focusMode={false}
      onOpenSettings={() => undefined}
    />
  );

  expect(html).toContain("data-post-editor-shortcut=\"Mod+Shift+I\"");
  expect(html).toContain("data-post-editor-shortcut=\"Mod+Shift+O\"");
  expect(html).toContain("data-post-editor-shortcut=\"Mod+Shift+D\"");
  expect(html).toContain("aria-controls=\"post-editor-block-inserter\"");
  expect(html).toContain("aria-controls=\"post-editor-document-overview\"");
  expect(html).toContain("aria-controls=\"post-editor-details\"");
});

test("post editor regions expose accessibility landmarks", () => {
  const html = renderAdminUi(
    <PostEditorLayout
      activeHref="/admin/posts"
      header={<div>Header</div>}
      content={<div>Canvas</div>}
      footer={<div>Footer</div>}
      secondarySidebar={
        <PostListViewSidebar
          document={{
            version: 1,
            meta: {},
            blocks: [
              {
                id: "block-1",
                type: "writing-canvas",
                attrs: {},
                content: {
                  version: 1,
                  nodes: [{ id: "node-1", type: "paragraph", text: "<p>Intro</p>" }],
                },
              },
            ],
          }}
          selectedBlockId="block-1"
          onSelectBlock={() => undefined}
          onMoveBlockToIndex={() => undefined}
          onInsertBlock={() => undefined}
        />
      }
      secondarySidebarOpen
      detailsSidebar={
        <PostDetailsSidebar
          activeTab="document"
          onTabChange={() => undefined}
          document={baseDocumentProps}
          block={null}
          onChangeBlockAttrs={() => undefined}
        />
      }
      detailsSidebarOpen
      viewportMode="desktop"
    />,
    { path: "/admin/coderso/posts/post-1" }
  );

  expect(html).toContain("aria-label=\"Post editor header\"");
  expect(html).toContain("aria-label=\"Post editor content\"");
  expect(html).toContain("aria-label=\"Post editor footer\"");
  expect(html).toContain("post-editor-document-overview");
  expect(html).toContain("post-editor-details");
});

test("PostInserterSidebar exposes a labeled region", () => {
  const html = renderToString(
    <PostInserterSidebar
      open
      onClose={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toContain("post-editor-block-inserter");
  expect(html).toContain("Block inserter");
});
