import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { ToolbarIconButton } from "../../../core/admin/ui/pages/editor/FloatingEditorToolbar";

test("ToolbarIconButton preserves accessible name, active state, and panel metadata", () => {
  const html = renderToStaticMarkup(
    <ToolbarIconButton
      tooltip={{ label: "Layout panel", description: "Layout description" }}
      active
      expanded
      panelId="layout"
    >
      <span>Icon</span>
    </ToolbarIconButton>
  );

  expect(html).toContain('aria-label="Layout panel"');
  expect(html).toContain('aria-expanded="true"');
  expect(html).toContain('data-page-editor-toolbar-icon="layout"');
  expect(html).toContain("bg-white/15");
  expect(html).toContain("Icon");
});
