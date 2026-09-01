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
  findHint,
  findReset,
  flush,
  flushIcons,
  hasGroup,
  mediaState,
  mount,
  navBlock,
  readLastSavedDocument,
  seededLevelStyles,
  seededNavChrome,
  seedDocument,
  segmentedOption,
  selectBlockRow,
  setInputValue,
  setSliderValue,
  setToggle,
  sliderReadout,
  sliderValue,
  switchDevice,
} from "./menuDesignEditorFixtures";

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

test("F1 base Reset renders on a DESKTOP-BASE per-level field and clears it byte-clean", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.levelStyles = { 1: { linkColor: "#ff0000" } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  const reset = findReset(container, "Link color");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  expect(reset?.getAttribute("aria-label")).toBe("Reset Link color to default");
  expect(reset?.textContent).toContain("Reset to default");

  clickSelector(container, '[data-menu-responsive-reset="Link color"]');
  clickButton(container, "Save");
  await flush();
  // The emptied level record prunes back to the legacy no-levelStyles shape.
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  cleanup();
});
test("F1 base Reset clears a level-0 navChrome field (Pill radius) to byte-clean", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.navChrome = { navPillRadius: 12 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  const reset = findReset(container, "Pill radius");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  clickSelector(container, '[data-menu-responsive-reset="Pill radius"]');
  clickButton(container, "Save");
  await flush();
  expect(seededNavChrome(readLastSavedDocument())).toBeUndefined();

  cleanup();
});
test("F1 base Reset clears a nav-base scalar and a brand field; absent when unset", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.linkPaddingX = 20;
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.style = { fontSize: 28 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Authored base scalar ⇒ base Reset; an unset sibling ⇒ no Reset at all.
  expect(
    findReset(container, "Link padding X")?.getAttribute("data-menu-responsive-reset-kind")
  ).toBe("base");
  expect(findReset(container, "Link radius")).toBeNull();
  clickSelector(container, '[data-menu-responsive-reset="Link padding X"]');

  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Brand");
  expect(
    findReset(container, "Brand font size")?.getAttribute("data-menu-responsive-reset-kind")
  ).toBe("base");
  clickSelector(container, '[data-menu-responsive-reset="Brand font size"]');
  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  expect(Object.prototype.hasOwnProperty.call(navBlock(saved)?.props ?? {}, "linkPaddingX")).toBe(
    false
  );
  expect(Object.prototype.hasOwnProperty.call(brandBlock(saved)?.props ?? {}, "style")).toBe(false);

  cleanup();
});
test("F1 on tablet/mobile still shows the device Reset (kind override), never the base branch", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  setSliderValue(container, "Link padding X", "10");
  const reset = findReset(container, "Link padding X");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("override");

  cleanup();
});
test("F2 hint shows the RESOLVED default (Inherits level 0) + slider thumb, not range.min", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.fontSize = 18;
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  // Level-1 fontSize is unset ⇒ inherits the level-0 base (18), NOT range.min (10).
  expect(findHint(container, "fontSize")?.textContent).toContain("Inherits level 0");
  expect(sliderValue(container, "Font size")).toBe("18");

  // Setting the own record hides the hint.
  setSliderValue(container, "Font size", "22");
  expect(findHint(container, "fontSize")).toBeNull();

  cleanup();
});
test("F2 hint shows a theme/base default at level 0 and disappears once set", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  expect(findHint(container, "itemGap")?.textContent).toContain("Default");
  setSliderValue(container, "Item gap", "14");
  expect(findHint(container, "itemGap")).toBeNull();

  cleanup();
});
test("F2 nav-base link sliders: unset thumb shows the RESOLVED default (12/8/6), never range.min (0)", async () => {
  // Fresh doc: linkPaddingX/Y/radius are all UNSET. The thumb must sit at the
  // resolved theme default (MENU_SHELL_DEFAULT_LINK_PX/PY/RADIUS = 12/8/6), matching
  // the F2 hint rendered below, NOT the misleading NAV_LINK_NUMBER_RANGES min (0).
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  expect(sliderValue(container, "Link padding X")).toBe("12");
  expect(sliderValue(container, "Link padding Y")).toBe("8");
  expect(sliderValue(container, "Link radius")).toBe("6");
  // The hint below each corroborates the same resolved default.
  expect(findHint(container, "linkPaddingX")?.textContent).toContain("Default 12px");
  expect(findHint(container, "linkPaddingY")?.textContent).toContain("Default 8px");
  expect(findHint(container, "linkRadius")?.textContent).toContain("Default 6px");

  cleanup();
});
test("F2 isSet trap: a Desktop base value must NOT suppress the Mobile 'Inherited from desktop' hint", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.linkPaddingX = 20;
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");

  // Desktop base = 20, no mobile override ⇒ the hint MUST still render (isSet uses
  // the override reader ALONE, not `hasBaseValue || override`).
  expect(findHint(container, "linkPaddingX")?.textContent).toContain("Inherited from desktop");

  cleanup();
});
test("TASK-507 FIX B: gated present-only numerics render NO default hint when unset", async () => {
  // The gated present-only numerics resolve to { value: undefined, sourceLabel:
  // "Off" | "Not applied" } precisely so the hint is HIDDEN — the range thumb sits
  // at range.min and NO mixed-messaging "Off"/"Not applied" text renders below it.
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0 (navChrome) gated numerics — unset ⇒ hidden.
  for (const key of [
    "navPillRadius",
    "navPillPaddingX",
    "navPillPaddingY",
    "itemDividerWidth",
    "indicatorThickness",
    "transitionMs",
    "hoverLift",
  ]) {
    expect(findHint(container, key), `level-0 ${key} hint must be hidden`).toBeNull();
  }

  // Level 1 (levelStyles) gated numerics — unset ⇒ hidden.
  // TASK-508-01 R1(a): containerPaddingX/Y are NO LONGER gated (they carry a REAL
  // base-sheet default) and are asserted POSITIVELY below — removed from this loop.
  clickSegmented(container, "Nesting level", "1");
  for (const key of ["itemDividerWidth", "indicatorThickness", "transitionMs", "hoverLift"]) {
    expect(findHint(container, key), `level-1 ${key} hint must be hidden`).toBeNull();
  }

  cleanup();
});
test("TASK-508-01 R1(a): unset dropdown-container controls render REAL base-sheet default hints (180 / 6)", async () => {
  // The R1(a) resolver fix makes minWidth resolve { value:180, "Default 180px" } and
  // containerPaddingX/Y resolve { value:6, "Default 6px" } — so (507 guard) the hint
  // now legitimately RENDERS (value !== undefined) and the thumb sits at 180 / 6.
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  expect(findHint(container, "minWidth")?.textContent, "level-1 minWidth hint").toContain(
    "Default 180px"
  );
  for (const key of ["containerPaddingX", "containerPaddingY"]) {
    expect(findHint(container, key)?.textContent, `level-1 ${key} hint`).toContain("Default 6px");
  }

  cleanup();
});
test("TASK-507 FIX B: no rendered default hint ever contains 'undefined'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  const assertNoUndefined = () => {
    for (const node of container.querySelectorAll("[data-menu-control-default-hint]")) {
      expect(node.textContent ?? "").not.toContain("undefined");
      expect(node.getAttribute("data-menu-control-default-source") ?? "").not.toContain(
        "undefined"
      );
    }
  };

  assertNoUndefined();
  clickSegmented(container, "Nesting level", "1");
  assertNoUndefined();
  clickSegmented(container, "Nesting level", "2");
  assertNoUndefined();

  cleanup();
});
test("B1–B5 controls write the Desktop BASE per level (with correct level gating)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0: pill + caret present, flyoutAnimation + container padding + placement absent.
  expect(container.querySelector('input[data-page-editor-slider="Pill radius"]')).toBeTruthy();
  expect(hasGroup(container, "Flyout animation")).toBe(false);
  expect(
    container.querySelector('input[data-page-editor-slider="Container padding X"]')
  ).toBeNull();
  expect(hasGroup(container, "Submenu placement")).toBe(false);
  setSliderValue(container, "Pill radius", "16");
  clickSegmented(container, "Show caret", "off");

  // Level 1: flyoutAnimation + container padding present, pill absent, placement absent.
  clickSegmented(container, "Nesting level", "1");
  expect(container.querySelector('input[data-page-editor-slider="Pill radius"]')).toBeNull();
  expect(hasGroup(container, "Flyout animation")).toBe(true);
  expect(
    container.querySelector('input[data-page-editor-slider="Container padding X"]')
  ).toBeTruthy();
  expect(hasGroup(container, "Submenu placement")).toBe(false);
  clickSegmented(container, "Item divider", "on");
  clickSegmented(container, "Divider style", "dashed");
  clickSegmented(container, "Indicator", "underline");
  clickSegmented(container, "Flyout animation", "fade");
  setSliderValue(container, "Container padding X", "10");
  // transitionMs uses the "ms" unit.
  expect(sliderReadout(container, "Transition")?.endsWith("ms")).toBe(true);

  // Level 2: submenu placement present (level-2 only).
  clickSegmented(container, "Nesting level", "2");
  expect(hasGroup(container, "Submenu placement")).toBe(true);
  clickSegmented(container, "Submenu placement", "bottom");

  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  expect(seededNavChrome(saved)).toMatchObject({ navPillRadius: 16, showCaret: false });
  const levels = seededLevelStyles(saved)!;
  expect(levels[1]).toMatchObject({
    itemDividerShow: true,
    itemDividerStyle: "dashed",
    indicator: "underline",
    flyoutAnimation: "fade",
    containerPaddingX: 10,
  });
  expect(levels[2]).toMatchObject({ submenuPlacement: "bottom" });

  cleanup();
});
test("B-controls fork per device (Mobile ⇒ sparse override) and the Default sentinel clears", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  clickSegmented(container, "Indicator", "overline");
  clickButton(container, "Save");
  await flush();
  const override = readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps?.levelStyles;
  expect(override?.[1]).toEqual({ indicator: "overline" });
  // Base props untouched by the mobile fork.
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  // The "Default" sentinel clears the field ⇒ present-only zero bytes (record pruned).
  clickSegmented(container, "Indicator", "inherit");
  clickButton(container, "Save");
  await flush();
  expect(readLastSavedDocument()?.sections[0]?.responsive).toBeUndefined();

  cleanup();
});
test("canvas force-open threads the selected level so the styled sublist is revealed", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "2");

  const style = canvasFrame(container).querySelector("style")?.textContent ?? "";
  // 506-02's previewForceOpenLevel opens AND neutralizes the level-2 sublist so
  // the fade/slide flyout is visible on canvas — TASK-508 R2 folds in visibility:visible.
  expect(style).toContain(
    ".site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );

  cleanup();
});
test("R1(b) linkAlign seg renders for dropdown levels 1 & 2, absent from level 0", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0 (top bar) ⇒ no per-level link alignment (out of scope).
  expect(hasGroup(container, "Link alignment")).toBe(false);
  clickSegmented(container, "Nesting level", "1");
  expect(hasGroup(container, "Link alignment")).toBe(true);
  clickSegmented(container, "Nesting level", "2");
  expect(hasGroup(container, "Link alignment")).toBe(true);

  cleanup();
});
test("R1(b) linkAlign writes center on the Desktop BASE per level and Default clears it", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  clickSegmented(container, "Link alignment", "center");
  clickButton(container, "Save");
  await flush();
  expect(seededLevelStyles(readLastSavedDocument())?.[1]).toMatchObject({ linkAlign: "center" });
  // Base write only — no responsive member.
  expect(JSON.stringify(readLastSavedDocument()?.sections[0]?.responsive ?? {})).not.toContain(
    "linkAlign"
  );

  // The "Default" sentinel clears it ⇒ present-only zero bytes (record prunes clean).
  clickSegmented(container, "Link alignment", "inherit");
  clickButton(container, "Save");
  await flush();
  expect(seededLevelStyles(readLastSavedDocument())).toBeUndefined();

  cleanup();
});
test("R1(b) linkAlign forks per device (Mobile ⇒ sparse override + Reset), base untouched", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  clickSegmented(container, "Link alignment", "right");
  // Override device ⇒ the MenuResponsiveControlShell Reset appears (kind override).
  expect(
    findReset(container, "Link alignment")?.getAttribute("data-menu-responsive-reset-kind")
  ).toBe("override");
  clickButton(container, "Save");
  await flush();
  const override = readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps?.levelStyles;
  expect(override?.[1]).toEqual({ linkAlign: "right" });
  // Desktop base never mutated by the mobile fork; tablet never inherits mobile.
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  cleanup();
});
test("R1(b) a stored linkAlign survives the read/normalize round-trip (fail-closed READ trap)", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.levelStyles = { 1: { linkAlign: "center" } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  // If `linkAlign` were missing from NAV_LEVEL_STYLE_KEYS the stored record would be
  // dropped on read and the seg would show "Default" instead of the seeded "center".
  expect(segmentedOption(container, "Link alignment", "center")?.getAttribute("aria-pressed")).toBe(
    "true"
  );

  cleanup();
});
test("R3a submenuDirection renders in the level-0 panel (Right/Down/Up/Left + Default), writes base", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level-0 nav-base panel ⇒ the nav-global "Open direction" is present with Up.
  expect(hasGroup(container, "Open direction")).toBe(true);
  for (const opt of ["inherit", "right", "down", "up", "left"]) {
    expect(
      segmentedOption(container, "Open direction", opt),
      `Open direction option ${opt}`
    ).toBeTruthy();
  }
  // Unset ⇒ the "Default" (inherit) segment is selected (base-only, no badge/Reset).
  expect(
    segmentedOption(container, "Open direction", "inherit")?.getAttribute("aria-pressed")
  ).toBe("true");
  expect(findReset(container, "Open direction")).toBeNull();

  clickSegmented(container, "Open direction", "down");
  clickButton(container, "Save");
  await flush();
  expect(seededNavChrome(readLastSavedDocument())).toMatchObject({ submenuDirection: "down" });

  cleanup();
});
test("R3a submenuDirection 'up' round-trips through the stored read", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.navChrome = { submenuDirection: "up" };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  expect(segmentedOption(container, "Open direction", "up")?.getAttribute("aria-pressed")).toBe(
    "true"
  );

  cleanup();
});
test("R3b submenuMode renders in the level-0 panel (Flyout/Accordion + Default), writes base + clears", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  expect(hasGroup(container, "Submenu mode")).toBe(true);
  for (const opt of ["inherit", "flyout", "accordion"]) {
    expect(
      segmentedOption(container, "Submenu mode", opt),
      `Submenu mode option ${opt}`
    ).toBeTruthy();
  }
  expect(findReset(container, "Submenu mode")).toBeNull();

  clickSegmented(container, "Submenu mode", "accordion");
  clickButton(container, "Save");
  await flush();
  expect(seededNavChrome(readLastSavedDocument())).toMatchObject({ submenuMode: "accordion" });

  // Default clears it ⇒ present-only zero bytes (navChrome prunes clean).
  clickSegmented(container, "Submenu mode", "inherit");
  clickButton(container, "Save");
  await flush();
  expect(seededNavChrome(readLastSavedDocument())).toBeUndefined();

  cleanup();
});
test("R3a/R3b are BASE-only on Tablet (write props.navChrome, no responsive.tablet, no Reset) and hidden on Mobile", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Tablet");
  selectBlockRow(container, "Navigation items");

  // Structural keys still render on Tablet but as base-DEFINING unwrapped controls.
  expect(hasGroup(container, "Open direction")).toBe(true);
  expect(findReset(container, "Open direction")).toBeNull();
  expect(findReset(container, "Submenu mode")).toBeNull();

  clickSegmented(container, "Open direction", "up");
  clickSegmented(container, "Submenu mode", "accordion");
  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  // The edits land on the BASE navChrome even though the active device is Tablet
  // (NO tablet-delta emitter exists ⇒ a responsive.tablet override would be DEAD DATA).
  expect(seededNavChrome(saved)).toMatchObject({
    submenuDirection: "up",
    submenuMode: "accordion",
  });
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("submenuDirection");
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("submenuMode");

  cleanup();
});
test("R3a/R3b are hidden on Mobile (flyout/accordion are >=640-only)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");

  expect(hasGroup(container, "Open direction")).toBe(false);
  expect(hasGroup(container, "Submenu mode")).toBe(false);

  cleanup();
});
test("R2 §2b: a Level-0 nav selection force-opens the FIRST dropdown in the canvas", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  const styleText = () => canvasFrame(container).querySelector("style")?.textContent ?? "";
  const depth1Open =
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}";

  // No nav selection ⇒ nothing forced (undefined force-open).
  expect(styleText()).not.toContain(depth1Open);

  // Nav-items selected on the Level-0 tab ⇒ depth-1 previews OPEN so the author sees
  // the nav-global direction/mode/animation effects while editing them on Level 0.
  selectBlockRow(container, "Navigation items");
  expect(styleText()).toContain(depth1Open);

  // Deselecting (non-nav) drops the force-open again.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]');
  expect(styleText()).not.toContain(depth1Open);

  cleanup();
});

