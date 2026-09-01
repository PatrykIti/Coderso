// @vitest-environment happy-dom

// TASK-105-08-08-L01 — pages reachable coverage: registry controls residual.
//
// Interacts with the real registry control surfaces (gradient stops, facet
// rows, gallery rows, category tokens, icon select, dynamic combobox, media
// URL picker) and asserts their public update payloads against the saved
// document plus visible panel state. Selecting a block opens the content
// subpanel by default, so panel buttons are only clicked to switch panels.

import React from "react";
import { expect, test } from "vitest";

import {
  changeField,
  changeInputByAriaLabel,
  clickButton,
  clickButtonByLabel,
  clickSegmentedOption,
  clickSelector,
  commitColorHex,
  createDocument,
  createPage,
  flush,
  mount,
  pageEditorState,
  selectMediaAsset,
  setSliderField,
  setToggleField,
} from "./pageEditorV2Fixtures";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
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

const controlsDocument = () =>
  createDocument({
    sections: [
      createPageSectionV2("content", {
        id: "sec-content",
        name: "Content",
        blocks: [
          createPageBlockV2("text", {
            id: "blk-copy",
            props: { text: "Existing page copy.", format: "plain", align: "center" },
          }),
          createPageBlockV2("gallery", {
            id: "blk-gallery",
            props: {
              items: [{ src: "/external/campus.jpg", alt: "Campus", caption: "Campus tour" }],
              layout: "grid",
              filterable: true,
              filterCategories: ["news"],
            },
          }),
          createPageBlockV2("filters", {
            id: "blk-filters",
            props: {
              facets: [{ kind: "checkbox", label: "Rooms", field: "data.rooms" }],
            },
          }),
          createPageBlockV2("form", {
            id: "blk-form",
            props: { formId: null },
          }),
          createPageBlockV2("icon", {
            id: "blk-icon",
            props: { name: "star", animation: "spin", size: 24, speed: 600 },
          }),
        ],
      }),
    ],
  });

const mountWithDocument = async () => {
  const page = createPage({ currentData: controlsDocument() });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);
  await flush();
  return view;
};

const savedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

const savedBlock = (blockId: string) => {
  for (const section of savedDocument().sections) {
    const stack = [...section.blocks];
    while (stack.length > 0) {
      const block = stack.shift();
      if (!block) continue;
      if (block.id === blockId) return block;
      for (const children of Object.values(block.slots ?? {})) stack.push(...(children ?? []));
    }
  }
  throw new Error(`block ${blockId} not found in the saved document`);
};

const blockProps = (blockId: string): Record<string, unknown> =>
  savedBlock(blockId).props as Record<string, unknown>;

const dispatchEvent = (element: Element, event: Event) => {
  React.act(() => {
    element.dispatchEvent(event);
  });
};

test("gradient stops commit type, color, position, added and removed stops", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButtonByLabel(view.container, "Background panel");
    await flush();
    clickSegmentedOption(view.container, "Background type", "gradient");
    await flush();

    expect(view.container.querySelector('[data-page-editor-control="gradient"]')).toBeTruthy();

    // Stop color commit through the hex field's Enter handling.
    commitColorHex(view.container, "Stop 1", "#112233");
    await flush();
    // Stop position commit through the slider's change handling.
    setSliderField(view.container, "Stop 1 position", "40");
    await flush();
    // Gradient kind switch re-renders the same stop list as a radial ramp.
    clickSegmentedOption(view.container, "Gradient type", "radial");
    await flush();

    // Appending stops unlocks the remove affordance, which drops one stop.
    clickButton(view.container, "Add stop");
    await flush();
    clickButton(view.container, "Add stop");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-gradient-stop]")).toHaveLength(4);

    const removeButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Remove"
    );
    expect(removeButtons.length).toBeGreaterThan(0);
    // Dropping the appended stop keeps the edited first stop in the ramp.
    dispatchEvent(
      removeButtons[removeButtons.length - 1]!,
      new MouseEvent("click", { bubbles: true })
    );
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-gradient-stop]")).toHaveLength(3);

    clickButton(view.container, "Save");
    await flush();

    const style = savedBlock("blk-copy").style as Record<string, unknown>;
    expect(style.backgroundType).toBe("gradient");
    expect(String(style.background)).toContain("radial-gradient(");
    expect(String(style.background)).toContain("#112233");
    expect(String(style.background)).toContain("40%");
  } finally {
    view.cleanup();
  }
});

