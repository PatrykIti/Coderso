// @vitest-environment happy-dom

// TASK-105-08-04 (Item I): useCustomScreenEditorPersistence residual branches —
// a content-type fetch rejection, and the save-time guard that blocks a
// definition save while an external cache event has not been resolved yet.

import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as contentTypesClient from "../../../core/admin/services/contentTypesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { createCustomScreenEditorPageHarness } from "./support/customScreenEditorPageHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const harness = createCustomScreenEditorPageHarness();
const {
  cachedScreens,
  remoteScreens,
  makeMountedScreen,
  mountEditor,
  flushMountedEditor,
  findButton,
  editScreenName,
  openScreenSettings,
  currentPath,
  setup,
  cleanup,
} = harness;

let updateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  ({ updateSpy } = setup());
});

afterEach(() => {
  cleanup();
});

describe("CustomScreenEditorPage persistence residuals", () => {
  test("a content-type fetch rejection is swallowed by the bounded catch", async () => {
    vi.mocked(contentTypesClient.listContentTypesCached).mockRejectedValueOnce(
      new Error("content types unavailable")
    );
    const screenId = "content-types-reject";
    const baseline = makeMountedScreen(screenId, "Content types reject");
    cachedScreens.set(screenId, baseline);
    remoteScreens.set(screenId, baseline);
    const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

    try {
      await flushMountedEditor();
      await openScreenSettings(view.container);
      expect(getScreenNameInputText(view.container)).toBe("Content types reject");
      expect(view.container.textContent).not.toContain("Failed to load custom screen.");
    } finally {
      view.cleanup();
    }
  });

  test("a Save click racing an unresolved external cache event is blocked with a refresh error", async () => {
    const screenId = "external-race-save";
    const baseline = makeMountedScreen(screenId, "External race baseline");
    cachedScreens.set(screenId, baseline);
    remoteScreens.set(screenId, baseline);
    const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Draft that must not save");

      const updatesBefore = updateSpy.mock.calls.length;
      // The broadcast sets externalUpdateUnresolvedRef synchronously while the
      // draft is dirty (no background refresh runs); the Save click in the same
      // act reaches handleSave before React re-renders the disabled button.
      React.act(() => {
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail(screenId),
          action: "update",
        });
        findButton(view.container, "Save")?.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      await flushMountedEditor();

      expect(updateSpy).toHaveBeenCalledTimes(updatesBefore);
      expect(view.container.textContent).toContain(
        "Refresh the newer Screen version before saving."
      );
      expect(getScreenNameInputText(view.container)).toBe("Draft that must not save");
      expect(currentPath(view.container)).toBe(`/admin/advanced/custom-screens/${screenId}`);
    } finally {
      view.cleanup();
    }
  });
});

const getScreenNameInputText = (container: ParentNode) => {
  const input = container.querySelector<HTMLInputElement>(
    'input[placeholder="Custom screen name"]'
  );
  return input?.value ?? "";
};