// --- TASK-105-08-05 residuals: level-0 nav writes, brand styles, logo picker --//

test("level-0 nav fields write base colors, typography, padding, chrome, and direction", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Nav base scalars (setNavField on the desktop base).
  setSliderValue(container, "Font size", "20");
  clickSegmented(container, "Text transform", "uppercase");
  clickFirstSwatch(container, "Link color");
  clickFirstSwatch(container, "Hover background");
  clickFirstSwatch(container, "Active background");
  clickFirstSwatch(container, "Hover text");
  setSliderValue(container, "Link padding X", "14");
  setSliderValue(container, "Link padding Y", "10");
  setSliderValue(container, "Link radius", "8");

  // Nav chrome sub-record (chromeSwatch / chromeSlider / chromeSeg / chromeToggle).
  clickFirstSwatch(container, "Pill background");
  setSliderValue(container, "Pill radius", "12");
  clickSegmented(container, "Item divider", "on");
  clickFirstSwatch(container, "Divider color");
  clickSegmented(container, "Divider style", "dashed");
  clickSegmented(container, "Indicator", "underline");
  setSliderValue(container, "Transition", "250");
  clickSegmented(container, "Show caret", "on");

  // Device-defining base writers (dropdown direction + submenu globals).
  clickSegmented(container, "Dropdown direction", "top");
  clickSegmented(container, "Open direction", "down");
  clickSegmented(container, "Submenu mode", "accordion");

  clickButton(container, "Save");
  await flush();
  const nav = navBlock(readLastSavedDocument());
  expect(nav?.props).toMatchObject({
    fontSize: 20,
    textTransform: "uppercase",
    linkPaddingX: 14,
    linkPaddingY: 10,
    linkRadius: 8,
    dropdownDirection: "top",
  });
  expect(nav?.props.linkColor).toBeTruthy();
  expect(nav?.props.linkHoverColor).toBeTruthy();
  expect(nav?.props.linkActiveColor).toBeTruthy();
  expect(nav?.props.linkHoverTextColor).toBeTruthy();
  expect(nav?.props.navChrome).toMatchObject({
    navPillRadius: 12,
    itemDividerShow: true,
    itemDividerStyle: "dashed",
    indicator: "underline",
    transitionMs: 250,
    showCaret: true,
    submenuDirection: "down",
    submenuMode: "accordion",
  });
  expect(
    (nav?.props.navChrome as Record<string, unknown> | undefined)?.navPillBackground
  ).toBeTruthy();
  expect(
    (nav?.props.navChrome as Record<string, unknown> | undefined)?.itemDividerColor
  ).toBeTruthy();
  cleanup();
});

