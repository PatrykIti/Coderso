import React from "react";
import { expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { PageEditorHost } from "../../../core/admin/ui/pages/PageEditor";
// The two page subjects are imported statically rather than with `await import(...)`
// inside each test. A deferred import bills the whole transform and evaluation of
// the templates module graph to whichever test touches it first, which is why
// "PageTemplatesPage renders cached templates with list affordances" was the one
// test here to exhaust the lane budget under full-suite contention while its four
// neighbours, doing the same work against an already-warm registry, were far
// cheaper. Static imports move that cost into the file's collection phase, where
// no per-test deadline races it. Every `vi.mock` below is hoisted above these
// imports by Vitest, and the mock factories read the mutable `cachedTemplates`
// binding at call time, so per-test fixtures still apply.
import { PageTemplateEditorPage } from "../../../core/admin/ui/pages/templates/PageTemplateEditorPage";
import { PageTemplatesPage } from "../../../core/admin/ui/pages/templates/PageTemplatesPage";
import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";

const templateSummary = {
  id: "tpl-1",
  name: "Landing stack",
  slug: "landing-stack",
  description: null,
  category: "marketing",
  status: "published" as const,
  sectionsCount: 3,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const templateDetail = {
  ...templateSummary,
  document: { schemaVersion: 2, sections: [] },
};

let cachedTemplates: (typeof templateSummary)[] | null = [templateSummary];

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplates: () => cachedTemplates,
  getCachedPageTemplateDetail: (id: string) => (id === "tpl-1" ? templateDetail : null),
  listPageTemplatesCached: async () => cachedTemplates ?? [],
  getPageTemplateCached: async (id: string) => (id === "tpl-1" ? templateDetail : null),
  createPageTemplate: async () => templateDetail,
  updatePageTemplate: async () => templateDetail,
  duplicatePageTemplate: async () => templateDetail,
  deletePageTemplate: async () => ({ ok: true }),
  previewPageTemplate: async () => ({
    token: "preview-token",
    previewUrl: "/preview?type=page-template&token=preview-token",
    expiresAt: "2026-06-01T01:00:00.000Z",
    sectionsCount: 3,
  }),
  clearPageTemplatesCache: () => undefined,
}));

const capturedHosts: PageEditorHost[] = [];

// Stub the heavy shared editor module entirely: this suite verifies the
// template host seam contract, while the real editor behavior is owned by
// tests/vitest/ui/page-editor-v2-flow.test.tsx.
vi.mock("../../../core/admin/ui/pages/PageEditor", () => ({
  PageEditor: ({ pageId, host }: { pageId?: string; host?: PageEditorHost }) => {
    if (host) capturedHosts.push(host);
    return (
      <div data-page-editor-stub data-page-id={pageId ?? ""} data-host-mode={host?.mode ?? ""} />
    );
  },
}));

// The settings sheet portals through the shared Sheet primitive; SSR string
// rendering needs the inline stand-in (same shape the flow suite uses).
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

test("PageTemplatesPage renders cached templates with list affordances", async () => {
  cachedTemplates = [templateSummary];
  const html = renderAdminUi(<PageTemplatesPage />, {
    path: "/admin/advanced/page-templates",
  });

  expect(html).toContain("Page Templates");
  expect(html).toContain("Reusable Page v2 section stacks");
  expect(html).toContain("New template");
  expect(html).toContain('href="/admin/pages"');
  expect(html).toContain('aria-current="page">Templates');
  expect(html).toContain('data-page-template-row="tpl-1"');
  expect(html).toContain("Landing stack");
  expect(html).toContain("landing-stack");
  expect(html).toContain("marketing");
  // SSR interleaves comment markers around interpolated counts.
  expect(html.replace(/<!-- -->/g, "")).toContain("Published (1)");
  expect(html.replace(/<!-- -->/g, "")).toContain("Draft (0)");
  expect(html).toContain('aria-label="Duplicate Landing stack"');
  expect(html).toContain('aria-label="Delete Landing stack"');
  // No legacy widget-template surface leaks into the rewritten page.
  expect(html).not.toContain("widget-template");
  expect(html).not.toContain("Widget Templates");
});

test("PageTemplatesPage renders the empty state when no templates are cached", async () => {
  cachedTemplates = [];
  const html = renderAdminUi(<PageTemplatesPage />, {
    path: "/admin/advanced/page-templates",
  });

  // TASK-479-23-L01: the empty state is the shared EmptyState primitive
  // (title + description), so the copy is split across nodes — assert both
  // parts rather than the pre-restyle single contiguous sentence.
  expect(html).toContain("No page templates yet");
  expect(html).toContain("Create one to reuse section stacks across pages.");
});

