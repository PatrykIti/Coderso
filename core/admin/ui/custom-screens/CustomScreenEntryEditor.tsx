import { ArrowLeft, RefreshCcw, Save, SquareArrowOutUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedContentTypes, listContentTypesCached, type ContentTypeSummary } from "@/services/contentTypesClient";
import { getCachedCustomScreen, getCustomScreenCached, type CustomScreenRecord } from "@/services/customScreensClient";
import {
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
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { CustomScreenPreview } from "./CustomScreenPreview";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { resolveCustomScreenEntryParams } from "./routeParams";
import { collectWritableBindingFields } from "../../../services/customScreens/bindingResolver";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { ContentField } from "../content-types/SchemaBuilder";

const normalizeText = (value: string) => value.trim();

function resolveDefaultValue(field: ContentField) {
  if (field.defaultValue === undefined || field.defaultValue === "") return null;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (field.type === "boolean") {
    return field.defaultValue === "true";
  }
  return field.defaultValue;
}

function buildInitialValues(fields: ContentField[], data: Record<string, unknown>) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (data[field.name] !== undefined) {
      acc[field.name] = data[field.name];
      return acc;
    }
    const fallback = field.type === "boolean" ? false : "";
    acc[field.name] = resolveDefaultValue(field) ?? fallback;
    return acc;
  }, {});
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type BoundFieldCardProps = {
  field: ContentField;
  usageCount: number;
  value: unknown;
  onChange: (value: unknown) => void;
  relationTargets: Array<{ slug: string; name: string }>;
};

function BoundFieldCard({
  field,
  usageCount,
  value,
  onChange,
  relationTargets,
}: BoundFieldCardProps) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{field.label}</p>
          <Badge variant="outline" className="text-[10px] uppercase">
            {field.type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Bound in {usageCount} widget {usageCount === 1 ? "property" : "properties"}.
        </p>
      </div>
      <FieldRenderer
        field={field}
        value={value}
        onChange={onChange}
        relationTargets={relationTargets}
        display="compact"
      />
    </div>
  );
}

