// @vitest-environment happy-dom
//
// TASK-105-08-04: CustomScreenListPage wave-2 interactive flows — content-type
// label mount failure, create drawer (open, submit with preference, failure,
// preference toggle), row status/delete actions, select-all, bulk partial and
// full failures, and the bulk-delete confirm dialog.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCustomScreenListPageHarness } from "./support/customScreenListPageHarness";

let harness: ReturnType<typeof createCustomScreenListPageHarness>;

beforeEach(() => {
  harness = createCustomScreenListPageHarness();
  harness.setup();
});

afterEach(() => {
  harness.cleanup();
  document.body.innerHTML = "";
});

describe("CustomScreenListPage wave-2 flows", () => {
  test("content type label mount failure surfaces the action error", async () => {
    const failedLoad = harness.deferred<ReturnType<typeof harness.buildMountedContentType>[]>();
    harness.queueContentTypesLoad(failedLoad.promise);
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      failedLoad.reject(new Error("types boom"));
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toBe(
        "Failed to load content type labels."
      );
    } finally {
      view.cleanup();
    }
  });

  test("the empty state New screen button opens the create drawer", async () => {
    harness.setRemoteScreens([]);
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      const newButtons = Array.from(
        view.container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((button) => button.textContent?.trim() === "New screen");
      // The page header button renders first; the table empty-state button is last.
      expect(newButtons.length).toBeGreaterThan(1);
      harness.clickElement(newButtons.at(-1));
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Create Custom Screen");
      expect(document.body.textContent).toContain("Select content type");
    } finally {
      view.cleanup();
    }
  });

  test("cancelling the create drawer runs the sheet onOpenChange handler", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Create Custom Screen");
      const cancel = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Cancel"
      );
      harness.clickElement(cancel);
      await harness.flushMountedPage();
      expect(document.body.textContent).not.toContain("Create Custom Screen");
    } finally {
      view.cleanup();
    }
  });

  test("reopening the create drawer resets its error and remounts it", async () => {
    harness.setRemoteScreens([]);
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      const newScreenButtons = () =>
        Array.from(view.container.querySelectorAll<HTMLButtonElement>("button")).filter(
          (button) => button.textContent?.trim() === "New screen"
        );
      const openDrawerFromHeader = async () => {
        harness.clickElement(newScreenButtons().at(0));
        await harness.flushMountedPage();
        expect(document.body.textContent).toContain("Create Custom Screen");
      };
      await openDrawerFromHeader();
      harness.requireCreateSpy().mockRejectedValueOnce(new Error("create exploded"));
      harness.setInputValue(
        document.body.querySelector<HTMLInputElement>(
          'input[placeholder="e.g. Product workspace"]'
        ),
        "Retry board"
      );
      await harness.flushMountedPage();
      const drawer = document.body.querySelector('[data-slot="sheet-content"]');
      const typeTrigger = Array.from(
        drawer!.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((node) => node.textContent?.includes("Select content type"));
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        harness.pointerClick(typeTrigger);
        const typeOption = Array.from(
          document.body.querySelectorAll<HTMLElement>("[role='option']")
        ).find((option) => option.textContent?.trim() === "Projects");
        harness.pointerClick(typeOption);
        await harness.flushMountedPage();
        expect(
          warnSpy.mock.calls.some((call) =>
            call.some((argument) =>
              String(argument).includes("changing from uncontrolled to controlled")
            )
          )
        ).toBe(false);
      } finally {
        warnSpy.mockRestore();
      }
      harness.clickElement(
        Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => button.textContent?.trim() === "Create Custom Screen"
        )
      );
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Unable to create custom screen");
      const cancel = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Cancel"
      );
      harness.clickElement(cancel);
      await harness.flushMountedPage();
      expect(document.body.textContent).not.toContain("Create Custom Screen");
      const emptyStateNewScreenButton = newScreenButtons().at(-1);
      expect(emptyStateNewScreenButton).toBeDefined();
      harness.clickElement(emptyStateNewScreenButton);
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Select content type");
      expect(document.body.textContent).not.toContain("Unable to create custom screen");
      expect(
        document.body.querySelector<HTMLInputElement>('input[placeholder="e.g. Product workspace"]')
          ?.value
      ).toBe("");
    } finally {
      view.cleanup();
    }
  });

  test("creating a screen with openAfterCreate on navigates to the builder", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      harness.setInputValue(
        document.body.querySelector<HTMLInputElement>(
          'input[placeholder="e.g. Product workspace"]'
        ),
        "Deals board"
      );
      await harness.flushMountedPage();
      const drawer = document.body.querySelector('[data-slot="sheet-content"]');
      const typeTrigger = Array.from(
        drawer!.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((node) => node.textContent?.includes("Select content type"));
      harness.pointerClick(typeTrigger);
      const typeOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((option) => option.textContent?.trim() === "Projects");
      harness.pointerClick(typeOption);
      await harness.flushMountedPage();
      harness.clickElement(
        Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => button.textContent?.trim() === "Create Custom Screen"
        )
      );
      await harness.flushMountedPage();
      expect(harness.currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/created-screen"
      );
    } finally {
      view.cleanup();
    }
  });

  test("a successful row delete clears the pending id and selection", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      await harness.flushMountedPage();
      harness.openRowActions(view.container, "Projects");
      await harness.flushMountedPage();
      const deleteItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Delete");
      harness.clickElement(deleteItem);
      await harness.flushMountedPage();
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete custom screen"
      );
      harness.clickElement(confirm);
      await harness.flushMountedPage();
      expect(harness.requireDeleteSpy()).toHaveBeenCalledWith("screen-1");
      expect(document.body.textContent).not.toContain("Delete custom screen?");
      expect(view.container.querySelectorAll('[data-selected="true"]').length).toBe(0);
    } finally {
      view.cleanup();
    }
  });

  test("a content types cache event refreshes the content type labels", async () => {
    harness.setRemoteContentTypes([
      harness.buildMountedContentType(),
      {
        id: "type-team",
        name: "Team",
        slug: "team",
        status: "published",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ]);
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      expect(view.container.textContent).toContain("Projects");
      harness.emitCacheEvent(harness.cacheKeys.contentTypesList);
      await harness.flushMountedPage();
      expect(view.container.textContent).toContain("Team");
    } finally {
      view.cleanup();
    }
  });

  test("creating a screen with openAfterCreate off refreshes and closes the drawer", async () => {
    harness.setGetUserSettings(async () => ({ "customScreens.openAfterCreate": false }));
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      harness.setInputValue(
        document.body.querySelector<HTMLInputElement>(
          'input[placeholder="e.g. Product workspace"]'
        ),
        "Deals board"
      );
      await harness.flushMountedPage();
      const drawer = document.body.querySelector('[data-slot="sheet-content"]');
      expect(drawer).not.toBeNull();
      const typeTrigger = Array.from(
        drawer!.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((node) => node.textContent?.includes("Select content type"));
      harness.pointerClick(typeTrigger);
      const typeOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((option) => option.textContent?.trim() === "Projects");
      harness.pointerClick(typeOption);
      await harness.flushMountedPage();
      harness.clickElement(
        Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => button.textContent?.trim() === "Create Custom Screen"
        )
      );
      await harness.flushMountedPage();
      expect(harness.requireCreateSpy()).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Deals board", contentTypeId: "type-projects" })
      );
      expect(document.body.textContent).not.toContain("Create Custom Screen");
      expect(harness.findByText(view.container, "Deals board")).not.toBeNull();
    } finally {
      view.cleanup();
    }
  });

  test("a create failure shows the drawer error alert", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.requireCreateSpy().mockRejectedValueOnce(new Error("create exploded"));
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      harness.setInputValue(
        document.body.querySelector<HTMLInputElement>(
          'input[placeholder="e.g. Product workspace"]'
        ),
        "Deals board"
      );
      await harness.flushMountedPage();
      const drawer = document.body.querySelector('[data-slot="sheet-content"]');
      const typeTrigger = Array.from(
        drawer!.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((node) => node.textContent?.includes("Select content type"));
      harness.pointerClick(typeTrigger);
      const typeOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((option) => option.textContent?.trim() === "Projects");
      harness.pointerClick(typeOption);
      await harness.flushMountedPage();
      harness.clickElement(
        Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
          (button) => button.textContent?.trim() === "Create Custom Screen"
        )
      );
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Unable to create custom screen");
    } finally {
      view.cleanup();
    }
  });

  test("the open-after-create preference toggle persists through setUserSetting", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      const toggle = document.body.querySelector<HTMLElement>("#custom-screen-open-after-create");
      expect(toggle).not.toBeNull();
      harness.clickElement(toggle);
      await harness.flushMountedPage();
      expect(harness.requireSetUserSettingSpy()).toHaveBeenCalledWith(
        "customScreens.openAfterCreate",
        false
      );
    } finally {
      view.cleanup();
    }
  });

  test("a row activate failure surfaces the action error", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.requireUpdateSpy().mockRejectedValueOnce(new Error("activate exploded"));
      harness.openRowActions(view.container, "Projects");
      await harness.flushMountedPage();
      const activateItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Activate");
      expect(activateItem).not.toBeNull();
      harness.clickElement(activateItem);
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toBe(
        "Failed to activate custom screen."
      );
    } finally {
      view.cleanup();
    }
  });

  test("an active screen moves to draft through the row actions menu", async () => {
    harness.setRemoteScreens([
      harness.buildScreen("screen-1", "Projects", { status: "active" }),
      harness.buildScreen("screen-2", "Team"),
    ]);
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.openRowActions(view.container, "Projects");
      await harness.flushMountedPage();
      const draftItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Move to draft");
      expect(draftItem).not.toBeNull();
      harness.clickElement(draftItem);
      await harness.flushMountedPage();
      expect(harness.requireUpdateSpy()).toHaveBeenCalledWith("screen-1", {
        status: "draft",
      });
    } finally {
      view.cleanup();
    }
  });

  test("a row delete failure surfaces the action error", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.requireDeleteSpy().mockRejectedValueOnce(new Error("delete exploded"));
      harness.openRowActions(view.container, "Projects");
      await harness.flushMountedPage();
      const deleteItem = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='menuitem']")
      ).find((node) => node.textContent?.trim() === "Delete");
      harness.clickElement(deleteItem);
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Delete custom screen?");
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete custom screen"
      );
      harness.clickElement(confirm);
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toBe(
        "Failed to delete custom screen."
      );
    } finally {
      view.cleanup();
    }
  });

  test("select all toggles every visible card and clears on the second click", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      const selectAll = view.container.querySelector<HTMLElement>(
        '[aria-label="Select all custom screens"]'
      );
      harness.clickElement(selectAll);
      await harness.flushMountedPage();
      expect(view.container.querySelectorAll('[data-selected="true"]').length).toBe(2);
      harness.clickElement(selectAll);
      await harness.flushMountedPage();
      expect(view.container.querySelectorAll('[data-selected="true"]').length).toBe(0);
    } finally {
      view.cleanup();
    }
  });

  test("a bulk activate partial failure keeps the inline message", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      harness.clickElement(view.container.querySelector('[aria-label="Select Team"]'));
      await harness.flushMountedPage();
      harness.requireUpdateSpy().mockImplementation(async (id) => {
        if (id === "screen-2") throw new Error("bulk exploded");
        return harness.buildScreen(id, "Projects", { status: "active" });
      });
      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-bulk-actions="inline"] [role="combobox"]'
      );
      harness.pointerClick(actionSelect);
      await harness.flushMountedPage();
      const activateOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Activate");
      harness.pointerClick(activateOption);
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "Apply"));
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toContain(
        "failed 1."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a synchronous bulk failure uses the activate fallback message", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      await harness.flushMountedPage();
      harness.requireUpdateSpy().mockImplementation(() => {
        throw new Error("sync boom");
      });
      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-bulk-actions="inline"] [role="combobox"]'
      );
      harness.pointerClick(actionSelect);
      await harness.flushMountedPage();
      const activateOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Activate");
      harness.pointerClick(activateOption);
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "Apply"));
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toBe(
        "Failed to activate selected custom screens."
      );
    } finally {
      view.cleanup();
    }
  });

  test("bulk delete confirms through the dialog and clears the pending ids", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      harness.clickElement(view.container.querySelector('[aria-label="Select Team"]'));
      await harness.flushMountedPage();
      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-bulk-actions="inline"] [role="combobox"]'
      );
      harness.pointerClick(actionSelect);
      await harness.flushMountedPage();
      const deleteOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Delete");
      harness.pointerClick(deleteOption);
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "Apply"));
      await harness.flushMountedPage();
      expect(document.body.textContent).toContain("Delete selected custom screens?");
      const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Delete selected"
      );
      harness.clickElement(confirm);
      await harness.flushMountedPage();
      expect(harness.requireDeleteSpy()).toHaveBeenCalledTimes(2);
      expect(document.body.textContent).not.toContain("Delete selected custom screens?");
    } finally {
      view.cleanup();
    }
  });

  test("a bulk move-to-draft partial failure reports the moved and failed counts", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      harness.clickElement(view.container.querySelector('[aria-label="Select Team"]'));
      await harness.flushMountedPage();
      harness.requireUpdateSpy().mockImplementation(async (id) => {
        if (id === "screen-2") throw new Error("draft exploded");
        return harness.buildScreen(id, "Projects", { status: "draft" });
      });
      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-bulk-actions="inline"] [role="combobox"]'
      );
      harness.pointerClick(actionSelect);
      await harness.flushMountedPage();
      const draftOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Move to draft");
      harness.pointerClick(draftOption);
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "Apply"));
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toContain(
        "Moved 1 custom screen to draft; failed 1."
      );
    } finally {
      view.cleanup();
    }
  });

  test("a synchronous bulk move-to-draft failure uses the fallback message", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(view.container.querySelector('[aria-label="Select Projects"]'));
      await harness.flushMountedPage();
      harness.requireUpdateSpy().mockImplementation(() => {
        throw new Error("sync draft boom");
      });
      const actionSelect = view.container.querySelector<HTMLElement>(
        '[data-custom-screen-bulk-actions="inline"] [role="combobox"]'
      );
      harness.pointerClick(actionSelect);
      await harness.flushMountedPage();
      const draftOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Move to draft");
      harness.pointerClick(draftOption);
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "Apply"));
      await harness.flushMountedPage();
      expect(harness.getAlertMessage(view.container, "Custom screen action failed")).toBe(
        "Failed to move selected custom screens to draft."
      );
    } finally {
      view.cleanup();
    }
  });

  test("the create drawer commits status, sidebar toggle, and label", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      harness.clickElement(harness.findButton(view.container, "New screen"));
      await harness.flushMountedPage();
      const sheet = document.body.querySelector('[data-slot="sheet-content"]');
      expect(sheet).not.toBeNull();
      const nameInput = sheet?.querySelector<HTMLInputElement>(
        'input[placeholder="e.g. Product workspace"]'
      );
      expect(nameInput).not.toBeNull();
      harness.setInputValue(nameInput, "Drawer options screen");

      const statusTrigger = Array.from(
        sheet?.querySelectorAll<HTMLElement>("[role='combobox']") ?? []
      ).find((combobox) => combobox.textContent?.trim() === "Draft");
      harness.pointerClick(statusTrigger);
      await harness.flushMountedPage();
      const activeOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Active");
      harness.pointerClick(activeOption);
      await harness.flushMountedPage();

      const sidebarCheckbox = sheet?.querySelector<HTMLElement>("#custom-screen-show-sidebar");
      harness.clickElement(sidebarCheckbox);
      await harness.flushMountedPage();

      const labelInput = sheet?.querySelector<HTMLInputElement>(
        'input[placeholder="Drawer options screen"]'
      );
      expect(labelInput).not.toBeNull();
      harness.setInputValue(labelInput, "Drawer label");
      await harness.flushMountedPage();

      const contentTypeTrigger = Array.from(
        sheet?.querySelectorAll<HTMLElement>("[role='combobox']") ?? []
      ).find((combobox) => combobox.textContent?.includes("Select content type"));
      harness.pointerClick(contentTypeTrigger);
      await harness.flushMountedPage();
      const projectsOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Projects");
      harness.pointerClick(projectsOption);
      await harness.flushMountedPage();

      const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => button.textContent?.trim() === "Create Custom Screen"
      );
      harness.clickElement(submit);
      await harness.flushMountedPage();

      expect(harness.requireCreateSpy()).toHaveBeenCalledTimes(1);
      expect(harness.requireCreateSpy().mock.calls[0]?.[0]).toMatchObject({
        name: "Drawer options screen",
        status: "active",
        showInSidebar: true,
        sidebarLabel: "Drawer label",
      });
    } finally {
      view.cleanup();
    }
  });

  test("changing the status filter selects the new status value", async () => {
    const view = harness.mount("/admin/advanced/custom-screens");
    try {
      await harness.flushMountedPage();
      const statusTrigger = Array.from(
        view.container.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((combobox) => combobox.textContent?.includes("Status"));
      expect(statusTrigger).toBeDefined();
      harness.pointerClick(statusTrigger);
      await harness.flushMountedPage();
      const activeOption = Array.from(
        document.body.querySelectorAll<HTMLElement>("[role='option']")
      ).find((node) => node.textContent?.trim() === "Active");
      harness.pointerClick(activeOption);
      await harness.flushMountedPage();
      const updatedTrigger = Array.from(
        view.container.querySelectorAll<HTMLElement>("[role='combobox']")
      ).find((combobox) => combobox.textContent?.includes("Active"));
      expect(updatedTrigger).toBeDefined();
    } finally {
      view.cleanup();
    }
  });
});