test("mobile nav writes forked overrides and device resets prune them", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  switchDevice(container, "Mobile");

  // Mobile menu is base-DEFINING (writes the base regardless of the device).
  clickSegmented(container, "Mobile menu", "inline");
  // Forked nav-base + chrome override writes.
  clickSegmented(container, "Text transform", "uppercase");
  clickFirstSwatch(container, "Pill background");
  // Device Reset prunes both override records (resetNav + resetChrome).
  const navReset = findReset(container, "Text transform");
  expect(navReset?.getAttribute("data-menu-responsive-reset-kind")).toBe("override");
  clickSelector(container, '[data-menu-responsive-reset="Text transform"]');
  clickSelector(container, '[data-menu-responsive-reset="Pill background"]');
  clickButton(container, "Save");
  await flush();
  const doc = readLastSavedDocument();
  expect(navBlock(doc)?.props.mobileMode).toBe("inline");
  const section = doc?.sections[0] as unknown as {
    responsive?: {
      mobile?: { navProps?: Record<string, unknown>; navChrome?: Record<string, unknown> };
    };
  };
  expect(section?.responsive?.mobile?.navProps?.textTransform).toBeUndefined();
  expect(section?.responsive?.mobile?.navChrome?.navPillBackground).toBeUndefined();
  cleanup();
});