export function CustomScreenEntryEditor() {
  const { path, navigate } = useAdminRouter();
  const { screenId, entryId } = useMemo(
    () => resolveCustomScreenEntryParams(path),
    [path]
  );
  const initialScreen = useMemo(
    () => (screenId ? getCachedCustomScreen(screenId) ?? null : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? getCachedContentTypes()?.find(
            (item) => item.id === initialScreen.contentTypeId
          ) ?? null
        : null,
    [initialScreen]
  );
  const initialEntry = useMemo(
    () =>
      initialContentType && entryId
        ? getCachedEntryDetail(initialContentType.slug, entryId) ?? null
        : null,
    [entryId, initialContentType]
  );
  const initialFields = useMemo(
    () => (initialContentType ? fieldsFromSchema(initialContentType.schema) : []),
    [initialContentType]
  );

  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [contentType, setContentType] = useState<ContentTypeSummary | null>(
    initialContentType
  );
  const [entry, setEntry] = useState<EntryDetail | null>(initialEntry);
  const [fields, setFields] = useState<ContentField[]>(initialFields);
  const [values, setValues] = useState<Record<string, unknown>>(
    initialEntry ? buildInitialValues(initialFields, initialEntry.data ?? {}) : {}
  );
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [slug, setSlug] = useState(initialEntry?.slug ?? "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !(initialScreen && initialContentType && initialEntry));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [relationTargets, setRelationTargets] = useState<
    Array<{ slug: string; name: string }>
  >(() =>
    (getCachedContentTypes() ?? []).map((item) => ({
      slug: item.slug,
      name: item.name,
    }))
  );

  const schemaFieldNames = useMemo(
    () => new Set(fields.map((field) => field.name)),
    [fields]
  );
  const writableFieldNames = useMemo(
    () => (screen ? collectWritableBindingFields(screen.bindings) : []),
    [screen]
  );
  const writableFieldUsage = useMemo(() => {
    if (!screen) return new Map<string, number>();
    return screen.bindings.reduce((result, binding) => {
      if (binding.mode === "read") return result;
      result.set(binding.field, (result.get(binding.field) ?? 0) + 1);
      return result;
    }, new Map<string, number>());
  }, [screen]);
  const writableFields = useMemo(
    () =>
      writableFieldNames
        .map((name) => fields.find((field) => field.name === name) ?? null)
        .filter((field): field is ContentField => Boolean(field)),
    [fields, writableFieldNames]
  );
  const readOnlyBindingCount = useMemo(
    () =>
      screen?.bindings.filter((binding) => binding.mode === "read").length ?? 0,
    [screen]
  );
  const screenCapabilities = useMemo(
    () =>
      screen?.capabilities ??
      resolveCustomScreenCapabilities({
        blocks: screen?.blocks,
        bindings: screen?.bindings,
      }),
    [screen]
  );
  const canEditInScreen = screenCapabilities.mode === "editor";
  const isDashboardScreen = screenCapabilities.mode === "dashboard";
  const isCollectionOnlyScreen = screenCapabilities.mode === "collection-only";

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
      nextEntry: EntryDetail
    ) => {
      const nextFields = fieldsFromSchema(nextContentType.schema);
      setScreen(nextScreen);
      setContentType(nextContentType);
      setEntry(nextEntry);
      setFields(nextFields);
      setTitle(nextEntry.title);
      setSlug(nextEntry.slug);
      setValues(buildInitialValues(nextFields, nextEntry.data ?? {}));
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

        const nextEntry = await getEntryCached(nextContentType.slug, entryId, {
          force,
        });
        if (!nextEntry) {
          setError("Record not found.");
          return;
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
    [applyLoadedState, entryId, hasUnsavedChanges, screenId]
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
        const nextEntry = await getEntryCached(nextContentType.slug, entryId, {
          force: true,
        });
        if (!active) return;
        if (!nextEntry) {
          setError("Record not found.");
          return;
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
  }, [applyLoadedState, entryId, screenId]);

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
        event.key === cacheKeys.entryDetail(contentType.slug, entryId)
      ) {
        refresh(true, { keepUnsaved: true }).catch(() => undefined);
      }
    });
  }, [contentType, entryId, refresh, screenId]);

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((current) => ({ ...current, [name]: value }));
    setHasUnsavedChanges(true);
    setError(null);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (schemaFieldNames.has("title")) {
      setValues((current) => ({ ...current, title: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    if (schemaFieldNames.has("slug")) {
      setValues((current) => ({ ...current, slug: value }));
    }
    setHasUnsavedChanges(true);
  };

  const buildPayloadData = () => {
    const data: Record<string, unknown> = {};
    Object.keys(contentType?.schema.properties ?? {}).forEach((key) => {
      if (values[key] !== undefined) {
        data[key] = values[key];
      }
    });
    if (schemaFieldNames.has("title")) data.title = title;
    if (schemaFieldNames.has("slug")) data.slug = slug;
    return data;
  };

  const handleSave = async () => {
    if (!contentType || !entryId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateEntry(contentType.slug, entryId, {
        title: normalizeText(title),
        slug: normalizeText(slug),
        data: buildPayloadData(),
      });
      setEntry(updated);
      setTitle(updated.title);
      setSlug(updated.slug);
      setValues(buildInitialValues(fields, updated.data ?? {}));
      setHasUnsavedChanges(false);
      setRemoteUpdatePending(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
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
        <p className="text-sm font-medium">
          {canEditInScreen ? "Bound fields" : "Screen workflow"}
        </p>
        <p className="text-xs text-muted-foreground">
          {canEditInScreen
            ? "Edit only the content fields mapped by the custom screen bindings."
            : isDashboardScreen
              ? "This screen can preview mapped record data, but edits stay in the classic editor until writable bindings are added."
              : "This shortcut currently narrows the records list. Add bound screen widgets if you want a dedicated record screen."}
        </p>
      </div>

      {!canEditInScreen ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          {isDashboardScreen
            ? "Use the builder to add writable bindings when this preview screen should become an editor."
            : "Use the builder to add dedicated screen widgets and field bindings before replacing the classic editor."}
        </div>
      ) : writableFields.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          This screen has no writable bindings yet. Use the builder to map widget props to
          content fields.
        </div>
      ) : (
        writableFields.map((field) => (
          <BoundFieldCard
            key={field.name}
            field={field}
            usageCount={writableFieldUsage.get(field.name) ?? 1}
            value={values[field.name]}
            onChange={(next) => handleFieldChange(field.name, next)}
            relationTargets={relationTargets}
          />
        ))
      )}

      {readOnlyBindingCount > 0 ? (
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          {readOnlyBindingCount} binding{readOnlyBindingCount === 1 ? "" : "s"} are
          preview-only and remain read-only in this screen workflow.
        </div>
      ) : null}
    </div>
  );

  const classicEditorHref =
    contentType && entryId
      ? `/advanced/entries/${encodeURIComponent(contentType.slug)}/${encodeURIComponent(entryId)}`
      : "/advanced/entries";
  const screenRecordsHref =
    screenId ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries` : "/advanced/custom-screens";

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
              {entry?.title?.trim() ? entry.title : "Record"}
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
              onClick={() => navigate(classicEditorHref)}
              disabled={!contentType || !entryId}
            >
              <SquareArrowOutUpRight className="h-4 w-4" />
              Classic editor
            </Button>
            {canEditInScreen ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={isSaving || isLoading || !contentType}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save record"}
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Custom screen preview
              </p>
              <p className="text-xs text-muted-foreground">
                {canEditInScreen
                  ? "The canvas reflects the current entry data through widget bindings."
                  : isDashboardScreen
                    ? "This screen previews the current record state, while edits stay in the classic editor."
                    : "This screen currently acts as a records shortcut and does not replace the classic editor yet."}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refresh(true)}
                  >
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {isCollectionOnlyScreen ? (
              <Alert>
                <AlertTitle>Collection-only screen</AlertTitle>
                <AlertDescription>
                  This shortcut currently narrows the records list for this content type.
                  Open the classic editor to edit the record, or add dedicated screen
                  widgets and field bindings in the builder to create a custom record
                  screen.
                </AlertDescription>
              </Alert>
            ) : isDashboardScreen ? (
              <Alert>
                <AlertTitle>Read-only record screen</AlertTitle>
                <AlertDescription>
                  This screen can preview mapped data for the current record, but edits
                  still happen in the classic editor until writable bindings are added.
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
            ) : screen && isCollectionOnlyScreen ? (
              <CustomScreenPreview
                blocks={[]}
                bindings={[]}
                data={{}}
                emptyTitle="Classic editor required"
                emptyMessage="This screen does not define a dedicated record view yet. Use the classic editor for edits, or add bound screen widgets in the builder."
              />
            ) : screen ? (
              <CustomScreenPreview
                blocks={screen.blocks}
                bindings={screen.bindings}
                data={buildPayloadData()}
                emptyTitle="No preview widgets yet"
                emptyMessage="Add dedicated screen widgets to preview this custom screen."
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
