// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import {
  advanceBuilderDraftGeneration,
  getBuilderExternalRevisionSaveError,
  runBuilderManualRefresh,
} from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
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
  createQueue,
  updateQueue,
  queueScreenLoad,
  queueScreenCreate,
  queueScreenUpdate,
  mountedContentType,
  makeMountedScreen,
  recordFromPayload,
  mountEditor,
  flushMountedEditor,
  deferred,
  resolveDeferred,
  rejectDeferred,
  clickElement,
  findButton,
  getScreenNameInput,
  editScreenName,
  chooseScreenContentType,
  saveScreen,
  getAlertDescription,
  currentPath,
} = harness;

let loadSpy: ReturnType<typeof vi.spyOn>;
let createSpy: ReturnType<typeof vi.spyOn>;
let updateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  ({ loadSpy, createSpy, updateSpy } = harness.setup());
});

afterEach(() => {
  harness.cleanup();
});

describe("CustomScreenEditorPage route, draft, hydration, and save authority", () => {
  test("advanceBuilderDraftGeneration is the production monotonic transition", () => {
    expect(advanceBuilderDraftGeneration(0)).toBe(1);
    expect(advanceBuilderDraftGeneration(41)).toBe(42);
  });

  test("manual refresh and external-revision save helpers enforce their production branches", () => {
    const refresh = vi.fn();
    expect(runBuilderManualRefresh({ saveActive: true, refresh })).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(runBuilderManualRefresh({ saveActive: false, refresh })).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(getBuilderExternalRevisionSaveError(false)).toBeNull();
    expect(getBuilderExternalRevisionSaveError(true)).toBe(
      "Refresh the newer Screen version before saving."
    );
  });

  test("local Screen mutations have one static dirty-generation owner", () => {
    const persistenceSource = readFileSync(
      resolve(
        process.cwd(),
        "core/admin/ui/custom-screens/hooks/useCustomScreenEditorPersistence.ts"
      ),
      "utf8"
    );
    const documentActionsSource = readFileSync(
      resolve(
        process.cwd(),
        "core/admin/ui/custom-screens/hooks/useCustomScreenDocumentActions.ts"
      ),
      "utf8"
    );
    const routeSessionSource = readFileSync(
      resolve(process.cwd(), "core/admin/ui/custom-screens/CustomScreenEditorRouteSession.tsx"),
      "utf8"
    );

    const updateDefinitionStart = persistenceSource.indexOf("const updateDefinition = useCallback");
    const updateDefinitionEnd = persistenceSource.indexOf(
      "const applyScreenFieldsAndDefinition = useCallback",
      updateDefinitionStart
    );
    expect(updateDefinitionStart).toBeGreaterThanOrEqual(0);
    expect(updateDefinitionEnd).toBeGreaterThan(updateDefinitionStart);
    const updateDefinitionSource = persistenceSource.slice(
      updateDefinitionStart,
      updateDefinitionEnd
    );
    expect(updateDefinitionSource.match(/markDirty\(/g)).toHaveLength(1);

    const updateEditorViewStart = documentActionsSource.indexOf("const updateEditorView = (");
    const updateEditorViewEnd = documentActionsSource.indexOf(
      "const handleSelectBlock = ",
      updateEditorViewStart
    );
    expect(updateEditorViewStart).toBeGreaterThanOrEqual(0);
    expect(updateEditorViewEnd).toBeGreaterThan(updateEditorViewStart);
    const updateEditorViewSource = documentActionsSource.slice(
      updateEditorViewStart,
      updateEditorViewEnd
    );
    expect(updateEditorViewSource.match(/updateDefinition\(/g)).toHaveLength(1);
    expect(updateEditorViewSource).not.toContain("markDirty(");
    expect(updateEditorViewSource).not.toContain("draftMutationGenerationRef.current");

    const orphanRemovalStart = documentActionsSource.indexOf("const handleRemoveOrphanBindings");
    const orphanRemovalEnd = documentActionsSource.indexOf("return {", orphanRemovalStart);
    expect(orphanRemovalStart).toBeGreaterThanOrEqual(0);
    expect(orphanRemovalEnd).toBeGreaterThan(orphanRemovalStart);
    const orphanRemovalSource = documentActionsSource.slice(orphanRemovalStart, orphanRemovalEnd);
    expect(orphanRemovalSource).not.toContain("markDirty(");
    expect(orphanRemovalSource).not.toContain("updateDefinition(");
    expect(orphanRemovalSource).not.toContain("draftMutationGenerationRef.current");
    expect(orphanRemovalSource.match(/updateEditorView\(\{/g)).toHaveLength(1);

    const handlerNames = [
      "handleAddBlock",
      "handleDragMove",
      "handleAddSection",
      "handleRenameSection",
      "handleMoveSection",
      "handleDeleteSection",
      "handleMoveBlock",
      "handleDuplicateBlock",
      "handleDeleteBlock",
      "handlePatchBlock",
      "handlePatchSection",
      "handlePatchBlockData",
      "handlePatchBinding",
    ] as const;
    const handlerBoundaries = [...handlerNames, "handleRemoveOrphanBindings"];
    for (const [index, handlerName] of handlerNames.entries()) {
      const handlerStart = documentActionsSource.indexOf(`const ${handlerName}`);
      const handlerEnd = documentActionsSource.indexOf(
        `const ${handlerBoundaries[index + 1]}`,
        handlerStart
      );
      expect(handlerStart, `${handlerName} start`).toBeGreaterThanOrEqual(0);
      expect(handlerEnd, `${handlerName} end`).toBeGreaterThan(handlerStart);
      const handlerSource = documentActionsSource.slice(handlerStart, handlerEnd);
      expect(handlerSource, handlerName).not.toContain("markDirty(");
      expect(handlerSource, handlerName).not.toContain("updateDefinition(");
      expect(handlerSource, handlerName).not.toContain("draftMutationGenerationRef.current");
      expect(handlerSource.match(/updateEditorView\(\{/g), handlerName).toHaveLength(
        handlerName === "handlePatchBinding" ? 2 : 1
      );
    }

    const metadataHandlersStart = routeSessionSource.indexOf("const changeName = ");
    const metadataHandlersEnd = routeSessionSource.indexOf(
      "const previewOwnerKey = ",
      metadataHandlersStart
    );
    expect(metadataHandlersStart).toBeGreaterThanOrEqual(0);
    expect(metadataHandlersEnd).toBeGreaterThan(metadataHandlersStart);
    const metadataHandlers = routeSessionSource.slice(metadataHandlersStart, metadataHandlersEnd);
    const metadataPaths = [
      /if \(next === name \|\| !persistence\.markDirty\(\)\) return;\s*setName\(next\);/g,
      /if \(next === contentTypeId \|\| !persistence\.markDirty\(\)\) return;\s*setContentTypeId\(next\);/g,
      /if \(next === status \|\| !persistence\.markDirty\(\)\) return;\s*setStatus\(next\);/g,
      /if \(next === showInSidebar \|\| !persistence\.markDirty\(\)\) return;\s*setShowInSidebar\(next\);/g,
      /if \(next === sidebarLabel \|\| !persistence\.markDirty\(\)\) return;\s*setSidebarLabel\(next\);/g,
    ];
    for (const path of metadataPaths) {
      expect(metadataHandlers.match(path)).toHaveLength(1);
    }
    expect(metadataHandlers.match(/persistence\.markDirty\(\)/g)).toHaveLength(
      metadataPaths.length
    );
    expect(metadataHandlers).not.toContain("updateDefinition(");
    expect(metadataHandlers).not.toContain("draftMutationGenerationRef.current");

    const manualRefreshStart = persistenceSource.indexOf(
      "const requestExternalRefresh = useCallback"
    );
    const manualRefreshEnd = persistenceSource.indexOf(
      "const discardLocalDraftAndRefresh = useCallback",
      manualRefreshStart
    );
    expect(manualRefreshStart).toBeGreaterThanOrEqual(0);
    expect(manualRefreshEnd).toBeGreaterThan(manualRefreshStart);
    const manualRefreshSource = persistenceSource.slice(manualRefreshStart, manualRefreshEnd);
    expect(manualRefreshSource.match(/runBuilderManualRefresh\(/g)).toHaveLength(1);

    const saveStart = persistenceSource.indexOf("const handleSave = async");
    const saveEnd = persistenceSource.indexOf(
      "const invalidateBuilderVisitForDiscard = useCallback",
      saveStart
    );
    expect(saveStart).toBeGreaterThanOrEqual(0);
    expect(saveEnd).toBeGreaterThan(saveStart);
    const saveSource = persistenceSource.slice(saveStart, saveEnd);
    expect(saveSource.match(/getBuilderExternalRevisionSaveError\(/g)).toHaveLength(1);
    const externalRevisionGuardStart = saveSource.indexOf("const externalRevisionError");
    const externalRevisionGuardEnd = saveSource.indexOf(
      "const trimmedName",
      externalRevisionGuardStart
    );
    expect(externalRevisionGuardStart).toBeGreaterThanOrEqual(0);
    expect(externalRevisionGuardEnd).toBeGreaterThan(externalRevisionGuardStart);
    const externalRevisionGuardSource = saveSource.slice(
      externalRevisionGuardStart,
      externalRevisionGuardEnd
    );
    expect(externalRevisionGuardSource).not.toContain("screenHydrationGenerationRef.current");
    expect(externalRevisionGuardSource).not.toContain("setLoadActivityVisit");
  });

  test("block boundary moves stay clean and persist across top-level, children, and slot siblings", async () => {
    for (const kind of ["top-level", "children", "slot"] as const) {
      const screenId = `screen-block-order-${kind}`;
      const baseline = makeMountedScreen(screenId, `Block order ${kind}`);
      const definition = baseline.definition;
      const firstSection = definition?.editorView.document.sections[0];
      if (!definition || !firstSection) throw new Error("Block-order fixture is invalid");
      const actions = [
        {
          id: `${kind}-button-1`,
          type: "button",
          data: { label: "First action", action: "link", href: "/first-target" },
        },
        {
          id: `${kind}-button-2`,
          type: "button",
          data: { label: "Second action", action: "link", href: "/second-target" },
        },
      ];
      const blocks =
        kind === "top-level"
          ? actions
          : [
              {
                id: `${kind}-parent`,
                type: "field-group",
                data: { title: `${kind} parent`, description: "" },
                ...(kind === "children" ? { children: actions } : { slots: { content: actions } }),
              },
            ];
      const orderedScreen: CustomScreenRecord = {
        ...baseline,
        definition: {
          ...definition,
          editorView: {
            ...definition.editorView,
            document: {
              ...definition.editorView.document,
              sections: [{ ...firstSection, blocks }],
            },
          },
        },
      };
      cachedScreens.set(screenId, orderedScreen);
      remoteScreens.set(screenId, orderedScreen);
      const updateCallsBefore = updateSpy.mock.calls.length;
      const view = mountEditor(`/admin/advanced/custom-screens/${screenId}`);

      try {
        await flushMountedEditor();
        const selectLayer = async (blockId: string) => {
          clickElement(view.container.querySelector('button[aria-label="Layers"]'));
          await flushMountedEditor();
          clickElement(view.container.querySelector(`[data-authoring-layer-node="${blockId}"]`));
          await flushMountedEditor();
        };
        await selectLayer(`${kind}-button-1`);
        await flushMountedEditor();
        clickElement(view.container.querySelector('button[aria-label="Move selected block up"]'));
        await flushMountedEditor();
        expect(view.container.textContent).not.toContain("Unsaved changes");

        await selectLayer(`${kind}-button-2`);
        clickElement(view.container.querySelector('button[aria-label="Move selected block down"]'));
        await flushMountedEditor();
        expect(view.container.textContent).not.toContain("Unsaved changes");

        clickElement(view.container.querySelector('button[aria-label="Move selected block up"]'));
        await flushMountedEditor();
        expect(view.container.textContent).toContain("Unsaved changes");

        saveScreen(view.container);
        await flushMountedEditor();
        expect(updateSpy).toHaveBeenCalledTimes(updateCallsBefore + 1);
        const savedTopLevel =
          updateSpy.mock.calls.at(-1)?.[1].definition?.editorView.document.sections[0]?.blocks;
        const savedSiblings =
          kind === "top-level"
            ? savedTopLevel
            : kind === "children"
              ? savedTopLevel?.[0]?.children
              : savedTopLevel?.[0]?.slots?.content;
        expect(savedSiblings?.map((block: { id: string }) => block.id)).toEqual([
          `${kind}-button-2`,
          `${kind}-button-1`,
        ]);
        expect(view.container.textContent).not.toContain("Unsaved changes");
      } finally {
        view.cleanup();
      }
    }
  });

  test("clean navigation proceeds, while dirty navigation guards beforeunload and preserves cancel/confirm semantics", async () => {
    const clean = mountEditor("/admin/advanced/custom-screens/screen-1");
    await flushMountedEditor();
    clickElement(clean.container.querySelector("[data-navigate-screen-two]"));
    await flushMountedEditor();
    expect(currentPath(clean.container)).toBe("/admin/advanced/custom-screens/screen-2");
    expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    clean.cleanup();

    const dirty = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(dirty.container, "Locally edited Screen");
      expect(dirty.container.textContent).toContain("Unsaved changes");

      const beforeUnload = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(beforeUnload);
      expect(beforeUnload.defaultPrevented).toBe(true);

      clickElement(dirty.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(document.body.textContent).toContain("Discard unsaved Screen changes?");

      clickElement(findButton(document, "Keep editing"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-1");
      expect(getScreenNameInput(dirty.container)?.value).toBe("Locally edited Screen");

      clickElement(dirty.container.querySelector("[data-navigate-screen-two]"));
      await flushMountedEditor();
      clickElement(findButton(document, "Discard and continue"));
      await flushMountedEditor();
      expect(currentPath(dirty.container)).toBe("/admin/advanced/custom-screens/screen-2");
      expect(dirty.container.textContent).toContain("Screen two baseline");
      expect(dirty.container.textContent).not.toContain("Locally edited Screen");
    } finally {
      dirty.cleanup();
    }
  });

  test("query/hash-only navigation preserves the dirty draft and mounted visit without prompting", async () => {
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");
    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Query-safe draft");
      const loadsBeforeNavigation = loadSpy.mock.calls.length;
      clickElement(view.container.querySelector("[data-navigate-query]"));
      await flushMountedEditor();
      expect(currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/screen-1?panel=settings#name"
      );
      expect(getScreenNameInput(view.container)?.value).toBe("Query-safe draft");
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeNavigation);
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("existing update failure keeps the draft dirty and an exact retry clears it without self-cache hydration", async () => {
    const failedUpdate = deferred<CustomScreenRecord>();
    queueScreenUpdate(failedUpdate);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Locally updated Screen");
      const loadsBeforeSave = loadSpy.mock.calls.length;

      saveScreen(view.container);
      await flushMountedEditor();
      expect(view.container.textContent).toContain("Saving...");

      await rejectDeferred(
        failedUpdate,
        new ApiClientError("custom_screen_invalid", "Screen save rejected", 422, {
          fields: ["name"],
        })
      );
      expect(getAlertDescription(view.container, "Custom screen error")).toBe(
        "Screen save rejected (field(s): name)"
      );
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(getScreenNameInput(view.container)?.value).toBe("Locally updated Screen");
      expect(updateSpy.mock.calls[0]?.[0]).toBe("screen-1");

      updateQueue.push(
        Promise.resolve({
          ...makeMountedScreen("screen-1", "Locally updated Screen"),
          warnings: [
            {
              code: "binding_field_removed",
              fields: ["legacyUrl", "secondaryUrl", "legacyUrl"],
            },
          ],
        })
      );
      saveScreen(view.container);
      await flushMountedEditor();
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy.mock.calls[1]?.[0]).toBe("screen-1");
      expect(updateSpy.mock.calls[1]?.[1].name).toBe("Locally updated Screen");
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(view.container.textContent).not.toContain("Screen save rejected");
      expect(getAlertDescription(view.container, "Binding cleanup")).toBe(
        "Removed binding(s) for deleted field(s): legacyUrl, secondaryUrl."
      );
      expect(loadSpy).toHaveBeenCalledTimes(loadsBeforeSave);
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
    } finally {
      view.cleanup();
    }
  });

  test("exact create saves once and opens the canonical encoded Screen editor without a discard prompt", async () => {
    const created = makeMountedScreen("created / screen", "Created Screen");
    createQueue.push(Promise.resolve(created));
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Created Screen");
      await chooseScreenContentType(view.container);
      expect(view.container.textContent).toContain("Unsaved changes");

      saveScreen(view.container);
      await flushMountedEditor();

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy.mock.calls[0]?.[0]).toMatchObject({
        name: "Created Screen",
        contentTypeId: mountedContentType.id,
      });
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe(
        "/admin/advanced/custom-screens/created%20%2F%20screen"
      );
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("an edit during an existing update preserves the newer local draft and bounded notice", async () => {
    const pendingUpdate = deferred<CustomScreenRecord>();
    queueScreenUpdate(pendingUpdate);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Server-bound update");
      saveScreen(view.container);
      await flushMountedEditor();
      const capturedPayload = updateSpy.mock.calls[0]?.[1];
      expect(capturedPayload).toBeDefined();
      if (!capturedPayload) throw new Error("Update payload was not captured");

      await editScreenName(view.container, "Newer local Screen draft");
      await resolveDeferred(
        pendingUpdate,
        recordFromPayload(makeMountedScreen("screen-1"), capturedPayload)
      );

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("screen-1");
      expect(getScreenNameInput(view.container)?.value).toBe("Newer local Screen draft");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Saved server version; newer local changes remain unsaved."
      );
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/screen-1");
    } finally {
      view.cleanup();
    }
  });

  test("a stale create stores its ID and an exact retry PATCHes once before canonical navigation", async () => {
    const pendingCreate = deferred<CustomScreenRecord>();
    queueScreenCreate(pendingCreate);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "First create payload");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();

      await editScreenName(view.container, "Newer create draft");
      await resolveDeferred(
        pendingCreate,
        makeMountedScreen("created-retry", "First create payload")
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).not.toHaveBeenCalled();
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      expect(getScreenNameInput(view.container)?.value).toBe("Newer create draft");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Saved server version; newer local changes remain unsaved."
      );

      saveScreen(view.container);
      await flushMountedEditor();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("created-retry");
      expect(updateSpy.mock.calls[0]?.[1].name).toBe("Newer create draft");
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/created-retry");
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(document.body.textContent).not.toContain("Discard unsaved Screen changes?");
    } finally {
      view.cleanup();
    }
  });

  test("a failed stale-create PATCH retry stays dirty and never navigates", async () => {
    const pendingCreate = deferred<CustomScreenRecord>();
    queueScreenCreate(pendingCreate);
    const failedRetry = deferred<CustomScreenRecord>();
    queueScreenUpdate(failedRetry);
    const view = mountEditor("/admin/advanced/custom-screens/new");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Create before retry");
      await chooseScreenContentType(view.container);
      saveScreen(view.container);
      await flushMountedEditor();
      await editScreenName(view.container, "Retry remains local");
      await resolveDeferred(
        pendingCreate,
        makeMountedScreen("created-failed-retry", "Create before retry")
      );

      saveScreen(view.container);
      await flushMountedEditor();
      await rejectDeferred(
        failedRetry,
        new ApiClientError("custom_screen_conflict", "Retry rejected", 409)
      );

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy.mock.calls[0]?.[0]).toBe("created-failed-retry");
      expect(currentPath(view.container)).toBe("/admin/advanced/custom-screens/new");
      expect(getScreenNameInput(view.container)?.value).toBe("Retry remains local");
      expect(view.container.textContent).toContain("Retry rejected");
      expect(view.container.textContent).toContain("Unsaved changes");
    } finally {
      view.cleanup();
    }
  });

  test("a hydration that resolves after a local edit preserves the draft and shows only the remote-update warning", async () => {
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Local draft during hydration");
      await resolveDeferred(pendingLoad, makeMountedScreen("screen-1", "Remote hydration result"));

      expect(getScreenNameInput(view.container)?.value).toBe("Local draft during hydration");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain("Newer changes are available");
      expect(view.container.textContent).not.toContain("Remote hydration result");
      expect(view.container.textContent).not.toContain("Failed to load custom screen.");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
    } finally {
      view.cleanup();
    }
  });

  test("a hydration rejection after a local edit uses the bounded local-copy error", async () => {
    const pendingLoad = deferred<CustomScreenRecord | null>();
    queueScreenLoad("screen-1", pendingLoad);
    const view = mountEditor("/admin/advanced/custom-screens/screen-1");

    try {
      await flushMountedEditor();
      await editScreenName(view.container, "Local draft before rejection");
      await rejectDeferred(pendingLoad, new Error("remote transport detail"));

      expect(getScreenNameInput(view.container)?.value).toBe("Local draft before rejection");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(view.container.textContent).toContain(
        "Could not check for Screen updates. Local changes are unchanged."
      );
      expect(view.container.textContent).not.toContain("remote transport detail");
      expect(view.container.textContent).not.toContain("Loading custom screen...");
    } finally {
      view.cleanup();
    }
  });
});
