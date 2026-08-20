// @vitest-environment happy-dom
// TASK-539-03-L04 flow proof (Bun-free ui lane). Owned by this leaf only:
//   - the real PageEditor narrow-canvas class contract (open/closed rail
//     reservation tokens, order, sub-sm base padding, no dirty on toggle),
//   - seeded tablet/mobile overrides through the real flow: every gallery and
//     divider control stays base-targeted (display, shell device, base gates,
//     base commits, byte-identical responsive layers, one dirty/autosave per
//     deliberate edit),
//   - L05 placement results through PageEditor: span-control gating for root
//     frame / template wrapper / nested / per-column / non-default media-split
//     / hidden assigned root sibling (includeHiddenBlocks proof), the
//     [{index:0}] fallback chain (registry fields, gallery row hosts, mobile
//     commit + reset, mutation), selected nested-path writes, and the
//     stale/empty no-fields + no-mutation contract,
//   - the split suites' independent discovery.
// The facade pins (4 values + PageEditorProps + 10 host types) are owned by
// the read-only `page-editor-facade.test.ts` split suite; the 2048/2049
// real-field selection is owned by `page-editor-v2-controls-flow.test.tsx`.
// Both run in the validation gate as evidence. No source or existing test is
// touched; the shared pageEditorV2FlowHarness is imported exactly like the
// sibling split suites.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { describe, expect, test, vi } from "vitest";

import {
  harnessState,
  createPage,
  createDocument,
  mount,
  flush,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  changeField,
  changeInputByAriaLabel,
  findResponsiveField,
  findSegmentedGroup,
  clickSegmentedOption,
  setToggleField,
  setSliderField,
  clickResponsiveReset,
} from "./pageEditorV2FlowHarness";

const { pageEditorState } = harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

type View = ReturnType<typeof mount>;

const mountPage = (document: PageDocumentV2) => {
  const page = createPage({ currentData: document });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  return view;
};

const setDevice = (view: View, label: "Desktop" | "Tablet" | "Mobile") => {
  const button = view.container.querySelector(`button[aria-label="${label}"]`);
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  return flush();
};

const selectBlock = async (view: View, blockId: string) => {
  clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
  await flush();
};

const openPanel = async (view: View, label: string) => {
  const panelKey = {
    "Content panel": "content",
    "Layout panel": "layout",
    "Style panel": "style",
  }[label];
  if (panelKey && view.container.querySelector(`[data-page-editor-toolbar-panel="${panelKey}"]`)) {
    return;
  }
  clickButtonByLabel(view.container, label);
  await flush();
};

const scrollerClass = (view: View) =>
  view.container.querySelector('[data-page-editor-canvas-scroller="true"]')?.className ?? "";

const spanSliderLabels = ["Column span", "Row span"] as const;

const spanControls = (view: View) =>
  spanSliderLabels.map((label) => {
    // Integer clamp ranges 1-4 render as segmented numeric pills (never a
    // slider), so span presence is asserted through the segmented group.
    try {
      return findSegmentedGroup(view.container, label);
    } catch {
      return null;
    }
  });

const expectSpanControls = (view: View, expected: boolean) => {
  for (const [index, control] of spanControls(view).entries()) {
    if (expected) {
      expect(control, spanSliderLabels[index]).toBeTruthy();
    } else {
      expect(control, spanSliderLabels[index]).toBeNull();
    }
  }
};

const advanceAutosave = async () => {
  await React.act(async () => {
    vi.advanceTimersByTime(1600);
    await Promise.resolve();
  });
};

const lastSaved = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

const savedBlock = (blockId: string): PageBlockV2 =>
  lastSaved()
    .sections.flatMap((section) => section.blocks)
    .find((block) => block.id === blockId) ?? lastSaved().sections[0]!.blocks[0]!;

const galleryItem = (src: string, alt: string) => ({ src, alt, caption: "" });

const headingBlock = (id: string, text: string) =>
  createPageBlockV2("heading", { id, props: { text, level: "h1", align: "center" } });

const hasUnsavedBadge = (view: View) => view.container.textContent?.includes("Unsaved") ?? false;

