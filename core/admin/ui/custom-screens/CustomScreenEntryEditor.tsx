import { RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  getCachedScreenEntryOverrides,
  getCachedCustomScreen,
  getCustomScreenCached,
  getScreenEntryOverridesCached,
  replaceScreenEntryOverrides,
  type CustomScreenEntryPresentationOverride,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  createEntry,
  getCachedEntryDetail,
  getEntryCached,
  updateEntry,
  type EntryDetail,
} from "@/services/entriesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { AuthoringCanvasFrame } from "@/ui/authoring";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type CustomScreenEditorViewDefinitionV4,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  screenEntryPresentationTextEmphasisValues,
  screenEntryPresentationTextSizes,
  screenEntryPresentationToneValues,
  type ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import {
  findScreenBlockById,
  getFirstScreenBlockId,
} from "../../../services/customScreens/screenDocumentOps";

import { CustomScreenPreview } from "./CustomScreenPreview";
import { CustomScreenEntryCanvas } from "./CustomScreenEntryCanvas";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { resolveCustomScreenEntryParams } from "./routeParams";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { ContentField } from "../content-types/SchemaBuilder";
import {
  buildEditorViewCreatePayload,
  buildEditorViewUpdatePayload,
  buildInitialEntryDraft,
  hydrateEditorViewDraft,
  resolveEntryFieldErrorsFromApiError,
  validateEntryDraft,
  type CustomScreenEntryDraft,
} from "./customScreenEntryDraft";

const emptyScreenDocument: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [],
};

const emptyEditorView: CustomScreenEditorViewDefinitionV4 = {
  document: emptyScreenDocument,
  bindings: [],
  saveMode: "entry",
  interactionMode: "inline",
};

const resolveRuntimeDefinition = (screen: CustomScreenRecord): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForRead({
    definition: screen.definition,
    schemaVersion: screen.schemaVersion,
    blocks: screen.blocks,
    bindings: screen.bindings,
  });

const resolveRuntimeEditorView = (screen: CustomScreenRecord) =>
  resolveRuntimeDefinition(screen).editorView;

const resolveRuntimeDocument = (screen: CustomScreenRecord | null) =>
  screen ? resolveRuntimeDefinition(screen).editorView.document : emptyScreenDocument;

const resolveRuntimeBindings = (screen: CustomScreenRecord | null) =>
  screen ? resolveRuntimeDefinition(screen).editorView.bindings : [];

const preserveSelectedElementAcrossRefresh = (input: {
  selectedBlockId: string | null;
  nextDocument: ScreenDocumentV1;
}) => {
  if (!input.selectedBlockId) {
    return getFirstScreenBlockId(input.nextDocument);
  }
  return findScreenBlockById(input.nextDocument, input.selectedBlockId)
    ? input.selectedBlockId
    : getFirstScreenBlockId(input.nextDocument);
};

const inheritPresentationValue = "__inherit__";
const recordHeaderPresentationBindingPaths = new Set([
  "title",
  "eyebrow",
  "subtitle",
  "description",
  "badge",
]);
const systemPresentationFieldNames = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

type PresentationTarget = {
  block: ScreenBlockV1;
  label: string;
  supportsText: boolean;
  mediaField: ContentField | null;
};

const presentationTextSizeOptions = screenEntryPresentationTextSizes.map((value) => ({
  value,
  label: value.toUpperCase(),
}));

const presentationTextEmphasisOptions = screenEntryPresentationTextEmphasisValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const presentationToneOptions = screenEntryPresentationToneValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const presentationOverrideSort = (
  left: CustomScreenEntryPresentationOverride,
  right: CustomScreenEntryPresentationOverride
) => {
  const blockCompare = left.blockId.localeCompare(right.blockId);
  return blockCompare === 0 ? left.propPath.localeCompare(right.propPath) : blockCompare;
};