test("level 1 and 2 controls write levelStyles and render the inherit badges", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  // The per-level set renders with the level-inherit badge chrome.
  expect(container.querySelector('[data-menu-level-field="inherited"]')).toBeTruthy();
  clickFirstSwatch(container, "Link color");
  setSliderValue(container, "Font size", "17");
  clickSegmented(container, "Font weight", "600");
  clickSegmented(container, "Shadow", "md");
  setSliderValue(container, "Min width", "220");
  clickSegmented(container, "Link alignment", "center");
  clickSegmented(container, "Item divider", "on");
  clickFirstSwatch(container, "Divider color");
  clickSegmented(container, "Divider style", "dotted");
  clickSegmented(container, "Indicator", "overline");
  clickSegmented(container, "Grow on hover", "on");
  clickSegmented(container, "Underline on hover", "on");
  clickSegmented(container, "Show caret", "on");
  clickSegmented(container, "Rotate caret on open", "on");
  clickSegmented(container, "Flyout animation", "fade");

  // Level 2 adds the nested-submenu placement axis.
  clickSegmented(container, "Nesting level", "2");
  clickSegmented(container, "Submenu placement", "left");

  clickButton(container, "Save");
  await flush();
  const styles = seededLevelStyles(readLastSavedDocument()) ?? {};
  expect(styles["1"]).toMatchObject({
    fontSize: 17,
    fontWeight: 600,
    shadow: "md",
    minWidth: 220,
    linkAlign: "center",
    itemDividerShow: true,
    itemDividerStyle: "dotted",
    indicator: "overline",
    indicatorGrow: true,
    hoverUnderline: true,
    showCaret: true,
    caretRotateOnOpen: true,
    flyoutAnimation: "fade",
  });
  expect(styles["1"]?.linkColor).toBeTruthy();
  expect(styles["1"]?.itemDividerColor).toBeTruthy();
  expect(styles["2"]).toMatchObject({ submenuPlacement: "left" });
  cleanup();
});