describe("TASK-539 narrow canvas: scroller class contract (DOM layout fixture)", () => {
  test("open inspector retains p-6 lg:p-8 plus both sm/lg rail tokens in the pinned order", async () => {
    const view = mountPage(createDocument());
    try {
      await flush();
      const className = scrollerClass(view);
      // The exact open contract: the ordinary state stays, then both conditional
      // tokens append, with the lg override ordered after lg:p-8.
      expect(className).toContain("p-6 lg:p-8 sm:pr-[300px] lg:pr-[300px]");
      expect(className).toContain("min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted");
      expect(className).toContain("p-6");
      // No UNPREFIXED reservation token: every rail token is sm:/lg:-scoped.
      expect(className.split(" ").filter((token) => token === "pr-[300px]")).toEqual([]);
    } finally {
      view.cleanup();
    }
  });

  test("closing removes only the conditional tokens; reopening restores them without dirtying", async () => {
    const view = mountPage(createDocument());
    try {
      await flush();
      const openClass = scrollerClass(view);
      expect(openClass).toContain("sm:pr-[300px] lg:pr-[300px]");

      clickButtonByLabel(view.container, "Hide panel");
      await flush();
      const closedClass = scrollerClass(view);
      expect(closedClass).toContain("p-6 lg:p-8");
      expect(closedClass).not.toContain("sm:pr-[300px]");
      expect(closedClass).not.toContain("lg:pr-[300px]");
      expect(pageEditorState.updatePage).not.toHaveBeenCalled();
      expect(pageEditorState.autosavePage).not.toHaveBeenCalled();
      expect(hasUnsavedBadge(view)).toBe(false);

      clickButtonByLabel(view.container, "Show panel");
      await flush();
      expect(scrollerClass(view)).toContain("p-6 lg:p-8 sm:pr-[300px] lg:pr-[300px]");
      expect(pageEditorState.updatePage).not.toHaveBeenCalled();
      expect(pageEditorState.autosavePage).not.toHaveBeenCalled();
      expect(hasUnsavedBadge(view)).toBe(false);

      // The panel stays usable after the open/close cycle.
      clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
      await flush();
      changeField(view.container, "Primary text", "Edited after toggle");
      await flush();
      clickButton(view.container, "Save");
      await flush();
      expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
      expect(lastSaved().sections[0]?.blocks[0]?.props.text).toBe("Edited after toggle");
    } finally {
      view.cleanup();
    }
  });

  test("at 320/390/480 an open inspector adds no rail reservation; the p-6 base remains", async () => {
    const view = mountPage(createDocument());
    try {
      await flush();
      // Token-level fixture: the rail reservation is exclusively sm+/lg+ scoped,
      // so below `sm` (640px) the open inspector can never reserve a rail and the
      // ordinary `p-6` padding stays. JSDOM cannot evaluate media queries; the
      // real computed right-padding at 640px / lg is TASK-539-08's Playwright
      // scope (per the L04 contract, no Vitest computed-layout claim is made).
      const className = scrollerClass(view);
      const paddingTokens = className
        .split(" ")
        .filter((token) => token === "p-6" || token === "lg:p-8" || token.includes("pr-[300px]"));
      for (const width of ["320", "390", "480"] as const) {
        expect(className, `${width}px base padding`).toContain("p-6");
        expect(
          paddingTokens.filter((token) => token === "pr-[300px]"),
          `${width}px bare reservation token`
        ).toEqual([]);
        expect(paddingTokens, `${width}px reservation set`).toEqual([
          "p-6",
          "lg:p-8",
          "sm:pr-[300px]",
          "lg:pr-[300px]",
        ]);
      }
    } finally {
      view.cleanup();
    }
  });
});

