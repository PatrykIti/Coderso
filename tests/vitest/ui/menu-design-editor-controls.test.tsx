// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  brandBlock,
  cacheBusState,
  canvasFrame,
  clickButton,
  clickFirstSwatch,
  clickSegmented,
  clickSelector,
  flush,
  findReset,
  flushIcons,
  getBlockRowLabels,
  hasGroup,
  menusClientState,
  mount,
  navigateState,
  readLastSavedDocument,
  seedDocument,
  selectBlockRow,
  setInputValue,
  setSliderValue,
  setToggle,
  sliderValue,
} from "./menuDesignEditorFixtures";

import {
  createDefaultMenuDocumentV2,
  normalizeMenuDocumentV2ForWrite,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import {
  historyReducer,
  type HistoryAction,
  type HistoryState,
} from "../../../core/admin/ui/menus/MenuDesignEditorControls";
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
// --- editor host + shell chrome (TASK-105-08-05 residuals) -------------------

test("the host resolves the menu id from the route when no prop is given", async () => {
  const previousPath = window.location.pathname;
  window.location.pathname = "/admin/menus/route-menu/design";
  try {
    const { container, cleanup } = mount(<MenuDesignEditorPage />);
    await flush();
    expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
    cleanup();
  } finally {
    window.location.pathname = previousPath;
  }
});

test("the host shows the missing state when the route has no menu id", async () => {
  const previousPath = window.location.pathname;
  window.location.pathname = "/admin/menus";
  try {
    const { container, cleanup } = mount(<MenuDesignEditorPage />);
    await flush();
    expect(container.textContent).toContain(
      "This menu could not be resolved from the current route."
    );
    cleanup();
  } finally {
    window.location.pathname = previousPath;
  }
});

test("save failure with an Error surfaces its message and keeps the draft dirty", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  menusClientState.updateError = new Error("save boom");
  clickButton(container, "Save");
  await flush();
  expect(container.textContent).toContain("save boom");
  // The draft stays dirty: the Discard button is re-enabled.
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(false);
  cleanup();
});

test("save failure with an ApiClientError surfaces its message", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  menusClientState.updateError = new ApiClientError("menus_save_failed", "api save boom", 400);
  clickButton(container, "Save");
  await flush();
  expect(container.textContent).toContain("api save boom");
  cleanup();
});

test("save failure with an opaque error falls back to the generic message", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  menusClientState.updateError = {};
  clickButton(container, "Save");
  await flush();
  expect(container.textContent).toContain("Failed to save menu design.");
  cleanup();
});

test("publish saves the document, publishes the menu, and clears dirty", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  clickButton(container, "Publish");
  await flush();
  expect(menusClientState.publishCalls).toContain("menu-1");
  expect(menusClientState.updateCalls.some((input) => "document" in input)).toBe(true);
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(true);
  cleanup();
});

test("publish failure surfaces the error and clears the publishing state", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  menusClientState.publishError = new Error("pub boom");
  clickButton(container, "Publish");
  await flush();
  expect(container.textContent).toContain("pub boom");
  // The Publish button is re-enabled after the failure settles.
  const publish = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Publish")
  );
  expect(publish?.hasAttribute("disabled")).toBe(false);
  cleanup();
});

test("discard resets the draft and clears the selection", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  setInputValue(container, "Brand text", "Draft name");
  clickButton(container, "Discard");
  // Dirty cleared ⇒ Discard is disabled again; selection cleared ⇒ BarPanel back.
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(true);
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  cleanup();
});

test("Structure navigates to the structure editor", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickButton(container, "Structure");
  expect(navigateState.calls).toContain("/menus/menu-1");
  cleanup();
});

