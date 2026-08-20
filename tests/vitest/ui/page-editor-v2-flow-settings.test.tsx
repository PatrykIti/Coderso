// @vitest-environment happy-dom

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  changeField,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  dispatchDocumentKey,
  findButton,
  flush,
  formsClientState,
  getCommandGroupButtons,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  setSliderField,
  setToggleField,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { PageSectionRender } from "../../../core/services/pages/pageRendererV2";

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

const findInlineEditRegion = (container: ParentNode, blockId: string, propPath: string) => {
  const region = container.querySelector(
    `[data-page-editor-block-id="${blockId}"] [data-page-editor-inline-edit-prop="${propPath}"]`
  );
  expect(region).toBeTruthy();
  return region as HTMLElement;
};

const dblClickElement = (element: Element | null) => {
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  });
};

const blurElement = (element: HTMLElement) => {
  React.act(() => {
    element.blur();
  });
};

const setInlineRegionText = (element: HTMLElement, value: string) => {
  React.act(() => {
    element.textContent = value;
  });
};

const clickPaletteBlock = (container: ParentNode, label: string) => {
  const button = getCommandGroupButtons(container, "Blocks").find((entry) =>
    entry.textContent?.includes(label)
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

test("PageEditor columns slot ghost tiles insert into the exact slot like Layers does", async () => {
  const columnsPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-columns",
          name: "Columns",
          blocks: [
            createPageBlockV2("columns", {
              id: "blk-columns",
              props: { count: 2, gap: 24, distribution: "equal" },
              slots: {
                "column:1": [
                  createPageBlockV2("heading", {
                    id: "blk-col-head",
                    props: { text: "Left heading", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = columnsPage;
  pageEditorState.currentPage = columnsPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={columnsPage} />);

  try {
    await flush();

    // Empty slot gets a full ghost tile; the non-empty slot gets the compact
    // trailing affordance — both labelled like the Layers insert path.
    expect(view.container.querySelectorAll('[data-page-editor-ghost="columns-slot"]')).toHaveLength(
      1
    );
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="columns-slot-append"]')
    ).toHaveLength(1);

    clickButtonByLabel(view.container, "Add block to Column 2");
    await flush();
    clickPaletteBlock(view.container, "Text");
    await flush();

    const insertedNested = view.container.querySelector(
      '[data-page-editor-block-path="root:0/column:2:0"]'
    );
    expect(insertedNested).toBeTruthy();
    expect(insertedNested?.getAttribute("data-page-editor-block")).toBe("text");
    expect(insertedNested?.getAttribute("data-page-editor-block-slot-key")).toBe("column:2");

    clickSelector(view.container, '[data-page-editor-ghost="columns-slot-append"]');
    await flush();
    clickPaletteBlock(view.container, "Heading");
    await flush();

    expect(
      view.container.querySelector('[data-page-editor-block-path="root:0/column:1:1"]')
    ).toBeTruthy();

    // Columns-slot children expose BOTH axes: up/down move ±1 inside the
    // vertical slot stack, left/right move across the adjacent column slot.
    clickSelector(view.container, '[data-page-editor-block-id="blk-col-head"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();

    clickButtonByLabel(view.container, "Move block right");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:2:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:1:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    // Left at the first column is a strict no-op.
    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0/column:1:0"]')
        ?.getAttribute("data-page-editor-block-id")
    ).toBe("blk-col-head");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const columnsBlock = savedDocument.sections[0]?.blocks[0];
    expect(columnsBlock?.slots?.["column:1"]?.map((child) => child.type)).toEqual([
      "heading",
      "heading",
    ]);
    expect(columnsBlock?.slots?.["column:1"]?.[0]?.id).toBe("blk-col-head");
    expect(columnsBlock?.slots?.["column:2"]?.map((child) => child.type)).toEqual(["text"]);
  } finally {
    view.cleanup();
  }
});

// --- "Add block beside" discoverability (owner finding #7, round 3) ---

const createDefaultHeroPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-default",
          name: "Hero",
          variant: "default",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Build with Coderso", level: "h1", align: "center" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: {
                text: "Compose sections and atomic blocks directly on the canvas.",
                format: "plain",
                align: "center",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: {
                label: "Primary action",
                href: "/",
                target: "self",
                variant: "primary",
                size: "md",
              },
            }),
          ],
        }),
      ],
    }),
  });

