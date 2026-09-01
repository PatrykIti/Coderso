// @vitest-environment happy-dom

// TASK-105-08-08-L01 — pages reachable coverage: editor commands + controller
// residual.
//
// Drives the real command palette, canvas preview loaders, responsive section
// writes, and section moving through the shared public fixture seam. The only
// local mock is `@/services/pageTemplatesClient` (an admin client module seam
// the editor fixture leaves real), plus typed `PageEditorHost` fixtures.

import React from "react";
import { expect, test, vi } from "vitest";

import {
  clickButton,
  clickButtonByLabel,
  clickSegmentedOption,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  dispatchDocumentKey,
  flush,
  formsClientState,
  mount,
  pageEditorState,
  selectMediaAsset,
} from "./pageEditorV2Fixtures";
import {
  blurElement,
  dblClickElement,
  findInlineEditRegion,
  setInlineRegionText,
} from "./pageEditorV2Helpers";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageEditorHost } from "../../../core/admin/ui/pages/editor/pageEditorHostContract";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import type { PageDetail } from "../../../core/admin/services/pagesClient";

const templatesState = vi.hoisted(() => ({
  listCalls: 0,
  detailCalls: [] as string[],
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  listPageTemplatesCached: vi.fn(async () => {
    templatesState.listCalls += 1;
    return [
      {
        id: "tpl-launch",
        name: "Launch",
        slug: "launch",
        description: null,
        category: "marketing",
        status: "published",
        sectionsCount: 1,
        createdAt: "2026-03-08T09:00:00.000Z",
        updatedAt: "2026-03-08T09:00:00.000Z",
      },
      {
        id: "tpl-vanished",
        name: "Vanished",
        slug: "vanished",
        description: null,
        category: "marketing",
        status: "published",
        sectionsCount: 1,
        createdAt: "2026-03-08T09:00:00.000Z",
        updatedAt: "2026-03-08T09:00:00.000Z",
      },
    ];
  }),
  getPageTemplateCached: vi.fn(async (id: string) => {
    templatesState.detailCalls.push(id);
    // A template that was deleted after listing resolves to nothing.
    if (id === "tpl-vanished") return null;
    return {
      id,
      name: "Launch",
      slug: "launch",
      description: null,
      category: "marketing",
      status: "published",
      sectionsCount: 1,
      createdAt: "2026-03-08T09:00:00.000Z",
      updatedAt: "2026-03-08T09:00:00.000Z",
      document: createDocument({
        sections: [
          createPageSectionV2("cta", {
            id: "sec-tpl",
            name: "Template CTA",
            blocks: [
              createPageBlockV2("heading", {
                id: "blk-tpl",
                props: { text: "From template", level: "h2", align: "center" },
              }),
            ],
          }),
        ],
      }),
    };
  }),
}));

const flushLocal = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Default page host wiring; tests only override the seam they exercise. */
const makeHost = (overrides: Partial<PageEditorHost>): PageEditorHost => ({
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

const twoSectionDocument = () =>
  createDocument({
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
      }),
      createPageSectionV2("content", {
        id: "sec-body",
        name: "Body",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-body-copy",
            props: { text: "Body copy.", format: "plain", align: "left" },
          }),
        ],
      }),
    ],
  });

const savedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

const openPalette = async (container: ParentNode) => {
  dispatchDocumentKey("k", { ctrlKey: true });
  await flush();
  const dialog = container.querySelector('[role="dialog"][aria-label="Command palette"]');
  expect(dialog).toBeTruthy();
  return dialog as HTMLElement;
};

test("the editor resolves the page id from the pages route when no props are given", async () => {
  window.history.pushState({}, "", "/pages/route-page");
  const routed = createPage({ id: "route-page", title: "Routed page" });
  pageEditorState.cachedPage = routed;
  pageEditorState.currentPage = routed;

  const view = mount(<PageEditor />);
  try {
    await flush();
    expect(pageEditorState.getCachedPageDetail).toHaveBeenCalledWith("route-page");
    expect(view.container.textContent).toContain("Routed page");
    expect(view.container.textContent).toContain("Welcome to Coderso");
  } finally {
    view.cleanup();
    window.history.pushState({}, "", "/");
  }
});

test("a host load that resolves to nothing hydrates the empty editor state", async () => {
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = null;
  const host = makeHost({ getCachedDetail: () => null, loadDetail: async () => null });

  const view = mount(<PageEditor pageId="page-missing" host={host} />);
  try {
    await flush();
    // Hydrating from "nothing" renders the empty page canvas, not an error.
    expect(view.container.textContent).toContain("This page has no sections yet.");
  } finally {
    view.cleanup();
  }
});

