// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  changeField,
  clickButton,
  collectionClientsState,
  createDocument,
  createPage,
  flush,
  formsClientState,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";
import { PageEditorNavigationHarness } from "./pageEditorFlowHarness";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";

vi.mock("sonner", () => pageEditorFlowMockFactories.sonner);
vi.mock("@/components/ui/alert", () => pageEditorFlowMockFactories.alert);
vi.mock("@/components/ui/button", () => pageEditorFlowMockFactories.button);
vi.mock("@/ui/shared/ConfirmActionDialog", () => pageEditorFlowMockFactories.confirmDialog);
vi.mock("@/components/ui/sheet", () => pageEditorFlowMockFactories.sheet);
vi.mock("@/services/apiClient", () => pageEditorFlowMockFactories.apiClient);
vi.mock("@/services/cachePolicy", () => pageEditorFlowMockFactories.cachePolicy);
vi.mock("@/services/settingsClient", () => pageEditorFlowMockFactories.settingsClient);
vi.mock("@/services/pagesClient", () => pageEditorFlowMockFactories.pagesClient);
vi.mock("@/ui/layouts/EditorShell", () => pageEditorFlowMockFactories.editorShell);
vi.mock(
  "@/ui/assistant/activeSurfaceContext",
  () => pageEditorFlowMockFactories.activeSurfaceContext
);
vi.mock("@/utils/cacheBus", () => pageEditorFlowMockFactories.cacheBus);
vi.mock("@/services/mediaClient", () => pageEditorFlowMockFactories.mediaClient);
vi.mock("@/services/formsClient", () => pageEditorFlowMockFactories.formsClient);
vi.mock("@/services/contentTypesClient", () => pageEditorFlowMockFactories.contentTypesClient);
vi.mock("@/services/entriesClient", () => pageEditorFlowMockFactories.entriesClient);
vi.mock("@/services/listingsClient", () => pageEditorFlowMockFactories.listingsClient);
vi.mock("@/ui/media/MediaPicker", () => pageEditorFlowMockFactories.mediaPicker);
vi.mock(
  "@/ui/preview/RuntimePreviewDialog",
  () => pageEditorFlowMockFactories.runtimePreviewDialog
);

beforeEach(() => {
  pageEditorState.reset();
  activeSurfaceState.reset();
  previewDialogState.reset();
  toastState.success.mockClear();
  toastState.error.mockClear();
  siteSettingsState.reset();
  formsClientState.reset();
  collectionClientsState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("PageEditor surfaces bounded autosave errors", async () => {
  vi.useFakeTimers();
  pageEditorState.autosavePage.mockRejectedValueOnce({
    kind: "api",
    message: "Autosave rejected",
  });
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    await React.act(async () => {
      vi.advanceTimersByTime(1600);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Autosave paused");
    expect(view.container.textContent).toContain("Autosave rejected");
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("PageEditor surfaces recoverable autosave drafts after mount revalidation", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(pageEditorState.listPageRevisions).toHaveBeenCalledWith("page-1");
    expect(view.container.textContent).toContain("Recover draft version");
    expect(view.container.textContent).toContain("Restore draft");
    expect(view.container.textContent).toContain("Discard draft");

    clickButton(view.container, "Keep current");
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
    expect(pageEditorState.restorePageRevision).not.toHaveBeenCalled();
    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageEditor ignores non-recoverable autosave candidates", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-old",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Old draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T08:50:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-same",
      pageId: "page-1",
      version: 2,
      kind: "autosave",
      title: "Same draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:00:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-invalid",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Invalid draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "not-a-date",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
  } finally {
    view.cleanup();
  }
});

test("PageEditor recoverable autosave prompt restores and discards through revision actions", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const restoreView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(restoreView.container, "Restore draft");
    await flush();

    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(restoreView.container.textContent).toContain("Restored rev-autosave");
    expect(restoreView.container.textContent).not.toContain("Recover draft version");
  } finally {
    restoreView.cleanup();
  }

  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const discardView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(discardView.container, "Discard draft");
    await flush();

    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(discardView.container.textContent).not.toContain("Recover draft version");
  } finally {
    discardView.cleanup();
  }
});

test("PageEditor recoverable autosave blocks navigation without deleting the revision", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  window.history.replaceState({}, "", "/admin/pages/page-1");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditorNavigationHarness />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Recover draft version");

    clickButton(view.container, "Go pages");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(document.body.textContent).toContain(
      "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
    );

    clickButton(document.body, "Discard and continue");
    await flush();

    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages"
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor previews, publishes, updates settings, and manages revisions with v2 payloads", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-1",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T08:50:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-2",
      pageId: "page-1",
      version: 2,
      kind: "publish",
      title: "Published",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:20:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Preview");
    await flush();
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.previewPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const previewSyncPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(previewSyncPayload?.data).toMatchObject({
      schemaVersion: 2,
      sections: [{ id: "sec-hero", type: "hero" }, { type: "content" }],
    });
    expect(pageEditorState.previewPage).toHaveBeenCalledWith("page-1", {
      ttlMinutes: 15,
      probe: true,
    });
    expect(previewDialogState.latest).toMatchObject({
      open: true,
      title: "Page preview",
      subtitle: "Runtime preview of the saved draft (read-only, site theme).",
      canPreview: true,
      previewUrl: "https://preview.test/page-1",
      device: "desktop",
      fixPreviewTargetLabel: "Retry preview",
    });
    // The unavailable placeholder exposes a retry affordance that re-runs the
    // preview issuance flow instead of leaving a dead end.
    const previewCallsBeforeRetry = pageEditorState.previewPage.mock.calls.length;
    const latestDialogProps = previewDialogState.latest as {
      onFixPreviewTarget?: () => void;
    };
    expect(typeof latestDialogProps.onFixPreviewTarget).toBe("function");
    await React.act(async () => {
      latestDialogProps.onFixPreviewTarget?.();
      await Promise.resolve();
    });
    await flush();
    expect(pageEditorState.previewPage.mock.calls.length).toBe(previewCallsBeforeRetry + 1);

    clickButton(view.container, "Page settings");
    await flush();
    changeField(view.container, "Title", "Landing Page");
    changeField(view.container, "Slug", "landing");
    changeField(view.container, "Show in navigation", "no");
    changeField(view.container, "Revision retention", "25");
    clickButton(view.container, "Save settings");
    await flush();

    const settingsPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(settingsPayload).toMatchObject({
      title: "Landing Page",
      slug: "/landing",
      data: {
        schemaVersion: 2,
        settings: {
          showInNav: false,
          revisionRetention: 25,
        },
      },
    });

    clickButton(view.container, "History");
    await flush();
    expect(view.container.textContent).toContain("Draft version");
    expect(view.container.textContent).toContain("Version 2");
    clickButton(view.container, "Discard");
    await flush();
    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    clickButton(view.container, "Restore");
    await flush();
    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    expect(view.container.textContent).toContain("Restored rev-1");

    clickButton(view.container, "Publish");
    await flush();
    expect(pageEditorState.publishPage.mock.calls.at(-1)?.[1]).toMatchObject({
      schemaVersion: 2,
      sections: expect.any(Array),
    });
  } finally {
    view.cleanup();
  }
});

