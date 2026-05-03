import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  getCachedCustomScreen,
  getCustomScreenCached,
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
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { getRegisteredWidget } from "@/ui/widgets/registry";

import { CustomScreenPreview } from "./CustomScreenPreview";
import { CustomScreenEntryCanvas } from "./CustomScreenEntryCanvas";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { resolveCustomScreenEntryParams } from "./routeParams";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import { getWidgetBindings } from "../../../services/customScreens/bindingResolver";
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

type DetailsTab = "record" | "element";

const hasBlockId = (
  blocks: Array<{ id: string; slots?: Record<string, unknown>; children?: unknown }>,
  targetId: string
): boolean =>
  blocks.some((block) => {
    if (block.id === targetId) return true;
    const slotBlocks = block.slots
      ? Object.values(block.slots).flatMap((value) =>
          Array.isArray(value)
            ? (value as Array<{ id: string; slots?: Record<string, unknown>; children?: unknown }>)
            : []
        )
      : [];
    const childBlocks = Array.isArray(block.children)
      ? (block.children as Array<{
          id: string;
          slots?: Record<string, unknown>;
          children?: unknown;
        }>)
      : [];
    return hasBlockId([...slotBlocks, ...childBlocks], targetId);
  });

const preserveSelectedElementAcrossRefresh = (input: {
  selectedBlockId: string | null;
  nextBlocks: Array<{ id: string; slots?: Record<string, unknown>; children?: unknown }>;
}) => {
  if (!input.selectedBlockId) {
    return input.nextBlocks[0]?.id ?? null;
  }
  return hasBlockId(input.nextBlocks, input.selectedBlockId)
    ? input.selectedBlockId
    : (input.nextBlocks[0]?.id ?? null);
};

const findBlockById = <
  T extends { id: string; slots?: Record<string, unknown>; children?: unknown },
