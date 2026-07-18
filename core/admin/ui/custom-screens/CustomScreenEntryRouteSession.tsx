import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, type ContentTypeSummary } from "@/services/contentTypesClient";
import {
  getCachedCustomScreen,
  getCachedScreenEntryOverrides,
  replaceScreenEntryOverrides,
  type CustomScreenEntryPresentationOverride,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  createEntry,
  getCachedEntryDetail,
  updateEntry,
  type EntryDetail,
} from "@/services/entriesClient";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { ScreenEntryPresentationOverridePropPath } from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { findScreenBlockById } from "../../../services/customScreens/screenDocumentOps";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import type { ContentField } from "../content-types/SchemaBuilder";

import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import {
  buildEditorViewCreatePayload,
  buildEditorViewUpdatePayload,
  buildInitialEntryDraft,
  hydrateEditorViewDraft,
  resolveEntryFieldErrorsFromApiError,
  validateEntryDraft,
  type CustomScreenEntryDraft,
} from "./customScreenEntryDraft";
import {
  filterRenderableScreenEntryPresentationOverrides,
  normalizePresentationOverrideOrder,
  removePresentationOverridesForBlock,
  resolvePresentationDraftTransition,
  resolvePresentationTarget,
  serializePresentationOverrides,
  upsertPresentationOverride,
} from "./customScreenEntryPresentation";
import {
  emptyEditorView,
  emptyFieldValues,
  preserveSelectedElementAcrossRefresh,
  resolveRuntimeBindings,
  resolveRuntimeDefinition,
  resolveRuntimeDocument,
  resolveRuntimeEditorView,
  type PresentationErrorCommit,
  type RouteMessageCommit,
  type RouteVisit,
} from "./customScreenEntryRuntime";
import { CustomScreenEntryEditorLayout } from "./CustomScreenEntryEditorLayout";
import { useScreenEntryHydration } from "./hooks/useScreenEntryHydration";
import { useScreenEntryPreferences } from "./hooks/useScreenEntryPreferences";
import { useScreenEntryPresentationMedia } from "./hooks/useScreenEntryPresentationMedia";
import { useScreenRelatedEntries } from "./hooks/useScreenRelatedEntries";
import { buildCustomScreenWorkspacePath } from "./routeParams";

const emptyContentFields: ContentField[] = [];
const emptyPresentationOverrides: CustomScreenEntryPresentationOverride[] = [];

export type CustomScreenEntryRouteSessionProps = {
  screenId: string | null;
  entryId: string | null;
  isCreateMode: boolean;
  routeKey: string;
};

