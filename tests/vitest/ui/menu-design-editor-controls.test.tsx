// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  brandBlock,
  canvasFrame,
  clickButton,
  clickFirstSwatch,
  clickSegmented,
  clickSelector,
  flush,
  flushIcons,
  hasGroup,
  mount,
  readLastSavedDocument,
  seedDocument,
  selectBlockRow,
  setInputValue,
  setSliderValue,
  setToggle,
  sliderValue,
} from "./menuDesignEditorFixtures";

import {
  normalizeMenuDocumentV2ForWrite,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

test("520-03-L01: Corner radius writes the present-only bar `radius` (no default hint)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  // MenuBarPanel is shown when nothing is selected.
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  // Present-only keys are held out of MENU_BAR_LAYOUT_KEYS ⇒ NO resolved-default hint.
  expect(container.querySelector('[data-menu-control-default-hint="radius"]')).toBeNull();
  expect(container.querySelector('[data-menu-control-default-hint="shadowCustom"]')).toBeNull();

  setSliderValue(container, "Corner radius", "18");
  clickButton(container, "Save");
  await flush();
  expect(readLastSavedDocument()?.sections[0]?.layout.radius).toBe(18);

  cleanup();
});
test("520-03-L01: Custom shadow writes/clears `shadowCustom`; the write normalizer drops an injection", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The unsaved/editor payload keeps the author's free text; the authoritative
  // write normalizer canonicalizes only the embedded color token.
  setInputValue(container, "Custom shadow", "0 18px 50px rgba(0,0,0,.24)");
  clickButton(container, "Save");
  await flush();
  const withValue = readLastSavedDocument();
  expect(withValue?.sections[0]?.layout.shadowCustom).toBe("0 18px 50px rgba(0,0,0,.24)");
  const normalized = normalizeMenuDocumentV2ForWrite(withValue as unknown as MenuDocumentV2);
  expect(normalized.sections[0]?.layout).toMatchObject({
    shadowCustom: "0 18px 50px rgba(0, 0, 0, 0.24)",
  });

  // Clearing removes the present-only key.
  setInputValue(container, "Custom shadow", "");
  clickButton(container, "Save");
  await flush();
  expect(
    Object.prototype.hasOwnProperty.call(
      readLastSavedDocument()?.sections[0]?.layout ?? {},
      "shadowCustom"
    )
  ).toBe(false);

  // An injection attempt is DROPPED by the authoritative write normalizer (fail-soft).
  setInputValue(container, "Custom shadow", "0 0 10px red;} body{display:none}");
  clickButton(container, "Save");
  await flush();
  const injected = readLastSavedDocument();
  const cleaned = normalizeMenuDocumentV2ForWrite(injected as unknown as MenuDocumentV2);
  expect(cleaned.sections[0]?.layout.shadowCustom).toBeUndefined();

  cleanup();
});
test("520-03-L01: the Scrolled-state group is gated on `sticky` and writes the `*Scrolled` keys", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Sticky OFF (default) ⇒ the scrolled group is hidden.
  expect(container.querySelector('[data-menu-scrolled-group="true"]')).toBeNull();

  // Turning Sticky ON reveals the group.
  setToggle(container, "Sticky header", true);
  expect(container.querySelector('[data-menu-scrolled-group="true"]')).toBeTruthy();
  // None of the scrolled keys carry a resolved-default hint (present-only).
  for (const key of [
    "surfaceColorScrolled",
    "borderColorScrolled",
    "borderWidthScrolled",
    "shadowScrolled",
    "shadowCustomScrolled",
  ]) {
    expect(container.querySelector(`[data-menu-control-default-hint="${key}"]`)).toBeNull();
  }

  // Each scrolled control writes its own key.
  clickFirstSwatch(container, "Scrolled surface");
  setSliderValue(container, "Scrolled border width", "4");
  clickSegmented(container, "Scrolled shadow preset", "md");
  setInputValue(container, "Scrolled custom shadow", "0 18px 50px rgba(0,0,0,.24)");
  clickButton(container, "Save");
  await flush();

  const layout = readLastSavedDocument()?.sections[0]?.layout ?? {};
  expect(layout.surfaceColorScrolled).toBeTruthy();
  expect(layout.borderWidthScrolled).toBe(4);
  expect(layout.shadowScrolled).toBe("md");
  expect(layout.shadowCustomScrolled).toBe("0 18px 50px rgba(0,0,0,.24)");

  cleanup();
});
test("520-03-L01: the canvas preview 'scrolled' toggle stamps data-scrolled on the header", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.layout.sticky = true;
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const toggle = container.querySelector('[data-menu-preview-scrolled-toggle="true"]');
  expect(toggle).toBeTruthy();
  expect(canvasFrame(container).getAttribute("data-scrolled")).toBeNull();

  clickSelector(container, '[data-menu-preview-scrolled-toggle="true"]');
  expect(canvasFrame(container).getAttribute("data-scrolled")).toBe("true");

  // Toggling back removes the attribute (byte-identical to the resting state).
  clickSelector(container, '[data-menu-preview-scrolled-toggle="true"]');
  expect(canvasFrame(container).getAttribute("data-scrolled")).toBeNull();

  cleanup();
});
test("520-03-L02: the brand Mode selector offers Text/Image/Icon and writes mode:'icon'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  const modeGroup = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === "Mode");
  expect(modeGroup?.querySelector('[data-page-editor-segmented-option="icon"]')).toBeTruthy();

  clickSegmented(container, "Mode", "icon");
  clickButton(container, "Save");
  await flush();
  expect(brandBlock(readLastSavedDocument())?.props.mode).toBe("icon");

  cleanup();
});
test("520-03-L02: the icon picker is icon-mode-only; picking writes props.icon; clear removes it", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.mode = "icon";
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  await flushIcons();

  expect(container.querySelector('[data-menu-brand-icon-picker="true"]')).toBeTruthy();

  // Search narrows the grid so the target chip is present, then pick it.
  setInputValue(container, "Search brand icons", "house");
  clickSelector(container, '[data-menu-brand-icon-pick="house"]');
  clickButton(container, "Save");
  await flush();
  expect(brandBlock(readLastSavedDocument())?.props.icon).toBe("house");

  // Clear removes the present-only key.
  clickSelector(container, '[aria-label="Clear icon"]');
  clickButton(container, "Save");
  await flush();
  expect(
    Object.prototype.hasOwnProperty.call(brandBlock(readLastSavedDocument())?.props ?? {}, "icon")
  ).toBe(false);

  cleanup();
});
test("520-03-L02: icon color/size controls are icon-mode-only and write props.style", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.mode = "icon";
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  expect(hasGroup(container, "Icon color")).toBe(true);
  expect(sliderValue(container, "Icon size")).toBeTruthy();
  // Text-mode typography controls are absent in icon mode.
  expect(hasGroup(container, "Brand font weight")).toBe(false);

  setSliderValue(container, "Icon size", "28");
  clickButton(container, "Save");
  await flush();
  expect(
    (brandBlock(readLastSavedDocument())?.props.style as { iconSize?: number } | undefined)
      ?.iconSize
  ).toBe(28);

  cleanup();
});
test("520-03-L02: the 'Show text alongside' combo toggle is graphic-mode-only; on⇒showText, off⇒removed", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.mode = "image";
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  setToggle(container, "Show text alongside", true);
  clickButton(container, "Save");
  await flush();
  expect(brandBlock(readLastSavedDocument())?.props.showText).toBe(true);

  setToggle(container, "Show text alongside", false);
  clickButton(container, "Save");
  await flush();
  expect(
    Object.prototype.hasOwnProperty.call(
      brandBlock(readLastSavedDocument())?.props ?? {},
      "showText"
    )
  ).toBe(false);

  // Text mode ⇒ the combo toggle is absent.
  clickSegmented(container, "Mode", "text");
  expect(
    Array.from(container.querySelectorAll('[role="switch"]')).some(
      (t) => t.getAttribute("aria-label") === "Show text alongside"
    )
  ).toBe(false);

  cleanup();
});
test("520-03-L02: the brand canvas preview renders the icon <svg> and the combo wordmark", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") {
      brand.props.mode = "icon";
      brand.props.icon = "star";
      brand.props.showText = true;
      brand.props.text = "Acme";
    }
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  await flushIcons();

  const brandMark = canvasFrame(container).querySelector(".site-header-brand");
  expect(brandMark?.querySelector("svg.site-header-brand-icon")).toBeTruthy();
  // Combo: the wordmark renders BESIDE the icon.
  const wordmark = brandMark?.querySelector(".site-header-brand-text");
  expect(wordmark?.textContent).toBe("Acme");
  expect(brandMark?.getAttribute("data-menu-brand-combo")).toBe("true");

  cleanup();
});
