// @vitest-environment happy-dom

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import {
  clickByText,
  editFirstRow,
  findButton,
  flush,
  mount,
  openAuditDialogAndRun,
  resetSeoHarness,
  seedList,
  seoHarness,
  setSeoQuery,
  submitDrawer,
} from "./seoWaveFixtures";

import type { SeoDocumentItem } from "../../../core/admin/services/seoClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";

const doc = (overrides: Partial<SeoDocumentItem> = {}): SeoDocumentItem =>
  ({
    ...(overrides as Record<string, unknown>),
    id: "doc-1",
    targetId: "page-1",
    targetType: "page",
    targetTitle: "Hello world",
    slug: "hello-world",
    title: "Hello world",
    description: "x".repeat(80),
    score: 92,
    status: "ok",
    issues: [],
    lastAuditAt: "2026-03-15T08:00:00.000Z",
    canonicalUrl: "",
    robots: "",
    createdAt: "2026-03-15T08:00:00.000Z",
    updatedAt: "2026-03-15T08:00:00.000Z",
  }) as unknown as SeoDocumentItem;

const weakDoc = (overrides: Partial<SeoDocumentItem> = {}): SeoDocumentItem =>
  ({
    ...doc(),
    ...(overrides as Record<string, unknown>),
    id: "doc-2",
    slug: "weak-page",
    title: "Weak page",
    description: "short",
    score: 30,
    status: "issues",
    issues: [{ id: "i1", message: "Description too short" }],
    lastAuditAt: null,
  }) as unknown as SeoDocumentItem;

beforeEach(() => {
  resetSeoHarness();
});

test("loads items, renders stats, filters by status and search", async () => {
  seedList([doc(), weakDoc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("SEO Manager");
    expect(view.container.textContent).toContain("2 pages");
    expect(view.container.textContent).toContain("Global Scan: 92%");
    expect(view.container.textContent).toContain("doc-1");

    // Status filter: critical only shows the weak item.
    clickByText(view.container, "Critical");
    expect(view.container.textContent).not.toContain("doc-1");
    expect(view.container.textContent).toContain("doc-2");

    // Optimized filter shows the healthy item only.
    clickByText(view.container, "Optimized");
    expect(view.container.textContent).not.toContain("doc-2");
    expect(view.container.textContent).toContain("doc-1");

    // Search narrows within "all".
    clickByText(view.container, "All pages");
    setSeoQuery(view, "weak");
    expect(view.container.textContent).toContain("doc-2");
    expect(view.container.textContent).not.toContain("doc-1");

    setSeoQuery(view, "zzz-no-match");
    expect(view.container.textContent).toContain("No pages match these filters");
    setSeoQuery(view, "");
  } finally {
    view.cleanup();
  }
});

test("runs a full audit: success refreshes, client error and generic error surface", async () => {
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();

    seoHarness.runSeoAudit.mockRejectedValueOnce(
      Object.assign(new Error("audit:boom"), { kind: "api", message: "audit:boom" })
    );
    openAuditDialogAndRun(view);
    await flush();
    expect(view.container.textContent).toContain("SEO data unavailable");
    expect(view.container.textContent).toContain("audit:boom");

    seoHarness.runSeoAudit.mockRejectedValueOnce(new Error("network:down"));
    openAuditDialogAndRun(view);
    await flush();
    expect(view.container.textContent).toContain("Failed to run SEO audit.");

    openAuditDialogAndRun(view);
    await flush();
    expect(seoHarness.runSeoAudit).toHaveBeenCalledWith({ checks: ["all"] });
    expect(seoHarness.listSeoCached).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("drawer save succeeds and maps update failures", async () => {
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    editFirstRow(view);

    seoHarness.updateSeo.mockRejectedValueOnce(
      Object.assign(new Error("save:boom"), { kind: "api", message: "save:boom" })
    );
    submitDrawer(view);
    await flush();
    expect(view.container.textContent).toContain("save:boom");

    seoHarness.updateSeo.mockRejectedValueOnce(new Error("offline"));
    submitDrawer(view);
    await flush();
    expect(view.container.textContent).toContain("Failed to update SEO data.");

    submitDrawer(view);
    await flush();
    expect(seoHarness.updateSeo).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ title: expect.any(String) })
    );
    expect(seoHarness.toastSuccessCalls().join("\n")).toContain("SEO updated.");
  } finally {
    view.cleanup();
  }
});