const normalizePresentationOverrideOrder = (overrides: CustomScreenEntryPresentationOverride[]) =>
  [...overrides].sort(presentationOverrideSort);

const serializePresentationOverrides = (overrides: CustomScreenEntryPresentationOverride[]) =>
  JSON.stringify(normalizePresentationOverrideOrder(overrides));

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const findBinding = (bindings: ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

const findContentField = (fields: ContentField[], fieldName: string) =>
  fields.find((field) => field.name === fieldName) ?? null;

const isResolvablePresentationField = (fields: ContentField[], fieldName: string) =>
  systemPresentationFieldNames.has(fieldName) || Boolean(findContentField(fields, fieldName));

const resolveFieldBlockFieldName = (block: ScreenBlockV1, bindings: ScreenFieldBinding[]) => {
  const binding = findBinding(bindings, block.id, "value");
  return binding?.field ?? readString(block.data.field);
};

const resolveBlockLabel = (block: ScreenBlockV1, fields: ContentField[]) => {
  const dataLabel =
    readString(block.data.label) ||
    readString(block.data.title) ||
    readString(block.data.content) ||
    readString(block.label);
  if (dataLabel) return dataLabel;
  if (block.type === "field") {
    const field = findContentField(fields, readString(block.data.field));
    return field?.label ?? "Field";
  }
  if (block.type === "record-header") return "Record header";
  if (block.type === "rich-text") return "Shared text";
  return "Selected block";
};

const resolvePresentationTarget = (input: {
  block: ScreenBlockV1 | null;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
}): PresentationTarget | null => {
  const { block, bindings, fields } = input;
  if (!block) return null;

  if (block.type === "rich-text") {
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
    };
  }

  if (block.type === "record-header") {
    const bindingsForHeader = bindings.filter(
      (binding) =>
        binding.blockId === block.id && recordHeaderPresentationBindingPaths.has(binding.propPath)
    );
    const bindingsResolvable = bindingsForHeader.every((binding) =>
      isResolvablePresentationField(fields, binding.field)
    );
    if (!bindingsResolvable) return null;
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
    };
  }

  if (block.type !== "field") return null;
  const fieldName = resolveFieldBlockFieldName(block, bindings);
  if (!fieldName || !isResolvablePresentationField(fields, fieldName)) return null;
  const field = findContentField(fields, fieldName);
  return {
    block,
    label: resolveBlockLabel(block, fields),
    supportsText: true,
    mediaField: field?.type === "media" ? field : null,
  };
};

const upsertPresentationOverride = (
  overrides: CustomScreenEntryPresentationOverride[],
  blockId: string,
  propPath: ScreenEntryPresentationOverridePropPath,
  value: string | null
) => {
  const withoutTarget = overrides.filter((override) => {
    if (override.blockId !== blockId) return true;
    if (propPath === "mediaAssetId") {
      return override.propPath !== "mediaAssetId" && override.propPath !== "image";
    }
    return override.propPath !== propPath;
  });
  if (!value) return normalizePresentationOverrideOrder(withoutTarget);
  return normalizePresentationOverrideOrder([
    ...withoutTarget,
    {
      blockId,
      propPath,
      value,
    },
  ]);
};

const removePresentationOverridesForBlock = (
  overrides: CustomScreenEntryPresentationOverride[],
  blockId: string
) => overrides.filter((override) => override.blockId !== blockId);

