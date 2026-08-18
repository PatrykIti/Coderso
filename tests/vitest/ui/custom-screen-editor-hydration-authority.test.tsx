// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensEditorClient";
import { runBuilderManualRefresh } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import {
  broadcastCacheEvent,
  createCacheEventOperationToken,
} from "../../../core/admin/utils/cacheBus";
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
  cachedScreens,
  remoteScreens,
  loadQueue,
  queueScreenLoad,
  queueScreenUpdate,
  makeMountedScreen,
  recordFromPayload,
  mountEditor,
  flushMountedEditor,
  deferred,
  resolveDeferred,
  rejectDeferred,
  clickElement,
  findButton,
  openScreenSettings,
  getScreenNameInput,
  editScreenName,
  saveScreen,
  emitRemoteScreenCacheEvent,
  emitLocalScreenCacheEvent,
  getAlertDescription,
  getAlertMessage,
} = harness;

let loadSpy: ReturnType<typeof vi.spyOn>;
let createSpy: ReturnType<typeof vi.spyOn>;
let updateSpy: ReturnType<typeof vi.spyOn>;
let assistantSetSpy: ReturnType<typeof vi.spyOn>;
let assistantClearSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  ({ loadSpy, createSpy, updateSpy, assistantSetSpy, assistantClearSpy } = harness.setup());
});

afterEach(() => {
  harness.cleanup();
});