test("PageEditor default hero button selection surfaces Add block beside in the toolbar AND as a canvas handle", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    // No block selected (section-level selection): neither the toolbar action
    // nor the canvas handle render.
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();

    // The toolbar action is present and ENABLED in the head-row action cluster.
    const toolbarBeside = view.container.querySelector(
      '[data-page-editor-toolbar-actions="true"] button[aria-label="Add block beside"]'
    ) as HTMLButtonElement | null;
    expect(toolbarBeside).toBeTruthy();
    expect(toolbarBeside?.disabled).toBe(false);

    // The canvas renders the compact ghost "+" handle inside the selected
    // block's frame — the discoverable on-canvas mirror of the same action.
    const handle = view.container.querySelector(
      'button[data-page-editor-ghost="add-block-beside"]'
    ) as HTMLButtonElement | null;
    expect(handle).toBeTruthy();
    expect(handle?.getAttribute("aria-label")).toBe("Add block beside");
    expect(handle?.closest('[data-page-editor-block-id="blk-hero-cta"]')).toBeTruthy();

    // Activating the handle opens the palette pre-targeted beside the button;
    // picking a block wraps the selection into a row group and selects the
    // new block (same contract as the toolbar action).
    clickSelector(view.container, 'button[data-page-editor-ghost="add-block-beside"]');
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    const wrappedFirst = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:0"]'
    );
    const insertedSecond = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:1"]'
    );
    expect(wrappedFirst?.getAttribute("data-page-editor-block-id")).toBe("blk-hero-cta");
    expect(insertedSecond?.getAttribute("data-page-editor-block")).toBe("button");
    expect(insertedSecond?.getAttribute("data-selected")).toBe("true");

    // Exactly one handle: it follows the (new) selection, never duplicates.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);
    expect(
      view.container
        .querySelector('[data-page-editor-ghost="add-block-beside"]')
        ?.closest('[data-page-editor-block-path="root:2/children:1"]')
    ).toBeTruthy();

    // The published front HTML of the persisted document stays free of the
    // canvas handle (and of any editor ghost chrome).
    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const front = renderToStaticMarkup(<PageSectionRender section={savedDocument.sections[0]!} />);
    expect(front).not.toContain("data-page-editor-ghost");
    expect(front).not.toContain("Add block beside");
    // The row group renders both buttons on the front.
    expect(front.match(/<a\s/g) ?? []).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas beside handle clears with the selection and respects action validity", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);

    // Escape clears the block selection back to the section: both the toolbar
    // action and the canvas handle disappear.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

// --- Round-3 friction A: single-click flow while another block is selected ---

const createTwoColumnPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-left",
              props: { text: "Left heading", level: "h2", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-right",
              props: { text: "Right copy.", format: "plain", align: "left" },
            }),
          ],
        }),
      ],
    }),
  });

test("PageEditor first click acts while another block is selected: ghost tile inserts, other block takes selection", async () => {
  const gridPage = createTwoColumnPage();
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // A block is selected and the floating toolbar (expanded panel) is open.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    // The FIRST click on a column ghost tile opens the pre-targeted palette —
    // no Escape/deselect step in between.
    clickSelector(view.container, 'button[aria-label="Add block to column 2"]');
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickPaletteBlock(view.container, "Quote");
    await flush();

    const inserted = view.container.querySelector('[data-page-editor-block="quote"]');
    expect(inserted).toBeTruthy();
    expect(inserted?.closest('[data-page-section-column="2"]')).toBeTruthy();

    // Re-select the first block; a single click on ANOTHER block hands the
    // selection over directly, without a prior deselect.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-right"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-right"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline-edit blur commits first and the same gesture's click target still acts", async () => {
  const gridPage = createTwoColumnPage();
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-left", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-left", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    setInlineRegionText(region, "Committed before insert");

    // Browser event order for a click outside an active contenteditable:
    // blur (commit) fires before the click reaches its target. The commit
    // must land AND the clicked ghost tile must still run its action — one
    // gesture, no third click.
    blurElement(region);
    clickSelector(view.container, 'button[aria-label="Add block to column 2"]');
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickPaletteBlock(view.container, "Text");
    await flush();

    // The inline-edit commit persisted through the insert.
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-left"]')?.textContent
    ).toContain("Committed before insert");

    // Same contract when the click target is another block: commit, then the
    // clicked block takes the selection.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-left", "text"));
    await flush();
    const secondRegion = findInlineEditRegion(view.container, "blk-left", "text");
    setInlineRegionText(secondRegion, "Committed before reselect");
    blurElement(secondRegion);
    clickSelector(view.container, '[data-page-editor-block-id="blk-right"]');
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-right"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-left"]')?.textContent
    ).toContain("Committed before reselect");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props).toMatchObject({
      text: "Committed before reselect",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor reserves right-rail padding on the canvas scroller while a selection is active (builder chrome)", async () => {
  // TASK-495-02: the builder chrome (page host) docks the panel into a light
  // right rail, so the canvas reserves RIGHT padding (not bottom clearance) so
  // the centered frame is not occluded by the overlay. The legacy bottom
  // clearance (ResizeObserver + --page-editor-toolbar-clearance) is retained
  // for the menu host only.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    // The editor auto-selects the first section, so the right rail is visible
    // and right padding is reserved from the start.
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
    expect(scroller.style.paddingRight).toBe("300px");
    // The builder branch never sets the legacy bottom-clearance var.
    expect(scroller.style.paddingBottom).toBe("");
    expect(scroller.style.getPropertyValue("--page-editor-toolbar-clearance")).toBe("");

    // Escape clears the selection: the rail unmounts and the padding is
    // released with it.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeFalsy();
    expect(scroller.style.paddingRight).toBe("");

    // Selecting a block restores the right padding.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    expect(scroller.style.paddingRight).toBe("300px");
  } finally {
    view.cleanup();
  }
});

