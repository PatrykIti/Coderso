import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ContentTypeEditor } from "../../../core/admin/ui/content-types/ContentTypeEditor";
import { ContentTypeList } from "../../../core/admin/ui/content-types/ContentTypeList";

test("ContentTypeList renders table view", () => {
  const html = renderAdminUi(<ContentTypeList />);

  expect(html).toContain("Content Types");
  expect(html).toContain("New type");
});

test("ContentTypeEditor renders header actions", () => {
  const html = renderAdminUi(<ContentTypeEditor />);

  // Inline actions on the refactored PageHeader; Publish/Duplicate/Schema preview/
  // Collection workspace now live in the collapsed "More actions" menu.
  expect(html).toContain(">Save<");
  expect(html).toContain("Open schema");
  expect(html).toContain('aria-label="More actions"');
  expect(html).toContain("Define the fields and behavior");
});
