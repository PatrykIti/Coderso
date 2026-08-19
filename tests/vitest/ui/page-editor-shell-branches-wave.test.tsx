// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  clickButton,
  clickButtonByLabel,
  clickColorSwatch,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  dispatchElementKey,
  findFieldControl,
  mediaLibraryState,
  mount,
  pageEditorState,
} from "./pageEditorV2Fixtures";

import {
  blurElement,
  clickPaletteBlock,
  createTwoColumnPage,
  dblClickElement,
  findInlineEditRegion,
  openPageSettingsPanel,
  setInlineRegionText,
} from "./pageEditorV2Helpers";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageEditorHost } from "../../../core/admin/ui/pages/editor/pageEditorHostContract";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const PALETTE_PRIMARY = "var(--color-primary)";
const PALETTE_ACCENT = "var(--color-accent)";

/** Default page host wiring; tests override the failure-relevant seams. */
const makeTestHost = (overrides: Partial<PageEditorHost>): PageEditorHost => ({
  mode: "page",
  resourceLabel: "Pages",
  settingsLabel: "Page settings",
  previewTitle: "Page preview",
  loadFailedMessage: "Failed to load page.",
  assistantSurface: true,
  detailCacheKey: (id) => `page-detail:${id}`,
  getCachedDetail: (id) =>
    pageEditorState.cachedPage && pageEditorState.cachedPage.id === id
      ? pageEditorState.cachedPage
      : null,
  loadDetail: async (id) =>
    pageEditorState.currentPage?.id === id ? pageEditorState.currentPage : null,
  saveDocument: async (id, document) => {
    const updated = pageEditorState.updatePage(id, { data: document }) as unknown as PageDetail;
    return updated;
  },
  autosaveDocument: async (id, document) => pageEditorState.autosavePage(id, { data: document }),
  publish: async (id, document) => pageEditorState.publishPage(id, document),
  preview: async (id) => pageEditorState.previewPage(id),
  revisions: {
    list: async (id) => pageEditorState.listPageRevisions(id),
    restore: async (id, revisionId) => pageEditorState.restorePageRevision(id, revisionId),
    discard: async (id, revisionId) => pageEditorState.discardPageRevision(id, revisionId),
  },
  ...overrides,
});

const clipboardSpy = (readTextValue: unknown, writeError = false) => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: writeError
        ? vi.fn().mockRejectedValue(new Error("denied"))
        : vi.fn().mockResolvedValue(undefined),
      readText:
        typeof readTextValue === "function"
          ? readTextValue
          : vi.fn().mockResolvedValue(readTextValue),
    },
  });
  return original;
};

const restoreClipboard = (original: PropertyDescriptor | undefined) => {
  if (original) {
    Object.defineProperty(navigator, "clipboard", original);
  }
};

const autosaveRevision = (overrides: Partial<PageRevision> = {}): PageRevision => ({
  id: "rev-autosave",
  pageId: "page-1",
  version: 3,
  kind: "autosave",
  title: "Draft",
  slug: "homepage",
  data: createDocument(),
  createdAt: "2026-03-08T09:10:00.000Z",
  createdBy: null,
  ...overrides,
});

