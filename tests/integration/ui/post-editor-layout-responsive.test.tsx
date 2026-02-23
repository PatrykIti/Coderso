import { expect, test } from "bun:test";

import { PostEditorLayout } from "../../../core/admin/ui/posts/editor/layout/PostEditorLayout";
import { renderAdminUi } from "../../utils/adminRouterRender";

test("PostEditorLayout renders desktop sidebars in-region", () => {
  const html = renderAdminUi(
    <PostEditorLayout
      activeHref="/admin/posts"
      breadcrumbs={<span>Breadcrumbs</span>}
      header={<div>Header</div>}
      content={<div>Canvas</div>}
      footer={<div>Footer</div>}
      secondarySidebar={<div>Secondary panel</div>}
      secondarySidebarOpen
      detailsSidebar={<div>Details panel</div>}
      detailsSidebarOpen
      viewportMode="desktop"
    />,
    { path: "/admin/coderso/posts/post-1" }
  );

  expect(html).toContain("data-post-editor-region=\"secondary-sidebar\"");
  expect(html).toContain("data-post-editor-region=\"sidebar\"");
  expect(html).toContain("Secondary panel");
  expect(html).toContain("Details panel");
});

test("PostEditorLayout renders sidebars as sheets on mobile", () => {
  const html = renderAdminUi(
    <PostEditorLayout
      activeHref="/admin/posts"
      content={<div>Canvas</div>}
      secondarySidebar={<div>Secondary panel</div>}
      secondarySidebarOpen
      detailsSidebar={<div>Details panel</div>}
      detailsSidebarOpen
      viewportMode="mobile"
    />,
    { path: "/admin/coderso/posts/post-1" }
  );

  expect(html).not.toContain("data-post-editor-region=\"secondary-sidebar\"");
  expect(html).not.toContain("data-post-editor-region=\"sidebar\"");
  expect(html).toContain("Editor panel");
  expect(html).toContain("Details");
});