test("PageTemplateEditorPage binds the Page Editor host seam to the template contract", async () => {
  capturedHosts.length = 0;
  const html = renderAdminUi(<PageTemplateEditorPage templateId="tpl-1" />, {
    path: "/admin/advanced/page-templates/tpl-1",
  });

  expect(html).toContain("data-page-editor-stub");
  expect(html).toContain('data-page-id="tpl-1"');
  expect(html).toContain('data-host-mode="page-template"');

  const host = capturedHosts[0];
  expect(host).toBeTruthy();
  expect(host?.mode).toBe("page-template");
  expect(host?.resourceLabel).toBe("Page Templates");
  expect(host?.assistantSurface).toBe(false);
  expect(host?.detailCacheKey("tpl-1")).toBe(cacheKeys.pageTemplateDetail("tpl-1"));

  // The host adapts the cached template detail into the PageDetail shape the
  // shared editor expects: the stored Page v2 document rides currentData.
  const cachedDetail = host?.getCachedDetail("tpl-1");
  expect(cachedDetail).toMatchObject({
    id: "tpl-1",
    title: "Landing stack",
    slug: "landing-stack",
    status: "published",
    currentData: { schemaVersion: 2, sections: [] },
  });

  const loaded = await host?.loadDetail("tpl-1");
  expect(loaded?.id).toBe("tpl-1");
  expect(loaded?.currentData).toEqual({ schemaVersion: 2, sections: [] });

  // `host.preview` is optional on the host seam (TASK-458-03); the
  // template host keeps providing it.
  expect(host?.preview).toBeTypeOf("function");
  const preview = await host?.preview?.("tpl-1");
  expect(preview?.previewUrl).toBe("/preview?type=page-template&token=preview-token");
});

test("Template settings dialog renders the shared segmented status control, not a native select", async () => {
  capturedHosts.length = 0;
  renderAdminUi(<PageTemplateEditorPage templateId="tpl-1" />, {
    path: "/admin/advanced/page-templates/tpl-1",
  });
  const host = capturedHosts[0];
  expect(host?.renderSettings).toBeTruthy();

  const html = renderAdminUi(
    <>
      {host?.renderSettings?.({
        open: true,
        onOpenChange: () => undefined,
        detail: host.getCachedDetail("tpl-1"),
        onSaved: () => undefined,
      })}
    </>,
    { path: "/admin/advanced/page-templates/tpl-1" }
  );

  expect(html).toContain("Template settings");
  // Dedicated-widget contract (phase2 smoke anomaly #3): the status field is
  // the shared SegmentedControl, never a native select.
  expect(html).not.toContain("<select");
  expect(html).toContain('data-page-template-status-control="true"');
  expect(html).toContain('data-page-editor-control="segmented"');
  expect(html).toContain('aria-label="Status"');
  expect(html).toContain('data-page-editor-segmented-option="draft"');
  expect(html).toContain('data-page-editor-segmented-option="published"');
  // Stored enum tokens stay lowercase; the pills show capitalized labels.
  expect(html).toContain(">Draft</button>");
  expect(html).toContain(">Published</button>");
  // The cached template is published, so the published pill is the active one.
  expect(html).toMatch(/aria-pressed="true"[^>]*data-page-editor-segmented-option="published"/);
  expect(html).toMatch(/aria-pressed="false"[^>]*data-page-editor-segmented-option="draft"/);
});

test("Template editor surfaces an always-visible propagation note via canvasChrome", async () => {
  capturedHosts.length = 0;
  renderAdminUi(<PageTemplateEditorPage templateId="tpl-1" />, {
    path: "/admin/advanced/page-templates/tpl-1",
  });

  // TASK-479-23-L02: the propagation note is rendered by the host
  // `canvasChrome` seam (above the canvas sections), NOT buried in the settings
  // sheet. The shared PageEditor is stubbed here, so the note is verified
  // through the seam directly (mirroring how renderSettings is exercised).
  const host = capturedHosts.at(-1);
  expect(host?.canvasChrome).toBeTypeOf("function");

  const document = {
    schemaVersion: 2,
    breakpoints: [],
    seo: {},
    settings: {},
    sections: [],
  } as unknown as PageDocumentV2;
  const html = renderAdminUi(<>{host?.canvasChrome?.({ document, device: "desktop" })}</>, {
    path: "/admin/advanced/page-templates/tpl-1",
  });

  expect(html).toMatch(/every page (using|that uses) it/i);
  // Honesty guard: generic copy, never a fabricated page count.
  expect(html).not.toMatch(/updates \d+ pages/i);
});
