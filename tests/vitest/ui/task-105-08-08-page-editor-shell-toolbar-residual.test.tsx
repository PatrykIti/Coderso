// @vitest-environment happy-dom

// TASK-105-08-08-L01 — pages reachable coverage: editor shell + toolbar residual.
//
// Drives the real PageEditor chrome (Layers panel, device switcher, Escape
// ladder, supported hotkeys, inline text mark toolbar) through the shared
// public fixture seam. The only mocks are the ones `pageEditorV2Fixtures`
// already installs at module seams; the single custom host fixture is a typed
// `PageEditorHost` (no casts) used to surface the host settings sheet.

import React from "react";
import { expect, test } from "vitest";

import {
  clickButton,
  clickButtonByLabel,
  clickResponsiveReset,
  clickSelector,
  createDocument,
  createPage,
  dispatchDocumentKey,
  findFieldControl,
  flush,
  mount,
  pageEditorState,
  setToggleField,
  toastState,
} from "./pageEditorV2Fixtures";
import { dblClickElement, findInlineEditRegion } from "./pageEditorV2Helpers";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { findRecoverableAutosaveRevision } from "../../../core/admin/ui/pages/editor/PageEditorToolbar";
import type {
  PageEditorHost,
  PageEditorResourceDetail,
  PageEditorRevision,
} from "../../../core/admin/ui/pages/editor/pageEditorHostContract";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const flushLocal = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Default page host wiring; tests only override the chrome they exercise. */
const makeResidualHost = (overrides: Partial<PageEditorHost>): PageEditorHost => ({
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
  saveDocument: async (id, document) =>
    pageEditorState.updatePage(id, { data: document }) as unknown as PageDetail,
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

const hostSettingsSheetHost = () =>
  makeResidualHost({
    renderSettings: ({ open }) =>
      open ? <div data-host-settings-sheet="true">Host page settings</div> : null,
  });

const nestedColumnsPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-nested",
          name: "Nested section",
          blocks: [
            createPageBlockV2("columns", {
              id: "blk-columns",
              props: { count: 2, gap: 24, distribution: "equal" },
              slots: {
                "column:1": [
                  createPageBlockV2("heading", {
                    id: "blk-left",
                    props: { text: "Left nested", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });

const tabletOverridePage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome to Coderso", level: "h1", align: "center" },
            }),
          ],
          visibility: { visible: true, authOnly: false, anchor: "hero-base" },
          responsive: {
            tablet: {
              style: { backgroundImage: "/tablet-hero.jpg" },
              visibility: {
                anchor: "hero-tablet",
                startsAt: "2026-06-10T10:00:00Z",
                endsAt: "2026-06-11T10:00:00Z",
              },
            },
          },
        }),
      ],
    }),
  });

const datedPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome to Coderso", level: "h1", align: "center" },
            }),
          ],
          visibility: {
            visible: true,
            authOnly: false,
            anchor: "hero-base",
            startsAt: "2026-06-10T10:00:00Z",
            endsAt: "2026-06-11T10:00:00Z",
          },
        }),
      ],
    }),
  });

const savedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

const mountEditor = async (
  props: {
    page?: PageDetail;
    host?: PageEditorHost;
  } = {}
) => {
  const page = props.page ?? pageEditorState.cachedPage;
  const view = mount(
    <PageEditor
      pageId="page-1"
      initialPage={page ?? undefined}
      host={props.host as PageEditorHost | undefined}
    />
  );
  await flush();
  return view;
};

test("a newer autosave revision surfaces the recoverable draft banner", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-published",
      pageId: "page-1",
      version: 1,
      kind: "publish",
      data: {},
      createdAt: "2026-03-08T08:00:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-autosave-old",
      pageId: "page-1",
      version: 2,
      kind: "autosave",
      data: {},
      createdAt: "2026-03-08T07:30:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-autosave-new",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      data: {},
      createdAt: "2026-03-08T09:45:00.000Z",
      createdBy: null,
    },
  ] satisfies PageRevision[];

  const view = await mountEditor();

  try {
    clickButton(view.container, "Page settings");
    await flush();

    // Only the newest autosave newer than the page detail qualifies.
    expect(view.container.textContent).toContain("A newer draft version from");
    expect(view.container.textContent).not.toContain("rev-autosave-old");
    expect(view.container.textContent).toContain("Restore draft");
  } finally {
    view.cleanup();
  }
});