export function CustomScreenEntryEditor() {
  const { path, navigate } = useAdminRouter();
  const { screenId, entryId } = useMemo(() => resolveCustomScreenEntryParams(path), [path]);
  const isCreateMode = entryId === "new";
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
  const initialCachedPresentationOverrides = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? getCachedScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );
  const initialPresentationOverrides = initialCachedPresentationOverrides ?? [];

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
  const [isLoading, setIsLoading] = useState(
    () => !(initialScreen && initialContentType && (isCreateMode || initialEntry))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [savedOverrides, setSavedOverrides] = useState<CustomScreenEntryPresentationOverride[]>(
    initialPresentationOverrides
  );
  const [draftOverrides, setDraftOverrides] = useState<CustomScreenEntryPresentationOverride[]>(
    initialPresentationOverrides
  );
  const [isPresentationLoading, setIsPresentationLoading] = useState(
    () =>
      !isCreateMode && Boolean(screenId && entryId) && initialCachedPresentationOverrides === null
  );
  const [isPresentationSaving, setIsPresentationSaving] = useState(false);
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [remotePresentationUpdatePending, setRemotePresentationUpdatePending] = useState(false);
  const [selectedRuntimeBlockId, setSelectedRuntimeBlockId] = useState<string | null>(null);
  const [relationTargets, setRelationTargets] = useState<Array<{ slug: string; name: string }>>(
    () =>
      (getCachedContentTypes() ?? []).map((item) => ({
        slug: item.slug,
        name: item.name,
      }))
  );

  const schemaFieldNames = useMemo(() => new Set(fields.map((field) => field.name)), [fields]);
  const screenCapabilities = useMemo(
    () =>
      screen?.capabilities ??
      resolveCustomScreenCapabilities({
        definition: screen ? resolveRuntimeDefinition(screen) : undefined,
      }),
    [screen]
  );
  const canEditInScreen = screenCapabilities.supportsDedicatedEditor;
  const runtimeDocument = useMemo(() => resolveRuntimeDocument(screen), [screen]);
  const runtimeBindings = useMemo(() => resolveRuntimeBindings(screen), [screen]);
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
        fields,
      }),
    [fields, runtimeBindings, selectedRuntimeBlock]
  );
  const savedPresentationKey = useMemo(
    () => serializePresentationOverrides(savedOverrides),
    [savedOverrides]
  );
  const draftPresentationKey = useMemo(
    () => serializePresentationOverrides(draftOverrides),
    [draftOverrides]
  );
  const hasUnsavedPresentationChanges = savedPresentationKey !== draftPresentationKey;
  const hasUnsavedPresentationChangesRef = useRef(hasUnsavedPresentationChanges);
  const overrideCacheKey = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? cacheKeys.customScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );

  useEffect(() => {
    hasUnsavedPresentationChangesRef.current = hasUnsavedPresentationChanges;
  }, [hasUnsavedPresentationChanges]);

  useEffect(() => {
    if (!screen || !screenId || !entryId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen,
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

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    entryId,
    hasUnsavedChanges,
    hasUnsavedPresentationChanges,
    remoteUpdatePending,
    remotePresentationUpdatePending,
    screen,
    screenCapabilities,
    screenId,
    runtimeDocument.sections,
    runtimeBindings,
    selectedRuntimeBlockId,
  ]);

  const applyLoadedState = useCallback(
    (
      nextScreen: CustomScreenRecord,
      nextContentType: ContentTypeSummary,
      nextEntry: EntryDetail | null
    ) => {
      const nextFields = fieldsFromSchema(nextContentType.schema);
      const editorView = resolveRuntimeEditorView(nextScreen);
      const nextDraft = nextEntry
        ? hydrateEditorViewDraft({
            contentType: nextContentType,
            editorView,
            entry: nextEntry,
          })
        : buildInitialEntryDraft({
            contentType: nextContentType,
            editorView,
          });
      setScreen(nextScreen);
      setContentType(nextContentType);
      setEntry(nextEntry);
      setFields(nextFields);
      setTitle(nextDraft.title);
      setSlug(nextDraft.slug);
      setValues(nextDraft.data);
      setEditableFields(nextDraft.editableFields);
      setOriginalData(nextDraft.originalData);
      setFieldErrors({});
      setHasUnsavedChanges(false);
      setRemoteUpdatePending(false);
      const nextDocument = resolveRuntimeDocument(nextScreen);
      setSelectedRuntimeBlockId((current) =>
        preserveSelectedElementAcrossRefresh({
          selectedBlockId: current,
          nextDocument,
        })
      );
      setError(null);
    },
    []
  );

  const applyLoadedPresentationOverrides = useCallback(
    (overrides: CustomScreenEntryPresentationOverride[], options?: { keepUnsaved?: boolean }) => {
      if (options?.keepUnsaved && hasUnsavedPresentationChangesRef.current) {
        setRemotePresentationUpdatePending(true);
        return;
      }
      const ordered = normalizePresentationOverrideOrder(overrides);
      setSavedOverrides(ordered);
      setDraftOverrides(ordered);
      setRemotePresentationUpdatePending(false);
      setPresentationError(null);
    },
    []
  );

  const refreshPresentation = useCallback(
    async (force = false, options?: { keepUnsaved?: boolean; background?: boolean }) => {
      if (!screenId || !entryId || isCreateMode) return;
      if (!options?.background) setIsPresentationLoading(true);
      try {
        const overrides = await getScreenEntryOverridesCached(screenId, entryId, { force });
        applyLoadedPresentationOverrides(overrides, {
          keepUnsaved: options?.keepUnsaved,
        });
      } catch (err) {
        if (isApiClientError(err)) {
          setPresentationError(err.message);
        } else {
          setPresentationError("Failed to load presentation overrides.");
        }
      } finally {
        if (!options?.background) setIsPresentationLoading(false);
      }
    },
    [applyLoadedPresentationOverrides, entryId, isCreateMode, screenId]
  );

  const refresh = useCallback(
    async (force = false, options?: { keepUnsaved?: boolean }) => {
      if (!screenId || !entryId) return;
      setIsLoading(true);
      try {
        const nextScreen = await getCustomScreenCached(screenId, { force });
        if (!nextScreen) {
          setError("Custom screen not found.");
          return;
        }

        const contentTypes = await listContentTypesCached({ force: true });
        const nextContentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!nextContentType) {
          setError("Content type not found.");
          return;
        }

        let nextEntry: EntryDetail | null = null;
        if (!isCreateMode) {
          nextEntry = await getEntryCached(nextContentType.slug, entryId, {
            force,
          });
          if (!nextEntry) {
            setError("Record not found.");
            return;
          }
        }

        if (options?.keepUnsaved && hasUnsavedChanges) {
          setRemoteUpdatePending(true);
          return;
        }

        applyLoadedState(nextScreen, nextContentType, nextEntry);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load record.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [applyLoadedState, entryId, hasUnsavedChanges, isCreateMode, screenId]
  );

  useEffect(() => {
    if (!screenId || !entryId) return;
    let active = true;
    getCustomScreenCached(screenId, { force: true })
      .then(async (nextScreen) => {
        if (!active) return;
        if (!nextScreen) {
          setError("Custom screen not found.");
          return;
        }
        const contentTypes = await listContentTypesCached({ force: true });
        if (!active) return;
        const nextContentType =
          contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
        if (!nextContentType) {
          setError("Content type not found.");
          return;
        }
        let nextEntry: EntryDetail | null = null;
        if (!isCreateMode) {
          nextEntry = await getEntryCached(nextContentType.slug, entryId, {
            force: true,
          });
          if (!active) return;
          if (!nextEntry) {
            setError("Record not found.");
            return;
          }
        }
        applyLoadedState(nextScreen, nextContentType, nextEntry);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load record.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyLoadedState, entryId, isCreateMode, screenId]);

  useEffect(() => {
    let active = true;
    const loadPresentationOverrides = async () => {
      if (!screenId || !entryId || isCreateMode) {
        if (!active) return;
        setSavedOverrides([]);
        setDraftOverrides([]);
        setRemotePresentationUpdatePending(false);
        setPresentationError(null);
        setIsPresentationLoading(false);
        return;
      }

      const cached = getCachedScreenEntryOverrides(screenId, entryId);
      if (cached) {
        if (!active) return;
        applyLoadedPresentationOverrides(cached);
        setIsPresentationLoading(false);
      } else {
        if (!active) return;
        setSavedOverrides([]);
        setDraftOverrides([]);
        setIsPresentationLoading(true);
      }

      try {
        const overrides = await getScreenEntryOverridesCached(screenId, entryId, { force: true });
        if (!active) return;
        applyLoadedPresentationOverrides(overrides, { keepUnsaved: true });
      } catch (err) {
        if (!active) return;
        if (isApiClientError(err)) {
          setPresentationError(err.message);
        } else {
          setPresentationError("Failed to load presentation overrides.");
        }
      } finally {
        if (active) setIsPresentationLoading(false);
      }
    };

    void Promise.resolve().then(loadPresentationOverrides);

    return () => {
      active = false;
    };
  }, [applyLoadedPresentationOverrides, entryId, isCreateMode, screenId]);

  useEffect(() => {
    listContentTypesCached({ force: true })
      .then((items) =>
        setRelationTargets(items.map((item) => ({ slug: item.slug, name: item.name })))
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!screenId || !entryId || !contentType) return undefined;
    return subscribeCacheEvents((event) => {
      if (overrideCacheKey && event.key === overrideCacheKey) {
        refreshPresentation(true, { keepUnsaved: true, background: true }).catch(() => undefined);
        return;
      }
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (!isCreateMode && event.key === cacheKeys.entryDetail(contentType.slug, entryId))
      ) {
        refresh(true, { keepUnsaved: true }).catch(() => undefined);
      }
    });
  }, [
    contentType,
    entryId,
    isCreateMode,
    overrideCacheKey,
    refresh,
    refreshPresentation,
    screenId,
  ]);

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setHasUnsavedChanges(true);
    setError(null);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.title;
      return next;
    });
    if (schemaFieldNames.has("title")) {
      setValues((current) => ({ ...current, title: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.slug;
      return next;
    });
    if (schemaFieldNames.has("slug")) {
      setValues((current) => ({ ...current, slug: value }));
    }
    setHasUnsavedChanges(true);
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

  const buildCanvasFieldValues = () => ({
    ...buildPayloadData(),
    title,
    slug,
    status: entry?.status ?? "draft",
    createdAt: entry?.createdAt ?? null,
    updatedAt: entry?.updatedAt ?? null,
    publishedAt: entry?.publishedAt ?? null,
  });

  const handleSave = async () => {
    if (!contentType || !entryId) return;
    const draft: CustomScreenEntryDraft = {
      title,
      slug,
      data: values,
      editableFields,
      originalData,
      fieldErrors,
    };
    const nextFieldErrors = validateEntryDraft({ contentType, draft });
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Fix the highlighted fields before saving.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const saved = isCreateMode
        ? await createEntry(contentType.slug, buildEditorViewCreatePayload({ contentType, draft }))
        : await updateEntry(
            contentType.slug,
            entryId,
            buildEditorViewUpdatePayload({ contentType, draft })
          );
      setEntry(saved);
      setTitle(saved.title);
      setSlug(saved.slug);
      const savedDraft = hydrateEditorViewDraft({
        contentType,
        editorView: screen ? resolveRuntimeEditorView(screen) : emptyEditorView,
        entry: saved,
      });
      setValues(savedDraft.data);
      setEditableFields(savedDraft.editableFields);
      setOriginalData(savedDraft.originalData);
      setFieldErrors({});
      setHasUnsavedChanges(false);
      setRemoteUpdatePending(false);
      if (isCreateMode && screenId) {
        navigate(
          `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries/${encodeURIComponent(saved.id)}`
        );
      }
    } catch (err) {
      if (isApiClientError(err)) {
        const nextFieldErrors = resolveEntryFieldErrorsFromApiError({
          contentType,
          error: err,
        });
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          setError("Fix the highlighted fields before saving.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to save record.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const readSelectedPresentationOverride = (propPath: ScreenEntryPresentationOverridePropPath) => {
    if (!selectedPresentationTarget) return null;
    return (
      draftOverrides.find(
        (override) =>
          override.blockId === selectedPresentationTarget.block.id && override.propPath === propPath
      )?.value ?? null
    );
  };

  const handleSelectedPresentationChange = (
    propPath: ScreenEntryPresentationOverridePropPath,
    value: string | null
  ) => {
    if (!selectedPresentationTarget) return;
    setDraftOverrides((current) =>
      upsertPresentationOverride(current, selectedPresentationTarget.block.id, propPath, value)
    );
    setPresentationError(null);
  };

  const handleClearSelectedPresentation = () => {
    if (!selectedPresentationTarget) return;
    setDraftOverrides((current) =>
      removePresentationOverridesForBlock(current, selectedPresentationTarget.block.id)
    );
    setPresentationError(null);
  };

  const handleSavePresentation = async () => {
    if (!screenId || !entryId || isCreateMode) return;
    setIsPresentationSaving(true);
    setPresentationError(null);
    try {
      const saved = await replaceScreenEntryOverrides(screenId, entryId, draftOverrides);
      applyLoadedPresentationOverrides(saved);
    } catch (err) {
      if (isApiClientError(err)) {
        setPresentationError(err.message);
      } else {
        setPresentationError("Failed to save presentation overrides.");
      }
    } finally {
      setIsPresentationSaving(false);
    }
  };

  const handleReloadPresentation = () => {
    refreshPresentation(true).catch(() => undefined);
  };

  const selectedPresentationOverrideCount = selectedPresentationTarget
    ? draftOverrides.filter((override) => override.blockId === selectedPresentationTarget.block.id)
        .length
    : 0;
  const selectedTextSize = readSelectedPresentationOverride("textSize") ?? inheritPresentationValue;
  const selectedTextEmphasis =
    readSelectedPresentationOverride("textEmphasis") ?? inheritPresentationValue;
  const selectedTone = readSelectedPresentationOverride("tone") ?? inheritPresentationValue;
  const selectedMediaAssetId =
    readSelectedPresentationOverride("mediaAssetId") ??
    readSelectedPresentationOverride("image") ??
    null;

  const presentationPanel =
    screen && canEditInScreen && !isCreateMode && selectedPresentationTarget ? (
      <div
        className="rounded-lg border bg-card/70 p-4 shadow-sm"
        data-custom-screen-entry-presentation-panel="true"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Presentation</p>
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedPresentationTarget.label}
              </Badge>
              {hasUnsavedPresentationChanges ? (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Unsaved presentation
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Overrides are scoped to this record and selected block.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={handleSavePresentation}
              disabled={
                isPresentationSaving || isPresentationLoading || !hasUnsavedPresentationChanges
              }
            >
              <Save className="h-4 w-4" />
              {isPresentationSaving ? "Saving..." : "Save presentation"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleReloadPresentation}
              disabled={isPresentationSaving || isPresentationLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Reload presentation
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleClearSelectedPresentation}
              disabled={selectedPresentationOverrideCount === 0 || isPresentationSaving}
            >
              <Trash2 className="h-4 w-4" />
              Clear selected presentation
            </Button>
          </div>
        </div>

        {presentationError ? (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Presentation error</AlertTitle>
            <AlertDescription>{presentationError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {selectedPresentationTarget.supportsText ? (
            <>
              <div className="space-y-1" data-presentation-control="textSize">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Text size
                </label>
                <Select
                  value={selectedTextSize}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "textSize",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationTextSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1" data-presentation-control="textEmphasis">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Emphasis
                </label>
                <Select
                  value={selectedTextEmphasis}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "textEmphasis",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationTextEmphasisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1" data-presentation-control="tone">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tone
                </label>
                <Select
                  value={selectedTone}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "tone",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationToneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>

        {selectedPresentationTarget.mediaField ? (
          <div className="mt-4" data-presentation-control="mediaAssetId">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Media override
            </label>
            <MediaPicker
              value={selectedMediaAssetId}
              onChange={(next) =>
                handleSelectedPresentationChange(
                  "mediaAssetId",
                  typeof next === "string" && next.trim() ? next : null
                )
              }
              multiple={false}
              accept={selectedPresentationTarget.mediaField.media?.accept}
            />
          </div>
        ) : null}
      </div>
    ) : null;

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";

  return (
    <>
      <EditorShell
        activeHref={screenRecordsHref}
        breadcrumbs={
          screen?.name
            ? [
                "Coderso",
                "Screens",
                screen.name,
                isCreateMode ? "New record" : entry?.title?.trim() ? entry.title : "Record",
              ]
            : [
                "Coderso",
                "Screens",
                isCreateMode ? "New record" : entry?.title?.trim() ? entry.title : "Record",
              ]
        }
        topbarActions={
          <div className="flex items-center gap-2">
            {entry ? (
              <Badge
                variant={entry.status === "published" ? "default" : "outline"}
                className="ml-1 text-[10px] uppercase"
              >
                {entry.status}
              </Badge>
            ) : null}
            {hasUnsavedChanges ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                Unsaved changes
              </span>
            ) : null}
            {canEditInScreen ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={isSaving || isLoading || !contentType}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Screen-owned record editor
              </p>
              <p className="text-xs text-muted-foreground">
                {canEditInScreen
                  ? "The canvas is the active editing surface for this record."
                  : "This screen still needs writable bindings before it can replace legacy editing paths."}
              </p>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Custom screen record error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {remoteUpdatePending ? (
              <Alert>
                <AlertTitle>Updated in another tab</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New changes are available. Refresh to load the latest version.</span>
                  <Button variant="outline" size="sm" onClick={() => refresh(true)}>
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {remotePresentationUpdatePending ? (
              <Alert>
                <AlertTitle>Presentation updated elsewhere</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New presentation changes are available for this record.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleReloadPresentation}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reload presentation
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {!canEditInScreen ? (
              <Alert>
                <AlertTitle>Workspace upgrade required</AlertTitle>
                <AlertDescription>
                  This screen is not yet ready for the dedicated editor workflow. Add writable
                  bindings in the builder before using this route as the active screen-owned editor.
                </AlertDescription>
              </Alert>
            ) : null}

            {presentationPanel}

            {isLoading ? (
              <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                Loading custom screen record...
              </div>
            ) : screen && canEditInScreen ? (
              <AuthoringCanvasFrame
                borderless
                onClearSelection={() => {
                  setSelectedRuntimeBlockId(null);
                }}
              >
                <CustomScreenEntryCanvas
                  document={runtimeDocument}
                  bindings={runtimeBindings}
                  fieldValues={buildCanvasFieldValues()}
                  fieldErrors={fieldErrors}
                  fields={fields}
                  relationTargets={relationTargets}
                  onFieldChange={handleFieldChange}
                  onTitleChange={handleTitleChange}
                  onSlugChange={handleSlugChange}
                  presentationOverrides={draftOverrides}
                  selectedBlockId={selectedRuntimeBlockId}
                  onSelectBlock={setSelectedRuntimeBlockId}
                />
              </AuthoringCanvasFrame>
            ) : screen ? (
              <CustomScreenPreview
                document={runtimeDocument}
                bindings={runtimeBindings}
                data={buildPayloadData()}
                fields={fields}
                emptyTitle="Editor upgrade required"
                emptyMessage="Add writable screen blocks and bindings in the builder before using this route as the dedicated record editor."
              />
            ) : (
              <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                Screen record unavailable.
              </div>
            )}
          </div>
        </ScrollArea>
      </EditorShell>
    </>
  );
}