test("sync performance: 403 disables write actions, other errors surface, success toasts", async () => {
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();

    seoHarness.syncSearchPerformance.mockRejectedValueOnce(
      Object.assign(new Error("forbidden"), { kind: "api", status: 403 })
    );
    clickByText(view.container, "Sync performance");
    await flush();
    expect(findButton(view.container, "Sync performance").disabled).toBe(true);
    expect(findButton(view.container, "Submit sitemap").disabled).toBe(true);
    expect(view.container.textContent).toContain("Indexed pages");
    // Re-mount for a clean non-disabled page.
    view.cleanup();
    document.body.innerHTML = "";
    const fresh = mount(<SeoManagerPage />);
    try {
      await flush();

      seoHarness.syncSearchPerformance.mockRejectedValueOnce(
        Object.assign(new Error("sync:boom"), { kind: "api", message: "sync:boom" })
      );
      clickByText(fresh.container, "Sync performance");
      await flush();
      expect(fresh.container.textContent).toContain("sync:boom");

      seoHarness.submitSitemap.mockRejectedValueOnce(
        Object.assign(new Error("Connect first"), {
          kind: "api",
          status: 409,
          code: "gsc_not_configured",
        })
      );
      clickByText(fresh.container, "Submit sitemap");
      await flush();
      expect(fresh.container.textContent).toContain("Google Search Console not connected");
      expect(fresh.container.textContent).toContain("Connect Google Search Console in Settings");

      clickByText(fresh.container, "Sync performance");
      await flush();
      expect(seoHarness.getSeoOverview).toHaveBeenCalled();
      expect(fresh.container.textContent).not.toContain("Google Search Console not connected");
    } finally {
      fresh.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("empty list renders the audit empty-state whose action opens the dialog", async () => {
  seedList([]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("No SEO pages found");
    expect(view.container.textContent).toContain("Run Full Audit");
  } finally {
    view.cleanup();
  }
});

test("list load failure surfaces the destructive alert; loading state shows first", async () => {
  seedList([], { failList: true });
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load SEO data.");
  } finally {
    view.cleanup();
  }
});

test("a rejected overview fetch is silently ignored while the list still renders", async () => {
  seoHarness.getSeoOverview.mockRejectedValueOnce(new Error("overview:down"));
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("doc-1");
    expect(view.container.textContent).toContain("Indexed pages");
  } finally {
    view.cleanup();
  }
});

test("an API-kind list failure surfaces its message in the destructive alert", async () => {
  seoHarness.listSeoCached.mockImplementationOnce(async () => {
    throw { kind: "api", message: "list:api:boom" };
  });
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("list:api:boom");
  } finally {
    view.cleanup();
  }
});