test("the panel toggle hides and the reopen affordance restores it", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  clickButton(container, "Hide panel");
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeNull();
  // The reopenAffordance chip is the LAST "Show panel" button (the toolbar
  // toggle shares the label); it is the shell's reopen slot.
  const affordance = Array.from(container.querySelectorAll('button[aria-label="Show panel"]')).at(
    -1
  );
  expect(affordance).toBeTruthy();
  React.act(() => {
    affordance?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  cleanup();
});

test("block rows move, add, and remove from the bar panel list", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  // Add a Divider via the add-block rail.
  clickSelector(container, '[data-menu-add-block="divider"]');
  expect(getBlockRowLabels(container)).toContain("Divider");
  // Move the last block up and the Brand block down (list-row buttons).
  clickSelector(container, '[aria-label="Move Divider up"]');
  clickSelector(container, '[aria-label="Move Brand down"]');
  // Remove the Brand block via the list-row button.
  clickSelector(container, '[aria-label="Remove Brand"]');
  expect(getBlockRowLabels(container)).not.toContain("Brand");
  clickButton(container, "Save");
  await flush();
  const doc = readLastSavedDocument();
  expect(doc?.sections[0]?.blocks.some((block) => block.type === "brand")).toBe(false);
  cleanup();
});

test("the block panel moves and removes the selected block", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Button");
  clickSelector(container, '[aria-label="Move block up"]');
  clickSelector(container, '[aria-label="Move block down"]');
  clickSelector(container, '[aria-label="Remove block"]');
  // Removal clears the selection: the bar panel returns.
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  clickButton(container, "Save");
  await flush();
  const doc = readLastSavedDocument();
  expect(doc?.sections[0]?.blocks.some((block) => block.type === "cta-button")).toBe(false);
  cleanup();
});

// --- cache-event revalidation + remote update alert --------------------------

test("a cache event for an unrelated key is ignored", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  cacheBusState.emit("some:unrelated:key");
  await flush();
  expect(container.textContent).not.toContain("Menu design changed");
  cleanup();
});

test("a cache event reload while dirty surfaces the remote update alert", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  cacheBusState.emit("menus:detail:menu-1");
  await flush();
  expect(container.textContent).toContain("New menu design is available.");
  // Keep editing dismisses the alert and keeps the draft.
  clickButton(container, "Keep editing");
  expect(container.textContent).not.toContain("Menu design changed");
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(false);
  cleanup();
});

test("Reload on the remote update alert force-hydrates and clears the draft", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  cacheBusState.emit("menus:detail:menu-1");
  await flush();
  clickButton(container, "Reload");
  await flush();
  expect(container.textContent).not.toContain("Menu design changed");
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(true);
  cleanup();
});

test("a cache event reload while clean hydrates and saving a clean doc is a no-op", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  cacheBusState.emit("menus:detail:menu-1");
  await flush();
  expect(container.textContent).not.toContain("Menu design changed");
  // Save without edits: markSaved on a clean state keeps it clean.
  clickButton(container, "Save");
  await flush();
  const discard = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Discard"
  );
  expect(discard?.hasAttribute("disabled")).toBe(true);
  cleanup();
});

test("a cache event reload failure surfaces a non-destructive error", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  menusClientState.failMenuLoad = new Error("refresh boom");
  cacheBusState.emit("menus:detail:menu-1");
  await flush();
  expect(container.textContent).toContain("refresh boom");
  cleanup();
});

test("a cache event reload with a null detail is a no-op", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  menusClientState.nullDetail = true;
  cacheBusState.emit("menus:detail:menu-1");
  await flush();
  expect(container.textContent).not.toContain("Menu design changed");
  expect(container.textContent).not.toContain("refresh boom");
  cleanup();
});

test("a cache event during a save is skipped (no redundant revalidation)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  // The server save broadcasts the detail cache event while the mutation is
  // in flight; the editor must ignore its own broadcast.
  menusClientState.updateMenu.mockImplementationOnce(
    async (_menuId: string, input: Record<string, unknown>) => {
      cacheBusState.emit("menus:detail:menu-1");
      menusClientState.updateCalls.push(input);
      return {
        id: "menu-1",
        name: "Main menu",
        location: "primary",
        status: "draft",
        publishedAt: null,
        createdAt: "2026-06-12T09:00:00.000Z",
        settings: null,
      };
    }
  );
  clickButton(container, "Save");
  await flush();
  expect(container.textContent).not.toContain("Menu design changed");
  cleanup();
});

