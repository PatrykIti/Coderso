// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  canvasBlock,
  canvasFrame,
  clickButton,
  clickSegmented,
  clickSelector,
  ctaBlockId,
  findMenuResponsiveField,
  flush,
  menusClientState,
  mount,
  readLastSavedDocument,
  seedDocument,
  selectBlockRow,
  setInputValue,
  setSliderValue,
  setToggle,
  settingsState,
  sliderValue,
  switchDevice,
} from "./menuDesignEditorFixtures";

import {
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  menuBlockTypes,
  normalizeMenuDocumentV2ForWrite,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

test("desktop edit writes the BASE layout (no responsive member) and the badge reads 'base'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "base"
  );
  setSliderValue(container, "Vertical padding", "20");
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  expect(document?.sections[0]?.layout.paddingY).toBe(20);
  expect(document?.sections[0]?.responsive).toBeUndefined();
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});
test("mobile edit writes a SPARSE responsive.mobile.layout override; the base stays untouched", async () => {
  // Event-handler-only writes: act-wrapped renders must produce no warning spew
  // (no setState-in-effect anywhere on the device-forked paths).
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  setSliderValue(container, "Vertical padding", "24");
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "override"
  );
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const section = document?.sections[0];
  // Sparse: ONLY the edited key, base record untouched (no own undefined key).
  expect(Object.prototype.hasOwnProperty.call(section?.layout ?? {}, "paddingY")).toBe(false);
  expect(section?.responsive?.mobile?.layout).toEqual({ paddingY: 24 });
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();

  cleanup();
});
test("tablet is a real override breakpoint: forked write + Override badge + working Reset (502-04)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Tablet");
  // TASK-502-04: tablet is now a REAL override breakpoint — an un-overridden
  // field reads "inherited" on Tablet (badge/Reset generalized off the
  // mobile-only predicate), and the edit writes the sparse tablet record.
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );
  setSliderValue(container, "Vertical padding", "18");
  const field = findMenuResponsiveField(container, "Vertical padding");
  expect(field.dataset.menuResponsiveField).toBe("override");
  expect(field.querySelector('[data-menu-responsive-badge="override"]')?.textContent).toBe(
    "Override"
  );
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const section = document?.sections[0];
  // NEW model contract: the Tablet edit writes its OWN sparse record; the base
  // layout is untouched and NO mobile record materializes.
  expect(Object.prototype.hasOwnProperty.call(section?.layout ?? {}, "paddingY")).toBe(false);
  expect(section?.responsive?.tablet?.layout).toEqual({ paddingY: 18 });
  expect(section?.responsive?.mobile).toBeUndefined();

  // Reset removes the tablet override + prunes back to the legacy shape.
  clickSelector(container, '[data-menu-responsive-reset="Vertical padding"]');
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );
  clickButton(container, "Save");
  await flush();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  cleanup();
});
test("panel shows RESOLVED values while badges compare against the BASE record", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.layout = { paddingX: 8 };
    doc.sections[0]!.responsive = { mobile: { layout: { paddingX: 24 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: base value displayed, every badge "base".
  expect(sliderValue(container, "Horizontal padding")).toBe("8");
  expect(findMenuResponsiveField(container, "Horizontal padding").dataset.menuResponsiveField).toBe(
    "base"
  );

  // Mobile: the RESOLVED override value displayed, override badge from the
  // BASE-record read; an un-overridden sibling reads "inherited".
  switchDevice(container, "Mobile");
  expect(sliderValue(container, "Horizontal padding")).toBe("24");
  const overriddenField = findMenuResponsiveField(container, "Horizontal padding");
  expect(overriddenField.dataset.menuResponsiveField).toBe("override");
  expect(
    overriddenField.querySelector('[data-menu-responsive-badge="override"]')?.textContent
  ).toBe("Override");
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );

  cleanup();
});
test("Reset removes the override, prunes empty records, and re-inherits the desktop value", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.layout = { paddingX: 8 };
    doc.sections[0]!.responsive = { mobile: { layout: { paddingX: 24 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // TASK-506-04 F1: Desktop now shows the BASE Reset-to-default when the base
  // record carries a value (this assertion flip is OWNED by 506-04, not a 504
  // regression). The device (mobile) Reset behaviour below is unchanged.
  const desktopReset = container.querySelector('[data-menu-responsive-reset="Horizontal padding"]');
  expect(desktopReset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  expect(desktopReset?.getAttribute("aria-label")).toBe("Reset Horizontal padding to default");
  expect(desktopReset?.textContent).toContain("Reset to default");

  switchDevice(container, "Mobile");
  clickSelector(container, '[data-menu-responsive-reset="Horizontal padding"]');

  // Re-inherits live: badge flips, base value re-displayed, button gone.
  const field = findMenuResponsiveField(container, "Horizontal padding");
  expect(field.dataset.menuResponsiveField).toBe("inherited");
  expect(sliderValue(container, "Horizontal padding")).toBe("8");
  expect(container.querySelector('[data-menu-responsive-reset="Horizontal padding"]')).toBeNull();

  clickButton(container, "Save");
  await flush();
  const document = readLastSavedDocument();
  expect(document?.sections[0]?.layout).toEqual({ paddingX: 8 });
  // Empty mobile/responsive records pruned back to the legacy shape.
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});
test("fontWeight 'Theme' deletes the key on BOTH device paths (delete-on-undefined, no undefined residue)", async () => {
  // Mobile: with an override present, "Theme" deletes the override leaf,
  // prunes empties, and re-inherits (same net effect as Reset for the key).
  seedDocument((doc) => {
    doc.sections[0]!.responsive = { mobile: { navProps: { fontWeight: 600 } } };
  });
  const mobileView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(mobileView.container, "Mobile");
  selectBlockRow(mobileView.container, "Navigation items");
  expect(
    findMenuResponsiveField(mobileView.container, "Font weight").dataset.menuResponsiveField
  ).toBe("override");
  clickSegmented(mobileView.container, "Font weight", "inherit");
  const fontField = findMenuResponsiveField(mobileView.container, "Font weight");
  expect(fontField.dataset.menuResponsiveField).toBe("inherited");
  expect(
    mobileView.container.querySelector('[data-menu-responsive-reset="Font weight"]')
  ).toBeNull();
  // Undo restores the pre-"Theme" document (override present again).
  clickSelector(mobileView.container, 'button[aria-label="Undo"]');
  expect(
    findMenuResponsiveField(mobileView.container, "Font weight").dataset.menuResponsiveField
  ).toBe("override");
  clickSelector(mobileView.container, 'button[aria-label="Redo"]');
  clickButton(mobileView.container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  expect(JSON.stringify(mobileSaved)).not.toContain('"responsive"');
  const savedNav = mobileSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(savedNav?.props ?? {}, "fontWeight")).toBe(false);
  mobileView.cleanup();

  // Desktop: "Theme" deletes the BASE key exactly like the previous flat
  // writer — no own undefined key left in the nav-items props.
  menusClientState.reset();
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((block) => block.type === "nav-items");
    if (nav && nav.type === "nav-items") nav.props = { fontWeight: 600 };
  });
  const desktopView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(desktopView.container, "Navigation items");
  clickSegmented(desktopView.container, "Font weight", "inherit");
  clickButton(desktopView.container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNav = desktopSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(desktopNav?.props ?? {}, "fontWeight")).toBe(false);
  desktopView.cleanup();
});
test("orientation SegmentedControl: resolved default 'horizontal'; desktop writes base props, mobile writes the override", async () => {
  // Desktop: default selection performs NO write; picking Vertical writes the
  // nav-items base props.
  const desktopView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(desktopView.container, "Navigation items");
  const horizontal = desktopView.container.querySelector(
    '[data-page-editor-segmented-option="horizontal"]'
  );
  expect(horizontal?.getAttribute("aria-pressed")).toBe("true");
  expect(desktopView.container.textContent).not.toContain("Unsaved");
  clickSegmented(desktopView.container, "Orientation", "vertical");
  clickButton(desktopView.container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNav = desktopSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(desktopNav?.props.orientation).toBe("vertical");
  expect(JSON.stringify(desktopSaved)).not.toContain('"responsive"');
  desktopView.cleanup();

  // Mobile: the same control writes the sparse navProps override instead.
  menusClientState.reset();
  const mobileView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(mobileView.container, "Mobile");
  selectBlockRow(mobileView.container, "Navigation items");
  clickSegmented(mobileView.container, "Orientation", "vertical");
  clickButton(mobileView.container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  const mobileSection = mobileSaved?.sections[0];
  const mobileNav = mobileSection?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(mobileNav?.props ?? {}, "orientation")).toBe(false);
  expect(mobileSection?.responsive?.mobile?.navProps).toEqual({ orientation: "vertical" });
  mobileView.cleanup();
});
test("per-block visibility forks by device: flat leaf toggle on Desktop, override toggle on Mobile, hidden-row indicator", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: native blocks get NO visibility toggle…
  selectBlockRow(container, "Brand");
  expect(
    Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Visible"
    )
  ).toBeUndefined();
  // …leaf blocks get the FLAT toggle (writes the flat visibility slot).
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Button");
  setToggle(container, "Visible", false);
  clickButton(container, "Save");
  await flush();
  const flatSaved = readLastSavedDocument();
  const flatCta = flatSaved?.sections[0]?.blocks.find((block) => block.type === "cta-button");
  expect(flatCta?.visibility?.visible).toBe(false);
  expect(JSON.stringify(flatSaved)).not.toContain('"responsive"');

  // Mobile: EVERY block type gets the override toggle (native included)…
  switchDevice(container, "Mobile");
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Brand");
  expect(
    Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Visible on mobile"
    )
  ).toBeTruthy();
  // …and composes show-only-on-mobile: flat visible:false + mobile true.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Button");
  setToggle(container, "Visible on mobile", true);
  const visibilityField = findMenuResponsiveField(container, "Visible on mobile");
  expect(visibilityField.dataset.menuResponsiveField).toBe("override");
  clickButton(container, "Save");
  await flush();
  const overrideSaved = readLastSavedDocument();
  const overrideCta = overrideSaved?.sections[0]?.blocks.find(
    (block) => block.type === "cta-button"
  );
  expect(overrideCta?.visibility?.visible).toBe(false); // flat slot untouched
  expect(overrideCta?.responsive?.mobile?.visibility).toEqual({ visible: true });

  // Reset clears the block record (pruned) and re-inherits the flat value.
  clickSelector(container, '[data-menu-responsive-reset="Visible on mobile"]');
  clickButton(container, "Save");
  await flush();
  const resetSaved = readLastSavedDocument();
  expect(JSON.stringify(resetSaved)).not.toContain('"responsive"');

  // Blocks-list discoverability: the (now) mobile-hidden Button is flagged.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]');
  const hidden = container.querySelector("[data-menu-block-hidden]");
  expect(hidden).toBeTruthy();
  expect(hidden?.getAttribute("aria-label")).toBe("Hidden on Mobile");

  cleanup();
});
test("content writes stay FLAT and badge-less on Mobile (cta label)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  selectBlockRow(container, "Button");
  const labelInput = container.querySelector('input[aria-label="Button label"]');
  // Device-invariant content controls are NOT wrapped in the responsive shell.
  expect(labelInput?.closest("[data-menu-responsive-field]")).toBeNull();
  setInputValue(container, "Button label", "Buy now");
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const cta = document?.sections[0]?.blocks.find((block) => block.type === "cta-button");
  expect(cta?.props.label).toBe("Buy now");
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});
test("nav appearance writes target the FIRST nav-items block regardless of selection (normative)", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.blocks.push({ id: "blk-nav-2", type: "nav-items", props: { itemGap: 40 } });
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Select the SECOND nav-items row.
  const navRows = Array.from(container.querySelectorAll("[data-menu-block-row]")).filter((row) =>
    Array.from(row.querySelectorAll("button")).some(
      (button) =>
        !button.getAttribute("aria-label") && button.textContent?.trim() === "Navigation items"
    )
  );
  expect(navRows).toHaveLength(2);
  const secondSelect = Array.from(navRows[1]!.querySelectorAll("button")).find(
    (button) => !button.getAttribute("aria-label")
  );
  React.act(() => {
    secondSelect?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  // Desktop edit mutates the FIRST nav block's props; the second stays intact.
  setSliderValue(container, "Item gap", "30");
  clickButton(container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNavBlocks =
    desktopSaved?.sections[0]?.blocks.filter((block) => block.type === "nav-items") ?? [];
  expect(desktopNavBlocks[0]?.props.itemGap).toBe(30);
  expect(desktopNavBlocks[1]?.props).toEqual({ itemGap: 40 });

  // Mobile edit writes the SECTION override; the second block still intact.
  switchDevice(container, "Mobile");
  setSliderValue(container, "Item gap", "26");
  clickButton(container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  expect(mobileSaved?.sections[0]?.responsive?.mobile?.navProps).toEqual({ itemGap: 26 });
  const mobileNavBlocks =
    mobileSaved?.sections[0]?.blocks.filter((block) => block.type === "nav-items") ?? [];
  expect(mobileNavBlocks[1]?.props).toEqual({ itemGap: 40 });

  cleanup();
});
test("undo/redo works across device-forked writes (no responsive residue after undo)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  setSliderValue(container, "Vertical padding", "24");
  clickSelector(container, 'button[aria-label="Undo"]');
  clickButton(container, "Save");
  await flush();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  clickSelector(container, 'button[aria-label="Redo"]');
  clickButton(container, "Save");
  await flush();
  expect(readLastSavedDocument()?.sections[0]?.responsive?.mobile?.layout).toEqual({
    paddingY: 24,
  });

  cleanup();
});
test("canvas scope cue reads 'Mobile (overrides)' / 'Tablet (overrides)' / 'Desktop (base)'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const contextPill = () => container.querySelector("[data-page-editor-canvas-context]");
  expect(contextPill()?.textContent).toBe("Desktop (base)");
  // TASK-502-04: tablet is now a real override breakpoint.
  switchDevice(container, "Tablet");
  expect(contextPill()?.textContent).toBe("Tablet (overrides)");
  switchDevice(container, "Mobile");
  expect(contextPill()?.textContent).toBe("Mobile (overrides)");
  expect(contextPill()?.getAttribute("data-page-editor-canvas-context")).toBe("mobile");

  cleanup();
});
test("leaf-list divergence guard: exactly cta-button/divider/spacer accept flat visibility (schema truth)", () => {
  // The editor inlines the three leaf types for the Desktop flat toggle
  // (MENU_LEAF_BLOCK_TYPES is module-private); this pins the inline list to
  // schema truth — a new leaf/native type fails here until the editor's
  // MenuBlockPanel leaf check is updated.
  const base = createDefaultMenuDocumentV2();
  const section = base.sections[0]!;
  const acceptingTypes = menuBlockTypes.filter((type) => {
    const block: Record<string, unknown> = {
      ...createDefaultMenuBlock(type),
      visibility: { visible: false },
    };
    const candidate = {
      schemaVersion: base.schemaVersion,
      sections: [
        { id: section.id, type: section.type, name: section.name, layout: {}, blocks: [block] },
      ],
    };
    try {
      normalizeMenuDocumentV2ForWrite(candidate);
      return true;
    } catch {
      return false;
    }
  });
  expect(acceptingTypes).toEqual(["cta-button", "divider", "spacer"]);
});
test("canvas frame paints all seven --color-* from settings overrides; swatch previews + admin-pinned ring", async () => {
  settingsState.payload = {
    "design.tokens": { colors: { secondary: "#654321" }, neutrals: { bg: "#abcdef" } },
  };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const frame = canvasFrame(container);
  // WYSIWYG: the seven brand+neutral vars are painted inline on the frame ROOT.
  expect(frame.style.getPropertyValue("--color-secondary")).toBe("#654321");
  expect(frame.style.getPropertyValue("--color-bg")).toBe("#abcdef");
  for (const name of [
    "--color-primary",
    "--color-secondary",
    "--color-accent",
    "--color-bg",
    "--color-surface",
    "--color-border",
    "--color-text",
  ]) {
    expect(frame.style.getPropertyValue(name).length, name).toBeGreaterThan(0);
  }

  // Every ColorSwatchControl gets the SITE palette: the secondary swatch preview
  // renders the overridden site hex (not the DEFAULT_TOKENS #0f766e).
  const secondarySwatch = container.querySelector(
    '[data-page-editor-color-swatch="secondary"]'
  ) as HTMLElement | null;
  expect(secondarySwatch?.style.backgroundColor).toBe("#654321");

  // Chrome-safety regression pin: the selection ring is admin-pinned, NOT
  // ring-primary (which would recolor to the SITE primary once the frame paints).
  selectBlockRow(container, "Brand");
  const selected = canvasFrame(container).querySelector('[data-menu-block-selected="true"]');
  expect(selected?.className).toContain("ring-[color:var(--admin-input-ring");
  expect(selected?.className).not.toContain("ring-primary");

  cleanup();
});
test("canvas ghost: flat-hidden, override-hidden, and visible-on-neither blocks dim to a selectable Hidden badge", async () => {
  const doc = seedDocument((d) => {
    const cta = d.sections[0]!.blocks.find((b) => b.type === "cta-button")!;
    (cta as { visibility?: unknown }).visibility = { visible: false }; // flat hide
  });
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: the flat-hidden cta renders as a ghost (NOT skipped) + Hidden badge.
  const ghost = canvasBlock(container, ctaId);
  expect(ghost?.getAttribute("data-menu-block-ghost")).toBe("true");
  expect(ghost?.querySelector('[data-menu-block-hidden-badge="true"]')?.textContent).toBe("Hidden");

  // …and STAYS selectable: clicking the ghost selects it.
  React.act(() => {
    ghost?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-selected")).toBe("true");

  // Defense-in-depth: a stray dual hide-rule <style> placed BEFORE the canvas
  // force-show cannot display:none the ghost (later source order wins the tie).
  React.act(() => {
    canvasFrame(container).insertAdjacentHTML(
      "afterbegin",
      `<style>[data-menu-document-canvas="true"] [data-menu-block-id="${ctaId}"],[data-menu-document-canvas="true"] [data-block-id="${ctaId}"]{display:none}</style>`
    );
  });
  expect(getComputedStyle(canvasBlock(container, ctaId)!).display).not.toBe("none");

  cleanup();
});
test("canvas ghost tracks the device: mobile-only override hides only on Mobile", async () => {
  const doc = seedDocument((d) => {
    const cta = d.sections[0]!.blocks.find((b) => b.type === "cta-button")!;
    (cta as { responsive?: unknown }).responsive = { mobile: { visibility: { visible: false } } };
  });
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: visible (no ghost).
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-ghost")).toBeNull();
  switchDevice(container, "Mobile");
  // Mobile: the override hides it ⇒ ghost.
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-ghost")).toBe("true");

  cleanup();
});
