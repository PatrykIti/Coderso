import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { applyWidgetPreviewStateUpdate } from "../../../core/admin/ui/pages/PageEditor";
import { PageEditorPage } from "../../../core/admin/ui/pages/PageEditorPage";

test("PageEditorPage renders key panels", () => {
  const html = renderAdminUi(<PageEditorPage />);

  expect(html).toContain("Homepage");
  expect(html).toContain("Publish");
  expect(html).toContain("Find components");
  expect(html).toContain("Templates");
  expect(html).toContain("Preview");
  expect(html).toContain("Hide library");
  expect(html).toContain('data-page-editor-canvas-scroller="true"');
  expect(html).not.toContain("Runtime preview device");
  expect(html).toContain("History");
  expect(html).toMatch(/data-slot="tabs"[^>]*class="[^"]*min-h-0[^"]*overflow-hidden[^"]*"/);
  expect(html).toMatch(
    /data-slot="tabs-content"[^>]*class="[^"]*min-h-0[^"]*flex-1[^"]*overflow-hidden[^"]*"/
  );
  expect(html).toMatch(/data-slot="scroll-area"[^>]*class="[^"]*min-h-0[^"]*flex-1[^"]*p-4[^"]*"/);
});

test("widget preview state updates are idempotent for empty and repeated states", () => {
  const empty = {};
  expect(applyWidgetPreviewStateUpdate(empty, "block-1", null)).toBe(empty);

  const readyState = {
    status: "ready" as const,
    dataPatch: { resolved: { total: 1 } },
    requestKey: "products:1",
  };
  const withState = applyWidgetPreviewStateUpdate(empty, "block-1", readyState);
  expect(withState).toEqual({ "block-1": readyState });
  expect(applyWidgetPreviewStateUpdate(withState, "block-1", readyState)).toBe(withState);

  const cleared = applyWidgetPreviewStateUpdate(withState, "block-1", null);
  expect(cleared).toEqual({});
});