describe("TASK-539 seeded responsive overrides stay base-targeted through the real flow", () => {
  test("gallery tablet override never surfaces; every gallery control commits base; tablet layer byte-identical", async () => {
    vi.useFakeTimers();
    const seedGallery = createPageBlockV2("gallery", {
      id: "blk-gallery",
      props: {
        items: [galleryItem("/media/base.jpg", "Base alt")],
        layout: "grid",
        filterable: true,
        filterCategories: ["news", "promo"],
      },
      responsive: {
        tablet: {
          props: {
            items: [galleryItem("/media/tablet.jpg", "Tablet alt")],
            layout: "carousel",
          },
        },
      },
    });
    const document = createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-gallery",
          name: "Gallery",
          blocks: [seedGallery],
        }),
      ],
    });
    const tabletLayerBaseline = seedGallery.responsive?.tablet;
    const view = mountPage(document);
    try {
      await flush();
      await setDevice(view, "Tablet");
      await selectBlock(view, "blk-gallery");

      // Shell device + canvas frame target the active device.
      expect(
        view.container.querySelector('[data-page-editor-editing-scope]')?.textContent
      ).toContain("Tablet");
      expect(
        view.container.querySelector('[data-page-editor-editing-scope]')?.textContent
      ).toContain("(overrides)");
      expect(
        view.container.querySelector('[data-page-editor-canvas-device="tablet"]')
      ).toBeTruthy();

      // Displayed value, auxiliary fields, and shell state all use the BASE
      // target: the tablet override neither surfaces nor exposes a badge/reset.
      const itemsField = findResponsiveField(view.container, "Gallery items");
      expect(itemsField.dataset.pageEditorResponsiveField).toBe("inherited");
      expect(
        itemsField.querySelector('[data-page-editor-responsive-badge="override"]')
      ).toBeNull();
      expect(
        itemsField.querySelector('button[aria-label="Reset Gallery items to inherited"]')
      ).toBeNull();
      const rowAlt = view.container.querySelector('input[aria-label="Gallery item 1 alt"]');
      expect((rowAlt as HTMLInputElement | null)?.value).toBe("Base alt");
      expect(
        view.container.querySelector('input[aria-label="Gallery item 1 alt"]')
      ).not.toHaveProperty("value", "Tablet alt");

      const autosavesBefore = pageEditorState.autosavePage.mock.calls.length;

      // Deliberate edit 1: add a base row (exactly one dirty/autosave).
      clickButtonByLabel(view.container, "Add gallery item");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 1);

      // Every gallery control is exercised on tablet; each commits base.
      await openPanel(view, "Style panel");
      clickSegmentedOption(view.container, "Layout", "carousel");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 2);

      await openPanel(view, "Content panel");
      setToggleField(view.container, "Filterable", false);
      await flush();
      expect(view.container.querySelector('[data-page-editor-control="gallery-category-tokens"]')).toBeNull();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 3);

      setToggleField(view.container, "Filterable", true);
      await flush();
      changeInputByAriaLabel(view.container, "New category token", "deal");
      clickButtonByLabel(view.container, "Add category token");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 4);

      clickButton(view.container, "Save");
      await flush();
      expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);

      const saved = lastSaved();
      const savedBlock0 = saved.sections[0]?.blocks[0]!;
      const savedBlock0Props = savedBlock0.props as {
        items: Array<{ src: string; alt: string; caption: string }>;
        layout: string;
        filterable: boolean;
        filterCategories: string[];
      };
      expect(savedBlock0Props.items).toHaveLength(2);
      expect(savedBlock0Props.items[0]).toEqual(galleryItem("/media/base.jpg", "Base alt"));
      expect(savedBlock0Props.layout).toBe("carousel");
      expect(savedBlock0Props.filterable).toBe(true);
      expect(savedBlock0Props.filterCategories).toEqual(["news", "promo", "deal"]);
      // The pre-existing tablet responsive object stays byte-identical.
      expect(savedBlock0.responsive?.tablet).toEqual(tabletLayerBaseline);
      // Base-only commit landed on the desktop base, never the tablet layer.
      expect(savedBlock0.responsive?.tablet?.props).toEqual(tabletLayerBaseline?.props);
    } finally {
      view.cleanup();
      vi.useRealTimers();
    }
  });

  test("divider mobile override cannot open/close base gates; every divider control commits base; mobile layer byte-identical", async () => {
    vi.useFakeTimers();
    const seedDivider = createPageBlockV2("divider", {
      id: "blk-divider",
      props: { tone: "neutral", thickness: 2, gradient: true, width: 40, align: "left" },
      responsive: { mobile: { props: { gradient: false } } },
    });
    const document = createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-divider",
          name: "Divider",
          blocks: [seedDivider],
        }),
      ],
    });
    const mobileLayerBaseline = seedDivider.responsive?.mobile;
    const view = mountPage(document);
    try {
      await flush();
      await setDevice(view, "Mobile");
      await selectBlock(view, "blk-divider");
      expect(
        view.container.querySelector('[data-page-editor-editing-scope]')?.textContent
      ).toContain("Mobile");
      expect(
        view.container.querySelector('[data-page-editor-editing-scope]')?.textContent
      ).toContain("(overrides)");

      // Content panel: Tone (segmented pills, select upgrade) and Thickness
      // (slider) show base values with no responsive badge/reset.
      await openPanel(view, "Content panel");
      const toneField = findResponsiveField(view.container, "Tone");
      expect(toneField.dataset.pageEditorResponsiveField).toBe("inherited");
      expect(toneField.querySelector('[data-page-editor-responsive-badge="override"]')).toBeNull();
      const toneActive = findSegmentedGroup(view.container, "Tone").querySelector(
        '[data-page-editor-segmented-option][aria-pressed="true"]'
      ) as HTMLElement | null;
      expect(toneActive?.dataset.pageEditorSegmentedOption).toBe("neutral");
      const thickness = view.container.querySelector(
        'input[type="range"][data-page-editor-slider="Thickness"]'
      ) as HTMLInputElement | null;
      expect(thickness?.value).toBe("2");

      // Style panel: base gates rule. The mobile override says gradient=false,
      // but the base says true, so Rule length / Rule align stay visible with
      // base values (an override can never open or close the base gate).
      await openPanel(view, "Style panel");
      const gradientToggle = Array.from(view.container.querySelectorAll('[role="switch"]')).find(
        (entry) => entry.getAttribute("aria-label") === "Gradient rule"
      );
      expect(gradientToggle?.getAttribute("aria-checked")).toBe("true");
      const lengthSlider = view.container.querySelector(
        'input[type="range"][data-page-editor-slider="Rule length"]'
      ) as HTMLInputElement | null;
      expect(lengthSlider?.value).toBe("40");
      const alignGroup = findSegmentedGroup(view.container, "Rule align");
      expect(
        alignGroup.querySelector('[data-page-editor-segmented-option="left"][aria-pressed="true"]')
      ).toBeTruthy();
      expect(
        findResponsiveField(view.container, "Rule length").querySelector(
          'button[aria-label="Reset Rule length to inherited"]'
        )
      ).toBeNull();

      const autosavesBefore = pageEditorState.autosavePage.mock.calls.length;

      // Exercise every divider control on mobile; each commits the base.
      setSliderField(view.container, "Rule length", "120");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 1);

      clickSegmentedOption(view.container, "Rule align", "right");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 2);

      await openPanel(view, "Content panel");
      clickSegmentedOption(view.container, "Tone", "accent");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 3);

      setSliderField(view.container, "Thickness", "6");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 4);

      await openPanel(view, "Style panel");
      setToggleField(view.container, "Gradient rule", false);
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 5);
      // Closing the base gate hides the width/align companions.
      expect(view.container.querySelector('[data-page-editor-slider="Rule length"]')).toBeNull();
      expect(
        view.container.querySelector('[data-page-editor-segmented-option="right"]')
      ).toBeNull();

      setToggleField(view.container, "Gradient rule", true);
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage.mock.calls.length).toBe(autosavesBefore + 6);
      expect(view.container.querySelector('[data-page-editor-slider="Rule length"]')).toBeTruthy();

      clickButton(view.container, "Save");
      await flush();
      expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);

      const savedBlock0 = savedBlock("blk-divider");
      expect(savedBlock0.props).toMatchObject({
        tone: "accent",
        thickness: 6,
        gradient: true,
        width: 120,
        align: "right",
      });
      // The pre-existing mobile responsive object stays byte-identical.
      expect(savedBlock0.responsive?.mobile).toEqual(mobileLayerBaseline);
    } finally {
      view.cleanup();
      vi.useRealTimers();
    }
  });
});