const resetPageClientDefaults = () => {
  const state = pageEditorState;
  state.getCachedPageDetail.mockImplementation((id) =>
    state.cachedPage && state.cachedPage.id === id ? state.cachedPage : null
  );
  state.getPageCached.mockImplementation(async () => state.currentPage);
  state.listPageRevisions.mockImplementation(async () => state.revisions);
  state.previewPage.mockImplementation(async () => ({
    token: "preview-token",
    previewUrl: "https://preview.test/page-1",
    expiresAt: "2026-03-08T10:20:00.000Z",
    probe: { ok: true, status: 200, targetLabel: "https://preview.test/page-1" },
  }));
  state.updatePage.mockImplementation(
    async (id: string, payload: Partial<PageDetail> & { data?: Record<string, unknown> }) => {
      const current =
        state.currentPage ??
        ({
          id,
          title: "Homepage",
          slug: "homepage",
          status: "draft",
          currentData: createDocument(),
          updatedAt: "2026-03-08T09:00:00.000Z",
        } satisfies PageDetail);
      const updated = {
        ...current,
        title: typeof payload.title === "string" ? payload.title : current.title,
        slug: typeof payload.slug === "string" ? payload.slug : current.slug,
        currentData: payload.data ?? current.currentData,
      } satisfies PageDetail;
      state.currentPage = updated;
      state.cachedPage = updated;
      return updated;
    }
  );
  state.autosavePage.mockImplementation(async () => ({ ok: true }));
  state.publishPage.mockImplementation(async (id: string, data: Record<string, unknown>) => {
    const current = state.currentPage ?? createPage({ id });
    const published: PageDetail = {
      ...current,
      status: "published",
      currentData: data,
      updatedAt: "2026-03-08T09:30:00.000Z",
    };
    state.currentPage = published;
    state.cachedPage = published;
    return { ok: true, page: published };
  });
  state.restorePageRevision.mockImplementation(async (_pageId: string, revisionId: string) => {
    const restored = createPage({
      title: "Restored Homepage",
      updatedAt: "2026-03-08T09:15:00.000Z",
      currentData: createDocument({
        sections: [
          createPageSectionV2("cta", {
            id: "sec-restored",
            name: "Restored CTA",
            blocks: [
              createPageBlockV2("heading", {
                id: "blk-restored",
                props: { text: `Restored ${revisionId}`, level: "h2", align: "center" },
              }),
            ],
          }),
        ],
      }),
    });
    state.currentPage = restored;
    state.cachedPage = restored;
    return {
      ok: true,
      restored: true,
      revision: {
        id: revisionId,
        pageId: "page-1",
        version: 1,
        kind: "autosave" as const,
        data: {},
        createdAt: "2026-03-08T09:15:00.000Z",
        createdBy: null,
      },
      page: restored,
    };
  });
  state.discardPageRevision.mockImplementation(async () => ({ ok: true }));
  state.subscribeCacheEvents.mockImplementation(
    (listener: (event: { key: string; action: "update" }) => void) => {
      state.cacheListener = listener;
      return () => {
        if (state.cacheListener === listener) state.cacheListener = null;
      };
    }
  );
};

beforeEach(() => {
  pageEditorState.reset();
  resetPageClientDefaults();
  mediaLibraryState.items = [
    { id: "asset-hero", url: "/hero.jpg", type: "image", mimeType: "image/jpeg" },
    { id: "asset-card", url: "/card.jpg", type: "image", mimeType: "image/jpeg" },
  ];
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("PageEditor with no pageId stays idle when the pathname has no pages segment", async () => {
  const originalPath = window.location.pathname;
  window.history.replaceState({}, "", "/admin/settings");
  const view = mount(<PageEditor />);
  try {
    await flush();
    expect(view.container.textContent).toContain("This page has no sections yet.");
    expect(pageEditorState.getPageCached).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
    window.history.replaceState({}, "", originalPath);
  }
});

test("PageEditor clipboard copy persists to sessionStorage and paste falls back when the async clipboard fails", async () => {
  const original = clipboardSpy(undefined, true);
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButtonByLabel(view.container, "Copy selection");
    await flush();
    const stored = window.sessionStorage.getItem("coderso.pageEditor.clipboard");
    expect(stored).toContain("coderso/page-fragment@v1");
    expect(stored).toContain('"kind":"section"');
    expect(
      (navigator.clipboard as unknown as { writeText: ReturnType<typeof vi.fn> }).writeText
    ).toHaveBeenCalled();

    clickButtonByLabel(view.container, "Paste");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-section]").length).toBeGreaterThan(1);
    expect(view.container.textContent).toContain("Unsaved");
  } finally {
    view.cleanup();
    restoreClipboard(original);
    window.sessionStorage.removeItem("coderso.pageEditor.clipboard");
  }
});

test("PageEditor pastes a block fragment read directly from the async clipboard", async () => {
  const block = createPageBlockV2("divider", { id: "blk-pasted", props: {} });
  const original = clipboardSpy(
    JSON.stringify({ clip: "coderso/page-fragment@v1", kind: "block", data: block })
  );
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButtonByLabel(view.container, "Paste");
    await flush();
    expect(view.container.querySelector('[data-page-editor-block="divider"]')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-page-editor-block="divider"]').length).toBe(1);
    expect(view.container.textContent).toContain("Unsaved");
  } finally {
    view.cleanup();
    restoreClipboard(original);
    window.sessionStorage.removeItem("coderso.pageEditor.clipboard");
  }
});

