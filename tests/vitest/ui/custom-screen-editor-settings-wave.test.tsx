// @vitest-environment happy-dom
//
// TASK-105-08-04: CustomScreenEditorRouteSession settings interactions — status
// change, sidebar shortcut toggle + label, preview dialog open, and orphan
// binding removal. These exercise the route-session change* setters and the
// settings-action wiring that the draft/save and navigation suites never touch.

import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createCustomScreenEditorPageHarness } from "./support/customScreenEditorPageHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

const harness = createCustomScreenEditorPageHarness();
const {
  remoteScreens,
  cachedScreens,
  makeMountedScreen,
  mountEditor,
  flushMountedEditor,
  openScreenSettings,
  currentPath,
} = harness;

beforeEach(() => {
  harness.setup();
});

afterEach(() => {
  harness.cleanup();
});

const findPortalOption = (text: string) =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (node) => node.textContent?.trim() === text
  );

const chooseStatus = (container: ParentNode, optionText: string) => {
  const trigger = container.querySelector<HTMLElement>('[role="combobox"][aria-label="Status"]');
  expect(trigger).not.toBeNull();
  React.act(() => {
    trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const option = findPortalOption(optionText);
  expect(option).toBeDefined();
  React.act(() => {
    option?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("CustomScreenEditorRouteSession settings surface", () => {
  test("changing the status marks the draft dirty and persists the selection", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await openScreenSettings(view.container);
      expect(view.container.textContent).not.toContain("Unsaved changes");

      chooseStatus(view.container, "Draft");
      await flushMountedEditor();

      expect(view.container.textContent).toContain("Unsaved changes");
      expect(
        view.container.querySelector('[role="combobox"][aria-label="Status"]')?.textContent
      ).toContain("Draft");
    } finally {
      view.cleanup();
    }
  });

  test("toggling the sidebar shortcut enables the label and typing it patches the draft", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await openScreenSettings(view.container);

      const labelInput = view.container.querySelector<HTMLInputElement>(
        'input[aria-label="Sidebar label"]'
      );
      expect(labelInput?.disabled).toBe(true);

      const toggle = view.container.querySelector<HTMLElement>(
        '[role="switch"][aria-label="Show records workflow in left menu"]'
      );
      expect(toggle).not.toBeNull();
      React.act(() => {
        toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushMountedEditor();

      expect(
        view.container.querySelector<HTMLInputElement>('input[aria-label="Sidebar label"]')
          ?.disabled
      ).toBe(false);

      const enabledLabel = view.container.querySelector<HTMLInputElement>(
        'input[aria-label="Sidebar label"]'
      );
      React.act(() => {
        enabledLabel?.focus();
        const setter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(enabledLabel as HTMLInputElement),
          "value"
        )?.set;
        setter?.call(enabledLabel, "Projects shortcut");
        enabledLabel?.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await flushMountedEditor();

      expect(view.container.textContent).toContain("Unsaved changes");
      expect(
        view.container.querySelector<HTMLInputElement>('input[aria-label="Sidebar label"]')?.value
      ).toBe("Projects shortcut");
    } finally {
      view.cleanup();
    }
  });

  test("the header Preview action opens the workspace preview dialog", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      const previewButton = Array.from(view.container.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.trim() === "Preview"
      );
      expect(previewButton).toBeDefined();
      React.act(() => {
        previewButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushMountedEditor();
      const dialog = Array.from(document.querySelectorAll('[role="dialog"]')).find((node) =>
        node.textContent?.includes("Editor View Preview")
      );
      expect(dialog).toBeDefined();
    } finally {
      view.cleanup();
    }
  });

  test("orphan bindings surface in settings and the remove action cleans them", async () => {
    const orphanScreen = makeMountedScreen("screen-1", "Orphan screen");
    orphanScreen.definition = {
      ...orphanScreen.definition,
      editorView: {
        saveMode: "entry",
        interactionMode: "inline",
        document: {
          schemaVersion: 1,
          sections: [
            {
              id: "section-screen-1",
              type: "section",
              label: "Details",
              data: { title: "Details" },
              blocks: [
                {
                  id: "heading-1",
                  type: "heading",
                  data: { text: "Hello", label: "Title" },
                },
              ],
            },
          ],
        },
        bindings: [
          {
            id: "b-orphan",
            // Field-orphan: the block is live but the content-type field was
            // deleted after save; the read path retains it for recovery UX.
            blockId: "heading-1",
            propPath: "text",
            source: "entry",
            field: "missing-field",
            mode: "read",
          },
        ],
      },
    };
    remoteScreens.set("screen-1", orphanScreen);
    cachedScreens.set("screen-1", orphanScreen);

    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await openScreenSettings(view.container);

      expect(view.container.querySelector('[data-screen-orphan-notice="true"]')).not.toBeNull();

      const removeButton = view.container.querySelector<HTMLElement>(
        '[data-screen-remove-orphans="true"]'
      );
      expect(removeButton).not.toBeNull();
      React.act(() => {
        removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      await flushMountedEditor();

      expect(view.container.querySelector('[data-screen-orphan-notice="true"]')).toBeNull();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
    } finally {
      view.cleanup();
    }
  });
});
