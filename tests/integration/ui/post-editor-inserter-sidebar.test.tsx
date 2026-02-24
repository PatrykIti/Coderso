import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PostInserterSidebar } from "../../../core/admin/ui/posts/editor/sidebars/PostInserterSidebar";

test("PostInserterSidebar renders dialog shell and block library actions", () => {
  const html = renderToString(
    <PostInserterSidebar
      open
      onClose={() => undefined}
      onInsertBlock={() => undefined}
      recentlyUsedTypes={["heading", "image"]}
    />
  );

  expect(html).toContain("data-post-editor-sidebar=\"inserter\"");
  expect(html).toContain("aria-label=\"Block inserter sidebar\"");
  expect(html).toContain("Close block inserter");
  expect(html).toContain("Search blocks...");
  expect(html).toContain("Most used");
  expect(html).toContain("All");
});

test("PostInserterSidebar returns null when closed", () => {
  const html = renderToString(
    <PostInserterSidebar
      open={false}
      onClose={() => undefined}
      onInsertBlock={() => undefined}
    />
  );

  expect(html).toBe("");
});