// ---------------------------------------------------------------------------
// TASK-521-05-L01/L02 — compact page-settings side panel relocation + Effects.
// (Uses the shared flow harness above; the default page host has no
// `renderSettings`, so the compact panel — not the full-height Sheet — is the
// settings surface.)
// ---------------------------------------------------------------------------

const openPageSettingsPanel = (container: ParentNode) => {
  const trigger = container.querySelector('button[aria-label="Page settings"]');
  expect(trigger).toBeTruthy();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const panel = container.querySelector(
    '[data-page-editor-settings-panel="true"]'
  ) as HTMLElement | null;
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

test("TASK-521-05: page settings open in the COMPACT rail panel (not a Sheet) with all fields + Effects", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    // Not the full-height drawer: the mocked Sheet renders "sheet:right".
    expect(view.container.textContent).not.toContain("sheet:right");
    const labelTexts = Array.from(panel.querySelectorAll("label")).map((l) => l.textContent ?? "");
    expect(labelTexts.some((t) => t.includes("Title"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Slug"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Show in navigation"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Revision retention"))).toBe(true);
    expect(panel.querySelector('[data-page-editor-effects-section="true"]')).toBeTruthy();
    expect(findButton(panel, "Save settings")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Title + Slug + Show-in-nav + Revision-retention persist through the explicit Save", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    changeField(panel, "Title", "Renamed Page");
    changeField(panel, "Slug", "/renamed");
    changeField(panel, "Show in navigation", "no");
    changeField(panel, "Revision retention", "25");
    clickButton(panel, "Save settings");
    await flush();
    expect(pageEditorState.updatePage).toHaveBeenCalled();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ title: "Renamed Page", slug: "/renamed" });
    const savedSettings = (call?.[1] as { data: PageDocumentV2 }).data.settings;
    expect(savedSettings.showInNav).toBe(false);
    expect(savedSettings.revisionRetention).toBe(25);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Effects toggle + size edit the live draft and persist on a normal Save draft", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setSliderField(panel, "Spotlight size", "600");
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    const effects = (call?.[1] as { data: PageDocumentV2 }).data.settings.effects;
    expect(effects?.cursorSpotlight).toBe(true);
    expect(effects?.spotlightSize).toBe(600);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: disabling spotlight drops settings.effects (present-only)", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setToggleField(panel, "Cursor spotlight", false);
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("TASK-534: Grain overlay toggle writes settings.effects.noiseOverlay present-only", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    // On ⇒ noiseOverlay:true persists (independent of the spotlight toggle).
    setToggleField(panel, "Grain overlay", true);
    clickButton(view.container, "Save draft");
    await flush();
    let call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects?.noiseOverlay).toBe(true);
    // Off ⇒ the key is dropped; with no other effect the whole object is stripped.
    setToggleField(panel, "Grain overlay", false);
    clickButton(view.container, "Save draft");
    await flush();
    call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: reload rehydrates the Effects controls from saved settings.effects", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: createDocument({
      settings: {
        template: "page-v2",
        showInNav: true,
        revisionRetention: 10,
        effects: { cursorSpotlight: true, spotlightSize: 500 },
      },
    }),
  });
  pageEditorState.currentPage = pageEditorState.cachedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    const toggle = Array.from(panel.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Cursor spotlight"
    );
    expect(toggle?.getAttribute("aria-checked")).toBe("true");
    const range = panel.querySelector(
      'input[type="range"][data-page-editor-slider="Spotlight size"]'
    ) as HTMLInputElement | null;
    expect(range?.value).toBe("500");
  } finally {
    view.cleanup();
  }
});
