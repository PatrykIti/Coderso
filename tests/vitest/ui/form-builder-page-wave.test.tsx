// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";
import { clickByText, flush, getFormsPageState, mount } from "./formsPagesWaveFixtures";

const formsPageState = getFormsPageState();

test("FormBuilderPage hydrates cache, tracks dirty state, refreshes remote updates, saves, previews, and opens logs", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const originalConfirm = window.confirm;
  const confirmSpy = vi.fn(() => true);
  Object.defineProperty(window, "confirm", {
    value: confirmSpy,
    configurable: true,
    writable: true,
  });
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Contact");
    expect(view.container.textContent).toContain("canvas:1");
    expect(formsPageState.detailCalls).toContainEqual({ id: "form-1", force: true });
    expect(formsPageState.actionsCalls).toContainEqual({ id: "form-1", force: true });

    clickByText(view.container, "add-library-field");
    clickByText(view.container, "duplicate-field");
    await flush();

    expect(view.container.textContent).toContain("canvas:3");
    expect(view.container.textContent).toContain("Unsaved changes");

    const mobileSelectButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent === "select-first-field"
    );
    const mobileAddButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (button) => button.textContent === "add-library-field"
    );

    React.act(() => {
      mobileSelectButtons.at(-1)?.click();
      mobileAddButtons.at(-1)?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("canvas:4");

    clickByText(view.container, "canvas-select-field");
    await flush();

    clickByText(view.container, "Runtime preview");
    await flush();

    expect(view.container.textContent).toContain("Save form before opening runtime preview.");

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "change-form-name");
    clickByText(view.container, "change-form-settings");
    clickByText(view.container, "change-retry");
    clickByText(view.container, "change-step-titles");
    clickByText(view.container, "apply-preset");
    await flush();

    expect(confirmSpy).toHaveBeenCalled();

    formsPageState.formDetail = {
      form: {
        ...formsPageState.form,
        name: "Remote Contact",
      },
      fields: [formsPageState.formDetail.fields[0]!],
    };

    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formDetail:form-1" });
      }
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Updated in another tab");

    clickByText(view.container, "Refresh");
    await flush();

    expect(view.container.textContent).toContain("Remote Contact");
    expect(view.container.textContent).not.toContain("Updated in another tab");

    clickByText(view.container, "canvas-select-form");
    clickByText(view.container, "change-form-name");
    await flush();

    clickByText(view.container, "Save");
    await flush();

    expect(formsPageState.updateFormCalls[0]).toEqual({
      id: "form-1",
      input: expect.objectContaining({
        name: "Updated form name",
      }),
    });
    expect(formsPageState.updateFieldsCalls[0]?.id).toBe("form-1");
    expect(formsPageState.updateFieldsCalls[0]?.fields.length).toBeGreaterThan(0);
    expect(formsPageState.updateActionsCalls[0]?.id).toBe("form-1");
    expect(view.container.textContent).toContain("Form saved.");

    clickByText(view.container, "Runtime preview");
    await flush();

    expect(view.container.textContent).toContain("runtime-preview:open:clean");

    clickByText(view.container, "Action logs");
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/action-runs");
  } finally {
    Object.defineProperty(window, "confirm", {
      value: originalConfirm,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("FormBuilderPage handles routes without form ids", async () => {
  window.history.replaceState({}, "", "/admin/forms");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Loading form builder");
    expect(formsPageState.detailCalls).toHaveLength(0);
    expect(formsPageState.actionsCalls).toHaveLength(0);

    clickByText(view.container, "Action logs");

    expect(formsPageState.navigateCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("FormBuilderPage reports not-found, load, and save errors", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  formsPageState.formDetail = null as never;

  const missingView = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(missingView.container.textContent).toContain("Unable to load form");
    expect(missingView.container.textContent).toContain("Form not found.");

    clickByText(missingView.container, "change-form-name");
    await flush();
    clickByText(missingView.container, "Save");
    await flush();

    expect(formsPageState.updateFormCalls).toHaveLength(0);
  } finally {
    missingView.cleanup();
  }

  formsPageState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1");
  formsPageState.detailError = new Error("boom");

  const loadView = mount(<FormBuilderPage />);

  try {
    await flush();

    expect(loadView.container.textContent).toContain("Unable to load form");
    expect(loadView.container.textContent).toContain("Failed to load form.");
  } finally {
    loadView.cleanup();
  }

  formsPageState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1");

  const saveView = mount(<FormBuilderPage />);

  try {
    await flush();

    formsPageState.updateError = formsPageState.apiError("Save failed");
    clickByText(saveView.container, "add-library-field");
    await flush();
    clickByText(saveView.container, "Save");
    await flush();

    expect(saveView.container.textContent).toContain("Save failed");
  } finally {
    saveView.cleanup();
  }
});

test("FormBuilderPage flags a remote update when the initial detail lands after a local change", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1");
  const { FormBuilderPage } = await import("../../../core/admin/ui/forms/FormBuilderPage");

  const view = mount(<FormBuilderPage />);

  try {
    // Make an unsaved change BEFORE the mount fetch resolves so the pending
    // detail fetch sees hasUnsavedChangesRef already true.
    clickByText(view.container, "add-library-field");
    await flush();

    expect(formsPageState.detailCalls).toContainEqual({ id: "form-1", force: true });
    expect(view.container.textContent).toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});
