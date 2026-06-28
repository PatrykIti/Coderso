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

test("PageEditorPage renders restyled chrome with status badge and panel toggle", () => {
  // TASK-479-08-L02/L03: the editor chrome adopts the shared StatusBadge and a
  // floating-panel show/hide toggle (panelOpen lazy-init true → "Hide panel").
  const html = renderAdminUi(<PageEditorPage />);

  // Shared StatusBadge chrome (data-slot is stable; Tailwind classes are not).
  expect(html).toContain('data-slot="badge"');
  // The sole-control-surface show/hide toggle, open by default.
  expect(html).toContain('aria-label="Hide panel"');
  expect(html).toContain('aria-pressed="true"');
  // Canvas data-* hooks remain intact after the restyle.
  expect(html).toContain('data-page-editor-canvas-frame="true"');
  expect(html).toContain('data-page-editor-canvas-scroller="true"');
});
