import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";

test("PageEditorPage renders key panels", () => {
  const html = renderAdminUi(<PageEditorPage />);

  expect(html).toContain("Homepage");
  expect(html).toContain("Publish");
  expect(html).toContain("Add section");
  expect(html).toContain("Layers");
  expect(html).toContain("Page settings");
  expect(html).toContain("Preview");
  expect(html).not.toContain("Find components");
  expect(html).not.toContain("Hide library");
  expect(html).toContain('data-page-editor-canvas-scroller="true"');
  expect(html).toContain('data-page-editor-canvas-frame="true"');
  expect(html).toContain('data-page-editor-canvas-device="desktop"');
  expect(html).not.toContain("Runtime preview device");
  expect(html).toContain("History");
});