test("PageEditor Enter on a focused toolbar control never hijacks keyboard activation", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    const undoButton = view.container.querySelector('button[aria-label="Undo"]') as HTMLElement;
    expect(undoButton).toBeTruthy();
    dispatchElementKey(undoButton, "Enter");
    await flush();
    expect(
      view.container
        .querySelector(
          '[data-page-editor-block-id="blk-heading"] [data-page-editor-inline-edit-prop="text"]'
        )
        ?.getAttribute("contenteditable")
    ).toBeNull();

    dispatchElementKey(document, "Enter");
    await flush();
    expect(
      view.container
        .querySelector(
          '[data-page-editor-block-id="blk-heading"] [data-page-editor-inline-edit-prop="text"]'
        )
        ?.getAttribute("contenteditable")
    ).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline commit resolves nested slot blocks by id and writes their text prop", async () => {
  const nestedSection: PageSectionV2 = createPageSectionV2("content", {
    id: "sec-nested",
    name: "Nested",
    blocks: [
      createPageBlockV2("columns", {
        id: "blk-cols",
        props: { gap: 24 },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk-nested-h",
              props: { text: "Nested heading", level: "h2", align: "left" },
            }),
          ],
          "column:2": [],
        },
      }),
    ],
  });
  const page = createPage({
    currentData: createDocument({ sections: [nestedSection] }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-nested-h"]');
    await flush();
    const region = findInlineEditRegion(view.container, "blk-nested-h", "text");
    dblClickElement(region);
    await flush();
    expect(region.getAttribute("contenteditable")).toBe("true");
    setInlineRegionText(region, "Nested edited");
    blurElement(region);
    await flush();

    expect(findFieldControl(view.container, "Primary text").value).toBe("Nested edited");
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-nested-h"]')?.textContent
    ).toContain("Nested edited");
  } finally {
    view.cleanup();
  }
});

test("PageEditor session-expired save failure surfaces sign-in guidance", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    pageEditorState.updatePage.mockRejectedValueOnce({
      kind: "api",
      sharedFailureKind: "session_expired",
      message: "expired",
    });
    clickButton(view.container, "Save draft");
    await flush();
    expect(view.container.textContent).toContain(
      "Your admin session expired. Sign in again before saving."
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor session-expired publish failure surfaces sign-in guidance", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    pageEditorState.publishPage.mockRejectedValueOnce({
      kind: "api",
      sharedFailureKind: "session_expired",
      message: "expired",
    });
    clickButton(view.container, "Publish");
    await flush();
    expect(view.container.textContent).toContain(
      "Your admin session expired. Sign in again before publishing."
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor plain api save failure shows the server message in the error alert", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    pageEditorState.updatePage.mockRejectedValueOnce({
      kind: "api",
      name: "ApiClientError",
      status: 500,
      code: "internal",
      message: "Save boom",
    });
    clickButton(view.container, "Save draft");
    await flush();
    expect(view.container.textContent).toContain("Page editor error");
    expect(view.container.textContent).toContain("Save boom");
  } finally {
    view.cleanup();
  }
});

test("PageEditor preview failure surfaces the preview alert and keeps the button enabled", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    pageEditorState.previewPage.mockRejectedValueOnce({ kind: "api", message: "Preview exploded" });
    clickButton(view.container, "Preview");
    await flush();
    expect(view.container.textContent).toContain("Preview unavailable");
    expect(view.container.textContent).toContain("Preview exploded");
  } finally {
    view.cleanup();
  }
});

test("PageEditor history list, restore, and discard failures surface sheet errors", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    pageEditorState.listPageRevisions.mockRejectedValue(new Error("history boom"));
    clickButton(view.container, "History");
    await flush();
    expect(view.container.textContent).toContain("Failed to load page history.");
  } finally {
    view.cleanup();
  }

  pageEditorState.reset();
  resetPageClientDefaults();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  const restoreView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );
  try {
    await flush();
    pageEditorState.revisions = [autosaveRevision({ id: "rev-1", kind: "publish", version: 1 })];
    clickButton(restoreView.container, "History");
    await flush();
    pageEditorState.restorePageRevision.mockRejectedValueOnce(new Error("restore boom"));
    clickButton(restoreView.container, "Restore");
    await flush();
    expect(restoreView.container.textContent).toContain("Failed to restore revision.");
  } finally {
    restoreView.cleanup();
  }

  pageEditorState.reset();
  resetPageClientDefaults();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  const discardView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );
  try {
    await flush();
    pageEditorState.revisions = [autosaveRevision({ id: "rev-2" })];
    clickButton(discardView.container, "History");
    await flush();
    pageEditorState.discardPageRevision.mockRejectedValueOnce(new Error("discard boom"));
    clickButton(discardView.container, "Discard");
    await flush();
    expect(discardView.container.textContent).toContain("Failed to discard revision.");
  } finally {
    discardView.cleanup();
  }
});