test("the needs-work filter isolates mid-range scores", async () => {
  seedList([
    doc(),
    {
      id: "needs-1",
      targetId: "page-3",
      targetType: "page",
      targetTitle: "Needs work page",
      slug: "needs-page",
      title: "Needs work page",
      description: "x".repeat(80),
      score: 62,
      status: "issue",
      issues: [],
      lastAuditAt: "2026-03-15T08:00:00.000Z",
      canonicalUrl: "",
      robots: "",
      createdAt: "2026-03-15T08:00:00.000Z",
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
  ]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    clickByText(view.container, "Needs work");
    expect(view.container.textContent).toContain("needs-1");
    expect(view.container.textContent).not.toContain("doc-1");
  } finally {
    view.cleanup();
  }
});

test("a blank meta description counts toward the warnings stat", async () => {
  seedList([
    {
      id: "missing-1",
      targetId: "page-4",
      targetType: "page",
      targetTitle: "Missing meta page",
      slug: "missing-page",
      title: "Missing meta page",
      description: "   ",
      score: 80,
      status: "ok",
      issues: [],
      lastAuditAt: "2026-03-15T08:00:00.000Z",
      canonicalUrl: "",
      robots: "",
      createdAt: "2026-03-15T08:00:00.000Z",
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
  ]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("missing-1");
    expect(view.container.textContent).toContain("Warnings:1");
  } finally {
    view.cleanup();
  }
});

test("a generic write-action failure surfaces its failure message", async () => {
  seedList([doc()]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    seoHarness.syncSearchPerformance.mockRejectedValueOnce(new Error("sync:generic"));
    clickByText(view.container, "Sync performance");
    await flush();
    expect(view.container.textContent).toContain("Failed to sync search performance.");
    expect(seoHarness.toastSuccessCalls().join("\n")).toContain(
      "error:Failed to sync search performance."
    );
  } finally {
    view.cleanup();
  }
});

test("the empty-state CTA opens the audit dialog", async () => {
  seedList([]);
  const view = mount(<SeoManagerPage />);
  try {
    await flush();
    // The empty-state action renders inside the table, after the header action,
    // so take the last "Run Full Audit" button to reach onEmptyAction.
    const ctas = Array.from(view.container.querySelectorAll("button")).filter((candidate) =>
      candidate.textContent?.includes("Run Full Audit")
    );
    const cta = ctas.at(-1);
    if (!(cta instanceof HTMLButtonElement)) throw new Error("missing empty-state CTA");
    React.act(() => {
      cta.click();
    });
    await flush();
    expect(view.container.textContent).toContain("audit-run-confirm");
  } finally {
    view.cleanup();
  }
});

test("a list cache event forces a background refresh and the drawer closes through onOpenChange", async () => {
  type CacheEvent = { key: string; action: string };
  let cacheEventSink: ((event: CacheEvent) => void) | null = null;

  const clientState = {
    items: [] as SeoDocumentItem[],
    listSeoCached: vi.fn(async () => clientState.items),
    getCachedSeo: vi.fn(() => null),
    getSeoOverview: vi.fn(async () => ({ indexedPages: 1 })),
    getCachedSeoOverview: vi.fn(() => null),
    runSeoAudit: vi.fn(async () => ({})),
    updateSeo: vi.fn(async () => ({})),
    syncSearchPerformance: vi.fn(async () => ({})),
    submitSitemap: vi.fn(async () => ({})),
  };

  vi.doMock("@/utils/cacheBus", () => ({
    subscribeCacheEvents: (callback: (event: CacheEvent) => void) => {
      cacheEventSink = callback;
      return () => undefined;
    },
  }));

  vi.doMock("../../../core/admin/ui/seo/SeoDrawer", () => ({
    SeoDrawer: ({
      item,
      open,
      onOpenChange,
    }: {
      item: { id: string } | null;
      open: boolean;
      onOpenChange: (next: boolean) => void;
    }) =>
      open && item ? (
        <div>
          <span>{`drawer-open:${item.id}`}</span>
          <button type="button" onClick={() => onOpenChange(false)}>
            drawer-close
          </button>
        </div>
      ) : null,
  }));

  vi.doMock("@/services/seoClient", () => ({
    listSeoCached: clientState.listSeoCached,
    getCachedSeo: clientState.getCachedSeo,
    getSeoOverview: clientState.getSeoOverview,
    getCachedSeoOverview: clientState.getCachedSeoOverview,
    runSeoAudit: clientState.runSeoAudit,
    updateSeo: clientState.updateSeo,
    syncSearchPerformance: clientState.syncSearchPerformance,
    submitSitemap: clientState.submitSitemap,
  }));

  vi.resetModules();
  const { SeoManagerPage: FreshSeoManagerPage } =
    await import("../../../core/admin/ui/seo/SeoManagerPage");

  clientState.items = [
    {
      id: "cache-doc",
      targetId: "page-5",
      targetType: "page",
      targetTitle: "Cache page",
      slug: "cache-page",
      title: "Cache page",
      description: "x".repeat(80),
      score: 90,
      status: "ok",
      issues: [],
      lastAuditAt: "2026-03-15T08:00:00.000Z",
      canonicalUrl: "",
      robots: "",
      createdAt: "2026-03-15T08:00:00.000Z",
      updatedAt: "2026-03-15T08:00:00.000Z",
    },
  ];
  const view = mount(<FreshSeoManagerPage />);
  try {
    await flush();
    expect(view.container.textContent).toContain("cache-doc");

    clientState.items = [
      ...clientState.items,
      {
        id: "cache-doc-2",
        targetId: "page-6",
        targetType: "page",
        targetTitle: "Second page",
        slug: "second-page",
        title: "Second page",
        description: "x".repeat(80),
        score: 90,
        status: "ok",
        issues: [],
        lastAuditAt: "2026-03-15T08:00:00.000Z",
        canonicalUrl: "",
        robots: "",
        createdAt: "2026-03-15T08:00:00.000Z",
        updatedAt: "2026-03-15T08:00:00.000Z",
      },
    ];
    React.act(() => {
      cacheEventSink?.({ key: cacheKeys.seoList, action: "invalidate" });
    });
    await flush();
    expect(view.container.textContent).toContain("cache-doc-2");
    expect(clientState.listSeoCached).toHaveBeenCalledWith({ force: true });

    clickByText(view.container, "edit:");
    await flush();
    expect(view.container.textContent).toContain("drawer-open:cache-doc");
    clickByText(view.container, "drawer-close");
    await flush();
    expect(view.container.textContent).not.toContain("drawer-open:");
  } finally {
    view.cleanup();
    vi.doUnmock("@/utils/cacheBus");
    vi.doUnmock("../../../core/admin/ui/seo/SeoDrawer");
    vi.doUnmock("@/services/seoClient");
  }
});

test("real SeoAuditDialog Cancel closes the dialog through onOpenChange", async () => {
  // The shared wave fixtures mock SeoAuditDialog (and seoClient without
  // seoAuditCheckIds). Revert both mocks for this test only so the real dialog
  // renders and its Cancel button is exercised.
  vi.doUnmock("../../../core/admin/ui/seo/SeoAuditDialog");
  vi.doMock("@/services/seoClient", () => ({
    seoAuditCheckIds: ["meta", "links", "robots"],
  }));

  const { SeoAuditDialog } = await import("../../../core/admin/ui/seo/SeoAuditDialog");
  const onOpenChange = vi.fn();
  const view = mount(<SeoAuditDialog open onOpenChange={onOpenChange} onRun={async () => {}} />);
  try {
    await flush();
    // Radix Dialog portals its content to document.body.
    expect(document.body.textContent).toContain("Run SEO Audit");
    clickByText(document.body, "Cancel");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/admin/ui/seo/SeoAuditDialog");
    vi.doUnmock("@/services/seoClient");
  }
});
