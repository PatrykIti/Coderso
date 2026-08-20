// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  harnessState,
  createPage,
  createDocument,
  mount,
  flush,
  findButton,
  clickButton,
  changeField,
  setToggleField,
  setSliderField,
} from "./pageEditorV2FlowHarness";

const { pageEditorState } = harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";

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
