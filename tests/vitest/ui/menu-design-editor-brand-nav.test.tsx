// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  brandBlock,
  canvasBlock,
  canvasFrame,
  clickButton,
  clickFirstSwatch,
  clickSegmented,
  clickSelector,
  ctaBlockId,
  findMenuResponsiveField,
  flush,
  hasGroup,
  menusClientState,
  mount,
  navBlock,
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
  MENU_BRAND_TEXT_MAX_LENGTH,
} from "../../../core/services/menus/menuDocumentV2";

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

test("brand text: text-mode-only Input (maxLength), writes props.text, empty deletes the key, canvas chain never shows menu name", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  selectBlockRow(container, "Brand");
  const input = () =>
    container.querySelector('input[aria-label="Brand text"]') as HTMLInputElement | null;
  expect(input()).toBeTruthy();
  expect(input()?.maxLength).toBe(MENU_BRAND_TEXT_MAX_LENGTH);

  // Image mode hides the Brand text input.
  clickSegmented(container, "Mode", "image");
  expect(container.querySelector('input[aria-label="Brand text"]')).toBeNull();
  clickSegmented(container, "Mode", "text");

  // Typing writes props.text; the canvas brand anchor renders it.
  setInputValue(container, "Brand text", "Acme Co");
  clickButton(container, "Save");
  await flush();
  const typedBrand = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(typedBrand?.props.text).toBe("Acme Co");
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe("Acme Co");

  // Clearing DELETES the key (sparse) — the doc round-trips textless.
  setInputValue(container, "Brand text", "");
  clickButton(container, "Save");
  await flush();
  const clearedBrand = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(Object.prototype.hasOwnProperty.call(clearedBrand?.props ?? {}, "text")).toBe(false);

  // With no text and no site name, the canvas shows the placeholder — NEVER the
  // menu name ("Main menu").
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe("Site name");
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).not.toBe(
    "Main menu"
  );

  cleanup();
});
test("brand canvas falls back to the real site name when no brand text is set", async () => {
  settingsState.payload = { "site.name": "Live Site Name" };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe(
    "Live Site Name"
  );
  cleanup();
});
test("device-scoped controls: Mobile menu is Mobile-only, Dropdown direction is Desktop/Tablet-only, both write the BASE", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  const hasControl = (label: string) =>
    Array.from(container.querySelectorAll('[role="group"]')).some(
      (group) => group.getAttribute("aria-label") === label
    );

  // Desktop: Dropdown direction present, Mobile menu absent.
  expect(hasControl("Dropdown direction")).toBe(true);
  expect(hasControl("Mobile menu")).toBe(false);
  // Neither device-defining control renders a responsive badge/Reset.
  expect(container.querySelector('[data-menu-responsive-reset="Dropdown direction"]')).toBeNull();

  // Editing Dropdown direction on Desktop writes the BASE (no responsive record).
  clickSegmented(container, "Dropdown direction", "top");
  clickButton(container, "Save");
  await flush();
  let saved = readLastSavedDocument();
  let nav = saved?.sections[0]?.blocks.find((b) => b.type === "nav-items");
  expect(nav?.props.dropdownDirection).toBe("top");
  expect(JSON.stringify(saved)).not.toContain('"responsive"');

  // Tablet: still Desktop/Tablet-only control.
  switchDevice(container, "Tablet");
  expect(hasControl("Dropdown direction")).toBe(true);
  expect(hasControl("Mobile menu")).toBe(false);

  // Mobile: Mobile menu present, Dropdown direction absent; editing writes BASE.
  switchDevice(container, "Mobile");
  expect(hasControl("Mobile menu")).toBe(true);
  expect(hasControl("Dropdown direction")).toBe(false);
  clickSegmented(container, "Mobile menu", "inline");
  clickButton(container, "Save");
  await flush();
  saved = readLastSavedDocument();
  nav = saved?.sections[0]?.blocks.find((b) => b.type === "nav-items");
  expect(nav?.props.mobileMode).toBe("inline");
  // Base write — NO mobileMode/dropdownDirection in any responsive record.
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("mobileMode");
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("dropdownDirection");

  cleanup();
});
test("tablet visibility fork writes responsive.tablet.visibility for a native block", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Tablet");
  selectBlockRow(container, "Brand"); // native block — no flat toggle on Desktop
  setToggle(container, "Visible on tablet", false);
  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  const brand = saved?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(brand?.responsive?.tablet?.visibility).toEqual({ visible: false });
  expect(brand?.responsive?.mobile).toBeUndefined();
  cleanup();
});
test("cta Size + Open-in-new-tab write props and visibly change the canvas preview; preview click selects without navigating", async () => {
  const doc = seedDocument();
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The canvas renders the REAL button leaf (page renderer), default size md.
  const ctaAnchor = () => canvasBlock(container, ctaId)?.querySelector("a") as HTMLElement | null;
  expect(ctaAnchor()?.className).toContain("px-5 py-3"); // md
  expect(ctaAnchor()?.getAttribute("target")).toBeNull();

  selectBlockRow(container, "Button");
  clickSegmented(container, "Size", "lg");
  setToggle(container, "Open in new tab", true);

  // Visible effect on canvas (not just control presence).
  expect(ctaAnchor()?.className).toContain("px-6 py-4"); // lg
  expect(ctaAnchor()?.getAttribute("target")).toBe("_blank");

  clickButton(container, "Save");
  await flush();
  const cta = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "cta-button");
  expect(cta?.props.size).toBe("lg");
  expect(cta?.props.target).toBe("blank");

  // Clicking the cta preview SELECTS the block (no navigation away).
  const href = window.location.href;
  React.act(() => {
    ctaAnchor()?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  expect(window.location.href).toBe(href);
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-selected")).toBe("true");

  cleanup();
});
test("divider canvas preview renders the real leaf frame (data-block-id) — the '—' literal is gone; inspector copy mentions the separator", async () => {
  const doc = seedDocument((d) => {
    d.sections[0]!.blocks.push(createDefaultMenuBlock("divider"));
  });
  const dividerId = doc.sections[0]!.blocks.find((b) => b.type === "divider")!.id;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const dividerBlock = canvasBlock(container, dividerId);
  expect(dividerBlock?.querySelector("[data-block-id]")).toBeTruthy();
  expect(dividerBlock?.textContent).not.toContain("—");

  selectBlockRow(container, "Divider");
  expect(container.textContent).toContain("vertical separator");

  cleanup();
});
test("spacer canvas preview KEEPS the fixed-24px selectable stub (no PageBlockFrame)", async () => {
  const doc = seedDocument((d) => {
    d.sections[0]!.blocks.push(createDefaultMenuBlock("spacer"));
  });
  const spacerId = doc.sections[0]!.blocks.find((b) => b.type === "spacer")!.id;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const spacerBlock = canvasBlock(container, spacerId);
  const stub = spacerBlock?.querySelector("span[aria-hidden='true']") as HTMLElement | null;
  expect(stub?.style.width).toBe("24px");
  expect(spacerBlock?.querySelector("[data-block-id]")).toBeNull(); // NOT a real leaf frame

  React.act(() => {
    spacerBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(canvasBlock(container, spacerId)?.getAttribute("data-menu-block-selected")).toBe("true");

  cleanup();
});
test("recursive NavItemsPreview renders grandchildren inside .site-nav-sublist .site-nav-sublist; parent label once", async () => {
  menusClientState.items = [
    {
      id: "grp",
      label: "Products",
      href: "#",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [
        {
          id: "sub",
          label: "Software",
          href: "#",
          pageId: null,
          parentId: "grp",
          orderIndex: 0,
          children: [
            {
              id: "leaf",
              label: "CMS",
              href: "/cms",
              pageId: null,
              parentId: "sub",
              orderIndex: 0,
              children: [],
            },
          ],
        },
      ],
    },
  ] as unknown as typeof menusClientState.items;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const frame = canvasFrame(container);
  const grandchild = frame.querySelector(".site-nav-sublist .site-nav-sublist a");
  expect(grandchild?.textContent).toBe("CMS");
  const productsCount = Array.from(frame.querySelectorAll(".site-nav-link")).filter(
    (node) => node.textContent === "Products"
  ).length;
  expect(productsCount).toBe(1);

  cleanup();
});
test("brand style controls are mode-gated and write props.style (base, sparse)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  // Text mode ⇒ typography controls present; image-only controls absent.
  expect(hasGroup(container, "Brand font weight")).toBe(true);
  expect(sliderValue(container, "Brand font size")).toBeTruthy();
  expect(sliderValue(container, "Logo height")).toBeUndefined();

  // Switch to image ⇒ typography controls disappear, image controls appear.
  clickSegmented(container, "Mode", "image");
  expect(hasGroup(container, "Brand font weight")).toBe(false);
  expect(sliderValue(container, "Brand font size")).toBeUndefined();
  expect(sliderValue(container, "Logo height")).toBeTruthy();
  expect(sliderValue(container, "Logo max width")).toBeTruthy();
  clickSegmented(container, "Mode", "text");

  // A base write lands ONLY the touched key in brand.props.style.
  setSliderValue(container, "Brand font size", "30");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.props.style).toEqual({ fontSize: 30 });
  expect(readLastSavedDocument()?.sections[0]?.responsive).toBeUndefined();

  cleanup();
});
test("brand font weight 'Theme' DELETES style.fontWeight (prunes empty style)", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.style = { fontWeight: 600 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  clickSegmented(container, "Brand font weight", "inherit");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(Object.prototype.hasOwnProperty.call(brand?.props ?? {}, "style")).toBe(false);

  cleanup();
});
test("Level SegmentedControl rebinds the nav control set to levelStyles[N]", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0 = the existing nav base (Orientation present, no container heading).
  expect(hasGroup(container, "Orientation")).toBe(true);
  expect(container.textContent).not.toContain("Dropdown container");

  // Level 1 ⇒ the level control set (base scalars gone, container controls in).
  clickSegmented(container, "Nesting level", "1");
  expect(hasGroup(container, "Orientation")).toBe(false);
  expect(container.textContent).toContain("Dropdown container");
  setSliderValue(container, "Font size", "20");
  clickButton(container, "Save");
  await flush();
  let nav = navBlock(readLastSavedDocument());
  expect((nav?.props.levelStyles as Record<string, { fontSize?: number }>)?.[1]?.fontSize).toBe(20);
  // The level write never touches the base scalar.
  expect(nav?.props.fontSize).toBeUndefined();

  // Level 2 writes levelStyles[2], never levelStyles[1].
  clickSegmented(container, "Nesting level", "2");
  setSliderValue(container, "Corner radius", "12");
  clickButton(container, "Save");
  await flush();
  nav = navBlock(readLastSavedDocument());
  expect((nav?.props.levelStyles as Record<string, { radius?: number }>)?.[2]?.radius).toBe(12);

  cleanup();
});
test("NavLevelInheritBadge tracks per-field override ('This level' vs 'Inherits level 0')", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.levelStyles = { 1: { linkColor: "#ff0000" } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  const overridden = findMenuResponsiveField(container, "Link color").querySelector(
    "[data-menu-level-field]"
  );
  expect(overridden?.getAttribute("data-menu-level-field")).toBe("override");
  expect(overridden?.textContent).toBe("This level");

  const inherited = findMenuResponsiveField(container, "Font size").querySelector(
    "[data-menu-level-field]"
  );
  expect(inherited?.getAttribute("data-menu-level-field")).toBe("inherited");
  expect(inherited?.textContent).toBe("Inherits level 0");

  cleanup();
});
test("device-forked brand style write ⇒ responsive.mobile.style (Override badge)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Brand");

  setSliderValue(container, "Brand font size", "28");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.responsive?.mobile?.style).toEqual({ fontSize: 28 });
  expect(brand?.props.style).toBeUndefined();
  expect(
    findMenuResponsiveField(container, "Brand font size").querySelector(
      '[data-menu-responsive-badge="override"]'
    )
  ).toBeTruthy();

  cleanup();
});
test("device-forked level write ⇒ responsive.mobile.navProps.levelStyles[1]", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  setSliderValue(container, "Font size", "22");
  clickButton(container, "Save");
  await flush();
  const override = readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps
    ?.levelStyles as Record<string, { fontSize?: number }> | undefined;
  expect(override?.[1]?.fontSize).toBe(22);
  // Base props untouched (mobile did NOT inherit into the base).
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  cleanup();
});
test("Reset prunes the stored brand-style responsive record verbatim", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.responsive = { mobile: { style: { fontSize: 28 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Brand");

  clickSelector(container, '[data-menu-responsive-reset="Brand font size"]');
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.responsive).toBeUndefined();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  cleanup();
});
test("cheap-win level-0 controls: Link padding/radius + 'Hover text' distinct from 'Hover background'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Two DISTINCT hover controls.
  expect(hasGroup(container, "Hover text")).toBe(true);
  expect(hasGroup(container, "Hover background")).toBe(true);
  // Per-link padding + radius sliders present.
  expect(sliderValue(container, "Link padding X")).toBeTruthy();
  expect(sliderValue(container, "Link padding Y")).toBeTruthy();
  expect(sliderValue(container, "Link radius")).toBeTruthy();

  setSliderValue(container, "Link padding X", "20");
  clickButton(container, "Save");
  await flush();
  const nav = navBlock(readLastSavedDocument());
  expect(nav?.props.linkPaddingX).toBe(20);
  // Untouched hover-text default OMITS the key (present-only, sparse).
  expect(Object.prototype.hasOwnProperty.call(nav?.props ?? {}, "linkHoverTextColor")).toBe(false);

  // Setting a hover-text color writes linkHoverTextColor (distinct from linkHoverColor).
  clickFirstSwatch(container, "Hover text");
  clickButton(container, "Save");
  await flush();
  expect(navBlock(readLastSavedDocument())?.props.linkHoverTextColor).toBeTruthy();

  cleanup();
});
test("canvas force-open threads the selected level (cumulative) into the preview CSS", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  const styleText = () => canvasFrame(container).querySelector("style")?.textContent ?? "";

  // TASK-508 §2b: Level 0 has no sublist of its own, so a nav-items selection now
  // previews the FIRST dropdown (depth 1) OPEN — the level-0 canvas is INTENTIONALLY
  // no longer byte-identical to the unforced preview, so the nav-global
  // submenuDirection/submenuMode/animation effects are visible while the author tunes
  // them on the Level-0 tab. R2 folds `visibility:visible` into the neutralize.
  expect(styleText()).toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );

  // Level 1 ⇒ depth-1 sim-open only. TASK-508 R2 folds `visibility:visible` into the
  // force-open rest neutralize (else the animated flyout previews open-but-invisible).
  clickSegmented(container, "Nesting level", "1");
  expect(styleText()).toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );
  // TASK-508 §2b: depth-2 stays ABSENT at level 1. Re-strung to the anchored (0,5,0)
  // visibility-inclusive form 508-02 actually emits (the short pre-Req2 substring is
  // unemittable after the visibility fold ⇒ would degrade to a silent tautology).
  expect(styleText()).not.toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );

  // Level 2 ⇒ CUMULATIVE (depth 1 AND depth 2 open). TASK-508 R2: visibility:visible fold.
  clickSegmented(container, "Nesting level", "2");
  expect(styleText()).toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );
  expect(styleText()).toContain(
    ".site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}"
  );

  cleanup();
});
test("brand IMAGE mode renders a real <img> (resolved src) on the canvas, stamped with data-menu-block-id (B1)", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") {
      brand.props.mode = "image";
      brand.props.image = { src: "https://cdn.test/logo.png", alt: "Acme logo" };
    }
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const anchor = canvasFrame(container).querySelector(".site-header-brand") as HTMLElement;
  const img = anchor.querySelector("img");
  expect(img?.getAttribute("src")).toBe("https://cdn.test/logo.png");
  expect(anchor.textContent).not.toContain("Logo");
  // §3 stamp: the rule reaches the <a> (and its <img>).
  expect(anchor.getAttribute("data-menu-block-id")).toBeTruthy();

  cleanup();
});
test("brand image mode with NO logo falls back to text (no broken <img>)", async () => {
  settingsState.payload = { "site.name": "Fallback Site" };
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.mode = "image";
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const anchor = canvasFrame(container).querySelector(".site-header-brand") as HTMLElement;
  expect(anchor.querySelector("img")).toBeNull();
  expect(anchor.textContent).toBe("Fallback Site");

  cleanup();
});
test("nav font-size UNSET shows the inherited value (16), distinct from an explicit 15 (B2)", async () => {
  const first = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(first.container, "Navigation items");
  // Unset ⇒ shows 16 (the theme-inherited size) + an "Inherited" hint.
  expect(sliderValue(first.container, "Font size")).toBe("16");
  expect(first.container.querySelector('[data-menu-font-size-inherited="true"]')).toBeTruthy();
  first.cleanup();

  menusClientState.reset();
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.fontSize = 15;
  });
  const second = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(second.container, "Navigation items");
  // Explicit 15 ⇒ shows 15, NO inherited hint.
  expect(sliderValue(second.container, "Font size")).toBe("15");
  expect(second.container.querySelector('[data-menu-font-size-inherited="true"]')).toBeNull();
  second.cleanup();
});
test("no setState-in-effect: brand/level/device flows emit no React act/update warnings", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  clickSegmented(container, "Mode", "image");
  clickSegmented(container, "Mode", "text");
  setSliderValue(container, "Brand font size", "24");
  switchDevice(container, "Mobile");
  // Deselect (canvas scroller) so the block rows return, then pick nav-items.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]');
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");
  clickSegmented(container, "Nesting level", "0");
  await flush();

  const warnings = errorSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((message) => /not wrapped in act|state update|Warning:/i.test(message));
  expect(warnings).toEqual([]);
  errorSpy.mockRestore();
  cleanup();
});