export function CustomScreenEntryRouteSession({
  screenId,
  entryId,
  isCreateMode,
  routeKey,
}: CustomScreenEntryRouteSessionProps) {
  const { navigate } = useAdminRouter();
  const [routeVisit] = useState<RouteVisit>(() => Object.freeze({ routeKey }));
  const initialScreen = useMemo(
    () => (screenId ? (getCachedCustomScreen(screenId) ?? null) : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? (getCachedContentTypes()?.find((item) => item.id === initialScreen.contentTypeId) ?? null)
        : null,
    [initialScreen]
  );
  const initialEntry = useMemo(
    () =>
      initialContentType && entryId && !isCreateMode
        ? (getCachedEntryDetail(initialContentType.slug, entryId) ?? null)
        : null,
    [entryId, initialContentType, isCreateMode]
  );
  const initialFields = useMemo(
    () => (initialContentType ? fieldsFromSchema(initialContentType.schema) : []),
    [initialContentType]
  );
  const initialDraft = useMemo<CustomScreenEntryDraft | null>(() => {
    if (!initialScreen || !initialContentType) return null;
    if (isCreateMode) {
      return buildInitialEntryDraft({
        contentType: initialContentType,
        editorView: resolveRuntimeEditorView(initialScreen),
      });
    }
    if (!initialEntry) return null;
    return hydrateEditorViewDraft({
      contentType: initialContentType,
      editorView: resolveRuntimeEditorView(initialScreen),
      entry: initialEntry,
    });
  }, [initialContentType, initialEntry, initialScreen, isCreateMode]);
  const initialCachedOverrides = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? getCachedScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );
  const initialOverrides = initialCachedOverrides ?? [];
  const initialEntryReady = Boolean(
    initialScreen && initialContentType && (isCreateMode || initialEntry)
  );
  const initialOverridesReady = isCreateMode || initialCachedOverrides !== null;

  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [contentType, setContentType] = useState<ContentTypeSummary | null>(initialContentType);
  const [entry, setEntry] = useState<EntryDetail | null>(initialEntry);
  const [fields, setFields] = useState<ContentField[]>(initialFields);
  const [values, setValues] = useState<Record<string, unknown>>(initialDraft?.data ?? {});
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [slug, setSlug] = useState(initialDraft?.slug ?? "");
  const [editableFields, setEditableFields] = useState<string[]>(
    initialDraft?.editableFields ?? []
  );
  const [originalData, setOriginalData] = useState<Record<string, unknown>>(
    initialDraft?.originalData ?? {}
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [committedEntryVisit, setCommittedEntryVisit] = useState<RouteVisit | null>(
    initialEntryReady ? routeVisit : null
  );
  const [committedOverrideVisit, setCommittedOverrideVisit] = useState<RouteVisit | null>(
    initialOverridesReady ? routeVisit : null
  );
  const [entryErrorCommit, setEntryErrorCommit] = useState<RouteMessageCommit | null>(null);
  const [presentationErrorCommit, setPresentationErrorCommit] =
    useState<PresentationErrorCommit | null>(null);
  const [remoteEntryWarningVisit, setRemoteEntryWarningVisit] = useState<RouteVisit | null>(null);
  const [remotePresentationWarningVisit, setRemotePresentationWarningVisit] =
    useState<RouteVisit | null>(null);
  const [entryLoadActivityVisit, setEntryLoadActivityVisit] = useState<RouteVisit | null>(
    initialEntryReady ? null : routeVisit
  );
  const [presentationLoadActivityVisit, setPresentationLoadActivityVisit] =
    useState<RouteVisit | null>(
      !isCreateMode && initialCachedOverrides === null ? routeVisit : null
    );
  const [contentSaveActivityVisit, setContentSaveActivityVisit] = useState<RouteVisit | null>(null);
  const [presentationSaveActivityVisit, setPresentationSaveActivityVisit] =
    useState<RouteVisit | null>(null);
  const [saveNoticeCommit, setSaveNoticeCommit] = useState<RouteMessageCommit | null>(null);
  const [presentationSaveNoticeCommit, setPresentationSaveNoticeCommit] =
    useState<RouteMessageCommit | null>(null);
  const [, setSavedOverrides] = useState(initialOverrides);
  const [draftOverrides, setDraftOverrides] = useState(initialOverrides);
  const [hasUnsavedPresentationChanges, setHasUnsavedPresentationChanges] = useState(false);
  const [selectedRuntimeBlockId, setSelectedRuntimeBlockId] = useState<string | null>(null);
  const { preferences: entryPreferences, setPreferences: setEntryPreferences } =
    useScreenEntryPreferences();
  const [panelOpen, setPanelOpen] = useState(true);
  const [relationTargets, setRelationTargets] = useState<Array<{ slug: string; name: string }>>(
    () => (getCachedContentTypes() ?? []).map((item) => ({ slug: item.slug, name: item.name }))
  );

  const contentDirtyRef = useRef(false);
  const presentationDirtyRef = useRef(false);
  const savedOverridesRef = useRef(initialOverrides);
  const draftOverridesRef = useRef(initialOverrides);
  const draftMutationGenerationRef = useRef(0);
  const entryLoadGenerationRef = useRef(0);
  const overrideLoadGenerationRef = useRef(0);
  const contentSaveGenerationRef = useRef(0);
  const presentationSaveGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const routeGenerationRef = useRef(0);
  const persistedEntryTargetRef = useRef<{
    routeVisit: RouteVisit;
    routeGeneration: number;
    id: string;
  } | null>(null);

  const entryRouteReady = committedEntryVisit === routeVisit;
  const overrideRouteReady = committedOverrideVisit === routeVisit;
  const error = entryErrorCommit?.routeVisit === routeVisit ? entryErrorCommit.message : null;
  const presentationError =
    presentationErrorCommit?.routeVisit === routeVisit ? presentationErrorCommit.message : null;
  const presentationErrorKind =
    presentationErrorCommit?.routeVisit === routeVisit ? presentationErrorCommit.kind : null;
  const remoteUpdatePending = remoteEntryWarningVisit === routeVisit;
  const remotePresentationUpdatePending = remotePresentationWarningVisit === routeVisit;
  const isLoading = entryLoadActivityVisit === routeVisit || (!entryRouteReady && error === null);
  const isPresentationLoading =
    presentationLoadActivityVisit === routeVisit ||
    (!isCreateMode && !overrideRouteReady && presentationError === null);
  const isSaving = contentSaveActivityVisit === routeVisit;
  const isPresentationSaving = presentationSaveActivityVisit === routeVisit;
  const currentSaveNotice =
    saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;
  const currentPresentationSaveNotice =
    presentationSaveNoticeCommit?.routeVisit === routeVisit
      ? presentationSaveNoticeCommit.message
      : null;
  const currentScreen = entryRouteReady ? screen : null;
  const currentContentType = entryRouteReady ? contentType : null;
  const currentEntry = entryRouteReady ? entry : null;
  const currentFields = entryRouteReady ? fields : emptyContentFields;
  const currentDraftOverrides = overrideRouteReady ? draftOverrides : emptyPresentationOverrides;

  const schemaFieldNames = useMemo(
    () => new Set(currentFields.map((field) => field.name)),
    [currentFields]
  );
  const screenCapabilities = useMemo(
    () =>
      currentScreen?.capabilities ??
      resolveCustomScreenCapabilities({
        definition: currentScreen ? resolveRuntimeDefinition(currentScreen) : undefined,
      }),
    [currentScreen]
  );
  const canEditInScreen = screenCapabilities.supportsDedicatedEditor;
  const runtimeDocument = useMemo(() => resolveRuntimeDocument(currentScreen), [currentScreen]);
  const runtimeBindings = useMemo(() => resolveRuntimeBindings(currentScreen), [currentScreen]);
  const renderableOverrides = useMemo(
    () =>
      filterRenderableScreenEntryPresentationOverrides({
        document: runtimeDocument,
        bindings: runtimeBindings,
        fields: currentFields,
        overrides: currentDraftOverrides,
      }),
    [currentDraftOverrides, currentFields, runtimeBindings, runtimeDocument]
  );
  const selectedRuntimeBlock = useMemo(
    () =>
      selectedRuntimeBlockId ? findScreenBlockById(runtimeDocument, selectedRuntimeBlockId) : null,
    [runtimeDocument, selectedRuntimeBlockId]
  );
  const selectedPresentationTarget = useMemo(
    () =>
      resolvePresentationTarget({
        block: selectedRuntimeBlock,
        bindings: runtimeBindings,
        fields: currentFields,
      }),
    [currentFields, runtimeBindings, selectedRuntimeBlock]
  );
  const overrideCacheKey = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? cacheKeys.customScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );

  useEffect(() => {
    if (!currentScreen || !screenId || !entryId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }
    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen: currentScreen,
        blocks: runtimeDocument.sections.flatMap((section) => section.blocks),
        bindings: runtimeBindings,
        capabilities: screenCapabilities,
        selectedBlockId: selectedRuntimeBlockId,
        selectedEntryId: entryId,
        warnings: [
          ...(hasUnsavedChanges ? ["custom_screen_entry_has_unsaved_changes"] : []),
          ...(hasUnsavedPresentationChanges
            ? ["custom_screen_entry_presentation_has_unsaved_changes"]
            : []),
          ...(remoteUpdatePending ? ["custom_screen_entry_remote_update_pending"] : []),
          ...(remotePresentationUpdatePending
            ? ["custom_screen_entry_presentation_remote_update_pending"]
            : []),
        ],
      })
    );
    return () => clearActiveAssistantSurfaceContext();
  }, [
    currentScreen,
    entryId,
    hasUnsavedChanges,
    hasUnsavedPresentationChanges,
    remotePresentationUpdatePending,
    remoteUpdatePending,
    runtimeBindings,
    runtimeDocument.sections,
    screenCapabilities,
    screenId,
    selectedRuntimeBlockId,
  ]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    routeGenerationRef.current += 1;
    return () => {
      clearActiveAssistantSurfaceContext();
      persistedEntryTargetRef.current = null;
      mountedRef.current = false;
      routeGenerationRef.current += 1;
      entryLoadGenerationRef.current += 1;
      overrideLoadGenerationRef.current += 1;
      contentSaveGenerationRef.current += 1;
      presentationSaveGenerationRef.current += 1;
    };
  }, [routeKey]);

  const applyLoadedState = useCallback(
    (
      nextScreen: CustomScreenRecord,
      nextContentType: ContentTypeSummary,
      nextEntry: EntryDetail | null,
      nextContentTypes: ContentTypeSummary[],
      acceptedRouteVisit: RouteVisit
    ) => {
      const nextFields = fieldsFromSchema(nextContentType.schema);
      const editorView = resolveRuntimeEditorView(nextScreen);
      const nextDraft = nextEntry
        ? hydrateEditorViewDraft({ contentType: nextContentType, editorView, entry: nextEntry })
        : buildInitialEntryDraft({ contentType: nextContentType, editorView });
      setScreen(nextScreen);
      setContentType(nextContentType);
      setEntry(nextEntry);
      setFields(nextFields);
      setTitle(nextDraft.title);
      setSlug(nextDraft.slug);
      setValues(nextDraft.data);
      setEditableFields(nextDraft.editableFields);
      setOriginalData(nextDraft.originalData);
      setRelationTargets(nextContentTypes.map((item) => ({ slug: item.slug, name: item.name })));
      setFieldErrors({});
      contentDirtyRef.current = false;
      setHasUnsavedChanges(false);
      setRemoteEntryWarningVisit(null);
      setSelectedRuntimeBlockId((current) =>
        preserveSelectedElementAcrossRefresh({
          selectedBlockId: current,
          nextDocument: resolveRuntimeDocument(nextScreen),
        })
      );
      setEntryErrorCommit(null);
      setCommittedEntryVisit(acceptedRouteVisit);
    },
    []
  );
  const applyAuthoritativePresentationState = useCallback(
    (overrides: CustomScreenEntryPresentationOverride[], acceptedRouteVisit: RouteVisit) => {
      const ordered = normalizePresentationOverrideOrder(overrides);
      savedOverridesRef.current = ordered;
      draftOverridesRef.current = ordered;
      presentationDirtyRef.current = false;
      setSavedOverrides(ordered);
      setDraftOverrides(ordered);
      setHasUnsavedPresentationChanges(false);
      setPresentationErrorCommit(null);
      setRemotePresentationWarningVisit(null);
      setCommittedOverrideVisit(acceptedRouteVisit);
    },
    []
  );

  const markContentMutation = () => {
    if (!entryRouteReady || currentContentType === null) return false;
    draftMutationGenerationRef.current += 1;
    contentDirtyRef.current = true;
    setHasUnsavedChanges(true);
    return true;
  };
  const handleFieldChange = (name: string, value: unknown) => {
    if (!markContentMutation()) return;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setEntryErrorCommit(null);
  };
  const handleTitleChange = (value: string) => {
    if (!markContentMutation()) return;
    setTitle(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.title;
      return next;
    });
    if (schemaFieldNames.has("title")) setValues((current) => ({ ...current, title: value }));
  };
  const handleSlugChange = (value: string) => {
    if (!markContentMutation()) return;
    setSlug(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.slug;
      return next;
    });
    if (schemaFieldNames.has("slug")) setValues((current) => ({ ...current, slug: value }));
  };
  const buildPayloadData = () => {
    const data: Record<string, unknown> = { ...originalData };
    editableFields.forEach((key) => {
      data[key] = values[key];
    });
    if (schemaFieldNames.has("title")) data.title = title;
    if (schemaFieldNames.has("slug")) data.slug = slug;
    return data;
  };
  const canvasFieldValues = useMemo<Record<string, unknown>>(
    () => ({
      ...buildPayloadData(),
      title,
      slug,
      status: currentEntry?.status ?? "draft",
      createdAt: currentEntry?.createdAt ?? null,
      updatedAt: currentEntry?.updatedAt ?? null,
      publishedAt: currentEntry?.publishedAt ?? null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalData, editableFields, values, schemaFieldNames, title, slug, currentEntry]
  );
  const relatedState = useScreenRelatedEntries({
    enabled: entryRouteReady,
    document: runtimeDocument,
    bindings: runtimeBindings,
    values: entryRouteReady ? canvasFieldValues : emptyFieldValues,
    fields: currentFields,
  });
  const relatedEntries: Record<string, RelatedEntrySummary[]> = relatedState.items;
  const presentationMedia = useScreenEntryPresentationMedia({
    routeKey,
    routeVisit,
    document: runtimeDocument,
    bindings: runtimeBindings,
    values: entryRouteReady ? canvasFieldValues : emptyFieldValues,
    overrides: renderableOverrides,
    mountedRef,
  });
  const { refresh, refreshPresentation } = useScreenEntryHydration({
    screenId,
    entryId,
    isCreateMode,
    routeKey,
    routeVisit,
    currentContentTypeSlug: currentContentType?.slug ?? null,
    overrideCacheKey,
    authority: {
      mountedRef,
      routeGenerationRef,
      draftMutationGenerationRef,
      entryLoadGenerationRef,
      overrideLoadGenerationRef,
      contentDirtyRef,
      presentationDirtyRef,
    },
    commit: {
      applyEntry: applyLoadedState,
      applyOverrides: applyAuthoritativePresentationState,
      setEntryError: setEntryErrorCommit,
      setPresentationError: setPresentationErrorCommit,
      setRemoteEntryWarning: setRemoteEntryWarningVisit,
      setRemotePresentationWarning: setRemotePresentationWarningVisit,
      setEntryActivity: setEntryLoadActivityVisit,
      setPresentationActivity: setPresentationLoadActivityVisit,
    },
  });

  const applyPresentationDraftMutation = (
    update: (
      current: readonly CustomScreenEntryPresentationOverride[]
    ) => CustomScreenEntryPresentationOverride[]
  ) => {
    if (!entryRouteReady || !overrideRouteReady || isCreateMode) return false;
    const transition = resolvePresentationDraftTransition({
      saved: savedOverridesRef.current,
      current: draftOverridesRef.current,
      update,
    });
    if (
      serializePresentationOverrides(transition.nextDraft) ===
      serializePresentationOverrides(draftOverridesRef.current)
    ) {
      return false;
    }
    draftMutationGenerationRef.current += 1;
    draftOverridesRef.current = transition.nextDraft;
    presentationDirtyRef.current = transition.dirty;
    setDraftOverrides(transition.nextDraft);
    setHasUnsavedPresentationChanges(transition.dirty);
    return true;
  };
  const clearUnsavedPresentationDraftWithoutPersisting = () => {
    const saved = savedOverridesRef.current;
    draftOverridesRef.current = saved;
    presentationDirtyRef.current = false;
    setDraftOverrides(saved);
    setHasUnsavedPresentationChanges(false);
  };

  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: hasUnsavedChanges || hasUnsavedPresentationChanges,
    title: "Discard unsaved entry changes?",
    description: "Content or presentation changes have not been saved.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: () => {
      contentDirtyRef.current = false;
      presentationDirtyRef.current = false;
      draftMutationGenerationRef.current += 1;
      entryLoadGenerationRef.current += 1;
      overrideLoadGenerationRef.current += 1;
      contentSaveGenerationRef.current += 1;
      presentationSaveGenerationRef.current += 1;
      presentationMedia.invalidate();
      persistedEntryTargetRef.current = null;
      setCommittedEntryVisit(null);
      setCommittedOverrideVisit(null);
      setEntryLoadActivityVisit(null);
      setPresentationLoadActivityVisit(null);
      setContentSaveActivityVisit(null);
      setPresentationSaveActivityVisit(null);
      setEntryErrorCommit(null);
      setPresentationErrorCommit(null);
      setRemoteEntryWarningVisit(null);
      setRemotePresentationWarningVisit(null);
      setSaveNoticeCommit(null);
      setPresentationSaveNoticeCommit(null);
      setHasUnsavedChanges(false);
      clearUnsavedPresentationDraftWithoutPersisting();
    },
  });

  type SaveChannel = "content" | "presentation";
  type SaveToken = {
    channel: SaveChannel;
    routeKey: string;
    routeVisit: RouteVisit;
    routeGeneration: number;
    saveGeneration: number;
    draftGeneration: number;
    createRouteVisit: RouteVisit | null;
  };
  const captureSaveToken = (channel: SaveChannel): SaveToken => ({
    channel,
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration:
      channel === "content"
        ? ++contentSaveGenerationRef.current
        : ++presentationSaveGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
    createRouteVisit: isCreateMode ? routeVisit : null,
  });
  const isSaveIdentityCurrent = (token: SaveToken) => {
    const generation =
      token.channel === "content"
        ? contentSaveGenerationRef.current
        : presentationSaveGenerationRef.current;
    return (
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.saveGeneration === generation
    );
  };
  const isExactSaveDraft = (token: SaveToken) =>
    isSaveIdentityCurrent(token) && token.draftGeneration === draftMutationGenerationRef.current;
  const applySavedEntryAndBaseline = (
    saved: EntryDetail,
    savedContentType: ContentTypeSummary,
    savedScreen: CustomScreenRecord | null
  ) => {
    const savedDraft = hydrateEditorViewDraft({
      contentType: savedContentType,
      editorView: savedScreen ? resolveRuntimeEditorView(savedScreen) : emptyEditorView,
      entry: saved,
    });
    setEntry(saved);
    setTitle(saved.title);
    setSlug(saved.slug);
    setValues(savedDraft.data);
    setEditableFields(savedDraft.editableFields);
    setOriginalData(savedDraft.originalData);
    setFieldErrors({});
  };

  const handleSave = async () => {
    if (!entryRouteReady || !currentContentType || !entryId) return;
    const capturedContentType = currentContentType;
    const capturedScreen = currentScreen;
    const draft: CustomScreenEntryDraft = {
      title,
      slug,
      data: values,
      editableFields,
      originalData,
      fieldErrors,
    };
    const nextFieldErrors = validateEntryDraft({ contentType: capturedContentType, draft });
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setEntryErrorCommit({ routeVisit, message: "Fix the highlighted fields before saving." });
      return;
    }
    const token = captureSaveToken("content");
    setContentSaveActivityVisit(token.routeVisit);
    setEntryErrorCommit(null);
    setFieldErrors({});
    try {
      const capturedTarget = persistedEntryTargetRef.current;
      const targetId = !isCreateMode
        ? entryId
        : capturedTarget?.routeVisit === routeVisit &&
            capturedTarget.routeGeneration === routeGenerationRef.current
          ? capturedTarget.id
          : null;
      const saved = targetId
        ? await updateEntry(
            capturedContentType.slug,
            targetId,
            buildEditorViewUpdatePayload({ contentType: capturedContentType, draft })
          )
        : await createEntry(
            capturedContentType.slug,
            buildEditorViewCreatePayload({ contentType: capturedContentType, draft })
          );
      if (!isSaveIdentityCurrent(token)) return;
      entryLoadGenerationRef.current += 1;
      setEntryLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
      setRemoteEntryWarningVisit(null);
      if (!isExactSaveDraft(token)) {
        setEntry(saved);
        setOriginalData(saved.data);
        if (token.createRouteVisit !== null) {
          persistedEntryTargetRef.current = {
            routeVisit: token.createRouteVisit,
            routeGeneration: token.routeGeneration,
            id: saved.id,
          };
        }
        setSaveNoticeCommit({
          routeVisit: token.routeVisit,
          message: "Saved server version; newer local changes remain unsaved.",
        });
        return;
      }
      contentDirtyRef.current = false;
      persistedEntryTargetRef.current = null;
      applySavedEntryAndBaseline(saved, capturedContentType, capturedScreen);
      setHasUnsavedChanges(false);
      setSaveNoticeCommit(null);
      if (isCreateMode && screenId) {
        navigate(buildCustomScreenWorkspacePath({ screenId, entryId: saved.id }), {
          skipBlockers: true,
        });
      }
    } catch (err) {
      if (!isSaveIdentityCurrent(token)) return;
      if (isApiClientError(err)) {
        const apiFieldErrors = resolveEntryFieldErrorsFromApiError({
          contentType: capturedContentType,
          error: err,
        });
        if (Object.keys(apiFieldErrors).length > 0) {
          setFieldErrors(apiFieldErrors);
          setEntryErrorCommit({
            routeVisit: token.routeVisit,
            message: "Fix the highlighted fields before saving.",
          });
        } else {
          setEntryErrorCommit({ routeVisit: token.routeVisit, message: err.message });
        }
      } else {
        setEntryErrorCommit({ routeVisit: token.routeVisit, message: "Failed to save record." });
      }
    } finally {
      if (isSaveIdentityCurrent(token)) {
        setContentSaveActivityVisit((current) => (current === token.routeVisit ? null : current));
      }
    }
  };

  const handleSelectedPresentationChange = (
    propPath: ScreenEntryPresentationOverridePropPath,
    value: string | null
  ) => {
    if (!selectedPresentationTarget) return;
    const changed = applyPresentationDraftMutation((current) =>
      upsertPresentationOverride(current, selectedPresentationTarget.block.id, propPath, value)
    );
    if (changed) {
      setPresentationErrorCommit((current) =>
        current?.routeVisit === routeVisit && current.kind === "save" ? null : current
      );
    }
  };
  const handleClearSelectedPresentation = () => {
    if (!selectedPresentationTarget) return;
    const changed = applyPresentationDraftMutation((current) =>
      removePresentationOverridesForBlock(current, selectedPresentationTarget.block.id)
    );
    if (changed) {
      setPresentationErrorCommit((current) =>
        current?.routeVisit === routeVisit && current.kind === "save" ? null : current
      );
    }
  };
  const handleSavePresentation = async () => {
    if (!entryRouteReady || !overrideRouteReady || isCreateMode || !screenId || !entryId) return;
    const token = captureSaveToken("presentation");
    const capturedDraft = [...draftOverridesRef.current];
    setPresentationSaveActivityVisit(token.routeVisit);
    setPresentationErrorCommit((current) =>
      current?.routeVisit === routeVisit && current.kind === "save" ? null : current
    );
    try {
      const saved = await replaceScreenEntryOverrides(screenId, entryId, capturedDraft);
      if (!isSaveIdentityCurrent(token)) return;
      overrideLoadGenerationRef.current += 1;
      setPresentationLoadActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
      setRemotePresentationWarningVisit(null);
      const ordered = normalizePresentationOverrideOrder(saved);
      savedOverridesRef.current = ordered;
      setSavedOverrides(ordered);
      if (!isExactSaveDraft(token)) {
        const stillDirty =
          serializePresentationOverrides(ordered) !==
          serializePresentationOverrides(draftOverridesRef.current);
        presentationDirtyRef.current = stillDirty;
        setHasUnsavedPresentationChanges(stillDirty);
        setPresentationSaveNoticeCommit(
          stillDirty
            ? {
                routeVisit: token.routeVisit,
                message: "Saved server presentation; newer local changes remain unsaved.",
              }
            : null
        );
        return;
      }
      presentationDirtyRef.current = false;
      draftOverridesRef.current = ordered;
      setDraftOverrides(ordered);
      setHasUnsavedPresentationChanges(false);
      setPresentationSaveNoticeCommit(null);
    } catch (err) {
      if (!isSaveIdentityCurrent(token)) return;
      setPresentationErrorCommit({
        routeVisit: token.routeVisit,
        kind: "save",
        message: isApiClientError(err) ? err.message : "Failed to save presentation overrides.",
      });
    } finally {
      if (isSaveIdentityCurrent(token)) {
        setPresentationSaveActivityVisit((current) =>
          current === token.routeVisit ? null : current
        );
      }
    }
  };

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";
  const presentationPanel =
    currentScreen &&
    canEditInScreen &&
    !isCreateMode &&
    overrideRouteReady &&
    !isPresentationLoading &&
    selectedPresentationTarget
      ? {
          target: selectedPresentationTarget,
          overrides: currentDraftOverrides,
          dirty: hasUnsavedPresentationChanges,
          loading: isPresentationLoading,
          saving: isPresentationSaving,
          onSave: () => void handleSavePresentation(),
          onReload: () => void refreshPresentation(true),
          onClear: handleClearSelectedPresentation,
          onChange: handleSelectedPresentationChange,
        }
      : null;

  return (
    <CustomScreenEntryEditorLayout
      dirtyNavigationDialog={dirtyNavigationDialog}
      screenRecordsHref={screenRecordsHref}
      screen={currentScreen}
      entry={currentEntry}
      isCreateMode={isCreateMode}
      canEditInScreen={canEditInScreen}
      isLoading={isLoading}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      error={error}
      presentationError={presentationError}
      presentationErrorKind={presentationErrorKind}
      remoteUpdatePending={remoteUpdatePending}
      remotePresentationUpdatePending={remotePresentationUpdatePending}
      currentSaveNotice={currentSaveNotice}
      currentPresentationSaveNotice={currentPresentationSaveNotice}
      relatedStatus={relatedState}
      mediaStatus={presentationMedia.state}
      presentationLoading={isPresentationLoading}
      onSave={() => void handleSave()}
      onRefresh={() => void refresh(true)}
      onReloadPresentation={() => void refreshPresentation(true)}
      onRetryMedia={() => presentationMedia.retry("manual-retry")}
      document={runtimeDocument}
      bindings={runtimeBindings}
      canvasFieldValues={canvasFieldValues}
      previewData={buildPayloadData()}
      fieldErrors={fieldErrors}
      fields={currentFields}
      relationTargets={relationTargets}
      relatedEntries={relatedEntries}
      presentationOverrides={renderableOverrides}
      selectedBlockId={selectedRuntimeBlockId}
      onSelectBlock={setSelectedRuntimeBlockId}
      onFieldChange={handleFieldChange}
      onTitleChange={handleTitleChange}
      onSlugChange={handleSlugChange}
      preferences={entryPreferences}
      onPreferencesChange={setEntryPreferences}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      presentationPanel={presentationPanel}
    />
  );
}