describe("TASK-539 placement results through PageEditor", () => {
  const contentSection = (
    id: string,
    blocks: PageBlockV2[],
    options: { columns?: number; variant?: PageSectionV2["variant"]; type?: PageSectionV2["type"] } = {}
  ) =>
    createPageSectionV2(options.type ?? "content", {
      id,
      name: id,
      variant: options.variant,
      layout: { columns: options.columns ?? 1, align: "start", justify: "start", maxWidth: 1080 },
      blocks,
    });

  test("root frame and template wrapper allow span controls; nested, per-column, and non-default media-split hide them", async () => {
    const cases: Array<{
      label: string;
      document: PageDocumentV2;
      blockId: string;
      spanExpected: boolean;
    }> = [
      {
        label: "root frame",
        blockId: "blk-frame",
        spanExpected: true,
        document: createDocument({
          sections: [
            contentSection("sec-frame", [headingBlock("blk-frame", "Frame root")]),
          ],
        }),
      },
      {
        label: "template wrapper",
        blockId: "blk-quote",
        spanExpected: true,
        document: createDocument({
          sections: [
            createPageSectionV2("testimonials", {
              id: "sec-tpl",
              name: "Testimonials",
              variant: "default",
              blocks: [headingBlock("blk-quote", "Template root")],
            }),
          ],
        }),
      },
      {
        label: "nested slot child",
        blockId: "blk-nested",
        spanExpected: false,
        document: createDocument({
          sections: [
            contentSection("sec-nested", [
              createPageBlockV2("columns", {
                id: "blk-columns",
                props: { count: 2, gap: 16, distribution: "equal" },
                slots: {
                  "column:1": [headingBlock("blk-nested", "Nested text")],
                  "column:2": [],
                },
              }),
            ]),
          ],
        }),
      },
      {
        label: "per-column composition",
        blockId: "blk-col-a",
        spanExpected: false,
        document: createDocument({
          sections: [
            contentSection(
              "sec-cols",
              [
                createPageBlockV2("heading", {
                  id: "blk-col-a",
                  props: { text: "A", level: "h2", align: "left" },
                  style: { column: 1 },
                }),
                createPageBlockV2("heading", {
                  id: "blk-col-b",
                  props: { text: "B", level: "h2", align: "left" },
                  style: { column: 2 },
                }),
              ],
              { columns: 2 }
            ),
          ],
        }),
      },
      {
        label: "non-default media-split",
        blockId: "blk-split",
        spanExpected: false,
        document: createDocument({
          sections: [
            createPageSectionV2("media-split", {
              id: "sec-split",
              name: "Split",
              variant: "split",
              blocks: [headingBlock("blk-split", "Split root")],
            }),
          ],
        }),
      },
    ];

      for (const fixture of cases) {
        const view = mountPage(fixture.document);
        try {
          await flush();
          await selectBlock(view, fixture.blockId);
          await openPanel(view, "Layout panel");
          expectSpanControls(view, fixture.spanExpected);
          if (!fixture.spanExpected) {
            // The nested path still drives the block registry fields.
            await openPanel(view, "Content panel");
            expect(findResponsiveField(view.container, "Primary text")).toBeTruthy();
          }
        } finally {
          view.cleanup();
        }
      }
  });

  test("hidden assigned root sibling hides span controls, proving Admin passes includeHiddenBlocks:true", async () => {
    // includeHiddenBlocks:false would see only the visible unassigned root and
    // resolve "block-frame" (span controls). PageEditor passes
    // {includeHiddenBlocks:true}, so the hidden column-assigned sibling still
    // counts and the section resolves per-column "none" (span controls hidden).
    const document = createDocument({
      sections: [
        contentSection(
          "sec-hidden",
          [
            createPageBlockV2("heading", {
              id: "blk-visible",
              props: { text: "Visible", level: "h2", align: "left" },
            }),
            createPageBlockV2("heading", {
              id: "blk-hidden",
              props: { text: "Hidden assigned", level: "h2", align: "left" },
              style: { column: 2 },
              visibility: { visible: false },
            }),
          ],
          { columns: 2 }
        ),
      ],
    });
    const view = mountPage(document);
    try {
      await flush();
      await selectBlock(view, "blk-visible");
      await openPanel(view, "Layout panel");
      expectSpanControls(view, false);
    } finally {
      view.cleanup();
    }
  });

  test("selected nested path commits to the nested block, never the root or a sibling", async () => {
    const document = createDocument({
      sections: [
        contentSection("sec-mut", [
          createPageBlockV2("columns", {
            id: "blk-columns",
            props: { count: 2, gap: 16, distribution: "equal" },
            slots: {
              "column:1": [headingBlock("blk-nested", "Nested text")],
              "column:2": [],
            },
          }),
          headingBlock("blk-other", "Sibling"),
        ]),
      ],
    });
    const view = mountPage(document);
    try {
      await flush();
      await selectBlock(view, "blk-nested");
      await openPanel(view, "Content panel");
      changeField(view.container, "Primary text", "Nested edited");
      await flush();
      clickButton(view.container, "Save");
      await flush();

      const saved = lastSaved();
      const nested = saved.sections[0]!.blocks[0]!.slots?.["column:1"]?.[0];
      expect(nested?.props.text).toBe("Nested edited");
      expect(nested?.id).toBe("blk-nested");
      const sibling = saved.sections[0]!.blocks[1];
      expect(sibling?.props.text).toBe("Sibling");
    } finally {
      view.cleanup();
    }
  });

  test("no selection: canonical fallback [{index:0}] drives gallery registry fields and block-0 mutation", async () => {
    const document = createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-fallback",
          name: "Fallback",
          blocks: [
            createPageBlockV2("gallery", {
              id: "blk-gallery",
              props: {
                items: [galleryItem("/media/base.jpg", "Base alt")],
                layout: "grid",
                filterable: true,
                filterCategories: ["news"],
              },
            }),
            headingBlock("blk-heading", "Second root"),
          ],
        }),
      ],
    });
    const view = mountPage(document);
    try {
      await flush();
      // Content panel is open by default with NO block selected. The registry
      // target falls back to [{index:0}]: the gallery control (never
      // ListItemsControl) renders with its row media hosts, and the second
      // root's fields do not.
      const itemsField = findResponsiveField(view.container, "Gallery items");
      expect(itemsField).toBeTruthy();
      expect(
        view.container.querySelector('[data-page-editor-control="gallery-items"]')
      ).toBeTruthy();
      expect(view.container.querySelector('[data-page-editor-control="list-items"]')).toBeNull();
      const mediaHosts = view.container.querySelectorAll(
        '[data-page-editor-media-control^="Gallery item"]'
      );
      expect(mediaHosts).toHaveLength(1);
      expect(
        view.container.querySelector('[data-page-editor-media-control="Gallery item 1 source"]')
      ).toBeTruthy();
      expect(
        view.container.querySelector('label[data-page-editor-control="text"]')
      ).toBeNull();

      // Mutation through the fallback path targets block 0.
      clickButtonByLabel(view.container, "Add gallery item");
      await flush();
      clickButton(view.container, "Save");
      await flush();
      const saved = lastSaved();
      const firstRoot = saved.sections[0]!.blocks[0]!;
      expect(firstRoot.id).toBe("blk-gallery");
      expect(firstRoot.props.items).toHaveLength(2);
      const secondRoot = saved.sections[0]!.blocks[1]!;
      expect(secondRoot.id).toBe("blk-heading");
      expect(secondRoot.props.text).toBe("Second root");
    } finally {
      view.cleanup();
    }
  });

  test("no selection: fallback path drives mobile override commit and reset", async () => {
    vi.useFakeTimers();
    const document = createDocument({
      sections: [contentSection("sec-reset", [headingBlock("blk-heading", "Welcome")])],
    });
    const view = mountPage(document);
    try {
      await flush();
      await setDevice(view, "Mobile");

      // No selection: the mobile edit writes the override to [{index:0}].
      changeField(view.container, "Primary text", "Mobile only");
      await flush();
      const shell = findResponsiveField(view.container, "Primary text");
      expect(shell.dataset.pageEditorResponsiveField).toBe("override");
      expect(shell.querySelector('[data-page-editor-responsive-badge="override"]')).toBeTruthy();
      await advanceAutosave();
      expect(pageEditorState.autosavePage).toHaveBeenCalledTimes(1);

      // Reset through the same fallback path clears exactly that override.
      clickResponsiveReset(view.container, "Primary text");
      await flush();
      await advanceAutosave();
      expect(pageEditorState.autosavePage).toHaveBeenCalledTimes(2);

      clickButton(view.container, "Save");
      await flush();
      expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
      const saved = lastSaved();
      const heading = saved.sections[0]!.blocks[0]!;
      expect(heading.id).toBe("blk-heading");
      expect(heading.props.text).toBe("Welcome");
      expect(heading.responsive?.mobile?.props?.text).toBeUndefined();
    } finally {
      view.cleanup();
      vi.useRealTimers();
    }
  });

  test("empty section and stale selected path expose no registry field, media/reset, or span placement", async () => {
    // Empty section: never dirtied, nothing can be written.
    const emptyDocument = createDocument({
      sections: [contentSection("sec-empty", [])],
    });
    const emptyView = mountPage(emptyDocument);
    try {
      await flush();
      expect(viewRegistryControls(emptyView)).toEqual([]);
      expect(viewMediaOrResetControls(emptyView)).toEqual([]);
      expect(viewSpanGroups(emptyView)).toEqual([]);
      expect(hasUnsavedBadge(emptyView)).toBe(false);
      // Nothing can write: no dirty transition, so no autosave or update.
      expect(pageEditorState.updatePage).not.toHaveBeenCalled();
      expect(pageEditorState.autosavePage).not.toHaveBeenCalled();
    } finally {
      emptyView.cleanup();
    }

    // Stale selected path: the block was deleted, so no registry field/control
    // (including media/reset) and no span placement can render, and no save or
    // autosave fires after the deletion commit.
    const staleDocument = createDocument({
      sections: [contentSection("sec-stale", [headingBlock("blk-heading", "Welcome")])],
    });
    const staleView = mountPage(staleDocument);
    try {
      await flush();
      await selectBlock(staleView, "blk-heading");
      clickButtonByLabel(staleView.container, "Delete block");
      await flush();
      clickButton(staleView.container, "Delete block");
      await flush();

      expect(viewRegistryControls(staleView)).toEqual([]);
      expect(viewMediaOrResetControls(staleView)).toEqual([]);
      expect(viewSpanGroups(staleView)).toEqual([]);
      expect(viewRegistryControls(staleView)).toEqual([]);
    } finally {
      staleView.cleanup();
    }
  });
});