>(
  blocks: T[],
  targetId: string | null
): T | null => {
  if (!targetId) return null;
  for (const block of blocks) {
    if (block.id === targetId) {
      return block;
    }
    const slotBlocks = block.slots
      ? Object.values(block.slots).flatMap((value) => (Array.isArray(value) ? (value as T[]) : []))
      : [];
    const childBlocks = Array.isArray(block.children) ? (block.children as T[]) : [];
    const nestedMatch = findBlockById([...slotBlocks, ...childBlocks], targetId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }
  return null;
};

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
        editorView: initialScreen.definition?.editorView ?? {
          blocks: initialScreen.blocks,
          bindings: initialScreen.bindings,
          saveMode: "entry",
          interactionMode: "inline",
        },
      });
    }
    if (!initialEntry) return null;
    return hydrateEditorViewDraft({
      contentType: initialContentType,
      editorView: initialScreen.definition?.editorView ?? {
        blocks: initialScreen.blocks,
        bindings: initialScreen.bindings,
        saveMode: "entry",
        interactionMode: "inline",
      },
      entry: initialEntry,
    });
  }, [initialContentType, initialEntry, initialScreen, isCreateMode]);

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<DetailsTab>("record");
  const [selectedRuntimeBlockId, setSelectedRuntimeBlockId] = useState<string | null>(null);
  const [relationTargets, setRelationTargets] = useState<Array<{ slug: string; name: string }>>(
    () =>
      (getCachedContentTypes() ?? []).map((item) => ({
        slug: item.slug,
        name: item.name,
      }))
  );

  const schemaFieldNames = useMemo(() => new Set(fields.map((field) => field.name)), [fields]);
  const readOnlyBindingCount = useMemo(
    () => screen?.bindings.filter((binding) => binding.mode === "read").length ?? 0,
    [screen]
  );
  const screenCapabilities = useMemo(
    () =>
      screen?.capabilities ??
      resolveCustomScreenCapabilities({
        definition: screen?.definition,
        blocks: screen?.blocks,
        bindings: screen?.bindings,
      }),
    [screen]
  );
  const canEditInScreen = screenCapabilities.supportsDedicatedEditor;
  const runtimeBlocks = useMemo(
    () => screen?.definition?.editorView.blocks ?? screen?.blocks ?? [],
    [screen]
  );
  const runtimeBindings = useMemo(
    () => screen?.definition?.editorView.bindings ?? screen?.bindings ?? [],
    [screen]
  );
  const selectedRuntimeBlock = useMemo(
    () => findBlockById(runtimeBlocks, selectedRuntimeBlockId),
    [runtimeBlocks, selectedRuntimeBlockId]
  );
  const selectedRuntimeWidget = selectedRuntimeBlock
    ? getRegisteredWidget(selectedRuntimeBlock.type)
    : null;
  const selectedRuntimeBindings = useMemo(
    () =>
      selectedRuntimeBlock
        ? getWidgetBindings(runtimeBindings, selectedRuntimeBlock.id, {
            includeRead: true,
            includeWrite: true,
          })
        : [],
    [runtimeBindings, selectedRuntimeBlock]
  );

  useEffect(() => {
    if (!screen || !screenId || !entryId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen,
        blocks: runtimeBlocks,
        bindings: runtimeBindings,
        capabilities: screenCapabilities,
        selectedBlockId: selectedRuntimeBlockId,
        selectedEntryId: entryId,
        warnings: [
          ...(hasUnsavedChanges ? ["custom_screen_entry_has_unsaved_changes"] : []),
          ...(remoteUpdatePending ? ["custom_screen_entry_remote_update_pending"] : []),
        ],
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    entryId,
    hasUnsavedChanges,
    remoteUpdatePending,
    screen,
    screenCapabilities,
    screenId,
    runtimeBlocks,
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
      const editorView = nextScreen.definition?.editorView ?? {
        blocks: nextScreen.blocks,
        bindings: nextScreen.bindings,
        saveMode: "entry" as const,
        interactionMode: "inline" as const,
      };
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
      const nextBlocks = nextScreen.definition?.editorView.blocks ?? nextScreen.blocks;
      setSelectedRuntimeBlockId((current) =>
        preserveSelectedElementAcrossRefresh({
          selectedBlockId: current,
          nextBlocks,
        })
      );
      setError(null);
    },
    []
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
    listContentTypesCached({ force: true })
      .then((items) =>
        setRelationTargets(items.map((item) => ({ slug: item.slug, name: item.name })))
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!screenId || !entryId || !contentType) return undefined;
    return subscribeCacheEvents((event) => {
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (!isCreateMode && event.key === cacheKeys.entryDetail(contentType.slug, entryId))
      ) {
        refresh(true, { keepUnsaved: true }).catch(() => undefined);
      }
    });
  }, [contentType, entryId, isCreateMode, refresh, screenId]);

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

  const renderSelectedBlockBindingEditor = () => {
    if (!selectedRuntimeBlock) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Click a widget on the canvas to inspect and edit its bound content fields.
        </div>
      );
    }

    if (selectedRuntimeBindings.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          This widget has no bindings yet. Add them in the builder `Data` tab.
        </div>
      );
    }

    const systemFieldMap = new Map<string, { label: string; editable: boolean }>([
      ["title", { label: "Title", editable: true }],
      ["slug", { label: "Slug", editable: true }],
      ["status", { label: "Status", editable: false }],
      ["createdAt", { label: "Created", editable: false }],
      ["updatedAt", { label: "Updated", editable: false }],
      ["publishedAt", { label: "Published", editable: false }],
    ]);

    return (
      <div className="space-y-3">
        {selectedRuntimeBindings.map((binding) => {
          const field = fields.find((item) => item.name === binding.field) ?? null;
          const systemField = systemFieldMap.get(binding.field) ?? null;

          if (field) {
            return (
              <div key={binding.id} className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {binding.propPath}
                </p>
                <p className="mb-3 text-sm font-medium">{field.label}</p>
                <FieldRenderer
                  field={field}
                  value={values[binding.field]}
                  onChange={(next: unknown) => handleFieldChange(binding.field, next)}
                  relationTargets={relationTargets}
                  display="compact"
                />
                {fieldErrors[binding.field] ? (
                  <p className="mt-2 text-xs text-destructive">{fieldErrors[binding.field]}</p>
                ) : null}
              </div>
            );
          }

          if (systemField?.editable) {
            const value = binding.field === "title" ? title : slug;
            const onChange = binding.field === "title" ? handleTitleChange : handleSlugChange;
            return (
              <div key={binding.id} className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {binding.propPath}
                </p>
                <p className="mb-3 text-sm font-medium">{systemField.label}</p>
                <Input
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  className="h-9"
                />
                {fieldErrors[binding.field] ? (
                  <p className="mt-2 text-xs text-destructive">{fieldErrors[binding.field]}</p>
                ) : null}
              </div>
            );
          }

          return (
            <div key={binding.id} className="rounded-lg border p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {binding.propPath}
              </p>
              <p className="mb-1 text-sm font-medium">{systemField?.label ?? binding.field}</p>
              <p className="text-sm text-muted-foreground">
                {String(
                  (buildCanvasFieldValues() as Record<string, unknown>)[binding.field] ?? "—"
                )}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

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
        editorView: screen?.definition?.editorView ?? {
          blocks: screen?.blocks ?? [],
          bindings: screen?.bindings ?? [],
          saveMode: "entry",
          interactionMode: "inline",
        },
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

  const detailsPanel = (
    <Tabs
      value={activeDetailsTab}
      onValueChange={(next) => setActiveDetailsTab(next as DetailsTab)}
      className="flex h-full flex-col p-6"
    >
      <TabsList variant="line" className="px-1">
        <TabsTrigger value="record">Record</TabsTrigger>
        <TabsTrigger value="element">Selected Element</TabsTrigger>
      </TabsList>
      <TabsContent value="record" className="mt-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Workspace details</p>
          <p className="text-xs text-muted-foreground">
            {canEditInScreen
              ? "This record is edited directly through the screen-owned canvas."
              : "This screen is not yet ready for the screen-owned editor workflow."}
          </p>
        </div>

        {!canEditInScreen ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            Use the builder to add writable screen widgets and bindings before using this record
            route as the active editor flow.
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </label>
              <Input value={title} onChange={(event) => handleTitleChange(event.target.value)} />
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Slug
              </label>
              <Input value={slug} onChange={(event) => handleSlugChange(event.target.value)} />
            </div>
          </>
        )}

        {readOnlyBindingCount > 0 ? (
          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {readOnlyBindingCount} binding{readOnlyBindingCount === 1 ? "" : "s"} are preview-only
            and remain read-only in this screen workflow.
          </div>
        ) : null}
      </TabsContent>
      <TabsContent value="element" className="mt-4 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {selectedRuntimeWidget?.title ?? "Selected element"}
          </p>
          <p className="text-xs text-muted-foreground">
            Click a widget on the canvas and use the pencil action to focus its bound content here.
          </p>
        </div>
        {renderSelectedBlockBindingEditor()}
      </TabsContent>
    </Tabs>
  );

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";

  return (
    <>
      <EditorShell
        activeHref={screenRecordsHref}
        breadcrumbs={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Coderso</span>
            <span>/</span>
            <span>Screens</span>
            {screen?.name ? (
              <>
                <span>/</span>
                <span>{screen.name}</span>
              </>
            ) : null}
            <span>/</span>
            <span className="text-foreground">
              {isCreateMode ? "New record" : entry?.title?.trim() ? entry.title : "Record"}
            </span>
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
          </div>
        }
        topbarActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate(screenRecordsHref)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to records
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setDetailsOpen(true)}
            >
              {canEditInScreen ? "Bound fields" : "Screen details"}
            </Button>
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
            {!canEditInScreen ? (
              <Alert>
                <AlertTitle>Workspace upgrade required</AlertTitle>
                <AlertDescription>
                  This screen is not yet ready for the dedicated editor workflow. Add writable
                  bindings in the builder before using this route as the active screen-owned editor.
                </AlertDescription>
              </Alert>
            ) : null}

            {isLoading ? (
              <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                Loading custom screen record...
              </div>
            ) : screen && canEditInScreen ? (
              <CustomScreenEntryCanvas
                blocks={screen.definition?.editorView.blocks ?? screen.blocks}
                bindings={screen.definition?.editorView.bindings ?? screen.bindings}
                fieldValues={buildCanvasFieldValues()}
                fieldErrors={fieldErrors}
                fields={fields}
                relationTargets={relationTargets}
                onFieldChange={handleFieldChange}
                onTitleChange={handleTitleChange}
                onSlugChange={handleSlugChange}
                selectedBlockId={selectedRuntimeBlockId}
                onSelectBlock={(blockId) => {
                  setSelectedRuntimeBlockId(blockId);
                  setActiveDetailsTab("element");
                }}
                onEditBlock={(blockId) => {
                  setSelectedRuntimeBlockId(blockId);
                  setActiveDetailsTab("element");
                  setDetailsOpen(true);
                }}
              />
            ) : screen ? (
              <CustomScreenPreview
                blocks={screen.definition?.editorView.blocks ?? screen.blocks}
                bindings={screen.definition?.editorView.bindings ?? screen.bindings}
                data={buildPayloadData()}
                emptyTitle="Editor upgrade required"
                emptyMessage="Add writable screen widgets and bindings in the builder before using this route as the dedicated record editor."
              />
            ) : (
              <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                Screen record unavailable.
              </div>
            )}
          </div>
        </ScrollArea>
      </EditorShell>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-96 p-0">
          <SheetTitle className="sr-only">Bound fields</SheetTitle>
          <SheetDescription className="sr-only">
            Edit the content fields mapped by this custom screen.
          </SheetDescription>
          <ScrollArea className="h-full">{detailsPanel}</ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