const readCanvasSectionTypes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-section]")).map((element) =>
    element.getAttribute("data-page-editor-section")
  );

test("Publish persists unsaved sections through the draft-save path so an editor reload keeps them", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Publish");
    await flush();

    // Draft/published coherence: the unsaved document is saved through the
    // same draft-save path as Save/Preview, strictly before publishing.
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.publishPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      PageDocumentV2 | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);
    const publishedDocument = pageEditorState.publishPage.mock.calls.at(-1)?.[1] as
      PageDocumentV2 | undefined;
    expect(publishedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // The dirty flag is cleared by the draft save, not by publish.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(toastState.success).toHaveBeenCalledWith("Page published.");
  } finally {
    view.cleanup();
  }

  // Owner gesture: reload the editor. The stored draft is whatever the save
  // produced, so the canvas must still contain the published section.
  expect(pageEditorState.cachedPage?.status).toBe("published");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish failure after a successful draft save keeps the saved draft and shows the publish error", async () => {
  pageEditorState.publishPage.mockRejectedValueOnce(new Error("publish_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // The draft save committed before the publish failure...
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      PageDocumentV2 | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // ...the publish failure is surfaced (no silent state)...
    expect(view.container.textContent).toContain("Failed to publish page.");
    expect(toastState.error).toHaveBeenCalledWith("Failed to publish page.");
    expect(toastState.success).not.toHaveBeenCalledWith("Page published.");

    // ...and the saved draft is kept: no unsaved-changes warning, canvas intact.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(readCanvasSectionTypes(view.container)).toEqual(["hero", "content"]);
  } finally {
    view.cleanup();
  }

  // The saved draft also survives an editor reload even though publish failed.
  expect(pageEditorState.cachedPage?.status).toBe("draft");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish aborts when the pre-publish draft save fails and keeps the unsaved state visible", async () => {
  pageEditorState.updatePage.mockRejectedValueOnce(new Error("save_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // Failure ordering: the published site never gets ahead of a draft that
    // could not be persisted.
    expect(pageEditorState.publishPage).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Failed to save draft.");
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor resets legacy widget page data to an empty v2 document before saving", async () => {
  const legacyPage = createPage({
    currentData: {
      blocks: [{ id: "legacy-hero", type: "hero", props: { title: "Legacy" } }],
    },
  });
  pageEditorState.cachedPage = legacyPage;
  pageEditorState.currentPage = legacyPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={legacyPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("This page has no sections yet.");
    clickButton(view.container, "Save");
    await flush();

    expect(pageEditorState.updatePage.mock.calls.at(-1)?.[1].data).toEqual({
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: {
        template: "page-v2",
        showInNav: true,
      },
      sections: [],
    });
  } finally {
    view.cleanup();
  }
});