test("mount load failure surfaces a non-destructive error", async () => {
  menusClientState.failMenuLoad = new Error("load boom");
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  expect(container.textContent).toContain("load boom");
  cleanup();
});

// --- bar panel writers + base reset -----------------------------------------

test("bar controls write their keys and the base reset clears them", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  clickSegmented(container, "Alignment", "end");
  setSliderValue(container, "Horizontal padding", "40");
  setSliderValue(container, "Border width", "3");
  clickSegmented(container, "Shadow", "md");
  clickButton(container, "Save");
  await flush();
  const layout = readLastSavedDocument()?.sections[0]?.layout ?? {};
  expect(layout).toMatchObject({
    alignment: "end",
    paddingX: 40,
    borderWidth: 3,
    shadow: "md",
  });
  // Desktop base value present ⇒ the base Reset affordance renders; clicking
  // it clears the base key (clearMenuSectionBase path).
  const reset = findReset(container, "Horizontal padding");
  expect(reset).toBeTruthy();
  clickSelector(container, '[data-menu-responsive-reset="Horizontal padding"]');
  clickButton(container, "Save");
  await flush();
  expect(
    Object.prototype.hasOwnProperty.call(
      readLastSavedDocument()?.sections[0]?.layout ?? {},
      "paddingX"
    )
  ).toBe(false);
  cleanup();
});

// --- canvas preview residuals -------------------------------------------------

test("canvas renders nested nav children recursively, utility fallbacks, and leaf types", async () => {
  menusClientState.items = [
    {
      id: "item-parent",
      label: "Parent",
      href: null,
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [
        {
          id: "item-child",
          label: "Child",
          href: "/child",
          pageId: null,
          parentId: "item-parent",
          orderIndex: 0,
          children: [
            {
              id: "item-grand",
              label: "Grandchild",
              href: "/grand",
              pageId: null,
              parentId: "item-child",
              orderIndex: 0,
              children: [],
            },
          ],
        },
      ],
    },
  ];
  seedDocument((doc) => {
    const section = doc.sections[0];
    if (!section) return;
    section.blocks = [
      ...section.blocks.filter((block) => block.type !== "cta-button"),
      {
        id: "spacer-block",
        type: "spacer",
        props: {},
      } as never,
      {
        id: "search-block",
        type: "search",
        props: { label: "" },
      } as never,
    ];
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  const frame = canvasFrame(container);
  // Recursive sublists render to depth 2 (parent → child → grandchild).
  expect(frame.querySelectorAll('[data-site-nav-group="true"]').length).toBeGreaterThanOrEqual(1);
  expect(frame.textContent).toContain("Grandchild");
  // Utility block falls back to its label constant when props.label is empty.
  expect(frame.textContent).toContain("Search");
  // Spacer renders an inert span.
  expect(frame.querySelector('[aria-hidden="true"]')).toBeTruthy();
  // The brand anchor swallows clicks (canvas preview never navigates).
  clickSelector(frame, ".site-header-brand");
  // Nested child links also swallow clicks (renderPreviewNavItem anchor path).
  clickSelector(frame, ".site-nav-link");
  cleanup();
});

test("historyReducer falls through its default branch for an unknown action", () => {
  const state: HistoryState = {
    doc: createDefaultMenuDocumentV2(),
    past: [],
    future: [],
    dirty: false,
  };
  // Only reachable via an invalid dispatch; pin the fail-closed passthrough.
  const action = { type: "unknown" } as unknown as HistoryAction;
  const next = historyReducer(state, action);
  expect(next).toBe(state);
});
