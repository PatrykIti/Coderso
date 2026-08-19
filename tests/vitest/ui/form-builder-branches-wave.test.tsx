// @vitest-environment happy-dom
//
// TASK-105-04 forms wave, LEAF A1 — FormBuilderPage branch closure.
// Covers empty-field selection, field remove/change/settings/duplicate
// collision, refresh cache-event paths, not-found and generic save errors,
// swallowed mount fetches, meta field setters, inspector tab switching,
// mobile field sheet, and the desktop preview device toggle. Uses the shared
// formsPagesWaveFixtures mocks.

import React from "react";
import { expect, test, vi } from "vitest";
import { clickByText, flush, getFormsPageState, mount } from "./formsPagesWaveFixtures";

const formsPageState = getFormsPageState();

const originalCrypto = globalThis.crypto;

test("FormBuilderPage with no fields selects the form target and renders the inspector", async () => {
  formsPageState.formDetail = { form: formsPageState.form, fields: [] };
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("canvas:0");
    // Form target selected -> the settings inspector (not the field panel) shows.
    expect(view.container.textContent).toContain("change-form-name");
    expect(view.container.textContent).not.toContain("change-field");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage removes the selected and unselected fields, and reports field edits as dirty", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    // Removing the SELECTED field resets the target back to the form.
    clickByText(view.container, "canvas-select-field");
    clickByText(view.container, "canvas-remove-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:0");
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("change-form-name");

    // Removing an UNselected field (form selected) keeps the form target.
    clickByText(view.container, "add-library-field");
    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "canvas-remove-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:0");

    clickByText(view.container, "add-library-field");
    clickByText(view.container, "canvas-select-field");
    clickByText(view.container, "change-field");
    clickByText(view.container, "change-field-settings");
    await flush();

    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage duplicate renames on collision and mobile/library add fields", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    // Select the base field and duplicate twice from the same source: the second
    // copy must bump its suffix through the name-collision loop.
    clickByText(view.container, "canvas-select-field");
    clickByText(view.container, "duplicate-field");
    clickByText(view.container, "canvas-select-field");
    clickByText(view.container, "duplicate-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:3");

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "canvas-remove-field");
    clickByText(view.container, "canvas-remove-field");
    clickByText(view.container, "canvas-remove-field");
    clickByText(view.container, "add-library-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:1");
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage falls back to a random local id when crypto.randomUUID is missing", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  // Simulate an environment without crypto.randomUUID (non-browser runtime path).
  Object.defineProperty(globalThis, "crypto", {
    value: { ...originalCrypto } as Crypto,
    configurable: true,
    writable: true,
  });
  delete (globalThis.crypto as { randomUUID?: unknown }).randomUUID;

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    clickByText(view.container, "add-library-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:2");
  } finally {
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("FormBuilderPage cache events refresh actions and reload the form with not-found and error paths", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    const actionsCallsBefore = formsPageState.actionsCalls.length;
    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formActions:form-1" });
      }
      await Promise.resolve();
    });
    expect(formsPageState.actionsCalls.length).toBeGreaterThan(actionsCallsBefore);

    // Form no longer resolvable -> refreshForm reports the not-found error.
    formsPageState.formDetail = null as never;
    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formDetail:form-1" });
      }
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Unable to load form");
    expect(view.container.textContent).toContain("Form not found.");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage refreshForm reports api and generic load errors via cache events", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const apiView = mount(<FormBuilderPage />);
  try {
    await flush();

    // A later cache event forces refreshForm, which surfaces the api error.
    formsPageState.detailError = formsPageState.apiError("Detail rejected");
    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formDetail:form-1" });
      }
      await Promise.resolve();
    });
    expect(apiView.container.textContent).toContain("Unable to load form");
    expect(apiView.container.textContent).toContain("Detail rejected");
  } finally {
    apiView.cleanup();
  }

  formsPageState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const genericView = mount(<FormBuilderPage />);
  try {
    await flush();

    formsPageState.detailError = new Error("boom");
    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formDetail:form-1" });
      }
      await Promise.resolve();
    });
    expect(genericView.container.textContent).toContain("Failed to load form.");
  } finally {
    genericView.cleanup();
  }
});

test("FormBuilderPage swallows action and content-type mount fetch failures", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  formsPageState.actionsLoadError = new Error("actions offline");
  formsPageState.contentTypesError = new Error("content types offline");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    // The page still loads the form and renders; the side fetches fail silently.
    expect(view.container.textContent).toContain("canvas:1");
    expect(view.container.textContent).not.toContain("Unable to load form");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage generic save failure falls back to the standard message", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  formsPageState.updateError = new Error("boom");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    clickByText(view.container, "add-library-field");
    await flush();
    clickByText(view.container, "Save");
    await flush();

    expect(view.container.textContent).toContain("Failed to save form.");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage meta setters update the inspector surface and mark the form dirty", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "change-form-description");
    clickByText(view.container, "change-form-status");
    clickByText(view.container, "change-form-access");
    clickByText(view.container, "change-form-success-message");
    clickByText(view.container, "change-form-redirect");
    await flush();

    expect(view.container.textContent).toContain("settings-description:Updated description");
    expect(view.container.textContent).toContain("settings-status:published");
    expect(view.container.textContent).toContain("settings-access:internal");
    expect(view.container.textContent).toContain("settings-success:Thanks!");
    expect(view.container.textContent).toContain("settings-redirect:/done");
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage inspector tabs switch, mobile Fields sheet opens, and preview device toggles", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    // The builder selects the first field by default; switch the inspector to
    // the form target so the Settings/Design/Automation tabs render.
    clickByText(view.container, "canvas-select-form");
    await flush();

    clickByText(view.container, "Design");
    expect(formsPageState.tabsValue).toBe("design");

    clickByText(view.container, "Fields");
    expect(view.container.querySelector('[data-sheet-open="true"]')).not.toBeNull();

    const desktopButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Desktop preview"
    );
    const mobileButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Mobile preview"
    );
    expect(mobileButton).toBeTruthy();

    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      desktopButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(desktopButton?.getAttribute("aria-pressed")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage automation panel changes mark dirty and open submissions navigates", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "update-actions");
    await flush();

    expect(view.container.textContent).toContain("Unsaved changes");

    clickByText(view.container, "Submissions");
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/submissions");
  } finally {
    view.cleanup();
  }
});