test("facet row edits commit the canonical facet config", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-filters"]');
    await flush();

    expect(view.container.querySelector('[data-page-editor-control="facet-list"]')).toBeTruthy();
    changeInputByAriaLabel(view.container, "Facet 1 label", "Meeting rooms");
    await flushLocal();
    expect(
      (view.container.querySelector('input[aria-label="Facet 1 label"]') as HTMLInputElement).value
    ).toBe("Meeting rooms");

    clickButton(view.container, "Save");
    await flush();

    const facets = blockProps("blk-filters").facets as Array<Record<string, unknown>>;
    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({ kind: "checkbox", label: "Meeting rooms" });
  } finally {
    view.cleanup();
  }
});

test("gallery rows and category tokens commit through their public affordances", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();
    expect(view.container.querySelector('[data-page-editor-control="gallery-items"]')).toBeTruthy();

    // Append a row through the public add affordance and fill its alt text.
    clickButtonByLabel(view.container, "Add gallery item");
    await flushLocal();
    expect(view.container.querySelector('input[aria-label="Gallery item 2 alt"]')).toBeTruthy();
    changeInputByAriaLabel(view.container, "Gallery item 2 alt", "Library");
    await flushLocal();

    // Enter inside the token input commits the typed token.
    const tokenInput = view.container.querySelector(
      'input[aria-label="New category token"]'
    ) as HTMLInputElement;
    // An empty draft commits nothing.
    dispatchEvent(tokenInput, new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushLocal();
    expect(
      view.container.querySelectorAll("[data-page-editor-gallery-category-token]")
    ).toHaveLength(1);

    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(tokenInput, "deals");
      tokenInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    dispatchEvent(tokenInput, new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushLocal();

    // The "Add" button commits the current draft as a second new token.
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(tokenInput, "events");
      tokenInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clickButtonByLabel(view.container, "Add category token");
    await flushLocal();

    expect(view.container.textContent).toContain("deals");
    expect(view.container.textContent).toContain("events");

    clickButton(view.container, "Save");
    await flush();

    const props = blockProps("blk-gallery");
    const items = props.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ alt: "Library" });
    expect(props.filterCategories).toEqual(["news", "deals", "events"]);
  } finally {
    view.cleanup();
  }
});

test("gallery category tokens stay gated behind the Filterable toggle", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();

    const tokens = () =>
      view.container.querySelector('[data-page-editor-control="gallery-category-tokens"]');
    expect(tokens()).toBeTruthy();

    setToggleField(view.container, "Filterable", false);
    await flushLocal();
    expect(tokens()).toBeNull();

    setToggleField(view.container, "Filterable", true);
    await flushLocal();
    expect(tokens()).toBeTruthy();

    // Turning the toggle off stores the explicit false while the token
    // control stays hidden.
    setToggleField(view.container, "Filterable", false);
    await flushLocal();
    clickButton(view.container, "Save");
    await flush();
    expect(blockProps("blk-gallery").filterable).toBe(false);
    expect(blockProps("blk-gallery").filterCategories).toEqual(["news"]);
  } finally {
    view.cleanup();
  }
});

test("the icon select control commits the chosen animated icon token", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-icon"]');
    await flush();
    expect(view.container.querySelector('[data-page-editor-control="select"]')).toBeTruthy();

    changeField(view.container, "Icon", "sparkles");
    await flushLocal();
    expect(view.container.textContent).toContain("Sparkles");

    clickButton(view.container, "Save");
    await flush();
    expect(blockProps("blk-icon").name).toBe("sparkles");
  } finally {
    view.cleanup();
  }
});

