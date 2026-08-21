// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  clickButton,
  clickSelector,
  flush,
  getBlockRowLabels,
  menusClientState,
  mount,
  readSavedDocument,
  selectBlockRow,
  setSliderValue,
} from "./menuDesignEditorFixtures";

import type { PageDetail } from "../../../core/admin/services/pagesClient";

import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import { PageEditor, type PageEditorHost } from "../../../core/admin/ui/pages/PageEditor";

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

test("renders the shared CanvasEditor builder shell, not the legacy dark panel", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The shared shell card + sub-toolbar title (Pages-identical chrome).
  expect(container.querySelector(".bg-card.shadow-card")).toBeTruthy();
  expect(container.textContent).toContain("Menu builder");
  expect(container.querySelector('[data-menu-design-canvas-scroller="true"]')).toBeTruthy();
  // NO legacy dark bottom panel.
  expect(container.querySelector('[class*="bg-slate-950"]')).toBeNull();
  expect(container.innerHTML).not.toContain("bg-slate-950");

  cleanup();
});
test("a fresh (empty) menu seeds createDefaultMenuDocumentV2 without writing", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Default document: menu-bar ⊃ brand / nav-items / cta-button.
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button"]);
  // Seed-only: nothing persisted until an explicit Save.
  expect(menusClientState.updateMenu).not.toHaveBeenCalled();

  cleanup();
});
test("a legacy menu seeds buildMenuDocumentV2FromLegacy (appearance + extras) without writing", async () => {
  menusClientState.setLegacy({
    appearance: { surfaceColor: "#101010", itemGap: 20 },
    extras: [createPageBlockV2("button")],
  });

  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Legacy adapter: nav-items (from appearance) + cta-button (button extra); NO brand.
  expect(getBlockRowLabels(container)).toEqual(["Navigation items", "Button"]);
  expect(menusClientState.updateMenu).not.toHaveBeenCalled();

  cleanup();
});
test("nav-items binds the live published item tree read-only (never persists item data)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const canvas = container.querySelector('[data-menu-document-canvas="true"]');
  expect(canvas?.textContent).toContain("Home");
  expect(canvas?.textContent).toContain("About us");

  clickButton(container, "Save");
  await flush();
  const document = readSavedDocument();
  const navBlock = document?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(navBlock).toBeTruthy();
  // The bound item labels never leak into the persisted nav-items props.
  expect(JSON.stringify(navBlock?.props)).not.toContain("About us");

  cleanup();
});
test("selecting a block opens its panel; editing marks dirty and Save/Publish ride updateMenu", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Empty selection = the menu-bar panel (blocks list + add rail).
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();

  // Selecting nav-items swaps to its per-block control panel.
  selectBlockRow(container, "Navigation items");
  expect(container.querySelector('[data-menu-block-panel="nav-items"]')).toBeTruthy();

  // Editing a control marks the draft dirty.
  expect(container.textContent).not.toContain("Unsaved");
  setSliderValue(container, "Item gap", "12");
  expect(container.textContent).toContain("Unsaved");

  // Save patches menuDocumentV2 through updateMenu({document}).
  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const document = readSavedDocument();
  const navBlock = document?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(navBlock?.props.itemGap).toBe(12);

  // Publish persists the draft first, then flips status.
  clickButton(container, "Publish");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(2);
  expect(menusClientState.publishMenu).toHaveBeenCalledTimes(1);

  cleanup();
});
test("the composer adds, removes, and reorders menu-bar blocks through updateMenu", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Add a divider from the add-block rail.
  clickSelector(container, '[data-menu-add-block="divider"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button", "Divider"]);

  // Reorder: move the divider up one position.
  clickSelector(container, 'button[aria-label="Move Divider up"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Divider", "Button"]);

  // Remove the divider.
  clickSelector(container, 'button[aria-label="Remove Divider"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button"]);

  // Every mutation marked the draft dirty and round-trips through updateMenu.
  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const document = readSavedDocument();
  expect(document?.sections[0]?.blocks.map((block) => block.type)).toEqual([
    "brand",
    "nav-items",
    "cta-button",
  ]);

  cleanup();
});
test("removing the selected block clears the stale selection", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  selectBlockRow(container, "Button");
  expect(container.querySelector('[data-menu-block-panel="cta-button"]')).toBeTruthy();

  // The per-block Remove deletes it AND drops back to the menu-bar panel.
  clickSelector(container, 'button[aria-label="Remove block"]');
  expect(container.querySelector('[data-menu-block-panel="cta-button"]')).toBeNull();
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items"]);

  cleanup();
});
test("Undo/Redo is a bounded history atom wired to the toolbar", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const undo = container.querySelector('button[aria-label="Undo"]') as HTMLButtonElement;
  const redo = container.querySelector('button[aria-label="Redo"]') as HTMLButtonElement;
  // Empty history: Undo + Redo disabled.
  expect(undo.disabled).toBe(true);
  expect(redo.disabled).toBe(true);

  // An edit pushes a snapshot: Undo enabled, Redo still empty.
  clickSelector(container, '[data-menu-add-block="divider"]');
  expect(getBlockRowLabels(container)).toHaveLength(4);
  expect(undo.disabled).toBe(false);
  expect(redo.disabled).toBe(true);

  // Undo restores the prior document; Redo re-applies it.
  clickSelector(container, 'button[aria-label="Undo"]');
  expect(getBlockRowLabels(container)).toHaveLength(3);
  const redoAfterUndo = container.querySelector('button[aria-label="Redo"]') as HTMLButtonElement;
  expect(redoAfterUndo.disabled).toBe(false);
  clickSelector(container, 'button[aria-label="Redo"]');
  expect(getBlockRowLabels(container)).toHaveLength(4);

  // A fresh edit clears the redo stack.
  clickSelector(container, 'button[aria-label="Undo"]');
  clickSelector(container, '[data-menu-add-block="spacer"]');
  const redoAfterFreshEdit = container.querySelector(
    'button[aria-label="Redo"]'
  ) as HTMLButtonElement;
  expect(redoAfterFreshEdit.disabled).toBe(true);

  cleanup();
});
test("page-host palette regression: a host palette can only narrow the global catalog", async () => {
  // The retired mode==="menu" chrome must not disturb the page editor's
  // host-palette narrowing: a palette LISTING the gated navigation section plus
  // hero surfaces ONLY hero — it intersects the insertable options, never widens.
  const detail: PageDetail = {
    id: "page-1",
    title: "Homepage",
    slug: "homepage",
    status: "draft",
    currentData: {
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: { template: "page-v2", showInNav: true },
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome", level: "h1", align: "center" },
            }),
          ],
        }),
      ],
    } as unknown as Record<string, unknown>,
    updatedAt: "2026-06-12T09:00:00.000Z",
  };
  const host: PageEditorHost = {
    mode: "page",
    resourceLabel: "Pages",
    settingsLabel: "Page settings",
    previewTitle: "Page preview",
    loadFailedMessage: "Failed to load page.",
    assistantSurface: false,
    palette: { sections: ["navigation", "hero"], blocks: ["heading"] },
    detailCacheKey: (id) => `pages:detail:${id}`,
    getCachedDetail: () => detail,
    loadDetail: async () => detail,
    saveDocument: async () => detail,
  };

  const { container, cleanup } = mount(
    <PageEditor pageId="page-1" initialPage={detail} host={host} />
  );
  await flush();

  clickButton(container, "Add section");
  const groupTitles = Array.from(
    container.querySelectorAll('[id="page-editor-command-results"] p.mb-2')
  ).map((entry) => entry.textContent);
  const entryLabels = Array.from(
    container.querySelectorAll(
      '[id="page-editor-command-results"] button span.block.text-sm.font-semibold'
    )
  ).map((entry) => entry.textContent);
  expect(groupTitles).toEqual(["Sections", "Blocks"]);
  expect(entryLabels).toEqual(["Hero", "Heading"]);

  cleanup();
});
