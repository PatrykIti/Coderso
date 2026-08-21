// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  getCommandGroupButtons,
  harnessState,
  PageEditorNavigationHarness,
  createPage,
  createDocument,
  mount,
  flush,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  changeField,
  findSegmentedGroup,
  findColorSwatchGroup,
} from "./pageEditorV2FlowHarness";

const { pageEditorState, toastState, activeSurfaceState, previewDialogState, mediaLibraryState } =
  harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  createPageBlockV2,
  createPageSectionV2,
  PageBlockV2,
  PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  getPageEditorControlsForTarget,
  type PageEditorControlDefinition,
  type PageEditorControlPanel,
} from "../../../core/services/pages/pageEditorControlRegistry";
import { resolvePageEditorControlUiModel } from "../../../core/services/pages/pageEditorControlUiModel";
import { getPageBlockRenderDefault } from "../../../core/services/pages/pageBlockRenderDefaults";

const expectedControlDisplayValue = (
  target: unknown,
  control: PageEditorControlDefinition,
  renderDefault?: string | number
): string => {
  const stored = readDocumentPath(target, control.path);
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "toggle") {
    const effective = typeof stored === "boolean" ? stored : control.fallback === true;
    return effective ? "yes" : "no";
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const effective =
      typeof stored === "number"
        ? stored
        : typeof renderDefault === "number"
          ? renderDefault
          : typeof control.fallback === "number"
            ? control.fallback
            : model.min;
    return String(Math.min(model.max, Math.max(model.min, effective)));
  }
  if (model.kind === "swatch") return typeof stored === "string" ? stored : "";
  if (model.kind === "media") {
    if (typeof stored !== "string" || stored.length === 0) return "";
    return mediaLibraryState.items.find((item) => item.url === stored)?.id ?? "";
  }
  if (typeof stored === "string") return stored;
  if (typeof stored === "number" || typeof stored === "boolean") return String(stored);
  if (typeof renderDefault === "string") return renderDefault;
  return typeof control.fallback === "string" ? control.fallback : "";
};

const floatingPanelButtonLabels: Partial<Record<PageEditorControlPanel, string>> = {
  layout: "Layout panel",
  content: "Content panel",
  typography: "Typography panel",
  style: "Style panel",
  spacing: "Spacing panel",
  background: "Background panel",
  responsive: "Responsive panel",
  visibility: "Visibility panel",
};

const openFloatingPanel = async (container: ParentNode, panel: PageEditorControlPanel) => {
  if (container.querySelector(`[data-page-editor-toolbar-panel="${panel}"]`)) return;
  clickButtonByLabel(container, floatingPanelButtonLabels[panel] ?? `${panel} panel`);
  await flush();
};

const readCanvasSectionTypes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-page-editor-section]")).map((element) =>
    element.getAttribute("data-page-editor-section")
  );

const readControlDisplayValue = (
  container: ParentNode,
  control: PageEditorControlDefinition
): string => {
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "segmented") {
    const group = findSegmentedGroup(container, control.label);
    const active = group.querySelector(
      '[data-page-editor-segmented-option][aria-pressed="true"]'
    ) as HTMLElement | null;
    return active?.dataset.pageEditorSegmentedOption ?? "";
  }
  if (model.kind === "select") {
    const select = Array.from(container.querySelectorAll('[data-page-editor-control="select"]'))
      .find((entry) => entry.textContent?.includes(control.label))
      ?.querySelector("select");
    expect(select, control.id).toBeTruthy();
    return (select as HTMLSelectElement).value;
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const slider = container.querySelector(
      `input[type="range"][data-page-editor-slider="${control.label}"]`
    );
    expect(slider, control.id).toBeTruthy();
    return (slider as HTMLInputElement).value;
  }
  if (model.kind === "toggle") {
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === control.label
    );
    expect(toggle, control.id).toBeTruthy();
    return toggle?.getAttribute("aria-checked") === "true" ? "yes" : "no";
  }
  if (model.kind === "swatch") {
    const group = findColorSwatchGroup(container, control.label);
    const transparent = group.querySelector('[data-page-editor-color-swatch="transparent"]');
    if (transparent?.getAttribute("aria-pressed") === "true") return "";
    const hex = group.querySelector(`input[data-page-editor-color-hex="${control.label}"]`);
    expect(hex, control.id).toBeTruthy();
    return (hex as HTMLInputElement).value;
  }
  if (model.kind === "media") {
    const host = container.querySelector(
      `[data-page-editor-media-control="${control.label}"] [data-media-picker-value]`
    );
    expect(host, control.id).toBeTruthy();
    return host?.getAttribute("data-media-picker-value") ?? "";
  }
  const field = Array.from(container.querySelectorAll('[data-page-editor-control="text"]'))
    .find((entry) => entry.textContent?.includes(control.label))
    ?.querySelector("input");
  expect(field, control.id).toBeTruthy();
  return (field as HTMLInputElement).value;
};