describe("CustomScreenEditorPage route, draft, hydration, and save authority", () => {
  test("dirty external Refresh confirms discard, restores the baseline, and remains retryable", async () => {
    for (const outcome of ["success", "missing", "reject"] as const) {
      const screenId = `dirty-external-refresh-${outcome}`;
      const baseline = makeMountedScreen(screenId, `Persisted baseline ${outcome}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Discarded local draft ${outcome}`);
        const callsBeforeCacheEvent = loadSpy.mock.calls.length;
        emitLocalScreenCacheEvent(screenId);
        await flushMountedEditor();
        expect(loadSpy).toHaveBeenCalledTimes(callsBeforeCacheEvent);
        expect(view.container.textContent).toContain("Newer changes are available");

        clickElement(findButton(view.container, "Refresh"));
        await flushMountedEditor();
        expect(document.body.textContent).toContain("Discard local Screen changes and refresh?");
        clickElement(findButton(document, "Keep editing"));
        await flushMountedEditor();
        expect(getScreenNameInput(view.container)?.value).toBe(`Discarded local draft ${outcome}`);
        expect(view.container.textContent).toContain("Unsaved changes");
        expect(loadSpy).toHaveBeenCalledTimes(callsBeforeCacheEvent);

        const pendingRefresh = deferred<CustomScreenRecord | null>();
        queueScreenLoad(screenId, pendingRefresh);
        clickElement(findButton(view.container, "Refresh"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and refresh"));
        await flushMountedEditor();

        expect(loadSpy).toHaveBeenCalledTimes(callsBeforeCacheEvent + 1);
        expect(loadSpy).toHaveBeenLastCalledWith(screenId, { force: true });
        expect(loadQueue.some((queued) => queued.screenId === screenId)).toBe(false);
        expect(getScreenNameInput(view.container)?.value).toBe(`Persisted baseline ${outcome}`);
        expect(view.container.textContent).not.toContain(`Discarded local draft ${outcome}`);
        expect(view.container.textContent).not.toContain("Unsaved changes");
        expect(view.container.textContent).toContain("Newer changes are available");
        expect(findButton(view.container, "Save")?.disabled).toBe(true);

        if (outcome === "success") {
          await resolveDeferred(
            pendingRefresh,
            makeMountedScreen(screenId, "Authoritative refreshed Screen")
          );
          expect(getScreenNameInput(view.container)?.value).toBe("Authoritative refreshed Screen");
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(findButton(view.container, "Save")?.disabled).toBe(false);
        } else if (outcome === "missing") {
          await resolveDeferred(pendingRefresh, null);
          expect(getScreenNameInput(view.container)?.value).toBe(`Persisted baseline ${outcome}`);
          expect(view.container.textContent).toContain("Custom screen not found.");
          expect(view.container.textContent).toContain("Newer changes are available");
          expect(findButton(view.container, "Save")?.disabled).toBe(true);
          expect(findButton(view.container, "Refresh")?.disabled).toBe(false);
        } else {
          await rejectDeferred(pendingRefresh, new Error("refresh failed privately"));
          expect(getScreenNameInput(view.container)?.value).toBe(`Persisted baseline ${outcome}`);
          expect(view.container.textContent).toContain("Failed to load custom screen.");
          expect(view.container.textContent).not.toContain("refresh failed privately");
          expect(view.container.textContent).toContain("Newer changes are available");
          expect(findButton(view.container, "Save")?.disabled).toBe(true);
          expect(findButton(view.container, "Refresh")?.disabled).toBe(false);
        }

        if (outcome !== "success") {
          const retryRefresh = deferred<CustomScreenRecord | null>();
          queueScreenLoad(screenId, retryRefresh);
          clickElement(findButton(view.container, "Refresh"));
          await flushMountedEditor();
          await resolveDeferred(
            retryRefresh,
            makeMountedScreen(screenId, `Authoritative retry ${outcome}`)
          );
          await openScreenSettings(view.container);
          expect(getScreenNameInput(view.container)?.value).toBe(`Authoritative retry ${outcome}`);
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(view.container.textContent).not.toContain("Custom screen not found.");
          expect(view.container.textContent).not.toContain("Failed to load custom screen.");
          expect(findButton(view.container, "Save")?.disabled).toBe(false);
        }
      } finally {
        view.cleanup();
      }
    }
  });

  test("an uncached current visit shows loading then not-found without mounting old or default builder content", async () => {
    cachedScreens.delete("screen-1");
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      expect(view.container.textContent).toContain("Loading custom screen...");
      expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
      expect(findButton(view.container, "Save")).toBeNull();
      expect(findButton(view.container, "Preview")).toBeNull();
      expect(assistantSetSpy).not.toHaveBeenCalled();
      await flushMountedEditor();

      await resolveDeferred(pendingLoad, null);
      expect(view.container.textContent).toContain("Custom screen not found.");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
      expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
      expect(assistantSetSpy).not.toHaveBeenCalled();
      expect(assistantClearSpy).toHaveBeenCalled();
    } finally {
      view.cleanup();
    }
  });

  test("only a clean unchanged uncached visit receives API or generic load errors", async () => {
    const cases = [
      {
        screenId: "screen-1",
        error: new ApiClientError("custom_screen_unavailable", "API load unavailable", 503),
        message: "API load unavailable",
      },
      {
        screenId: "screen-2",
        error: new Error("private generic detail"),
        message: "Failed to load custom screen.",
      },
    ];

    for (const testCase of cases) {
      cachedScreens.delete(testCase.screenId);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(testCase.screenId, pendingLoad);
      const view = mountEditor(`/admin/advanced/custom-screens/${testCase.screenId}`);
      try {
        expect(view.container.textContent).toContain("Loading custom screen...");
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        await flushMountedEditor();
        await rejectDeferred(pendingLoad, testCase.error);
        expect(view.container.textContent).toContain(testCase.message);
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        expect(assistantSetSpy).not.toHaveBeenCalled();
      } finally {
        view.cleanup();
      }
    }
  });

  test("synchronous save validation owns diagnostics over every older hydration settlement", async () => {
    const branches = [
      {
        kind: "blank-name" as const,
        message: "Screen name is required.",
      },
      {
        kind: "missing-content-type" as const,
        message: "Select a content type before saving.",
      },
    ];

    for (const branch of branches) {
      for (const outcome of ["resolve", "reject"] as const) {
        const screenId = `validation-${branch.kind}-${outcome}`;
        const baseline = {
          ...makeMountedScreen(screenId, `Validation ${branch.kind}`),
          ...(branch.kind === "missing-content-type" ? { contentTypeId: "" } : {}),
        };
        cachedScreens.set(screenId, baseline);
        remoteScreens.set(screenId, baseline);
        const pendingLoad = deferred<CustomScreenRecord | null>();
        queueScreenLoad(screenId, pendingLoad);
        const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

        try {
          await flushMountedEditor();
          await editScreenName(
            view.container,
            branch.kind === "blank-name" ? "" : `Authored ${branch.kind} ${outcome}`
          );
          const expectedDraft =
            branch.kind === "blank-name" ? "" : `Authored ${branch.kind} ${outcome}`;
          const createCallsBeforeValidation = createSpy.mock.calls.length;
          const updateCallsBeforeValidation = updateSpy.mock.calls.length;

          saveScreen(view.container);
          await flushMountedEditor();

          expect(getAlertDescription(view.container, "Custom screen error")).toBe(branch.message);
          expect(getScreenNameInput(view.container)?.value).toBe(expectedDraft);
          expect(view.container.textContent).toContain("Unsaved changes");
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(view.container.textContent).not.toContain("Loading custom screen...");
          expect(createSpy).toHaveBeenCalledTimes(createCallsBeforeValidation);
          expect(updateSpy).toHaveBeenCalledTimes(updateCallsBeforeValidation);

          if (outcome === "resolve") {
            await resolveDeferred(
              pendingLoad,
              makeMountedScreen(screenId, `Older validation hydration ${branch.kind}`)
            );
          } else {
            await rejectDeferred(
              pendingLoad,
              new Error(`Older validation rejection ${branch.kind}`)
            );
          }

          expect(getAlertDescription(view.container, "Custom screen error")).toBe(branch.message);
          expect(getScreenNameInput(view.container)?.value).toBe(expectedDraft);
          expect(view.container.textContent).toContain("Unsaved changes");
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(view.container.textContent).not.toContain("Loading custom screen...");
          expect(view.container.textContent).not.toContain("Older validation hydration");
          expect(view.container.textContent).not.toContain("Older validation rejection");
          expect(createSpy).toHaveBeenCalledTimes(createCallsBeforeValidation);
          expect(updateSpy).toHaveBeenCalledTimes(updateCallsBeforeValidation);
        } finally {
          view.cleanup();
        }
      }
    }
  });

  test("an older hydration cannot erase or replace a newer save failure", async () => {
    const cases: Array<"resolve" | "reject"> = ["resolve", "reject"];

    for (const [index, outcome] of cases.entries()) {
      const screenId = `save-failure-${index}`;
      const baseline = makeMountedScreen(screenId, `Save failure ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(screenId, pendingLoad);
      const failedUpdate = deferred<CustomScreenRecord>();
      queueScreenUpdate(failedUpdate);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Local save failure ${index}`);
        saveScreen(view.container);
        await flushMountedEditor();
        await rejectDeferred(
          failedUpdate,
          new ApiClientError("custom_screen_conflict", `Save failed visibly ${index}`, 409)
        );
        expect(view.container.textContent).toContain(`Save failed visibly ${index}`);

        if (outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen(screenId, `Older hydration ${index}`)
          );
        } else {
          await rejectDeferred(pendingLoad, new Error(`Older load failure ${index}`));
        }

        expect(getScreenNameInput(view.container)?.value).toBe(`Local save failure ${index}`);
        expect(view.container.textContent).toContain(`Save failed visibly ${index}`);
        expect(view.container.textContent).toContain("Unsaved changes");
        expect(view.container.textContent).not.toContain(`Older hydration ${index}`);
        expect(view.container.textContent).not.toContain("Newer changes are available");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.textContent).not.toContain("Failed to load custom screen.");
      } finally {
        view.cleanup();
      }
    }
  });

  test("pre-existing hydration settlements on either side of an exact save cannot publish stale state", async () => {
    const cases = [
      { outcome: "resolve" as const, hydrationFirst: true },
      { outcome: "reject" as const, hydrationFirst: true },
      { outcome: "resolve" as const, hydrationFirst: false },
      { outcome: "reject" as const, hydrationFirst: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `save-hydration-${index}`;
      const baseline = makeMountedScreen(screenId, `Hydration baseline ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad(screenId, pendingLoad);
      const pendingUpdate = deferred<CustomScreenRecord>();
      queueScreenUpdate(pendingUpdate);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      const settleHydration = async () => {
        if (testCase.outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen(screenId, `Stale hydration ${index}`)
          );
        } else {
          await rejectDeferred(pendingLoad, new Error(`Stale hydration failure ${index}`));
        }
      };

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Exact saved Screen ${index}`);
        saveScreen(view.container);
        await flushMountedEditor();
        const payload = updateSpy.mock.calls.at(-1)?.[1];
        if (!payload) throw new Error("Exact update payload was not captured");

        if (testCase.hydrationFirst) await settleHydration();
        await resolveDeferred(pendingUpdate, recordFromPayload(baseline, payload));
        if (!testCase.hydrationFirst) await settleHydration();

        expect(getScreenNameInput(view.container)?.value).toBe(`Exact saved Screen ${index}`);
        expect(view.container.textContent).not.toContain("Unsaved changes");
        expect(view.container.textContent).not.toContain("Newer changes are available");
        expect(view.container.textContent).not.toContain(
          "Could not check for Screen updates. Local changes are unchanged."
        );
        expect(view.container.textContent).not.toContain("Failed to load custom screen.");
        expect(view.container.textContent).not.toContain(
          "Saved server version; newer local changes remain unsaved."
        );
        expect(view.container.textContent).not.toContain(`Stale hydration ${index}`);
      } finally {
        view.cleanup();
      }
    }
  });

  test("only an exact self token is suppressed while every external event variant survives save settlement", async () => {
    const externalVariants = [
      {
        name: "remote",
        emit: (screenId: string) => emitRemoteScreenCacheEvent(screenId),
      },
      {
        name: "local-distinct-token",
        emit: (screenId: string) =>
          emitLocalScreenCacheEvent(screenId, createCacheEventOperationToken()),
      },
      {
        name: "local-tokenless",
        emit: (screenId: string) => emitLocalScreenCacheEvent(screenId),
      },
    ];

    for (const variant of externalVariants) {
      for (const outcome of ["resolve", "reject"] as const) {
        const screenId = `${variant.name}-during-save-${outcome}`;
        const baseline = makeMountedScreen(screenId, `External save ${outcome}`);
        cachedScreens.set(screenId, baseline);
        remoteScreens.set(screenId, baseline);
        const pendingUpdate = deferred<CustomScreenRecord>();
        queueScreenUpdate(pendingUpdate);
        const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

        try {
          await flushMountedEditor();
          await editScreenName(view.container, `External save draft ${variant.name} ${outcome}`);
          saveScreen(view.container);
          await flushMountedEditor();
          const payload = updateSpy.mock.calls.at(-1)?.[1];
          const operationToken = updateSpy.mock.calls.at(-1)?.[2]?.cacheEventOperationToken;
          if (!payload) throw new Error("External-race update payload was not captured");
          if (!operationToken) throw new Error("Save operation token was not captured");
          const loadsBeforeCacheEvents = loadSpy.mock.calls.length;

          emitLocalScreenCacheEvent(screenId, operationToken);
          await flushMountedEditor();
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeCacheEvents);

          variant.emit(screenId);
          await flushMountedEditor();

          expect(view.container.textContent).toContain("Newer changes are available");
          expect(getAlertMessage(view.container, "Newer changes are available")).toBe(
            "This Screen changed outside this editor. Refresh to load the latest version."
          );
          const refresh = findButton(view.container, "Refresh");
          expect(refresh?.disabled).toBe(true);
          if (!refresh) throw new Error("Refresh button was not rendered");
          const guardedRefresh = vi.fn();
          expect(runBuilderManualRefresh({ saveActive: true, refresh: guardedRefresh })).toBe(
            false
          );
          expect(guardedRefresh).not.toHaveBeenCalled();
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeCacheEvents);

          if (outcome === "resolve") {
            await resolveDeferred(pendingUpdate, recordFromPayload(baseline, payload));
            expect(view.container.textContent).not.toContain("Unsaved changes");
            expect(getScreenNameInput(view.container)?.value).toBe(
              `External save draft ${variant.name} ${outcome}`
            );
            expect(view.container.textContent).not.toContain(
              "Saved server version; newer local changes remain unsaved."
            );
          } else {
            await rejectDeferred(
              pendingUpdate,
              new ApiClientError("custom_screen_conflict", "Concurrent Screen save rejected", 409, {
                fields: ["definition"],
              })
            );
            expect(getAlertDescription(view.container, "Custom screen error")).toBe(
              "Concurrent Screen save rejected (field(s): definition)"
            );
            expect(view.container.textContent).toContain("Unsaved changes");
            expect(getScreenNameInput(view.container)?.value).toBe(
              `External save draft ${variant.name} ${outcome}`
            );
          }

          expect(view.container.textContent).toContain("Newer changes are available");
          expect(getAlertMessage(view.container, "Newer changes are available")).toBe(
            "This Screen changed outside this editor. Refresh to load the latest version."
          );
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeCacheEvents);
        } finally {
          view.cleanup();
        }
      }
    }
  });

  test("a generic Screen-list event cannot claim that the current Screen changed", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      const callsBeforeListEvent = loadSpy.mock.calls.length;
      React.act(() => {
        broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
      });
      await flushMountedEditor();
      expect(loadSpy).toHaveBeenCalledTimes(callsBeforeListEvent);
      expect(view.container.textContent).not.toContain("Newer changes are available");
      expect(findButton(view.container, "Save")?.disabled).toBe(false);
    } finally {
      view.cleanup();
    }
  });
});

