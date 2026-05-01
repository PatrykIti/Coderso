import { ArrowLeft, RefreshCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

  useEffect(() => {
    if (!screen || !screenId || !entryId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen,
        capabilities: screenCapabilities,
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
  }, [entryId, hasUnsavedChanges, remoteUpdatePending, screen, screenCapabilities, screenId]);

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
    <div className="space-y-4 p-6">
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
          Use the builder to add writable screen widgets and bindings before using this record route
          as the active editor flow.
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
          Inline canvas editing is active. Save writes through the shared content entry contract.
        </div>
      )}

      {readOnlyBindingCount > 0 ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          {readOnlyBindingCount} binding{readOnlyBindingCount === 1 ? "" : "s"} are preview-only and
          remain read-only in this screen workflow.
        </div>
      ) : null}
    </div>
  );

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";

  return (
    <>
      <EditorShell
        activeHref="/admin/advanced/custom-screens"
        rightPanel={detailsPanel}
        rightPanelClassName="w-[360px]"
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2 lg:hidden"
              onClick={() => setDetailsOpen(true)}
            >
              {canEditInScreen ? "Bound fields" : "Screen details"}
            </Button>
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

            <div className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
              {canEditInScreen ? (
                <div className="space-y-3">
                  <Textarea
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    rows={1}
                    className="min-h-0 resize-none overflow-hidden border-0 px-0 py-0 text-3xl font-semibold leading-tight tracking-tight shadow-none focus-visible:ring-0"
                    placeholder="Record title"
                  />
                  {fieldErrors.title ? (
                    <p className="text-xs text-destructive">{fieldErrors.title}</p>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Slug
                    </span>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                      <span className="text-xs text-muted-foreground">/</span>
                      <Input
                        value={slug}
                        onChange={(event) => handleSlugChange(event.target.value)}
                        className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-mono focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleSlugChange(slugify(title))}
                      >
                        <RefreshCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {fieldErrors.slug ? (
                    <p className="text-xs text-destructive">{fieldErrors.slug}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Record title
                    </p>
                    <p className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
                      {title || "Untitled record"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Slug
                    </p>
                    <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                      /{slug || "draft-slug"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
                Loading custom screen record...
              </div>
            ) : screen && canEditInScreen ? (
              <CustomScreenEntryCanvas
                blocks={screen.definition?.editorView.blocks ?? screen.blocks}
                bindings={screen.definition?.editorView.bindings ?? screen.bindings}
                fieldValues={buildPayloadData()}
                fieldErrors={fieldErrors}
                fields={fields}
                relationTargets={relationTargets}
                onFieldChange={handleFieldChange}
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