const readDocumentPath = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    source
  );

test("PageEditor autosaves dirty v2 section data", async () => {
  vi.useFakeTimers();
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
    });

    expect(pageEditorState.autosavePage).toHaveBeenCalledWith("page-1", {
      data: expect.objectContaining({
        schemaVersion: 2,
        sections: expect.arrayContaining([expect.objectContaining({ type: "cta" })]),
      }),
    });
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
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

test("PageEditor floating panel marks the stored heading level and shows effective render defaults", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  const pressedOption = (label: string) =>
    (
      findSegmentedGroup(view.container, label).querySelector(
        '[data-page-editor-segmented-option][aria-pressed="true"]'
      ) as HTMLElement | null
    )?.dataset.pageEditorSegmentedOption;

  try {
    await flush();

    // Stored level h1 must be the pressed Level option (owner bug #9).
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    await openFloatingPanel(view.container, "content");
    expect(pressedOption("Level")).toBe("h1");

    // Unset opacity renders fully opaque: the slider must present the schema
    // default 1, never the zero-value lie.
    await openFloatingPanel(view.container, "style");
    const opacity = view.container.querySelector(
      'input[type="range"][data-page-editor-slider="Opacity"]'
    ) as HTMLInputElement;
    expect(opacity.value).toBe("1");
    expect(
      opacity.closest('[data-page-editor-control="slider"]')?.querySelector("output")?.textContent
    ).toBe("1");
    // Unset radius/shadow display their schema defaults.
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Radius"]'
        ) as HTMLInputElement
      ).value
    ).toBe("0");
    expect(pressedOption("Shadow")).toBe("none");

    // Owner finding #9 (round 3): unset block width/align display the
    // EFFECTIVE RENDERED default as active — the grid-stretch frame spans the
    // full column ("full") and the content text flows left ("left").
    await openFloatingPanel(view.container, "layout");
    expect(pressedOption("Width")).toBe("full");
    expect(pressedOption("Align")).toBe("left");

    // Unset typography tokens display the h1's baked styling as active:
    // sans page font, text-5xl, font-semibold, leading-tight (1.25).
    await openFloatingPanel(view.container, "typography");
    expect(pressedOption("Font family")).toBe("sans");
    expect(pressedOption("Font size")).toBe("5xl");
    expect(pressedOption("Font weight")).toBe("semibold");
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Line height"]'
        ) as HTMLInputElement
      ).value
    ).toBe("1.25");
    // The hero-starter heading STORES props.align center: Text align must
    // present the stored value, not a render default.
    expect(pressedOption("Text align")).toBe("center");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating panel presents stored values and tablet overrides per breakpoint", async () => {
  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Breakpoint heading", level: "h1", align: "center" },
              style: { opacity: 0.4 },
              responsive: {
                tablet: { props: { level: "h3" }, style: { opacity: 0.6 } },
              },
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

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();

    const pressedLevel = () =>
      (
        findSegmentedGroup(view.container, "Level").querySelector(
          '[data-page-editor-segmented-option][aria-pressed="true"]'
        ) as HTMLElement | null
      )?.dataset.pageEditorSegmentedOption;
    const opacityValue = () =>
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Opacity"]'
        ) as HTMLInputElement
      ).value;

    // Desktop presents the base values.
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Tablet presents the override values.
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    expect(opacityValue()).toBe("0.6");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h3");

    // Mobile has no override: it presents the inherited base values.
    clickButtonByLabel(view.container, "Mobile");
    await flush();
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Back on desktop the base values are untouched.
    clickButtonByLabel(view.container, "Desktop");
    await flush();
    expect(opacityValue()).toBe("0.4");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating-panel sweep: every rendered control presents the document's effective value", async () => {
  const sweepSection = createPageSectionV2("hero", {
    id: "sec-sweep",
    name: "Sweep hero",
    variant: "centered",
    layout: { columns: 2, align: "center", justify: "between", maxWidth: 960 },
    style: {
      background: "#fef3c7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#123456",
      radius: 12,
      shadow: "md",
      // TASK-539-03-L01 gate: parallaxIntensity is reachable only while the
      // base scroll effect is parallax; keeping the gate open keeps the sweep
      // over the full style-panel surface (stored 0.5 must display as-is).
      scrollEffect: "parallax",
      parallaxIntensity: 0.5,
    },
    spacing: { paddingTop: 32, paddingBottom: 48, paddingLeft: 24, paddingRight: 16, gap: 12 },
    blocks: [
      createPageBlockV2("text", {
        id: "blk-sweep",
        props: { text: "Sweep copy.", format: "plain", align: "center" },
        style: {
          width: "full",
          textColor: "#123456",
          opacity: 0.4,
          padding: { top: 8 },
          fontWeight: "bold",
          letterSpacing: 1.5,
        },
      }),
    ],
  });
  const page = createPage({
    currentData: createDocument({ sections: [sweepSection] }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);

  try {
    await flush();

    const sweptControlIds: string[] = [];
    const sweepTarget = async (
      target: unknown,
      controls: readonly PageEditorControlDefinition[],
      panels: readonly PageEditorControlPanel[],
      block?: PageBlockV2
    ) => {
      for (const panel of panels) {
        await openFloatingPanel(view.container, panel);
        const visibleControls = controls
          .filter((entry) => entry.panel === panel)
          .filter(
            (entry) =>
              entry.id !== "block.style.backgroundImage" || block?.style?.backgroundType === "image"
          );
        for (const control of visibleControls) {
          expect(readControlDisplayValue(view.container, control), control.id).toBe(
            expectedControlDisplayValue(
              target,
              control,
              block ? getPageBlockRenderDefault(block, control.path) : undefined
            )
          );
          sweptControlIds.push(control.id);
        }
      }
    };

    // Section sweep: the first section is selected by default.
    await sweepTarget(
      sweepSection,
      getPageEditorControlsForTarget({ kind: "section", type: "hero" }),
      ["layout", "style", "background", "spacing", "visibility", "responsive"]
    );

    // Block sweep: a text block with a partial style (stored + unset fields).
    // Unset fields with a baked render default (width/align/typography) must
    // display it; stored fields must beat it (owner finding #9 round 3).
    clickSelector(view.container, '[data-page-editor-block-id="blk-sweep"]');
    await flush();
    await sweepTarget(
      sweepSection.blocks[0],
      getPageEditorControlsForTarget({ kind: "block", type: "text" }),
      ["content", "typography", "layout", "style", "background", "spacing", "visibility"],
      sweepSection.blocks[0]
    );

    // The sweep must have exercised the full registry surface of both targets.
    expect(sweptControlIds.length).toBeGreaterThanOrEqual(40);
    expect(new Set(sweptControlIds).size).toBe(sweptControlIds.length);
  } finally {
    view.cleanup();
  }
});

test("PageEditor save keeps a freshly inserted empty list block in the document", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    const listEntry = getCommandGroupButtons(view.container, "Blocks").find(
      (button) => button.querySelector("span")?.textContent === "List"
    );
    expect(listEntry).toBeTruthy();
    React.act(() => {
      listEntry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // Save immediately, before the author types any items.
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedList = savedDocument.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "list");
    expect(savedList?.props).toMatchObject({ items: [], ordered: false });
  } finally {
    view.cleanup();
  }
});

// --- Multi-column canvas authoring UX (owner findings #5 #6 #7 #8) ---