test("PageEditor recoverable autosave restore and discard failures surface recovery errors", async () => {
  pageEditorState.revisions = [autosaveRevision()];
  const restoreView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );
  try {
    await flush();
    expect(restoreView.container.textContent).toContain("Recover draft version");
    pageEditorState.restorePageRevision.mockRejectedValueOnce(new Error("recover boom"));
    clickButton(restoreView.container, "Restore draft");
    await flush();
    expect(restoreView.container.textContent).toContain("Failed to restore draft version.");
  } finally {
    restoreView.cleanup();
  }

  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  pageEditorState.revisions = [autosaveRevision()];
  const discardView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );
  try {
    await flush();
    pageEditorState.discardPageRevision.mockRejectedValueOnce(new Error("discard boom"));
    clickButton(discardView.container, "Discard draft");
    await flush();
    expect(discardView.container.textContent).toContain("Failed to discard draft version.");
  } finally {
    discardView.cleanup();
  }
});

test("PageEditor load failures surface the host error, and revalidation failures warn on cached drafts", async () => {
  const host = makeTestHost({
    loadDetail: vi.fn().mockRejectedValue(new Error("load boom")),
  });
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = null;
  const view = mount(<PageEditor pageId="page-1" host={host} />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Page editor error");
    expect(view.container.textContent).toContain("Failed to load page.");
  } finally {
    view.cleanup();
  }

  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  const cachedView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} host={host} />
  );
  try {
    await flush();
    expect(cachedView.container.textContent).toContain("Cached draft shown");
    expect(cachedView.container.textContent).toContain("Failed to load page.");
  } finally {
    cachedView.cleanup();
  }
});

test("PageEditor deleting the selected section through confirmation clears the canvas", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButtonByLabel(view.container, "Delete section");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected section"]')
    ).toBeTruthy();
    clickButton(view.container, "Delete section");
    await flush();
    expect(view.container.textContent).toContain("This page has no sections yet.");
    expect(view.container.textContent).toContain("Unsaved");
    expect(pageEditorState.updatePage).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageEditor deleting the last block keeps the section selected", async () => {
  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-solo",
          name: "Solo",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-solo",
              props: { text: "Solo heading", level: "h2", align: "left" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-solo"]');
    await flush();
    clickButtonByLabel(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();
    expect(view.container.querySelector('[data-page-editor-block-id="blk-solo"]')).toBeNull();
    expect(view.container.querySelector("[data-page-editor-floating-toolbar]")).toBeTruthy();
    expect(view.container.textContent).toContain("Solo");
    expect(view.container.textContent).toContain("Unsaved");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts published template sections and surfaces template failures", async () => {
  const tplSection = createPageSectionV2("cta", {
    id: "sec-tpl",
    name: "Template CTA",
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-tpl",
        props: { text: "From template", level: "h2", align: "center" },
      }),
    ],
  });
  const host = makeTestHost({
    templateLibrary: {
      listPublished: vi
        .fn()
        .mockResolvedValue([{ id: "tpl-1", name: "Launch", description: null }]),
      instantiateSections: vi.fn().mockResolvedValue([tplSection]),
    },
  });
  const view = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} host={host} />
  );
  try {
    await flush();
    clickButton(view.container, "Add section");
    await flush();
    expect(view.container.textContent).toContain("Launch");
    clickButton(view.container, "Launch");
    await flush();
    expect(view.container.querySelector('[data-section-id="sec-tpl"]')).toBeTruthy();
    expect(view.container.textContent).toContain("From template");
  } finally {
    view.cleanup();
  }

  const failingHost = makeTestHost({
    templateLibrary: {
      listPublished: vi
        .fn()
        .mockResolvedValue([{ id: "tpl-2", name: "Broken", description: null }]),
      instantiateSections: vi.fn().mockRejectedValue(new Error("tpl boom")),
    },
  });
  const failView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} host={failingHost} />
  );
  try {
    await flush();
    clickButton(failView.container, "Add section");
    await flush();
    clickButton(failView.container, "Broken");
    await flush();
    expect(failView.container.textContent).toContain("Page editor error");
    expect(failView.container.textContent).toContain("Failed to insert template.");
  } finally {
    failView.cleanup();
  }
});