test("Escape closes each overlay in priority order", async () => {
  const view = await mountEditor({ host: hostSettingsSheetHost() });

  try {
    const overlaysClosed = () =>
      view.container.querySelector(
        '[role="dialog"][aria-label="Delete selected block"], [role="dialog"][aria-label="Command palette"], [data-host-settings-sheet="true"], [data-page-editor-layers-panel="true"], [data-runtime-preview-dialog="true"]'
      ) === null && !view.container.textContent?.includes("Page history");

    // 1. Delete confirmation wins over every other overlay.
    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dispatchDocumentKey("Delete");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeTruthy();
    // Editing hotkeys are blocked while a blocking overlay is up.
    dispatchDocumentKey("z", { metaKey: true });
    await flush();
    expect(view.container.textContent).toContain("Existing page copy.");
    dispatchDocumentKey("Escape");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeNull();

    // 2. Command palette.
    dispatchDocumentKey("k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    dispatchDocumentKey("Escape");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();

    // 3. Layers panel.
    clickButton(view.container, "Layers");
    await flush();
    expect(view.container.querySelector('[data-page-editor-layers-panel="true"]')).toBeTruthy();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-layers-panel="true"]')).toBeNull();

    // 4. Host settings sheet (renderSettings hosts use the header button).
    clickButton(view.container, "Page settings");
    await flush();
    expect(view.container.querySelector('[data-host-settings-sheet="true"]')).toBeTruthy();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-host-settings-sheet="true"]')).toBeNull();

    // 5. History sheet.
    clickButton(view.container, "History");
    await flush();
    expect(view.container.textContent).toContain("Page history");
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.textContent).not.toContain("Page history");

    // 6. Runtime preview dialog.
    clickButton(view.container, "Preview");
    await flush();
    expect(view.container.querySelector('[data-runtime-preview-dialog="true"]')).toBeTruthy();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-runtime-preview-dialog="true"]')).toBeNull();

    expect(overlaysClosed()).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("Escape closes the compact page settings panel and then clears the selection", async () => {
  const view = await mountEditor();

  try {
    clickButtonByLabel(view.container, "Page settings");
    await flush();
    expect(view.container.querySelector('[data-page-editor-settings-panel="true"]')).toBeTruthy();

    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-settings-panel="true"]')).toBeNull();

    // With no overlay left, Escape deselects the section.
    clickSelector(view.container, '[data-page-editor-section="hero"]');
    await flush();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("supported hotkeys undo, redo, copy, paste, and duplicate the selected section", async () => {
  const view = await mountEditor();

  try {
    // History starts empty: both undo and redo are no-ops before any edit.
    dispatchDocumentKey("z", { metaKey: true });
    await flush();
    dispatchDocumentKey("z", { metaKey: true, shiftKey: true });
    await flush();
    expect(view.container.textContent).toContain("Existing page copy.");

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    const copyField = findFieldControl(view.container, "Primary text");
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(copyField, "Edited page copy");
      copyField.dispatchEvent(new Event("input", { bubbles: true }));
      copyField.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("Edited page copy");

    // Undo restores the previous draft text.
    dispatchDocumentKey("z", { metaKey: true });
    await flush();
    expect(view.container.textContent).toContain("Existing page copy.");
    expect(view.container.textContent).not.toContain("Edited page copy");

    // Shift+undo redoes it, plain undo takes it back, Cmd+Y redoes again.
    dispatchDocumentKey("z", { metaKey: true, shiftKey: true });
    await flush();
    expect(view.container.textContent).toContain("Edited page copy");
    dispatchDocumentKey("z", { metaKey: true });
    await flush();
    expect(view.container.textContent).not.toContain("Edited page copy");
    dispatchDocumentKey("y", { ctrlKey: true });
    await flush();
    expect(view.container.textContent).toContain("Edited page copy");

    // Copy + paste the selected block fragment into the same section.
    dispatchDocumentKey("c", { metaKey: true });
    await flush();
    dispatchDocumentKey("v", { metaKey: true });
    await flush();
    clickButton(view.container, "Save");
    await flush();
    const pasted = savedDocument();
    expect(pasted.sections[0]?.blocks).toHaveLength(3);
    expect(pasted.sections[0]?.blocks[1]?.props.text).toBe("Edited page copy");
    expect(pasted.sections[0]?.blocks[2]?.props.text).toBe("Edited page copy");
    expect(pasted.sections[0]?.blocks[1]?.id).not.toBe(pasted.sections[0]?.blocks[2]?.id);

    // Duplicate the SECTION (no block selected) through Cmd+D.
    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-section-id="sec-hero"]');
    await flush();
    dispatchDocumentKey("Escape");
    await flush();
    dispatchDocumentKey("d", { metaKey: true });
    await flush();
    clickButton(view.container, "Save");
    await flush();
    expect(savedDocument().sections).toHaveLength(2);
    expect(savedDocument().sections[1]?.name).toContain("Hero");
  } finally {
    view.cleanup();
  }
});

test("Layers adds a block to a nested slot and the panel close button dismisses it", async () => {
  pageEditorState.cachedPage = nestedColumnsPage();
  pageEditorState.currentPage = nestedColumnsPage();
  const view = await mountEditor({ page: nestedColumnsPage() });

  try {
    clickButton(view.container, "Layers");
    await flush();
    expect(view.container.querySelector('[data-page-editor-layers-panel="true"]')).toBeTruthy();

    // The slot "Add" affordance opens the command palette scoped to that slot.
    clickButtonByLabel(view.container, "Add block to Column 2");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();

    dispatchDocumentKey("Escape");
    await flush();

    // The panel's own close button hides the layers surface.
    const layersPanel = view.container.querySelector(
      '[data-page-editor-layers-panel="true"]'
    ) as HTMLElement;
    const closeButton = Array.from(layersPanel.querySelectorAll("button"))[0];
    expect(closeButton).toBeTruthy();
    React.act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-page-editor-layers-panel="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("closing the floating rail keeps a reopen chip that restores the panel", async () => {
  const view = await mountEditor();

  try {
    clickSelector(view.container, '[data-page-editor-section="hero"]');
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    clickButtonByLabel(view.container, "Hide panel");
    await flush();

    const reopenChip = view.container.querySelector(
      'button[aria-label="Show panel"]:not([aria-pressed])'
    ) as HTMLElement;
    expect(reopenChip).toBeTruthy();
    React.act(() => {
      reopenChip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("tablet overrides reset through the background and visibility affordances", async () => {
  pageEditorState.cachedPage = tabletOverridePage();
  pageEditorState.currentPage = tabletOverridePage();
  const view = await mountEditor({ page: tabletOverridePage() });

  try {
    clickButtonByLabel(view.container, "Tablet");
    await flush();

    // Background image override resets to the inherited (empty) desktop value.
    clickButtonByLabel(view.container, "Background panel");
    await flush();
    clickResponsiveReset(view.container, "Background image");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-responsive-reset="Background image"]')
    ).toBeNull();

    clickButtonByLabel(view.container, "Visibility panel");
    await flush();
    clickResponsiveReset(view.container, "Anchor");
    await flush();
    expect(view.container.querySelector('[data-page-editor-responsive-reset="Anchor"]')).toBeNull();

    clickResponsiveReset(view.container, "Starts at");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-responsive-reset="Starts at"]')
    ).toBeNull();

    clickResponsiveReset(view.container, "Ends at");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-responsive-reset="Ends at"]')
    ).toBeNull();

    clickButton(view.container, "Save");
    await flush();

    const section = savedDocument().sections[0];
    expect(section?.responsive?.tablet?.style?.backgroundImage).toBeUndefined();
    expect(section?.responsive?.tablet?.visibility?.anchor).toBeUndefined();
    expect(section?.responsive?.tablet?.visibility?.startsAt).toBeUndefined();
    expect(section?.responsive?.tablet?.visibility?.endsAt).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("turning the date range toggle off clears the stored visibility dates", async () => {
  pageEditorState.cachedPage = datedPage();
  pageEditorState.currentPage = datedPage();
  const view = await mountEditor({ page: datedPage() });

  try {
    clickButtonByLabel(view.container, "Visibility panel");
    await flush();
    expect(view.container.querySelector('[data-page-editor-date-range-toggle="on"]')).toBeTruthy();

    setToggleField(view.container, "Date range", false);
    await flush();
    expect(view.container.querySelector('[data-page-editor-date-range-toggle="off"]')).toBeTruthy();

    clickButton(view.container, "Save");
    await flush();
    const visibility = savedDocument().sections[0]?.visibility;
    expect(visibility?.startsAt ?? null).toBeNull();
    expect(visibility?.endsAt ?? null).toBeNull();
    expect(visibility?.anchor).toBe("hero-base");
  } finally {
    view.cleanup();
  }
});

test("settings save failures surface the draft-save error message", async () => {
  pageEditorState.updatePage.mockRejectedValueOnce(new Error("Slug already in use."));
  const view = await mountEditor();

  try {
    clickButtonByLabel(view.container, "Page settings");
    await flush();
    clickButton(view.container, "Save settings");
    await flushLocal();

    expect(view.container.textContent).toContain("Failed to save draft.");
    expect(toastState.error).toHaveBeenCalledWith("Failed to save draft.");
  } finally {
    view.cleanup();
  }
});

test("the inline text color picker keeps the selection and the editing session", async () => {
  const view = await mountEditor();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const toolbar = view.container.querySelector('[data-page-editor-text-mark-toolbar="true"]');
    expect(toolbar).toBeTruthy();

    const pickerLabel = toolbar?.querySelector(
      "[data-page-editor-text-color-picker-label]"
    ) as HTMLElement | null;
    expect(pickerLabel).toBeTruthy();
    React.act(() => {
      pickerLabel?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // stopPropagation keeps the click off the block frame, so the inline edit
    // session and the toolbar both survive the picker click.
    expect(
      findInlineEditRegion(view.container, "blk-copy", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("active");
    expect(
      view.container.querySelector('[data-page-editor-text-mark-toolbar="true"]')
    ).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("findRecoverableAutosaveRevision returns the newest autosave newer than the page detail", () => {
  const page: Pick<PageEditorResourceDetail, "updatedAt"> = {
    updatedAt: "2026-01-10T00:00:00.000Z",
  };
  const revision = (
    id: string,
    kind: PageEditorRevision["kind"],
    createdAt: string
  ): PageEditorRevision => ({
    id,
    pageId: "page-1",
    version: 1,
    kind,
    data: {},
    createdAt,
    createdBy: null,
  });

  // Deliberately unsorted: two qualifying autosaves straddle a newer
  // published-kind revision, plus one autosave older than the loaded detail.
  const revisions: PageEditorRevision[] = [
    revision("rev-autosave-early", "autosave", "2026-01-12T08:00:00.000Z"),
    revision("rev-publish-later", "publish", "2026-01-13T09:00:00.000Z"),
    revision("rev-autosave-late", "autosave", "2026-01-12T12:30:00.000Z"),
    revision("rev-autosave-stale", "autosave", "2026-01-09T12:00:00.000Z"),
  ];

  expect(findRecoverableAutosaveRevision(revisions, page)?.id).toBe("rev-autosave-late");

  // Autosaves that are not newer than the loaded detail never qualify, so a
  // stale-only history recovers nothing.
  expect(
    findRecoverableAutosaveRevision(
      [revision("rev-autosave-stale", "autosave", "2026-01-09T12:00:00.000Z")],
      page
    )
  ).toBeNull();
});

test("the floating chip reopens the hidden panel while a section stays selected", async () => {
  const view = await mountEditor();

  try {
    clickSelector(view.container, '[data-page-editor-section="hero"]');
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    clickButtonByLabel(view.container, "Hide panel");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();

    // After hiding, the sub-toolbar toggle AND the builder chip both read
    // aria-label="Show panel" (the public fixture's Button mock drops
    // aria-pressed), so the chip is isolated by its shell-owned absolute
    // top-right placement classes — the discriminator the read-only
    // page-editor-builder-chrome-flow suite also uses.
    const showPanelButtons = view.container.querySelectorAll('button[aria-label="Show panel"]');
    expect(showPanelButtons).toHaveLength(2);
    const chip = Array.from(showPanelButtons).find(
      (button) => button.className.includes("right-4") && button.className.includes("top-4")
    );
    expect(chip?.className).toContain("absolute");

    clickSelector(view.container, 'button[aria-label="Show panel"].absolute.top-4.right-4');
    await flush();

    // The chip restored the panel: the rail is back and the toggle flipped back
    // to "Hide panel", with no "Show panel" affordance left in the toolbar.
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Hide panel"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Show panel"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});