// TASK-569 — optimistic-concurrency revision precondition on definition saves.
test("a definition save sends the loaded revision and a real 409 keeps the local draft", async () => {
  const screenId = "revision-save-screen";
  const baseline = makeMountedScreen(screenId, `Revision baseline`);
  cachedScreens.set(screenId, baseline);
  remoteScreens.set(screenId, baseline);
  const pendingUpdate = deferred<CustomScreenRecord>();
  queueScreenUpdate(pendingUpdate);
  const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

  try {
    await flushMountedEditor();
    await editScreenName(view.container, `Revision draft`);
    saveScreen(view.container);
    await flushMountedEditor();

    const payload = updateSpy.mock.calls.at(-1)?.[1];
    expect(payload?.expectedRevision).toBe(1);
    expect(payload?.definition).toBeDefined();

    await rejectDeferred(
      pendingUpdate,
      new ApiClientError("custom_screen_conflict", "Concurrent Screen save rejected", 409)
    );
    expect(getScreenNameInput(view.container)?.value).toBe(`Revision draft`);
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(getAlertDescription(view.container, "Custom screen error")).toBe(
      "Concurrent Screen save rejected"
    );
  } finally {
    view.cleanup();
  }
});

test("a stale browser-cache record without a revision revalidates before a definition save", async () => {
  const screenId = "stale-revision-screen";
  const { revision: _revision, ...staleBaseline } = makeMountedScreen(
    screenId,
    "Stale cached Screen"
  );
  cachedScreens.set(screenId, staleBaseline);
  // The record predates revision tracking on both the browser cache and the
  // server, so the editor cannot produce an expectedRevision and must revalidate
  // instead of sending a doomed definition save.
  remoteScreens.set(screenId, staleBaseline);
  const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

  try {
    await flushMountedEditor();
    await editScreenName(view.container, `Draft on stale cache`);
    const updatesBefore = updateSpy.mock.calls.length;
    const loadsBefore = loadSpy.mock.calls.length;

    saveScreen(view.container);
    await flushMountedEditor();

    // No PATCH was attempted; the editor revalidated the stale record instead.
    expect(updateSpy).toHaveBeenCalledTimes(updatesBefore);
    expect(loadSpy).toHaveBeenCalledTimes(loadsBefore + 1);
    expect(loadSpy).toHaveBeenLastCalledWith(screenId, { force: true });
    expect(getScreenNameInput(view.container)?.value).toBe(`Draft on stale cache`);
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("Newer changes are available");
  } finally {
    view.cleanup();
  }
});