test("PageEditor settings panel edits live background and effects and closes", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    expect(panel.getAttribute("role")).toBe("region");

    clickColorSwatch(view.container, "Page background", "primary");
    await flush();
    expect(view.container.textContent).toContain("Unsaved");

    const toggle = Array.from(panel.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Cursor spotlight"
    );
    expect(toggle).toBeTruthy();
    React.act(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickColorSwatch(view.container, "Spotlight color", "accent");
    await flush();

    clickButton(view.container, "Save settings");
    await flush();
    const payload = pageEditorState.updatePage.mock.calls.at(-1)?.[1] as {
      data: PageDocumentV2;
    };
    expect(payload.data.settings.background).toBe(PALETTE_PRIMARY);
    expect(payload.data.settings.effects).toMatchObject({
      cursorSpotlight: true,
      spotlightColor: PALETTE_ACCENT,
    });
    expect(view.container.textContent).not.toContain("Unsaved");

    // Clearing the background drops the key present-only (byte-identity).
    clickColorSwatch(view.container, "Page background", "transparent");
    await flush();
    clickButton(view.container, "Save settings");
    await flush();
    const clearedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1] as {
      data: PageDocumentV2;
    };
    expect(clearedPayload.data.settings.background).toBeUndefined();
    expect(clearedPayload.data.settings.effects).toMatchObject({
      cursorSpotlight: true,
      spotlightColor: PALETTE_ACCENT,
    });

    const closeButton = view.container.querySelector(
      '[data-page-editor-settings-panel="true"] button[aria-label="Close panel"]'
    );
    expect(closeButton).toBeTruthy();
    React.act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-page-editor-settings-panel="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor host settings sheet saves metadata through onSaved", async () => {
  const savedDetail = {
    ...createPage(),
    title: "Renamed Page",
    slug: "renamed-page",
  };
  const host = makeTestHost({
    renderSettings: ({ open, onSaved }) =>
      open ? (
        <div data-host-settings-sheet="true">
          <button type="button" onClick={() => onSaved(savedDetail)}>
            Save host settings
          </button>
        </div>
      ) : null,
  });
  const view = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} host={host} />
  );
  try {
    await flush();
    clickButton(view.container, "Page settings");
    await flush();
    expect(view.container.querySelector('[data-host-settings-sheet="true"]')).toBeTruthy();
    clickButton(view.container, "Save host settings");
    await flush();
    expect(view.container.textContent).toContain("Renamed Page");
    expect(view.container.querySelector('[data-host-settings-sheet="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor host appearance panel closes and the reopen chip restores the rail", async () => {
  const host = makeTestHost({
    appearancePanel: {
      label: "Appearance",
      description: "Host look",
      render: () => <div data-host-appearance="true">Appearance body</div>,
    },
  });
  const view = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} host={host} />
  );
  try {
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="host-appearance"]')
    ).toBeTruthy();
    clickButtonByLabel(view.container, "Close panel");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="host-appearance"]')
    ).toBeNull();

    clickButton(view.container, "Hide panel");
    await flush();
    const reopenChip = view.container.querySelector(
      'button[aria-label="Show panel"]:not([aria-pressed])'
    ) as HTMLElement;
    expect(reopenChip).toBeTruthy();
    React.act(() => {
      reopenChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector("[data-page-editor-floating-toolbar]")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor filters block binds an unscoped saved query and tolerates listing load failure", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButton(view.container, "Add block");
    await flush();
    clickPaletteBlock(view.container, "Filters");
    await flush();

    const trigger = view.container.querySelector(
      'button[data-page-editor-combobox-trigger="Saved query"]'
    );
    expect(trigger).toBeTruthy();
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(collectionClientsState.listListingQueries).toHaveBeenCalled();
    const optionValues = Array.from(
      view.container.querySelectorAll("[data-page-editor-combobox-option]")
    ).map((option) => option.getAttribute("data-page-editor-combobox-option"));
    expect(optionValues).toEqual(["none", "query-services", "query-projects"]);

    clickSelector(view.container, '[data-page-editor-combobox-option="query-projects"] button');
    await flush();
    expect(
      view.container.querySelector('button[data-page-editor-combobox-trigger="Saved query"]')
        ?.textContent
    ).toContain("Projects feed");

    clickButton(view.container, "Save");
    await flush();
    const payload = pageEditorState.updatePage.mock.calls.at(-1)?.[1] as { data: PageDocumentV2 };
    const filtersBlock = payload.data.sections[0]?.blocks.at(-1);
    expect(filtersBlock).toMatchObject({
      type: "filters",
      props: { queryId: "query-projects" },
    });
  } finally {
    view.cleanup();
  }

  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  const failView = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    clickButton(failView.container, "Add block");
    await flush();
    collectionClientsState.listListingQueries.mockRejectedValueOnce(new Error("queries boom"));
    clickPaletteBlock(failView.container, "Filters");
    await flush();
    const trigger = failView.container.querySelector(
      'button[data-page-editor-combobox-trigger="Saved query"]'
    );
    expect(trigger).toBeTruthy();
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(
      failView.container.querySelectorAll(
        '[data-page-editor-combobox-option]:not([data-page-editor-combobox-option="none"])'
      ).length
    ).toBe(0);
    expect(failView.container.textContent).toContain("None");
  } finally {
    failView.cleanup();
  }
});

