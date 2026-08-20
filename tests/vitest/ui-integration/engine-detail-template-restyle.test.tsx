import React from "react";
import { expect, test } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { DetailTemplateEditorPage } from "../../../core/admin/ui/content-types/DetailTemplateEditorPage";

test("detail template editor renders restyled editor chrome", () => {
  const html = renderAdminUi(<DetailTemplateEditorPage />, {
    path: "/admin/advanced/engine/sample/collection/detail-template/1",
  });

  // Editor toolbar actions are preserved.
  expect(html).toContain("Save draft");
  expect(html).toContain("Preview");
  expect(html).toContain("Publish");
  expect(html).toContain("History");
  expect(html).toContain("Autosave");

  // Existing details Tabs (Template / Data / Block) survive the restyle.
  for (const label of ["Template", "Data", "Block"]) {
    expect(html).toContain(label);
  }

  // Editor shell region markers and the page-builder body still render.
  expect(html).toContain("data-editor-shell-center");
  expect(html).toContain("data-editor-shell-right-panel");
  expect(html).toContain("Loading detail template");

  // Token-driven status badge replaces the previous raw-palette pills.
  expect(html).toContain("Draft");
  expect(html).not.toContain("bg-rose-100");
  expect(html).not.toContain("bg-amber-100");
  expect(html).not.toContain("bg-emerald-500/10");
});