test("a level-1 override on Mobile resets via the device Reset (resetLevel)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");
  switchDevice(container, "Mobile");
  clickFirstSwatch(container, "Link color");
  const reset = findReset(container, "Link color");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("override");
  clickSelector(container, '[data-menu-responsive-reset="Link color"]');
  clickButton(container, "Save");
  await flush();
  const doc = readLastSavedDocument();
  const levelStyles = doc?.sections[0]?.responsive?.mobile?.navProps?.levelStyles;
  expect(levelStyles?.[1]?.linkColor).toBeUndefined();
  cleanup();
});

test("brand text-mode style controls write props.style and base reset clears", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  setSliderValue(container, "Brand font size", "22");
  clickSegmented(container, "Brand font weight", "700");
  clickFirstSwatch(container, "Brand color");
  clickSegmented(container, "Brand text transform", "uppercase");
  setSliderValue(container, "Letter spacing", "2");
  // Base-reset the letter spacing back out (clearMenuBrandStyleBase path).
  const reset = findReset(container, "Letter spacing");
  expect(reset?.getAttribute("aria-label")).toBe("Reset Letter spacing to default");
  clickSelector(container, '[data-menu-responsive-reset="Letter spacing"]');
  clickButton(container, "Save");
  await flush();
  const style = brandBlock(readLastSavedDocument())?.props.style as
    Record<string, unknown> | undefined;
  expect(style).toMatchObject({ fontSize: 22, fontWeight: 700, textTransform: "uppercase" });
  expect(style?.color).toBeTruthy();
  expect(Object.prototype.hasOwnProperty.call(style ?? {}, "letterSpacing")).toBe(false);
  cleanup();
});

