// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  brandBlock,
  canvasFrame,
  clickButton,
  clickSegmented,
  clickSelector,
  findHint,
  findReset,
  flush,
  hasGroup,
  mount,
  navBlock,
  readLastSavedDocument,
  seededLevelStyles,
  seededNavChrome,
  seedDocument,
  segmentedOption,
  selectBlockRow,
  setSliderValue,
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
  const override = (
    readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps as
      { levelStyles?: Record<string, Record<string, unknown>> } | undefined
  )?.levelStyles;
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
  const override = (
    readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps as
      { levelStyles?: Record<string, Record<string, unknown>> } | undefined
  )?.levelStyles;
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