/** Types a palette query through the public search input of the open dialog. */
const typePaletteQuery = (dialog: Element, value: string) => {
  const search = dialog.querySelector(
    'input[aria-label="Search sections and blocks"]'
  ) as HTMLInputElement;
  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(search, value);
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

/** Runs the active palette row through the search input's keyboard handling. */
const runActivePaletteRow = async (dialog: Element) => {
  const search = dialog.querySelector(
    'input[aria-label="Search sections and blocks"]'
  ) as HTMLInputElement;
  React.act(() => {
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await flushLocal();
};

const paletteIsClosed = (container: ParentNode) =>
  expect(container.querySelector('[role="dialog"][aria-label="Command palette"]')).toBeNull();

test("a host palette scopes the palette and an untargeted insert lands in the existing section", async () => {
  const host = makeHost({ palette: { sections: ["hero"], blocks: ["text"] } });
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} host={host} />);
  try {
    await flush();
    const dialog = await openPalette(view.container);

    // Host scoping: only the hero section and the text block are offered.
    const labels = Array.from(dialog.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    expect(labels.some((label) => label.includes("Hero"))).toBe(true);
    expect(labels.some((label) => label.includes("Text"))).toBe(true);
    expect(labels.some((label) => label.includes("Call to action"))).toBe(false);
    expect(labels.some((label) => label.includes("Heading"))).toBe(false);

    // Query filtering narrows the remaining groups down to the block row.
    typePaletteQuery(dialog, "tex");
    await flushLocal();
    expect(dialog.textContent).not.toContain("Hero section");

    // Enter runs the active (block) row of the filtered results.
    await runActivePaletteRow(dialog);
    paletteIsClosed(view.container);

    // The palette insert selected the new block inside the auto-selected
    // first section.
    clickButton(view.container, "Save");
    await flush();
    const afterFirstInsert = savedDocument();
    expect(afterFirstInsert.sections).toHaveLength(2);
    expect(afterFirstInsert.sections[0]?.blocks).toHaveLength(2);
    expect(afterFirstInsert.sections[0]?.blocks[1]?.type).toBe("text");

    // Escape clears the selection entirely, so the next untargeted insert can
    // no longer ride along on a selected section.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();

    const dialogAgain = await openPalette(view.container);
    typePaletteQuery(dialogAgain, "tex");
    await flushLocal();
    // The scoped host cannot create content sections, so an untargeted block
    // insert falls back to the existing first section instead of appending a
    // new one.
    await runActivePaletteRow(dialogAgain);
    paletteIsClosed(view.container);

    clickButton(view.container, "Save");
    await flush();
    const sections = savedDocument().sections;
    expect(sections).toHaveLength(2);
    const heroBlocks = sections[0]?.blocks ?? [];
    expect(heroBlocks).toHaveLength(3);
    expect(heroBlocks[1]?.type).toBe("text");
    expect(heroBlocks[2]?.type).toBe("text");
    // The inserted block is selected inside its existing section.
    expect(
      Array.from(view.container.querySelectorAll("[data-page-editor-block-id]")).map((node) =>
        node.getAttribute("data-page-editor-block-id")
      )
    ).toContain(heroBlocks[2]?.id);
  } finally {
    view.cleanup();
  }
});

test("the default template library lists, filters, and inserts template sections", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    const dialog = await openPalette(view.container);
    await flushLocal();
    expect(templatesState.listCalls).toBeGreaterThan(0);
    expect(dialog.textContent).toContain("Page templates");

    const search = dialog.querySelector(
      'input[aria-label="Search sections and blocks"]'
    ) as HTMLInputElement;

    // Arrow navigation rests the active row on the first result and back.
    React.act(() => {
      search.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    await flushLocal();
    const activeButtons = () =>
      Array.from(dialog.querySelectorAll('button[aria-current="true"]')).map(
        (button) => button.textContent ?? ""
      );
    expect(activeButtons().length).toBe(1);
    React.act(() => {
      search.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    await flushLocal();

    // Typing a template-only query resets the active row and filters every
    // group down to the template result.
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(search, "launch");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushLocal();
    expect(dialog.textContent).toContain("Launch");
    expect(dialog.textContent).not.toContain("Heading");

    // Enter runs the active result, which inserts the template sections.
    React.act(() => {
      search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flushLocal();
    await flush();

    expect(templatesState.detailCalls).toEqual(["tpl-launch"]);
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();
    expect(view.container.textContent).toContain("From template");
  } finally {
    view.cleanup();
  }
});

test("a listed template whose detail is gone raises the editor error alert", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    const dialog = await openPalette(view.container);
    await flushLocal();
    typePaletteQuery(dialog, "vanished");
    await flushLocal();
    expect(dialog.textContent).toContain("Vanished");

    await runActivePaletteRow(dialog);
    await flush();

    // The detail lookup failed closed: the editor surfaces the insert failure
    // instead of applying a partial template.
    expect(templatesState.detailCalls).toContain("tpl-vanished");
    expect(view.container.textContent).toContain("Page editor error");
    expect(view.container.textContent).toContain("Failed to insert template.");
    paletteIsClosed(view.container);
    expect(view.container.textContent).not.toContain("From template");

    clickButton(view.container, "Save");
    await flush();
    expect(savedDocument().sections).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("a host template that instantiates nothing closes the palette with no edits", async () => {
  const host = makeHost({
    templateLibrary: {
      listPublished: async () => [
        { id: "tpl-empty", name: "Empty shell", description: "Renders nothing yet" },
      ],
      instantiateSections: async () => [],
    },
  });
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} host={host} />);
  try {
    await flush();
    const dialog = await openPalette(view.container);
    await flushLocal();
    typePaletteQuery(dialog, "empty shell");
    await flushLocal();
    expect(dialog.textContent).toContain("Empty shell");

    await runActivePaletteRow(dialog);
    await flush();

    paletteIsClosed(view.container);
    expect(view.container.textContent).not.toContain("Page editor error");

    clickButton(view.container, "Save");
    await flush();
    expect(savedDocument().sections).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("canvas form and collection blocks prefetch their preview sources once per id", async () => {
  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-body",
          name: "Body",
          blocks: [
            createPageBlockV2("form", {
              id: "blk-form",
              props: { formId: "form-contact" },
            }),
            // A repeated id shares the first fetch.
            createPageBlockV2("form", {
              id: "blk-form-copy",
              props: { formId: "form-contact" },
            }),
            createPageBlockV2("collection", {
              id: "blk-collection",
              props: { contentTypeId: "ct-services" },
            }),
            createPageBlockV2("collection", {
              id: "blk-collection-copy",
              props: { contentTypeId: "ct-services" },
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
    await flushLocal();

    // The form detail load backs the canvas form preview fields, fetched once
    // for both referencing blocks.
    expect(formsClientState.detailRequests).toEqual(["form-contact"]);
    expect(view.container.textContent).toContain("Email address");
    // The collection preview resolves the referenced content type's entries.
    expect(collectionClientsState.listContentTypes).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Site audit");
  } finally {
    view.cleanup();
  }
});

test("a failing canvas preview fetch keeps the block rendered and fail-closed", async () => {
  formsClientState.getFormDetail.mockImplementationOnce(async () => {
    throw new Error("Forms offline.");
  });
  collectionClientsState.listContentTypes.mockImplementationOnce(async () => {
    throw new Error("Content types offline.");
  });

  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-body",
          name: "Body",
          blocks: [
            createPageBlockV2("form", { id: "blk-form", props: { formId: "form-contact" } }),
            createPageBlockV2("collection", {
              id: "blk-collection",
              props: { contentTypeId: "ct-services" },
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
    await flushLocal();

    // Both preview sources were requested and their failures swallowed, so the
    // canvas falls back to the plain block frames without preview data.
    expect(formsClientState.getFormDetail).toHaveBeenCalledWith("form-contact");
    expect(collectionClientsState.listContentTypes).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).not.toContain("Email address");
    expect(view.container.textContent).not.toContain("Site audit");
    expect(
      Array.from(view.container.querySelectorAll("[data-page-editor-block-id]")).map((node) =>
        node.getAttribute("data-page-editor-block-id")
      )
    ).toEqual(["blk-form", "blk-collection"]);
  } finally {
    view.cleanup();
  }
});

test("a failed background revalidation keeps the cached draft on screen", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const host = makeHost({
    loadDetail: async () => {
      throw new Error("Network down.");
    },
  });

  const view = mount(<PageEditor pageId="page-1" initialPage={page} host={host} />);
  try {
    await flush();

    // The stale-while-error state is explicit: cached content stays and the
    // warning names the failed refresh.
    expect(view.container.textContent).toContain("Cached draft shown");
    expect(view.container.textContent).toContain("Failed to load page.");
    expect(view.container.textContent).toContain("Welcome to Coderso");
  } finally {
    view.cleanup();
  }
});

test("an in-flight revalidation is dropped when the editor unmounts first", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const loadDetail = vi.fn(async () => page);
  const host = makeHost({ loadDetail });

  const first = mount(<PageEditor pageId="page-1" initialPage={page} host={host} />);
  // Unmount before the forced revalidation resolves: its callback must not
  // touch state afterwards.
  first.cleanup();
  await flush();

  const second = mount(<PageEditor pageId="page-1" initialPage={page} host={host} />);
  try {
    await flush();
    expect(loadDetail).toHaveBeenCalledTimes(2);
    expect(second.container.textContent).toContain("Welcome to Coderso");
    expect(second.container.textContent).not.toContain("Page editor error");
  } finally {
    second.cleanup();
  }
});

test("tablet section style patches and block override resets write the right target", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();
    clickButtonByLabel(view.container, "Tablet");
    await flush();

    // Section-level style write on a non-desktop device.
    clickSelector(view.container, '[data-page-editor-section="hero"][data-section-id="sec-hero"]');
    await flush();
    clickButtonByLabel(view.container, "Background panel");
    await flush();
    selectMediaAsset(view.container, "Background image", "asset-hero");
    await flushLocal();
    clickButton(view.container, "Save");
    await flush();
    expect(savedDocument().sections[0]?.responsive?.tablet?.style?.backgroundImage).toBe(
      "/hero.jpg"
    );

    // The same override on the selected block clears through the block path.
    // The background panel stays open across the selection change.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickSegmentedOption(view.container, "Background type", "image");
    await flush();
    selectMediaAsset(view.container, "Background image", "asset-card");
    await flushLocal();

    // The Responsive panel lists the block's breakpoint override, and its
    // reset affordance clears the override for the selected block only.
    clickButtonByLabel(view.container, "Responsive panel");
    await flush();
    const overrideReset = () =>
      view.container.querySelector('button[aria-label="Reset Background image to inherited"]');
    expect(overrideReset()).toBeTruthy();
    React.act(() => {
      overrideReset()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushLocal();
    expect(overrideReset()).toBeNull();

    clickButton(view.container, "Save");
    await flush();
    const heading = savedDocument().sections[0]?.blocks[0];
    expect(heading?.responsive?.tablet?.style?.backgroundImage).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("the floating toolbar moves the selected section and inline edits resolve across sections", async () => {
  const page = createPage({ currentData: twoSectionDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;

  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  try {
    await flush();

    // The first section has nothing above it: "Move section up" is a no-op.
    clickSelector(view.container, '[data-page-editor-section="hero"][data-section-id="sec-hero"]');
    await flush();
    clickButtonByLabel(view.container, "Move section up");
    await flush();
    expect(
      Array.from(view.container.querySelectorAll("[data-section-id]")).map((node) =>
        node.getAttribute("data-section-id")
      )
    ).toEqual(["sec-hero", "sec-body"]);

    // A lone block in its section cannot move either direction.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    expect(
      Array.from(view.container.querySelectorAll("[data-page-editor-block-id]")).map((node) =>
        node.getAttribute("data-page-editor-block-id")
      )
    ).toEqual(["blk-heading", "blk-body-copy"]);

    // An inline edit commit resolves the block path section by section, so
    // the miss on the non-owning first section is part of the real flow.
    clickSelector(view.container, '[data-page-editor-block-id="blk-body-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-body-copy", "text"));
    await flush();
    setInlineRegionText(
      findInlineEditRegion(view.container, "blk-body-copy", "text"),
      "Edited body copy"
    );
    blurElement(findInlineEditRegion(view.container, "blk-body-copy", "text"));
    await flush();
    expect(view.container.textContent).toContain("Edited body copy");

    // Selecting the second section and moving it up swaps the order.
    clickSelector(
      view.container,
      '[data-page-editor-section="content"][data-section-id="sec-body"]'
    );
    await flush();
    clickButtonByLabel(view.container, "Move section up");
    await flush();
    expect(
      Array.from(view.container.querySelectorAll("[data-section-id]")).map((node) =>
        node.getAttribute("data-section-id")
      )
    ).toEqual(["sec-body", "sec-hero"]);

    clickButton(view.container, "Save");
    await flush();
    const sections = savedDocument().sections;
    expect(sections[0]?.id).toBe("sec-body");
    expect(sections[1]?.id).toBe("sec-hero");
    expect(sections[0]?.blocks[0]?.props.text).toBe("Edited body copy");
  } finally {
    view.cleanup();
  }
});
