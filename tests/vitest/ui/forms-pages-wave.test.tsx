// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";
import { flush, getFormsPageState, mount } from "./formsPagesWaveFixtures";

// TASK-551 owns the eventual filename migration; TASK-540 keeps this historical
// suite path present while reducing it below the repository line limit.
const formsPageState = getFormsPageState();

test("useForms consumes cache, refreshes, and reacts to cache bus events", async () => {
  const { useForms } = await import("../../../core/admin/ui/forms/hooks/useForms");

  const Harness = () => {
    const { items, isLoading, error, refresh } = useForms();
    return (
      <div>
        <span>{`count:${items.length}`}</span>
        <span>{`loading:${String(isLoading)}`}</span>
        <span>{error ?? "no-error"}</span>
        <button type="button" onClick={() => refresh(true)}>
          refresh-forms
        </button>
      </div>
    );
  };

  const view = mount(<Harness />);

  try {
    await React.act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("count:1");
    expect(formsPageState.listCalls).toContain(false);

    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formsList" });
      }
      await Promise.resolve();
    });

    expect(formsPageState.listCalls.length).toBeGreaterThan(1);

    formsPageState.listError = formsPageState.apiError("Forms load failed");
    await React.act(async () => {
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Forms load failed");
  } finally {
    view.cleanup();
  }
});
test("FormListPage creates, refreshes fallback, confirms row actions, and reports form errors", async () => {
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    expect(view.container.textContent).toContain("Forms");
    expect(view.container.textContent).toContain("Contact");
    expect(
      view.container.querySelector("[data-active-href]")?.getAttribute("data-active-href")
    ).toBe("/admin/advanced/forms");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("New"))
        ?.click();
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();

    expect(formsPageState.createCalls[0]).toEqual({
      name: "Created form",
      slug: "created-form",
      status: "draft",
      description: "Created from drawer",
    });
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/created-form");
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith('Form "Created form" created.');

    formsPageState.createReturnsNull = true;
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();
    expect(formsPageState.listCalls.at(-1)).toBe(true);

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "edit-form-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "action-logs-form-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "publish-form-row")
        ?.click();
    });
    await flush();
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1");
    expect(formsPageState.navigateCalls).toContain("/advanced/forms/form-1/action-runs");
    expect(formsPageState.updateFormCalls).toContainEqual({
      id: "form-1",
      input: { status: "published" },
    });

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "delete-form-row")
        ?.click();
    });
    expect(formsPageState.deleteCalls).toHaveLength(0);

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Delete form")
        ?.click();
    });
    await flush();
    expect(formsPageState.deleteCalls).toContain("form-1");
    expect(formsPageState.toastSuccess).toHaveBeenCalledWith("Form deleted.");

    formsPageState.createError = formsPageState.apiError("Create failed");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "create-form-drawer")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Forms update failed");
    expect(view.container.textContent).toContain("Create failed");

    formsPageState.createError = null;
    formsPageState.deleteError = new Error("boom");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "delete-form-row")
        ?.click();
    });
    await flush();
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Delete form")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Failed to delete form.");
  } finally {
    view.cleanup();
  }
});

test("FormListPage reports load failures", async () => {
  formsPageState.listError = formsPageState.apiError("Forms load failed");
  const { FormListPage } = await import("../../../core/admin/ui/forms/FormListPage");

  const view = mount(<FormListPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load forms");
    expect(view.container.textContent).toContain("Forms load failed");
  } finally {
    view.cleanup();
  }
});