test("the dynamic combobox commits through keyboard, hover, and outside dismissal", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-form"]');
    await flush();

    const trigger = () =>
      view.container.querySelector(
        'button[data-page-editor-combobox-trigger="Form"]'
      ) as HTMLButtonElement | null;
    const popover = () =>
      view.container.querySelector('[data-page-editor-combobox-popover="Form"]');
    const search = () =>
      view.container.querySelector('input[aria-label="Search Form"]') as HTMLInputElement | null;

    // Home rests the active row on the "None" row, then ArrowDown moves to the
    // first form option and Enter commits it.
    dispatchEvent(trigger()!, new MouseEvent("click", { bubbles: true }));
    await flushLocal();
    expect(popover()).toBeTruthy();
    expect(view.container.querySelector('[data-page-editor-combobox-option="none"]')).toBeTruthy();
    expect(
      view.container.querySelector('[data-page-editor-combobox-option="form-contact"]')
    ).toBeTruthy();

    expect(search()).toBeTruthy();
    dispatchEvent(search()!, new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    dispatchEvent(search()!, new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    dispatchEvent(search()!, new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushLocal();

    expect(popover()).toBeNull();
    expect(trigger()?.textContent).toContain("Contact");

    // Reopening rests on the committed row; hovering another row makes it the
    // active row, so Enter commits the hovered option.
    dispatchEvent(trigger()!, new MouseEvent("click", { bubbles: true }));
    await flushLocal();
    const hovered = view.container.querySelector(
      '[data-page-editor-combobox-option="form-quote"] button'
    );
    expect(hovered).toBeTruthy();
    dispatchEvent(hovered!, new MouseEvent("pointerover", { bubbles: true }));
    dispatchEvent(search()!, new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushLocal();
    expect(popover()).toBeNull();
    expect(trigger()?.textContent).toContain("Quote");

    // A pointer press outside the combobox root closes the listbox without
    // changing the committed value.
    dispatchEvent(trigger()!, new MouseEvent("click", { bubbles: true }));
    await flushLocal();
    expect(popover()).toBeTruthy();
    dispatchEvent(document.body, new MouseEvent("pointerdown", { bubbles: true }));
    await flushLocal();
    expect(popover()).toBeNull();
    expect(trigger()?.textContent).toContain("Quote");

    clickButton(view.container, "Save");
    await flush();
    expect(blockProps("blk-form").formId).toBe("form-quote");
  } finally {
    view.cleanup();
  }
});

test("a stored external media URL surfaces a clearable readout and picker writes win", async () => {
  const view = await mountWithDocument();

  try {
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();
    const readout = () =>
      view.container.querySelector('[data-page-editor-media-external="Gallery item 1 source"]');

    // The stored URL matches no library asset, so the control surfaces it as
    // a clearable readout instead of a picker selection.
    expect(readout()?.textContent).toContain("/external/campus.jpg");
    expect(readout()?.textContent).toContain("Clear");

    // The readout's Clear affordance commits an explicit null.
    dispatchEvent(readout()!.querySelector("button")!, new MouseEvent("click", { bubbles: true }));
    await flushLocal();
    expect(readout()).toBeNull();

    clickButton(view.container, "Save");
    await flush();
    const clearedSrc = (blockProps("blk-gallery").items as Array<Record<string, unknown>>)[0]?.src;
    expect(clearedSrc).toBe("");

    // Picking a library asset through the public picker writes the asset URL.
    selectMediaAsset(view.container, "Gallery item 1 source", "asset-card");
    await flushLocal();
    expect(readout()).toBeNull();

    clickButton(view.container, "Save");
    await flush();
    expect((blockProps("blk-gallery").items as Array<Record<string, unknown>>)[0]?.src).toBe(
      "/card.jpg"
    );
  } finally {
    view.cleanup();
  }
});
