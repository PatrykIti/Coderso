import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PageEditor, type PageEditorHost } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail } from "../../../core/admin/services/pagesClient";

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

// TASK-496-01: Pages AND Page Templates render through the ONE shared
// `CanvasEditor` editor-chrome shell (one shell, two resources) — both surface
// the in-content "Page builder" sub-toolbar inside the separated card. The menu
// (legacy) host does NOT (covered by menu-design-editor-flow's flat-body guard).
const templateDetail: PageDetail = {
  id: "tpl-1",
  title: "Footer template",
  slug: "footer-template",
  status: "draft",
  updatedAt: "2026-06-30T00:00:00.000Z",
  currentData: {
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [],
  } as unknown as Record<string, unknown>,
};

const templateHost: PageEditorHost = {
  mode: "page-template",
  resourceLabel: "Page templates",
  settingsLabel: "Template settings",
  previewTitle: "Template preview",
  loadFailedMessage: "Failed to load template.",
  assistantSurface: false,
  detailCacheKey: (id) => `page-templates:detail:${id}`,
  getCachedDetail: () => templateDetail,
  loadDetail: async () => templateDetail,
  saveDocument: async () => templateDetail,
  // No publish capability → "Save only" badge; no preview button.
};

test("Pages and Page Templates both render through the shared builder-chrome shell", () => {
  // Page (default page host) routes through the shell: the builder card +
  // "Page builder" sub-toolbar, with the publish-capable header (no "Save only").
  const pageHtml = renderAdminUi(<PageEditor />);
  expect(pageHtml).toContain("Page builder");
  expect(pageHtml).toContain("rounded-2xl border border-border bg-card shadow-card");
  expect(pageHtml).not.toContain("Save only");

  // Page Template (mode:"page-template") rides the SAME shell — same card +
  // "Page builder" sub-toolbar — and surfaces the "Save only" no-publish badge.
  const templateHtml = renderAdminUi(
    <PageEditor pageId="tpl-1" initialPage={templateDetail} host={templateHost} />
  );
  expect(templateHtml).toContain("Page builder");
  expect(templateHtml).toContain("rounded-2xl border border-border bg-card shadow-card");
  expect(templateHtml).toContain("Save only");
});
