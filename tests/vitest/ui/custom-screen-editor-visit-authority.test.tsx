// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import * as customScreensClient from "../../../core/admin/services/customScreensClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensEditorClient";
import { getBuilderExternalRevisionSaveError } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { subscribeCacheEvents } from "../../../core/admin/utils/cacheBus";
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
  updateQueue,
  queueScreenLoad,
  queueScreenCreate,
  queueScreenUpdate,
  makeMountedScreen,
  recordFromPayload,
  mountEditor,
  mountLayoutRemovalRace,
  flushMountedEditor,
  deferred,
  assertDeferredOwningCall,
  resolveDeferred,
  rejectDeferred,
  clickElement,
  findButton,
  openScreenSettings,
  getScreenNameInput,
  editScreenName,
  chooseScreenContentType,
  saveScreen,
  emitLocalScreenCacheEvent,
  currentPath,
} = harness;

let loadSpy: ReturnType<typeof vi.spyOn>;
let createSpy: ReturnType<typeof vi.spyOn>;
let updateSpy: ReturnType<typeof vi.spyOn>;
let assistantSetSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  ({ loadSpy, createSpy, updateSpy, assistantSetSpy } = harness.setup());
});

afterEach(() => {
  harness.cleanup();
});

describe("CustomScreenEditorPage route, draft, hydration, and save authority", () => {
  test("an unresolved current-Screen revision visibly blocks Save without cancelling its GET", async () => {
    const cases = [
      { outcome: "resolve" as const, editDuringLoad: false },
      { outcome: "reject" as const, editDuringLoad: false },
      { outcome: "resolve" as const, editDuringLoad: true },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `external-authority-${index}`;
      const baseline = makeMountedScreen(screenId, `External baseline ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);
      try {
        await flushMountedEditor();
        const pendingRefresh = deferred<CustomScreenRecord | null>();
        queueScreenLoad(screenId, pendingRefresh);
        const callsBeforeEvent = loadSpy.mock.calls.length;
        emitLocalScreenCacheEvent(screenId);
        await flushMountedEditor();

        expect(loadSpy).toHaveBeenCalledTimes(callsBeforeEvent + 1);
        expect(loadSpy).toHaveBeenLastCalledWith(screenId, { force: true });
        expect(loadQueue.some((queued) => queued.screenId === screenId)).toBe(false);
        expect(view.container.textContent).toContain("Newer changes are available");
        expect(findButton(view.container, "Save")?.disabled).toBe(true);
        expect(getBuilderExternalRevisionSaveError(true)).toBe(
          "Refresh the newer Screen version before saving."
        );

        if (testCase.editDuringLoad) {
          await editScreenName(view.container, `Local draft during external GET ${index}`);
          expect(findButton(view.container, "Save")?.disabled).toBe(true);
        }
        const updatesBeforeBlockedSave = updateSpy.mock.calls.length;
        saveScreen(view.container);
        await flushMountedEditor();
        expect(updateSpy).toHaveBeenCalledTimes(updatesBeforeBlockedSave);

        if (testCase.outcome === "reject") {
          await rejectDeferred(pendingRefresh, new Error("private external refresh failure"));
          await openScreenSettings(view.container);
          expect(getScreenNameInput(view.container)?.value).toBe(`External baseline ${index}`);
          expect(view.container.textContent).toContain("Failed to load custom screen.");
          expect(view.container.textContent).not.toContain("private external refresh failure");
          expect(view.container.textContent).toContain("Newer changes are available");
          expect(findButton(view.container, "Save")?.disabled).toBe(true);
        } else {
          await resolveDeferred(
            pendingRefresh,
            makeMountedScreen(screenId, `Authoritative external Screen ${index}`)
          );
          await openScreenSettings(view.container);
          if (testCase.editDuringLoad) {
            expect(getScreenNameInput(view.container)?.value).toBe(
              `Local draft during external GET ${index}`
            );
            expect(view.container.textContent).toContain("Unsaved changes");
            expect(view.container.textContent).toContain("Newer changes are available");
            expect(findButton(view.container, "Save")?.disabled).toBe(true);
          } else {
            expect(getScreenNameInput(view.container)?.value).toBe(
              `Authoritative external Screen ${index}`
            );
            expect(view.container.textContent).not.toContain("Newer changes are available");
            expect(findButton(view.container, "Save")?.disabled).toBe(false);
          }
        }
      } finally {
        view.cleanup();
      }
    }
  });

  test("A to B to A gives the second A an opaque visit in both stale settlement orders", async () => {
    const cases = [
      { oldOutcome: "resolve" as const, oldFirst: true },
      { oldOutcome: "reject" as const, oldFirst: true },
      { oldOutcome: "resolve" as const, oldFirst: false },
      { oldOutcome: "reject" as const, oldFirst: false },
    ];

    for (const [index, testCase] of cases.entries()) {
      const firstBaseline = makeMountedScreen("screen-1", `First A baseline ${index}`);
      const secondBaseline = makeMountedScreen("screen-2", `B baseline ${index}`);
      cachedScreens.set("screen-1", firstBaseline);
      cachedScreens.set("screen-2", secondBaseline);
      remoteScreens.set("screen-1", firstBaseline);
      remoteScreens.set("screen-2", secondBaseline);
      const oldA = deferred<CustomScreenRecord | null>();
      const newA = deferred<CustomScreenRecord | null>();
      queueScreenLoad("screen-1", oldA);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");

      const settleOldA = async () => {
        if (testCase.oldOutcome === "resolve") {
          await resolveDeferred(oldA, makeMountedScreen("screen-1", `First A late ${index}`));
        } else {
          await rejectDeferred(oldA, new Error(`First A failure ${index}`));
        }
      };

      try {
        await flushMountedEditor();
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain(`B baseline ${index}`);

        cachedScreens.delete("screen-1");
        queueScreenLoad("screen-1", newA);
        assistantSetSpy.mockClear();
        clickElement(view.container.querySelector("[data-navigate-screen-one]"));
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
        expect(view.container.textContent).toContain("Loading custom screen...");
        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        await flushMountedEditor();
        expect(assistantSetSpy).not.toHaveBeenCalled();

        if (testCase.oldFirst) {
          await settleOldA();
          expect(view.container.textContent).toContain("Loading custom screen...");
          expect(view.container.textContent).not.toContain(`First A late ${index}`);
          expect(view.container.textContent).not.toContain("Failed to load custom screen.");
          expect(view.container.textContent).not.toContain("Newer changes are available");
          expect(assistantSetSpy).not.toHaveBeenCalled();
        }

        await resolveDeferred(
          newA,
          makeMountedScreen("screen-1", `Second A authoritative ${index}`)
        );
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(
          view.container.querySelector('[data-screen-authoring-canvas="true"]')
        ).not.toBeNull();
        await openScreenSettings(view.container);
        expect(getScreenNameInput(view.container)?.value).toBe(`Second A authoritative ${index}`);
        const assistantCallsAfterCurrent = assistantSetSpy.mock.calls.length;

        if (!testCase.oldFirst) await settleOldA();

        expect(getScreenNameInput(view.container)?.value).toBe(`Second A authoritative ${index}`);
        expect(view.container.textContent).not.toContain(`First A late ${index}`);
        expect(view.container.textContent).not.toContain(`First A failure ${index}`);
        expect(view.container.textContent).not.toContain(`B baseline ${index}`);
        expect(view.container.textContent).not.toContain("Newer changes are available");
        expect(view.container.textContent).not.toContain(
          "Saved server version; newer local changes remain unsaved."
        );
        expect(view.container.textContent).not.toContain("Loading custom screen...");
        expect(assistantSetSpy.mock.calls.length).toBe(assistantCallsAfterCurrent);
        expect(JSON.stringify(assistantSetSpy.mock.calls)).toContain(
          `Second A authoritative ${index}`
        );
        expect(JSON.stringify(assistantSetSpy.mock.calls)).not.toContain(`First A late ${index}`);
      } finally {
        view.cleanup();
      }
    }
  });

  test("a first-A update reaches the second A only through its current cache-driven hydration", async () => {
    for (const outcome of ["resolve", "reject"] as const) {
      const firstBaseline = makeMountedScreen("screen-1", `Pending update A ${outcome}`);
      const secondBaseline = makeMountedScreen("screen-2", `Pending update B ${outcome}`);
      cachedScreens.set("screen-1", firstBaseline);
      cachedScreens.set("screen-2", secondBaseline);
      remoteScreens.set("screen-1", firstBaseline);
      remoteScreens.set("screen-2", secondBaseline);
      const pendingUpdate = deferred<CustomScreenRecord>();
      queueScreenUpdate(pendingUpdate);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");

      try {
        await flushMountedEditor();
        await editScreenName(view.container, `First A draft ${outcome}`);
        saveScreen(view.container);
        await flushMountedEditor();
        const payload = updateSpy.mock.calls.at(-1)?.[1];
        if (!payload) throw new Error("Pending A update payload was not captured");
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and continue"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

        clickElement(view.container.querySelector("[data-navigate-screen-one]"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
        expect(view.container.textContent).not.toContain("Unsaved changes");
        await openScreenSettings(view.container);
        expect(getScreenNameInput(view.container)?.value).toBe(`Pending update A ${outcome}`);
        const loadsBeforeOldSaveSettlement = loadSpy.mock.calls.length;

        if (outcome === "resolve") {
          const currentHydration = deferred<CustomScreenRecord | null>();
          queueScreenLoad("screen-1", currentHydration);
          const savedFirstA: CustomScreenRecord = {
            ...recordFromPayload(firstBaseline, payload),
            warnings: [{ code: "binding_field_removed", fields: ["first-a-only"] }],
          };
          expect(updateQueue).toHaveLength(0);
          await resolveDeferred(pendingUpdate, savedFirstA);
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeOldSaveSettlement + 1);
          expect(loadSpy).toHaveBeenLastCalledWith("screen-1", { force: true });
          expect(loadQueue.some((queued) => queued.screenId === "screen-1")).toBe(false);
          expect(getScreenNameInput(view.container)?.value).toBe(`Pending update A ${outcome}`);
          expect(view.container.textContent).toContain("Newer changes are available");
          await resolveDeferred(currentHydration, savedFirstA);
        } else {
          await rejectDeferred(pendingUpdate, new Error("First A late update rejection"));
        }

        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
        expect(getScreenNameInput(view.container)?.value).toBe(
          outcome === "resolve" ? `First A draft ${outcome}` : `Pending update A ${outcome}`
        );
        if (outcome === "resolve") {
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeOldSaveSettlement + 1);
        } else {
          expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeOldSaveSettlement);
          expect(view.container.textContent).not.toContain(`First A draft ${outcome}`);
        }
        expect(view.container.textContent).not.toContain("Saving...");
        expect(view.container.textContent).not.toContain("Unsaved changes");
        expect(view.container.textContent).not.toContain("First A late update rejection");
        expect(view.container.textContent).not.toContain("first-a-only");
        expect(view.container.textContent).not.toContain("Newer changes are available");
        expect(view.container.textContent).not.toContain(
          "Saved server version; newer local changes remain unsaved."
        );
      } finally {
        view.cleanup();
      }
    }
  });

  test("cancel keeps a pending hydration live while confirm invalidates all of its late outcomes", async () => {
    const cancelLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", cancelLoad);
    const cancelView = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(cancelView.container, "Hydration cancel draft");
      clickElement(cancelView.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      await resolveDeferred(
        cancelLoad,
        makeMountedScreen("screen-1", "Remote after hydration cancel")
      );

      expect(currentPath(cancelView.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(cancelView.container)?.value).toBe("Hydration cancel draft");
      expect(cancelView.container.textContent).toContain("Unsaved changes");
      expect(cancelView.container.textContent).toContain("Newer changes are available");
      expect(cancelView.container.textContent).not.toContain("Remote after hydration cancel");
    } finally {
      cancelView.cleanup();
    }

    for (const outcome of ["resolve", "reject"] as const) {
      const pendingLoad = deferred<CustomScreenRecord | null>();
      queueScreenLoad("screen-1", pendingLoad);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");
      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Hydration confirm ${outcome}`);
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and continue"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

        if (outcome === "resolve") {
          await resolveDeferred(
            pendingLoad,
            makeMountedScreen("screen-1", "Discarded hydration result")
          );
        } else {
          await rejectDeferred(pendingLoad, new Error("discarded hydration failure"));
        }

        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain("Screen two baseline");
        expect(view.container.textContent).not.toContain(`Hydration confirm ${outcome}`);
        expect(view.container.textContent).not.toContain("Discarded hydration result");
        expect(view.container.textContent).not.toContain("discarded hydration failure");
        expect(view.container.textContent).not.toContain("Newer changes are available");
        expect(view.container.textContent).not.toContain("Loading custom screen...");
      } finally {
        view.cleanup();
      }
    }
  });

  test("cancel keeps a pending save authoritative while confirm invalidates success and failure", async () => {
    const cancelSave = deferred<CustomScreenRecord>();
    queueScreenUpdate(cancelSave);
    const cancelView = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(cancelView.container, "Save cancel draft");
      saveScreen(cancelView.container);
      await flushMountedEditor();
      const payload = updateSpy.mock.calls.at(-1)?.[1];
      if (!payload) throw new Error("Cancel-save payload was not captured");
      clickElement(cancelView.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      await resolveDeferred(cancelSave, recordFromPayload(makeMountedScreen("screen-1"), payload));

      expect(currentPath(cancelView.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(cancelView.container)?.value).toBe("Save cancel draft");
      expect(cancelView.container.textContent).not.toContain("Unsaved changes");
      expect(cancelView.container.textContent).not.toContain("Saving...");
    } finally {
      cancelView.cleanup();
    }

    for (const outcome of ["resolve", "reject"] as const) {
      const pendingSave = deferred<CustomScreenRecord>();
      queueScreenUpdate(pendingSave);
      const view = mountEditor("/admin/advanced/custom-screens/screen-1");
      try {
        await flushMountedEditor();
        await editScreenName(view.container, `Save confirm ${outcome}`);
        saveScreen(view.container);
        await flushMountedEditor();
        const payload = updateSpy.mock.calls.at(-1)?.[1];
        if (!payload) throw new Error("Confirm-save payload was not captured");
        clickElement(view.container.querySelector("[data-navigate-screen-two]"));
        await flushMountedEditor();
        clickElement(findButton(document, "Discard and continue"));
        await flushMountedEditor();
        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

        if (outcome === "resolve") {
          await resolveDeferred(pendingSave, {
            ...recordFromPayload(makeMountedScreen("screen-1"), payload),
            warnings: [
              {
                code: "binding_field_removed",
                fields: ["discarded-field"],
              },
            ],
          });
        } else {
          await rejectDeferred(pendingSave, new Error("discarded save failure"));
        }

        expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");
        expect(view.container.textContent).toContain("Screen two baseline");
        expect(view.container.textContent).not.toContain(`Save confirm ${outcome}`);
        expect(view.container.textContent).not.toContain("discarded-field");
        expect(view.container.textContent).not.toContain("discarded save failure");
        expect(view.container.textContent).not.toContain("Saving...");
        expect(view.container.textContent).not.toContain("Unsaved changes");
      } finally {
        view.cleanup();
      }
    }
  });

  test("an old create response cannot seed the next create visit with a PATCH target", async () => {
    const oldCreate = deferred<CustomScreenRecord>();
    queueScreenCreate(oldCreate);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Create visit A");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();
      clickElement(view.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Discard and continue"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-2");

      clickElement(view.container.querySelector("[data-navigate-new-screen]"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      await editScreenName(view.container, "Create visit B");
      await chooseScreenContentType(view.container);

      await resolveDeferred(oldCreate, makeMountedScreen("old-create-a", "Create visit A"));
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      await openScreenSettings(view.container);
      expect(getScreenNameInput(view.container)?.value).toBe("Create visit B");

      saveScreen(view.container);
      await flushMountedEditor();
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(createSpy.mock.calls[1]?.[0].name).toBe("Create visit B");
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/created-screen");
    } finally {
      view.cleanup();
    }
  });

  test("a cache event between layout removal and passive unsubscribe starts no old-visit work", async () => {
    let observedBroadcasts = 0;
    const unsubscribeObserver = subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.customScreenDetail("screen-1")) observedBroadcasts += 1;
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const view = mountLayoutRemovalRace("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      const loadsBeforeRemoval = loadSpy.mock.calls.length;
      assistantSetSpy.mockClear();
      view.removeEditor(true);
      await flushMountedEditor();

      expect(observedBroadcasts).toBe(1);
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeRemoval);
      expect(assistantSetSpy).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      unsubscribeObserver();
      view.cleanup();
      consoleError.mockRestore();
    }
  });

  test("promise settlement in the route-render to passive-cleanup window has no old-visit authority", async () => {
    const cases = [
      { operation: "hydrate" as const, outcome: "resolve" as const },
      { operation: "hydrate" as const, outcome: "reject" as const },
      { operation: "save" as const, outcome: "resolve" as const },
      { operation: "save" as const, outcome: "reject" as const },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `layout-settlement-${testCase.operation}-${testCase.outcome}-${index}`;
      const baseline = makeMountedScreen(screenId, `Layout settlement ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const hydration = deferred<CustomScreenRecord | null>();
      const save = deferred<CustomScreenRecord>();
      let savePayload: Parameters<typeof customScreensClient.updateCustomScreen>[1] | null = null;
      if (testCase.operation === "hydrate") {
        queueScreenLoad(screenId, hydration);
      } else {
        queueScreenUpdate(save);
      }
      const settleAfterRemoval = () => {
        if (testCase.operation === "hydrate") {
          if (testCase.outcome === "resolve") {
            hydration.resolve(makeMountedScreen(screenId, `Layout-window hydration ${index}`));
          } else {
            hydration.reject(new Error(`Layout-window hydration failure ${index}`));
          }
          return;
        }
        if (testCase.outcome === "resolve") {
          if (!savePayload) throw new Error("Layout-window save payload was unavailable");
          save.resolve(recordFromPayload(baseline, savePayload));
        } else {
          save.reject(new Error(`Layout-window save failure ${index}`));
        }
      };
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const view = mountLayoutRemovalRace(
        `/admin/advanced/custom-screens/${screenId}`,
        settleAfterRemoval
      );

      try {
        await flushMountedEditor();
        if (testCase.operation === "save") {
          await editScreenName(view.container, `Layout-window draft ${index}`);
          saveScreen(view.container);
          await flushMountedEditor();
          savePayload = updateSpy.mock.calls.at(-1)?.[1] ?? null;
          if (!savePayload) throw new Error("Layout-window save payload was not captured");
        }
        if (testCase.operation === "hydrate") {
          assertDeferredOwningCall(hydration);
        } else {
          assertDeferredOwningCall(save);
        }
        const assistantCallsBeforeRemoval = assistantSetSpy.mock.calls.length;
        const loadsBeforeRemoval = loadSpy.mock.calls.length;

        view.removeEditor();
        await flushMountedEditor();

        expect(view.container.querySelector('[data-screen-authoring-canvas="true"]')).toBeNull();
        expect(assistantSetSpy.mock.calls.length).toBe(assistantCallsBeforeRemoval);
        expect(loadSpy.mock.calls.length).toBe(loadsBeforeRemoval);
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        view.cleanup();
        consoleError.mockRestore();
      }
    }
  });

  test("late hydration and save settlements after unmount cannot commit or restart work", async () => {
    const cases = [
      { operation: "hydrate" as const, outcome: "resolve" as const },
      { operation: "hydrate" as const, outcome: "reject" as const },
      { operation: "save" as const, outcome: "resolve" as const },
      { operation: "save" as const, outcome: "reject" as const },
    ];

    for (const [index, testCase] of cases.entries()) {
      const screenId = `unmount-${testCase.operation}-${testCase.outcome}-${index}`;
      const baseline = makeMountedScreen(screenId, `Unmount baseline ${index}`);
      cachedScreens.set(screenId, baseline);
      remoteScreens.set(screenId, baseline);
      const hydration = deferred<CustomScreenRecord | null>();
      const save = deferred<CustomScreenRecord>();
      if (testCase.operation === "hydrate") {
        queueScreenLoad(screenId, hydration);
      } else {
        queueScreenUpdate(save);
      }
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);
      let mounted = true;

      try {
        await flushMountedEditor();
        let savePayload: Parameters<typeof customScreensClient.updateCustomScreen>[1] | null = null;
        if (testCase.operation === "save") {
          await editScreenName(view.container, `Unmount save ${index}`);
          saveScreen(view.container);
          await flushMountedEditor();
          savePayload = updateSpy.mock.calls.at(-1)?.[1] ?? null;
          if (!savePayload) throw new Error("Unmount-save payload was not captured");
        }

        view.cleanup();
        mounted = false;
        const assistantCallsAfterUnmount = assistantSetSpy.mock.calls.length;
        const loadCallsAfterUnmount = loadSpy.mock.calls.length;

        if (testCase.operation === "hydrate") {
          if (testCase.outcome === "resolve") {
            await resolveDeferred(
              hydration,
              makeMountedScreen(screenId, `Late hydration ${index}`)
            );
          } else {
            await rejectDeferred(hydration, new Error(`Late hydration failure ${index}`));
          }
        } else if (testCase.outcome === "resolve") {
          if (!savePayload) throw new Error("Unmount-save payload became unavailable");
          await resolveDeferred(save, recordFromPayload(baseline, savePayload));
        } else {
          await rejectDeferred(save, new Error(`Late save failure ${index}`));
        }

        expect(assistantSetSpy.mock.calls.length).toBe(assistantCallsAfterUnmount);
        expect(loadSpy.mock.calls.length).toBe(loadCallsAfterUnmount);
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        if (mounted) view.cleanup();
        consoleError.mockRestore();
      }
    }
  });
});