test("brand icon-mode style writes icon color; the canvas renders the graphic", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((block) => block.type === "brand");
    if (brand?.type === "brand") {
      brand.props.mode = "icon";
      brand.props.icon = "star";
    }
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  await flushIcons();
  selectBlockRow(container, "Brand");
  clickFirstSwatch(container, "Icon color");
  setSliderValue(container, "Icon size", "30");
  clickButton(container, "Save");
  await flush();
  const style = brandBlock(readLastSavedDocument())?.props.style as
    Record<string, unknown> | undefined;
  expect(style?.iconColor).toBeTruthy();
  expect(style?.iconSize).toBe(30);
  cleanup();
});

test("brand image-mode logo picker resolves the asset and clear removes the image", async () => {
  // Cold media cache: the picker loads the library on mount (currentSrc set).
  mediaState.cached = null;
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((block) => block.type === "brand");
    if (brand?.type === "brand") {
      brand.props.mode = "image";
      brand.props.image = { src: "/media/logo.svg", alt: "" };
    }
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  await flush();
  // The library load resolves the stored src to its asset id.
  expect(
    container
      .querySelector('[data-shared-media-picker="true"]')
      ?.getAttribute("data-media-picker-value")
  ).toBe("asset-logo");
  // Image-mode brand style also exposes the bounded max-width/height sliders.
  setSliderValue(container, "Logo max width", "120");
  setSliderValue(container, "Logo height", "48");
  // Picking a new asset resolves through the library and writes its URL.
  clickSelector(container, '[data-menu-media-pick="true"]');
  clickButton(container, "Save");
  await flush();
  expect(brandBlock(readLastSavedDocument())?.props.image).toMatchObject({
    src: "/media/logo.svg",
  });
  const brandStyle = brandBlock(readLastSavedDocument())?.props.style as
    Record<string, unknown> | undefined;
  expect(brandStyle?.maxWidth).toBe(120);
  expect(brandStyle?.height).toBe(48);
  // Clearing drops the present-only image key entirely.
  clickSelector(container, '[data-menu-media-clear="true"]');
  clickButton(container, "Save");
  await flush();
  expect(
    Object.prototype.hasOwnProperty.call(brandBlock(readLastSavedDocument())?.props ?? {}, "image")
  ).toBe(false);
  cleanup();
});

