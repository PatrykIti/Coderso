import { expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
// Imported statically, not with `await import(...)` inside `renderList`: a deferred
// import bills the whole transform and evaluation of the templates module graph to
// whichever test runs first, which is what put this file's siblings over the lane
// budget under full-suite contention. Collection is the right place for that cost.
// The `vi.mock` below is hoisted above this import by Vitest and its factory reads
// the mutable `cachedTemplates` binding at call time, so per-test fixtures apply.
import { PageTemplatesPage } from "../../../core/admin/ui/pages/templates/PageTemplatesPage";

// TASK-479-23-L03: list-structure coverage for the restyled Page Templates
// library. Reuses the `pageTemplatesClient` mock shape from
// page-templates-surface.test.tsx; the list reads `getCachedPageTemplates`
// synchronously for its initial state, so the SSR string render exercises the
// cached branch without effects.

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

let cachedTemplates: (typeof templateSummary)[] | null = [templateSummary];

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplates: () => cachedTemplates,
  getCachedPageTemplateDetail: () => null,
  listPageTemplatesCached: async () => cachedTemplates ?? [],
  getPageTemplateCached: async () => null,
  createPageTemplate: async () => templateSummary,
  updatePageTemplate: async () => templateSummary,
  duplicatePageTemplate: async () => templateSummary,
  deletePageTemplate: async () => ({ ok: true }),
  previewPageTemplate: async () => ({
    token: "preview-token",
    previewUrl: "/preview?type=page-template&token=preview-token",
    expiresAt: "2026-06-01T01:00:00.000Z",
    sectionsCount: 3,
  }),
  clearPageTemplatesCache: () => undefined,
}));

const renderList = async () => {
  return renderAdminUi(<PageTemplatesPage />, { path: "/admin/advanced/page-templates" });
};

test("PageTemplatesPage renders restyled header + propagation note + entries", async () => {
  cachedTemplates = [templateSummary];
  const html = await renderList();

  // Header + CTA preserved.
  expect(html).toContain("Page Templates");
  expect(html).toContain("New template");
  // Propagation note (ported from the prototype) — assert stable copy, not classes.
  expect(html).toMatch(/every page (using|that uses) it/i);
  // A seeded template renders with its real fields (name + section count).
  expect(html).toContain("Landing stack");
  expect(html).toContain("landing-stack");
  expect(html).toMatch(/section/i);
  // The badge reflects a REAL field (category), not a fabricated scope.
  expect(html).toContain("marketing");
  // Open/row affordance: navigation is onClick, so the route string is not
  // emitted by SSR — assert the emitted DOM hook + action labels instead.
  expect(html).toContain('data-page-template-row="tpl-1"');
  expect(html).toContain('aria-label="Edit Landing stack"');
  expect(html).toContain('aria-label="Duplicate Landing stack"');
  expect(html).toContain('aria-label="Delete Landing stack"');
});

test("PageTemplatesPage shows NO fabricated scope/usage", async () => {
  cachedTemplates = [templateSummary];
  const html = await renderList();

  // Honesty guard: the mock-only prototype copy must NOT leak into the real screen.
  expect(html).not.toContain("Used on 24 pages");
  expect(html).not.toMatch(/Used on \d+ pages/);
  expect(html).not.toMatch(/Site-wide/); // unless a REAL scope field exists
});

test("PageTemplatesPage cached render does not show the loading state", async () => {
  // cachedTemplates is seeded -> isLoading starts false; the loading affordance is
  // absent and the seeded name renders.
  cachedTemplates = [templateSummary];
  const html = await renderList();

  expect(html).not.toContain("Loading page templates");
  expect(html).toContain("Landing stack");
});

test("PageTemplatesPage renders the redesigned empty state when no templates are cached", async () => {
  cachedTemplates = [];
  const html = await renderList();

  // Empty state is the shared EmptyState (title + description), with its New
  // template action still available.
  expect(html).toContain("No page templates yet");
  expect(html).toContain("Create one to reuse section stacks across pages.");
  expect(html).toContain("New template");
});