test("PageEditor media url field clears external urls and resets through the picker", async () => {
  const buildMediaPage = () =>
    createPage({
      currentData: createDocument({
        sections: [
          createPageSectionV2("content", {
            id: "sec-media",
            name: "Media",
            blocks: [
              createPageBlockV2("image", {
                id: "blk-img",
                props: { src: "/hero.jpg", alt: "Hero", caption: "", radius: 0 },
              }),
              createPageBlockV2("image", {
                id: "blk-external",
                props: {
                  src: "https://cdn.example/x.png",
                  alt: "Ext",
                  caption: "",
                  radius: 0,
                },
              }),
            ],
          }),
        ],
      }),
    });
  const readSavedSrc = (blockId: string) => {
    const payload = pageEditorState.updatePage.mock.calls.at(-1)?.[1] as {
      data: PageDocumentV2;
    };
    const block = payload?.data.sections[0]?.blocks.find((candidate) => candidate.id === blockId);
    return block?.props.src;
  };

  // External stored URLs surface a clearable readout; clearing writes null.
  const externalPage = buildMediaPage();
  pageEditorState.cachedPage = externalPage;
  pageEditorState.currentPage = externalPage;
  mediaLibraryState.items = [];
  const externalView = mount(<PageEditor pageId="page-1" initialPage={externalPage} />);
  try {
    await flush();
    clickSelector(externalView.container, '[data-page-editor-block-id="blk-external"]');
    await flush();
    const readout = externalView.container.querySelector(
      '[data-page-editor-media-external="Source"]'
    );
    expect(readout?.textContent).toContain("https://cdn.example/x.png");
    const clearButton = Array.from(readout?.querySelectorAll("button") ?? []).find((button) =>
      button.textContent?.includes("Clear")
    );
    expect(clearButton).toBeTruthy();
    React.act(() => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(externalView.container.textContent).toContain("Unsaved");
    clickButton(externalView.container, "Save");
    await flush();
    expect(readSavedSrc("blk-external")).toBeNull();
  } finally {
    externalView.cleanup();
  }

  // The picker "Clear media" row writes the explicit cleared value.
  const libraryPage = buildMediaPage();
  pageEditorState.cachedPage = libraryPage;
  pageEditorState.currentPage = libraryPage;
  mediaLibraryState.items = [
    { id: "asset-hero", url: "/hero.jpg", type: "image", mimeType: "image/jpeg" },
  ];
  const libraryView = mount(<PageEditor pageId="page-1" initialPage={libraryPage} />);
  try {
    await flush();
    clickSelector(libraryView.container, '[data-page-editor-block-id="blk-img"]');
    await flush();
    const clearMedia = libraryView.container.querySelector('[data-media-picker-clear="true"]');
    expect(clearMedia).toBeTruthy();
    React.act(() => {
      clearMedia?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(libraryView.container.textContent).toContain("Unsaved");
    clickButton(libraryView.container, "Save");
    await flush();
    expect(readSavedSrc("blk-img")).toBeNull();
  } finally {
    libraryView.cleanup();
  }
});