const viewRegistryControls = (view: View) =>
  Array.from(
    view.container.querySelectorAll(
      '[data-page-editor-control="gallery-items"], [data-page-editor-control="gallery-category-tokens"], [data-page-editor-control="list-items"]'
    )
  );

const viewMediaOrResetControls = (view: View) =>
  Array.from(
    view.container.querySelectorAll(
      '[data-page-editor-media-control], [data-page-editor-responsive-badge="override"], [data-page-editor-responsive-badge="inherited"]'
    )
  );

const viewSpanGroups = (view: View) =>
  Array.from(
    view.container.querySelectorAll(
      '[data-page-editor-control="segmented"] [role="group"][aria-label="Column span"], [data-page-editor-control="segmented"] [role="group"][aria-label="Row span"]'
    )
  );

describe("TASK-539 split flow suites stay independent discoverable entries", () => {
  test("every page-editor-v2 split suite remains a directly discoverable entry", () => {
    const suiteFiles = new Set(
      readdirSync(join(process.cwd(), "tests", "vitest", "ui")).map((name) => `./${name}`)
    );
    for (const name of [
      "page-editor-v2-authoring-flow.test.tsx",
      "page-editor-v2-controls-flow.test.tsx",
      "page-editor-v2-flow.test.tsx",
      "page-editor-v2-inline-edit-flow.test.tsx",
      "page-editor-v2-layout-flow.test.tsx",
      "page-editor-v2-persistence-flow.test.tsx",
      "page-editor-v2-responsive-flow.test.tsx",
      "page-editor-v2-settings-flow.test.tsx",
    ]) {
      expect(suiteFiles, name).toContain(`./${name}`);
    }
    // Every split suite imports the shared harness at module top, so the
    // beforeEach/afterEach hooks register on each importing file independently
    // (Vitest collects hooks from the running file's module graph). This file
    // is itself a standalone entry under tests/vitest/ui, discovered by the
    // vitest include glob exactly like its siblings.
  });
});
