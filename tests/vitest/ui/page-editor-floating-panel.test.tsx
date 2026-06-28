import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";

// TASK-479-08-L02/L03: lock the floating-panel control model for the page
// builder. The SSR `renderAdminUi` harness renders a single default-open
// snapshot, so this asserts the default structure (the show/hide toggle + the
// preserved canvas hooks) rather than driving the open→closed interaction,
// which the page-editor-v2-flow suite covers with a state-capable renderer.

test("Page editor exposes the floating control-panel show/hide toggle", () => {
  const html = renderAdminUi(<PageEditorPage />);

  // The single dockable control panel is shown by default; its chrome toggle is
  // present and reflects the open state via aria.
  expect(html).toContain('aria-label="Hide panel"');
  expect(html).toContain('aria-pressed="true"');
});

test("Page builder does not use the legacy EditorShell side rails as the control home", () => {
  const html = renderAdminUi(<PageEditorPage />);

  // The floating panel is the sole control surface — no permanent left/right
  // side rails are mounted for the page builder.
  expect(html).not.toContain("data-editor-shell-left-panel");
  expect(html).not.toContain("data-editor-shell-right-panel");
});

test("Page editor keeps the canvas data-* hooks intact under the restyle", () => {
  const html = renderAdminUi(<PageEditorPage />);

  expect(html).toContain('data-page-editor-canvas-scroller="true"');
  expect(html).toContain('data-page-editor-canvas-frame="true"');
  expect(html).toContain('data-page-editor-canvas-device="desktop"');
});
