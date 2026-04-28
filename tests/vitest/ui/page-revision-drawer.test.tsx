import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { PageRevisionDrawer } from "../../../core/admin/ui/pages/PageRevisionDrawer";

test("PageRevisionDrawer renders draft-version label and discard action", () => {
  const html = renderToString(
    <PageRevisionDrawer
      open
      onOpenChange={() => undefined}
      revisions={[
        {
          id: "rev-1",
          pageId: "page-1",
          version: 3,
          kind: "autosave",
          title: "Landing draft",
          slug: "/landing-draft",
          data: { blocks: [] },
          createdAt: "2026-03-06T12:00:00.000Z",
          createdBy: null,
        },
      ]}
      isLoading={false}
      error={null}
      onRestore={() => undefined}
      onDiscard={() => undefined}
    />
  );

  expect(html).toContain("Page history");
  expect(html).toContain("Restore published versions or manage the latest draft version.");
  expect(html).toContain("Draft version");
  expect(html).toContain("Draft");
  expect(html).toContain("Discard");
  expect(html).toContain("Restore");
  expect(html.toLowerCase()).not.toContain("autosave");
});
