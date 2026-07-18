import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  createCustomScreen,
  getCustomScreenCached,
  updateCustomScreen,
  type CustomScreenRecord,
  type CustomScreenStatus,
} from "@/services/customScreensClient";
import { listContentTypesCached, type ContentTypeSummary } from "@/services/contentTypesClient";
import { clearActiveAssistantSurfaceContext } from "@/ui/assistant/activeSurfaceContext";
import {
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "@/utils/cacheBus";
import type { CustomScreenDefinition } from "../../../../services/customScreens/customScreenSchemas";
import { buildCustomScreenEditorPath } from "../routeParams";
import {
  advanceBuilderDraftGeneration,
  buildScreenEditorSaveNotice,
  formatScreenEditorApiSaveError,
  getBuilderExternalRevisionSaveError,
  normalizeScreenEditorText,
  resolveScreenEditorDefinition,
  resolveScreenEditorInitialSelection,
  runBuilderManualRefresh,
  type BuilderLoadToken,
  type BuilderRouteMessage,
  type BuilderRouteVisit,
  type BuilderSaveToken,
} from "../customScreenEditorModel";

type Setter<T> = Dispatch<SetStateAction<T>>;

type EditorIdentity = {
  routeKey: string;
  routeVisit: BuilderRouteVisit;
  screenId: string | null;
  isCreateMode: boolean;
};

type EditorDraft = {
  screen: CustomScreenRecord | null;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  showInSidebar: boolean;
  sidebarLabel: string;
  definition: CustomScreenDefinition;
  setContentTypes: Setter<ContentTypeSummary[]>;
  setScreen: Setter<CustomScreenRecord | null>;
  setName: Setter<string>;
  setContentTypeId: Setter<string>;
  setStatus: Setter<CustomScreenStatus>;
  setShowInSidebar: Setter<boolean>;
  setSidebarLabel: Setter<string>;
  setDefinition: Setter<CustomScreenDefinition>;
  setSelectedId: Setter<string | null>;
  setSelectedSectionId: Setter<string | null>;
  setHasUnsavedChanges: Setter<boolean>;
  setPreviewOpen: Setter<boolean>;
};

type EditorCommits = {
  committedScreenVisit: BuilderRouteVisit | null;
  setCommittedScreenVisit: Setter<BuilderRouteVisit | null>;
  setLoadActivityVisit: Setter<BuilderRouteVisit | null>;
  setSaveActivityVisit: Setter<BuilderRouteVisit | null>;
  setErrorCommit: Setter<BuilderRouteMessage | null>;
  setSaveNoticeCommit: Setter<BuilderRouteMessage | null>;
  setExternalWarningVisit: Setter<BuilderRouteVisit | null>;
  setExternalRevisionVisit: Setter<BuilderRouteVisit | null>;
  setExternalRefreshConfirmOpen: Setter<boolean>;
};

export type CustomScreenEditorPersistenceInput = {
  identity: EditorIdentity;
  draft: EditorDraft;
  commits: EditorCommits;
  navigate: (href: string, options?: { replace?: boolean; skipBlockers?: boolean }) => void;
};

export function useCustomScreenEditorPersistence({
  identity,
  draft,
  commits,
  navigate,
}: CustomScreenEditorPersistenceInput) {
  const { routeKey, routeVisit, screenId, isCreateMode } = identity;
  const {
    screen,
    name,
    contentTypeId,
    status,
    showInSidebar,
    sidebarLabel,
    definition,
    setContentTypes,
    setScreen,
    setName,
    setContentTypeId,
    setStatus,
    setShowInSidebar,
    setSidebarLabel,
    setDefinition,
    setSelectedId,
    setSelectedSectionId,
    setHasUnsavedChanges,
    setPreviewOpen,
  } = draft;
  const {
    committedScreenVisit,
    setCommittedScreenVisit,
    setLoadActivityVisit,
    setSaveActivityVisit,
    setErrorCommit,
    setSaveNoticeCommit,
    setExternalWarningVisit,
    setExternalRevisionVisit,
    setExternalRefreshConfirmOpen,
  } = commits;

  const definitionRef = useRef(definition);
  const builderDirtyRef = useRef(false);
  const draftMutationGenerationRef = useRef(0);
  const screenHydrationGenerationRef = useRef(0);
  const screenSaveGenerationRef = useRef(0);
  const externalScreenEventGenerationRef = useRef(0);
  const externalUpdateUnresolvedRef = useRef(false);
  const activeScreenSaveTokenRef = useRef<BuilderSaveToken | null>(null);
  const persistedScreenTargetRef = useRef<{
    routeVisit: BuilderRouteVisit;
    routeGeneration: number;
    id: string;
  } | null>(null);
  const mountedRef = useRef(true);
  const routeGenerationRef = useRef(0);

  useLayoutEffect(() => {
    mountedRef.current = true;
    routeGenerationRef.current += 1;
    return () => {
      clearActiveAssistantSurfaceContext();
      activeScreenSaveTokenRef.current = null;
      externalUpdateUnresolvedRef.current = false;
      persistedScreenTargetRef.current = null;
      mountedRef.current = false;
      routeGenerationRef.current += 1;
      screenHydrationGenerationRef.current += 1;
      screenSaveGenerationRef.current += 1;
    };
  }, [routeVisit]);

  const markDirty = useCallback(() => {
    if (committedScreenVisit !== routeVisit) return false;
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = true;
    setHasUnsavedChanges(true);
    setErrorCommit(null);
    setSaveNoticeCommit(null);
    return true;
  }, [committedScreenVisit, routeVisit, setErrorCommit, setHasUnsavedChanges, setSaveNoticeCommit]);

  const updateDefinition = useCallback(
    (next: CustomScreenDefinition) => {
      if (next === definitionRef.current) return false;
      if (!markDirty()) return false;
      definitionRef.current = next;
      setDefinition(next);
      return true;
    },
    [markDirty, setDefinition]
  );

  const applyScreenFieldsAndDefinition = useCallback(
    (record: CustomScreenRecord) => {
      const nextDefinition = resolveScreenEditorDefinition(record);
      const nextSelection = resolveScreenEditorInitialSelection(nextDefinition.editorView.document);
      definitionRef.current = nextDefinition;
      setScreen(record);
      setName(record.name);
      setContentTypeId(record.contentTypeId);
      setStatus(record.status);
      setShowInSidebar(record.showInSidebar ?? false);
      setSidebarLabel(record.sidebarLabel ?? "");
      setDefinition(nextDefinition);
      setSelectedId(nextSelection.blockId);
      setSelectedSectionId(nextSelection.sectionId);
    },
    [
      setContentTypeId,
      setDefinition,
      setName,
      setScreen,
      setSelectedId,
      setSelectedSectionId,
      setShowInSidebar,
      setSidebarLabel,
      setStatus,
    ]
  );

  const resetBuilderDraftAuthority = useCallback(() => {
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = false;
    setHasUnsavedChanges(false);
  }, [setHasUnsavedChanges]);

  const applyPersistedScreen = useCallback(
    (
      record: CustomScreenRecord,
      acceptedRouteVisit: BuilderRouteVisit,
      source: "load" | "save",
      preserveExternalWarning = false
    ) => {
      applyScreenFieldsAndDefinition(record);
      resetBuilderDraftAuthority();
      if (source === "load") {
        externalUpdateUnresolvedRef.current = false;
        setExternalRevisionVisit(null);
      }
      if (!preserveExternalWarning) setExternalWarningVisit(null);
      setCommittedScreenVisit(acceptedRouteVisit);
      const notice = source === "save" ? buildScreenEditorSaveNotice(record.warnings) : null;
      setSaveNoticeCommit(
        notice ? { routeVisit: acceptedRouteVisit, kind: "save", message: notice } : null
      );
    },
    [
      applyScreenFieldsAndDefinition,
      resetBuilderDraftAuthority,
      setCommittedScreenVisit,
      setExternalRevisionVisit,
      setExternalWarningVisit,
      setSaveNoticeCommit,
    ]
  );

  const updatePersistedScreenBaselineWithoutReplacingDraft = useCallback(
    (record: CustomScreenRecord, acceptedRouteVisit: BuilderRouteVisit) => {
      setScreen(record);
      setCommittedScreenVisit(acceptedRouteVisit);
    },
    [setCommittedScreenVisit, setScreen]
  );

  const captureScreenLoadToken = useCallback(
    (): BuilderLoadToken => ({
      routeKey,
      routeVisit,
      routeGeneration: routeGenerationRef.current,
      requestGeneration: ++screenHydrationGenerationRef.current,
      draftGeneration: draftMutationGenerationRef.current,
    }),
    [routeKey, routeVisit]
  );

  const isScreenLoadIdentityCurrent = useCallback(
    (token: BuilderLoadToken) =>
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.requestGeneration === screenHydrationGenerationRef.current,
    [routeKey, routeVisit]
  );

  const mayApplyScreenLoad = useCallback(
    (token: BuilderLoadToken) =>
      isScreenLoadIdentityCurrent(token) &&
      token.draftGeneration === draftMutationGenerationRef.current &&
      !builderDirtyRef.current,
    [isScreenLoadIdentityCurrent]
  );

  const didBuilderDraftRemainClean = useCallback(
    (token: BuilderLoadToken) =>
      token.draftGeneration === draftMutationGenerationRef.current && !builderDirtyRef.current,
    []
  );

  const hasCurrentScreenSaveAuthority = useCallback(() => {
    const token = activeScreenSaveTokenRef.current;
    return Boolean(
      token &&
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.saveGeneration === screenSaveGenerationRef.current
    );
  }, [routeKey, routeVisit]);

  const runBackgroundScreenHydration = useCallback(
    async (load: () => Promise<CustomScreenRecord | null>, isActive: () => boolean) => {
      if (!mountedRef.current || !isActive() || hasCurrentScreenSaveAuthority()) return;
      const token = captureScreenLoadToken();
      setLoadActivityVisit(token.routeVisit);
      try {
        const detail = await load();
        if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
        if (hasCurrentScreenSaveAuthority()) return;
        if (!mayApplyScreenLoad(token)) {
          setErrorCommit(null);
          setExternalWarningVisit(token.routeVisit);
          return;
        }
        if (!detail) {
          setErrorCommit({
            routeVisit: token.routeVisit,
            kind: "load",
            message: "Custom screen not found.",
          });
          return;
        }
        applyPersistedScreen(detail, token.routeVisit, "load");
        setErrorCommit(null);
      } catch (loadError) {
        if (!isActive() || !isScreenLoadIdentityCurrent(token)) return;
        if (hasCurrentScreenSaveAuthority()) return;
        setErrorCommit({
          routeVisit: token.routeVisit,
          kind: "load",
          message: didBuilderDraftRemainClean(token)
            ? isApiClientError(loadError)
              ? loadError.message
              : "Failed to load custom screen."
            : "Could not check for Screen updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isScreenLoadIdentityCurrent(token)) {
          setLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
        }
      }
    },
    [
      applyPersistedScreen,
      captureScreenLoadToken,
      didBuilderDraftRemainClean,
      hasCurrentScreenSaveAuthority,
      isScreenLoadIdentityCurrent,
      mayApplyScreenLoad,
      setErrorCommit,
      setExternalWarningVisit,
      setLoadActivityVisit,
    ]
  );

  const refreshScreen = useCallback(
    async (force = true, isActive: () => boolean = () => true) => {
      if (!screenId || isCreateMode) return;
      await runBackgroundScreenHydration(
        () => getCustomScreenCached(screenId, { force }),
        () => mountedRef.current && isActive()
      );
    },
    [isCreateMode, runBackgroundScreenHydration, screenId]
  );

  const requestExternalRefresh = useCallback(() => {
    runBuilderManualRefresh({
      saveActive: hasCurrentScreenSaveAuthority(),
      refresh: () => {
        if (builderDirtyRef.current) {
          setExternalRefreshConfirmOpen(true);
          return;
        }
        void refreshScreen(true);
      },
    });
  }, [hasCurrentScreenSaveAuthority, refreshScreen, setExternalRefreshConfirmOpen]);

  const discardLocalDraftAndRefresh = useCallback(() => {
    if (!screen) return;
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = false;
    screenHydrationGenerationRef.current += 1;
    applyScreenFieldsAndDefinition(screen);
    setHasUnsavedChanges(false);
    setLoadActivityVisit(null);
    setErrorCommit(null);
    setSaveNoticeCommit(null);
    setExternalRefreshConfirmOpen(false);
    void refreshScreen(true);
  }, [
    applyScreenFieldsAndDefinition,
    refreshScreen,
    screen,
    setErrorCommit,
    setExternalRefreshConfirmOpen,
    setHasUnsavedChanges,
    setLoadActivityVisit,
    setSaveNoticeCommit,
  ]);

  const handleCurrentScreenCacheEvent = useCallback(
    (origin: CacheEventOrigin, operationToken?: CacheEventOperationToken) => {
      if (!mountedRef.current) return;
      const activeSave = activeScreenSaveTokenRef.current;
      const saveActive = hasCurrentScreenSaveAuthority();
      const isExactSelfEvent = Boolean(
        saveActive && origin === "local" && operationToken === activeSave?.cacheEventOperationToken
      );
      if (isExactSelfEvent) return;
      externalScreenEventGenerationRef.current += 1;
      externalUpdateUnresolvedRef.current = true;
      setExternalRevisionVisit(routeVisit);
      setExternalWarningVisit(routeVisit);
      if (builderDirtyRef.current || saveActive) return;
      void refreshScreen(true);
    },
    [
      hasCurrentScreenSaveAuthority,
      refreshScreen,
      routeVisit,
      setExternalRevisionVisit,
      setExternalWarningVisit,
    ]
  );

  useEffect(() => {
    let active = true;
    void listContentTypesCached({ force: true })
      .then((items) => {
        if (active && mountedRef.current) setContentTypes(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [setContentTypes]);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (active && mountedRef.current) void refreshScreen(true, () => active);
    });
    return () => {
      active = false;
    };
  }, [isCreateMode, refreshScreen, screenId]);

  useEffect(() => {
    if (isCreateMode || !screenId) return undefined;
    return subscribeCacheEvents((event, origin, operationToken) => {
      if (event.key !== cacheKeys.customScreenDetail(screenId)) return;
      handleCurrentScreenCacheEvent(origin, operationToken);
    });
  }, [handleCurrentScreenCacheEvent, isCreateMode, screenId]);

  const mapBoundedScreenSaveError = (saveError: unknown) => {
    if (!isApiClientError(saveError)) return "Failed to save custom screen.";
    return formatScreenEditorApiSaveError(saveError);
  };

  const captureScreenSaveToken = (): BuilderSaveToken => ({
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration: ++screenSaveGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
    externalEventGeneration: externalScreenEventGenerationRef.current,
    cacheEventOperationToken: createCacheEventOperationToken(),
  });

  const isScreenSaveIdentityCurrent = (token: BuilderSaveToken) =>
    mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    token.routeGeneration === routeGenerationRef.current &&
    token.saveGeneration === screenSaveGenerationRef.current;

  const commitScreenSaveResponse = (saved: CustomScreenRecord, token: BuilderSaveToken) => {
    if (!isScreenSaveIdentityCurrent(token) || activeScreenSaveTokenRef.current !== token) {
      return { mayNavigate: false };
    }
    activeScreenSaveTokenRef.current = null;
    screenHydrationGenerationRef.current += 1;
    setLoadActivityVisit(null);
    setErrorCommit(null);
    const externalEventArrivedDuringSave =
      token.externalEventGeneration !== externalScreenEventGenerationRef.current;
    if (!externalEventArrivedDuringSave) setExternalWarningVisit(null);
    if (token.draftGeneration !== draftMutationGenerationRef.current) {
      if (isCreateMode) {
        persistedScreenTargetRef.current = {
          routeVisit: token.routeVisit,
          routeGeneration: token.routeGeneration,
          id: saved.id,
        };
      }
      updatePersistedScreenBaselineWithoutReplacingDraft(saved, token.routeVisit);
      setSaveNoticeCommit({
        routeVisit: token.routeVisit,
        kind: "save",
        message: "Saved server version; newer local changes remain unsaved.",
      });
      return { mayNavigate: false };
    }
    persistedScreenTargetRef.current = null;
    applyPersistedScreen(saved, token.routeVisit, "save", externalEventArrivedDuringSave);
    return { mayNavigate: true };
  };

  const commitSynchronousSaveValidationError = (message: string) => {
    screenHydrationGenerationRef.current += 1;
    setLoadActivityVisit((current) => (current === routeVisit ? null : current));
    setSaveNoticeCommit(null);
    setErrorCommit({ routeVisit, kind: "save", message });
  };

  const handleSave = async () => {
    if (committedScreenVisit !== routeVisit) return;
    const externalRevisionError = getBuilderExternalRevisionSaveError(
      externalUpdateUnresolvedRef.current
    );
    if (externalRevisionError) {
      setSaveNoticeCommit(null);
      setErrorCommit({ routeVisit, kind: "save", message: externalRevisionError });
      return;
    }
    const trimmedName = normalizeScreenEditorText(name);
    if (!trimmedName) {
      commitSynchronousSaveValidationError("Screen name is required.");
      return;
    }
    if (!contentTypeId) {
      commitSynchronousSaveValidationError("Select a content type before saving.");
      return;
    }

    const token = captureScreenSaveToken();
    activeScreenSaveTokenRef.current = token;
    screenHydrationGenerationRef.current += 1;
    setLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
    setSaveActivityVisit(token.routeVisit);
    setErrorCommit(null);
    setSaveNoticeCommit(null);
    const payload = {
      name: trimmedName,
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel: sidebarLabel.trim() || null,
      definition: definitionRef.current,
    };

    try {
      const capturedTarget = persistedScreenTargetRef.current;
      const targetId =
        screenId && !isCreateMode
          ? screenId
          : capturedTarget?.routeVisit === routeVisit &&
              capturedTarget.routeGeneration === routeGenerationRef.current
            ? capturedTarget.id
            : null;
      const mutationOptions = { cacheEventOperationToken: token.cacheEventOperationToken };
      const saved = targetId
        ? await updateCustomScreen(targetId, payload, mutationOptions)
        : await createCustomScreen(payload, mutationOptions);
      const { mayNavigate } = commitScreenSaveResponse(saved, token);
      if (isCreateMode && mayNavigate) {
        navigate(buildCustomScreenEditorPath({ screenId: saved.id }), { skipBlockers: true });
      }
    } catch (saveError) {
      if (isScreenSaveIdentityCurrent(token)) {
        if (activeScreenSaveTokenRef.current === token) {
          activeScreenSaveTokenRef.current = null;
        }
        setErrorCommit({
          routeVisit: token.routeVisit,
          kind: "save",
          message: mapBoundedScreenSaveError(saveError),
        });
      }
    } finally {
      if (isScreenSaveIdentityCurrent(token)) {
        if (activeScreenSaveTokenRef.current === token) {
          activeScreenSaveTokenRef.current = null;
        }
        setSaveActivityVisit((current) => (current === token.routeVisit ? null : current));
      }
    }
  };

  const invalidateBuilderVisitForDiscard = useCallback(() => {
    draftMutationGenerationRef.current = advanceBuilderDraftGeneration(
      draftMutationGenerationRef.current
    );
    builderDirtyRef.current = false;
    screenHydrationGenerationRef.current += 1;
    screenSaveGenerationRef.current += 1;
    activeScreenSaveTokenRef.current = null;
    externalUpdateUnresolvedRef.current = false;
    persistedScreenTargetRef.current = null;
    setHasUnsavedChanges(false);
    setCommittedScreenVisit(null);
    setLoadActivityVisit(null);
    setSaveActivityVisit(null);
    setErrorCommit(null);
    setExternalWarningVisit(null);
    setExternalRevisionVisit(null);
    setExternalRefreshConfirmOpen(false);
    setSaveNoticeCommit(null);
    setPreviewOpen(false);
    clearActiveAssistantSurfaceContext();
  }, [
    setCommittedScreenVisit,
    setErrorCommit,
    setExternalRefreshConfirmOpen,
    setExternalRevisionVisit,
    setExternalWarningVisit,
    setHasUnsavedChanges,
    setLoadActivityVisit,
    setPreviewOpen,
    setSaveActivityVisit,
    setSaveNoticeCommit,
  ]);

  return {
    markDirty,
    updateDefinition,
    requestExternalRefresh,
    discardLocalDraftAndRefresh,
    invalidateBuilderVisitForDiscard,
    handleSave,
    definitionRef,
  };
}