test("brand text and link inputs patch the brand block; cta fields patch the leaf", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Button");
  setInputValue(container, "Button label", "Join now");
  setInputValue(container, "Button link", "/join");
  clickSegmented(container, "Variant", "secondary");
  clickSegmented(container, "Size", "lg");
  setToggle(container, "Open in new tab", true);

  // Switch selection via the canvas brand mark (the bar list is hidden once a
  // block is selected).
  const brandMark = canvasFrame(container).querySelector(".site-header-brand");
  expect(brandMark).toBeTruthy();
  React.act(() => {
    brandMark?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  // Clearing the brand text drops the sparse prop (site-name fallback).
  setInputValue(container, "Brand text", "");
  setInputValue(container, "Brand link", "/home");

  clickButton(container, "Save");
  await flush();
  const doc = readLastSavedDocument();
  const brand = brandBlock(doc);
  expect(Object.prototype.hasOwnProperty.call(brand?.props ?? {}, "text")).toBe(false);
  expect(brand?.props.href).toBe("/home");
  const cta = doc?.sections[0]?.blocks.find((block) => block.type === "cta-button");
  expect(cta?.props).toMatchObject({
    label: "Join now",
    href: "/join",
    variant: "secondary",
    size: "lg",
    target: "blank",
  });
  cleanup();
});
