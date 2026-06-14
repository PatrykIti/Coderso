import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

test("PageEditor renders a region-owned canvas workspace shell", () => {
  const html = renderAdminUi(<PageEditor />);

  expect(html).not.toContain('data-editor-shell-left-panel="true"');
  expect(html).toContain('data-editor-shell-center="true"');
  expect(html).not.toContain('data-editor-shell-right-panel="true"');
  expect(html).not.toContain("Hide library");
  expect(html).not.toContain("Hide details");
  expect(html).toContain("Layers");
  expect(html).toContain("Page settings");
  expect(html).toMatch(
    /class="[^"]*min-h-0[^"]*flex-1[^"]*overflow-auto[^"]*overscroll-contain[^"]*"[^>]*data-page-editor-canvas-scroller="true"/
  );
  expect(html).toMatch(
    /data-page-editor-canvas-frame="true"[^>]*data-page-editor-canvas-device="desktop"|data-page-editor-canvas-device="desktop"[^>]*data-page-editor-canvas-frame="true"/
  );
  expect(html).toContain("max-w-[1080px]");
});
