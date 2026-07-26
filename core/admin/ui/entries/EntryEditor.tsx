import { SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  deleteEntry,
  getEntryCached,
  publishEntry,
  updateEntryMetadata,
  updateEntry,
  type EntryDetail,
  type EntryVisibility,
} from "@/services/entriesClient";
import {
  getSiteSettings,
  resolveContentSlugDisplay,
  resolveContentSlugRouteContext,
  type SiteSettingsResponse,
} from "@/services/siteSettingsClient";
import {
  createTaxonomyTerm,
  getTaxonomyOverview,
  type ContentTerm,
  type TaxonomyOverview,
} from "@/services/taxonomyClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { RuntimePreviewDialog } from "@/ui/preview/RuntimePreviewDialog";

import { EntryDeleteDialog } from "./EntryDeleteDialog";
import { EntryEditorHeaderActions } from "./EntryEditorHeader";
import { EntryFieldSections } from "./EntryFieldSections";
import { EntryMetadataPanel, type EntryStatus } from "./EntryMetadataPanel";
import { EntryTitleSlugFields } from "./EntryTitleSlugFields";
import { getContentTypeLabels } from "./contentTypeLabels";
import { buildEntryChecklist } from "./entryChecklist";
import { buildEntryFieldGroups } from "./entryFieldGroups";
import { buildEntryMetadataUpdate } from "./entryMetadataUpdate";
import { buildEntryPayloadData, buildInitialValues } from "./entryValueMapping";
import { useEntryRelationTargets } from "./useEntryRelationTargets";
import { useEntryRuntimePreview } from "./useEntryRuntimePreview";
import type { ContentField } from "../content-types/SchemaBuilder";
import { fieldsFromSchema } from "../content-types/schemaMapping";

const resolveEntryParams = (pathname: string): { type: string | null; id: string | null } => {
  const parts = pathname.split("/").filter(Boolean);
  const entriesIndex = parts.findIndex((segment) => segment === "entries");
  if (entriesIndex !== -1) {
    return {
      type: parts[entriesIndex + 1] ?? null,
      id: parts[entriesIndex + 2] ?? null,
    };
  }

  return { type: null, id: null };
};

const resolveEditorErrorMessage = (error: unknown, fallback: string) =>
  isApiClientError(error) ? error.message : fallback;

// Local edits reach the editor through two independent channels, each with its own
// dirty flag and Save action: CONTENT (title/slug/field values, "Save draft") and
// METADATA (status/visibility/schedule/SEO, the metadata panel). Each is preserved on
// its own flag, so a snapshot can keep the dirty channel and still hydrate the other.
type ApplyEntryOptions = Readonly<{
  preserveContentEdits?: boolean;
  preserveMetadataEdits?: boolean;
}>;

// The metadata values applyEntry hydrates, tracked one by one so that preserving
// the channel keeps ONLY what the user actually edited. Taxonomy selections are
// deliberately absent: loadTaxonomy owns them, and their controls render only once
// that overview has loaded, so they cannot be edited before hydration.
type MetadataFieldKey =
  "status" | "visibility" | "accessPassword" | "scheduledAt" | "seoDescription";

const NO_EDITED_METADATA_FIELDS: ReadonlySet<MetadataFieldKey> = new Set<MetadataFieldKey>();

export function EntryEditor() {
  const { navigate } = useAdminRouter();
  const [{ type, id }] = useState<{
    type: string | null;
    id: string | null;
  }>(() => {
    if (typeof window === "undefined") {
      return { type: null, id: null };
    }
    return resolveEntryParams(window.location.pathname);
  });
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [contentTypeId, setContentTypeId] = useState<string | null>(null);
  const [contentTypeName, setContentTypeName] = useState<string | null>(null);
  const [fields, setFields] = useState<ContentField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<EntryStatus>("draft");
  // Visibility (514-03). Two password states only: "" = untouched (keep the
  // stored hash), a non-empty string = a newly typed password. Removing a
  // password is done by switching visibility to public/private (514-01 §3).
  const [visibility, setVisibility] = useState<EntryVisibility>("public");
  const [accessPassword, setAccessPassword] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const setUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };
  const [hasUnsavedMetadataChanges, setHasUnsavedMetadataChanges] = useState(false);
  const hasUnsavedMetadataChangesRef = useRef(false);
  const editedMetadataFieldsRef = useRef<Set<MetadataFieldKey>>(new Set());
  const setMetadataUnsavedChanges = (value: boolean) => {
    hasUnsavedMetadataChangesRef.current = value;
    if (!value) editedMetadataFieldsRef.current.clear();
    setHasUnsavedMetadataChanges(value);
  };
  const markMetadataEdited = (field: MetadataFieldKey) => {
    editedMetadataFieldsRef.current.add(field);
    setMetadataUnsavedChanges(true);
  };
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [siteSettings, setSiteSettings] = useState<SiteSettingsResponse | null>(null);
  const { previewOpen, setPreviewOpen, previewUrl, previewLoading, previewError, openPreview } =
    useEntryRuntimePreview(type, id);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [taxonomyOverview, setTaxonomyOverview] = useState<TaxonomyOverview | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const schemaFieldNames = useMemo(() => new Set(fields.map((field) => field.name)), [fields]);
  const hiddenSchemaFieldNames = useMemo(() => new Set<string>(), []);

  const applyEntry = useCallback(
    (entryResult: EntryDetail, contentType: ContentTypeSummary, options?: ApplyEntryOptions) => {
      const mappedFields = fieldsFromSchema(contentType.schema).filter(
        (field) => !hiddenSchemaFieldNames.has(field.name)
      );
      const preserveContentEdits = options?.preserveContentEdits === true;
      const preserveMetadataEdits = options?.preserveMetadataEdits === true;
      setFields(mappedFields);
      setEntry(entryResult);
      setContentTypeId(contentType.id);
      setContentTypeName(contentType.name);
      setTitle((current) =>
        preserveContentEdits && current.length > 0 ? current : entryResult.title
      );
      setSlug((current) =>
        preserveContentEdits && current.length > 0 ? current : entryResult.slug
      );
      const baseValues = buildInitialValues(mappedFields, entryResult.data ?? {});
      setValues((current) => (preserveContentEdits ? { ...baseValues, ...current } : baseValues));
      if (!preserveContentEdits) setUnsavedChanges(false);
      // Every metadata value the user did NOT touch is still hydrated from the snapshot:
      // keeping the whole channel would leave untouched controls on their pristine mount
      // defaults ("draft", "public", no schedule, empty SEO), and the metadata panel PATCHes
      // all of them together, so the next save would unpublish or un-restrict the entry.
      const keptMetadataFields = preserveMetadataEdits
        ? editedMetadataFieldsRef.current
        : NO_EDITED_METADATA_FIELDS;
      if (!keptMetadataFields.has("status")) setStatus(entryResult.status);
      if (!keptMetadataFields.has("visibility")) setVisibility(entryResult.visibility);
      if (!keptMetadataFields.has("accessPassword")) setAccessPassword("");
      if (!keptMetadataFields.has("scheduledAt")) setScheduledAt(entryResult.scheduledAt ?? "");
      if (!keptMetadataFields.has("seoDescription")) {
        setSeoDescription(entryResult.seo?.description ?? "");
      }
      if (!preserveMetadataEdits) setMetadataUnsavedChanges(false);
      setError(null);
      setRemoteUpdatePending(false);
    },
    [hiddenSchemaFieldNames]
  );

  const loadTaxonomy = useCallback(async (contentTypeId: string, entryResult: EntryDetail) => {
    let overview: TaxonomyOverview | null = null;
    try {
      overview = await getTaxonomyOverview(contentTypeId);
    } catch {
      overview = null;
    }
    setTaxonomyOverview(overview);
    setSelectedCategoryId(entryResult.taxonomy?.category?.id ?? null);
    setSelectedTagIds(entryResult.taxonomy?.tags?.map((tag) => tag.id) ?? []);
  }, []);

  const resolveContentType = useCallback(
    async (force?: boolean) => {
      if (!type) return null;
      const cached = getCachedContentTypes()?.find((item) => item.slug === type) ?? null;
      if (cached && !force) return cached;
      const types = await listContentTypesCached({ force: true });
      return types.find((item) => item.slug === type) ?? null;
    },
    [type]
  );

  const refreshEntry = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!type || !id) return;
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      setError(null);
      try {
        const [entryResult, contentType] = await Promise.all([
          getEntryCached(type, id, { force: true }),
          resolveContentType(true),
        ]);
        if (!contentType) {
          setError("Content type not found.");
          return;
        }
        if (!entryResult) return;
        if (
          !options?.allowUnsaved &&
          (hasUnsavedChangesRef.current || hasUnsavedMetadataChangesRef.current)
        ) {
          setRemoteUpdatePending(true);
          return;
        }
        applyEntry(entryResult, contentType);
        await loadTaxonomy(contentType.id, entryResult);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load entry.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyEntry, id, loadTaxonomy, resolveContentType, type]
  );

  useEffect(() => {
    if (!type || !id) return;
    let active = true;
    Promise.all([
      getEntryCached(type, id, { force: true }),
      listContentTypesCached({ force: true }),
    ])
      .then(async ([entryResult, contentTypes]) => {
        if (!active) return;
        const contentType = contentTypes.find((item) => item.slug === type) ?? null;
        if (!contentType) {
          setError("Content type not found.");
          return;
        }
        if (!entryResult) return;
        // The first hydration is the baseline the local edits are based on, not a remote
        // update: skipping it left `slug` empty and every field value unpopulated, and the
        // next save persisted that emptiness. Apply it, keeping what the user already typed
        // in EITHER channel — the metadata panel is writable before hydration too, so
        // preserving only the content channel silently reverted a pre-hydration status,
        // visibility, schedule or SEO edit and cleared its unsaved-changes warning.
        applyEntry(entryResult, contentType, {
          preserveContentEdits: hasUnsavedChangesRef.current,
          preserveMetadataEdits: hasUnsavedMetadataChangesRef.current,
        });
        await loadTaxonomy(contentType.id, entryResult);
      })
      .catch((err) => {
        if (!active) return;
        setError(resolveEditorErrorMessage(err, "Failed to load entry."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyEntry, id, loadTaxonomy, type]);

  useEffect(() => {
    if (!type || !id) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.entryDetail(type, id)) return;
      refreshEntry({ setLoading: false }).catch(() => undefined);
    });
  }, [id, refreshEntry, type]);

  // Called here rather than beside the other useState calls so the effects it
  // registers keep their original position in the mount effect order.
  const relationTargets = useEntryRelationTargets();

  useEffect(() => {
    let active = true;
    getSiteSettings()
      .then((settings) => {
        if (active) setSiteSettings(settings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const hasAnyUnsavedChanges = hasUnsavedChanges || hasUnsavedMetadataChanges;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasAnyUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasAnyUnsavedChanges]);

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setUnsavedChanges(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (schemaFieldNames.has("title")) {
      setValues((prev) => ({ ...prev, title: value }));
    }
    setUnsavedChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    if (schemaFieldNames.has("slug")) {
      setValues((prev) => ({ ...prev, slug: value }));
    }
    setUnsavedChanges(true);
  };

  const handleSaveDraft = async (options?: { successMessage?: string }) => {
    if (!type || !id) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateEntry(type, id, {
        title,
        slug,
        data: buildEntryPayloadData({
          fields,
          values,
          entry,
          title,
          slug,
          hiddenFieldNames: hiddenSchemaFieldNames,
          schemaFieldNames,
        }),
      });
      setEntry(updated);
      setStatus(updated.status);
      setScheduledAt(updated.scheduledAt ?? scheduledAt);
      setSeoDescription(updated.seo?.description ?? seoDescription);
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      toast.success(options?.successMessage ?? "Draft saved.");
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to save entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!type || !id) return;
    if (checklist.blockingIssues.length > 0) {
      setError(checklist.blockingIssues.join(" "));
      return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      if (status === "published") {
        await handleSaveDraft({ successMessage: "Entry updated." });
      } else {
        await publishEntry(type, id);
        const updated = await getEntryCached(type, id, { force: true });
        if (updated) {
          setEntry(updated);
          setStatus(updated.status);
          setScheduledAt(updated.scheduledAt ?? "");
          setSeoDescription(updated.seo?.description ?? "");
        }
        setUnsavedChanges(false);
        setRemoteUpdatePending(false);
        toast.success("Entry published.");
      }
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to publish entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleStatusChange = (nextStatus: EntryStatus) => {
    if (!type || !id) return;
    setStatus(nextStatus);
    markMetadataEdited("status");
  };

  const handleVisibilityChange = (nextVisibility: EntryVisibility) => {
    setVisibility(nextVisibility);
    // Switching away from password mode discards any typed value (removal is
    // driven by the visibility switch, not a separate clear signal — 514-01 §3).
    if (nextVisibility !== "password") {
      setAccessPassword("");
    }
    markMetadataEdited("visibility");
  };

  const handleAccessPasswordChange = (value: string) => {
    setAccessPassword(value);
    markMetadataEdited("accessPassword");
  };

  const handleScheduledAtChange = (value: string) => {
    setScheduledAt(value);
    markMetadataEdited("scheduledAt");
  };

  const handleSeoDescriptionChange = (value: string) => {
    setSeoDescription(value);
    markMetadataEdited("seoDescription");
  };

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setMetadataUnsavedChanges(true);
  };

  const handleTagIdsChange = (tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    setMetadataUnsavedChanges(true);
  };

  // Revisions seam (TASK-487-02-L02): opens the future revision drawer. No-op
  // for now so the PageHeader "History" action renders as a documented insertion
  // point without fetching/rendering revision data.
  const handleOpenRevisions = () => {
    // Intentionally empty until TASK-487-02-L02 wires the EntryRevisionDrawer.
  };

  const handleCreateTerm = async (
    kind: "category" | "tag",
    name: string
  ): Promise<ContentTerm | null> => {
    const taxonomy =
      kind === "category"
        ? taxonomyOverview?.taxonomies.category
        : taxonomyOverview?.taxonomies.tag;
    if (!taxonomy) return null;
    try {
      const created = await createTaxonomyTerm(taxonomy.id, { name });
      setTaxonomyOverview((prev) => {
        if (!prev) return prev;
        const termsKey = kind === "category" ? "categories" : "tags";
        const nextTerms = [...prev.terms[termsKey], created].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        return {
          ...prev,
          terms: {
            ...prev.terms,
            [termsKey]: nextTerms,
          },
        };
      });
      return created;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create term.");
      }
      return null;
    }
  };

  const handleSaveMetadata = async () => {
    if (!type || !id) return;
    setIsSavingMetadata(true);
    setError(null);

    const prepared = buildEntryMetadataUpdate({
      status,
      visibility,
      accessPassword,
      scheduledAt,
      seoDescription,
      taxonomyOverview,
      selectedCategoryId,
      selectedTagIds,
    });
    if (!prepared.ok) {
      setError(prepared.message);
      toast.error(prepared.message);
      setIsSavingMetadata(false);
      return;
    }

    try {
      const updated = await updateEntryMetadata(type, id, prepared.payload);
      setEntry(updated);
      setStatus(updated.status);
      setVisibility(updated.visibility);
      setAccessPassword("");
      setScheduledAt(updated.scheduledAt ?? "");
      setSeoDescription(updated.seo?.description ?? "");
      setSelectedCategoryId(updated.taxonomy?.category?.id ?? null);
      setSelectedTagIds(updated.taxonomy?.tags?.map((tag) => tag.id) ?? []);
      setMetadataUnsavedChanges(false);
      setRemoteUpdatePending(false);
      toast.success("Metadata saved.");
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to save metadata.");
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!type || !id) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteEntry(type, id);
      toast.success("Entry deleted.");
      navigate("/entries");
    } catch (err) {
      const message = resolveEditorErrorMessage(err, "Failed to delete entry.");
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const taxonomyState = taxonomyOverview
    ? {
        categoryEnabled: Boolean(taxonomyOverview.taxonomies.category),
        tagEnabled: Boolean(taxonomyOverview.taxonomies.tag),
        selectedCategoryId,
        selectedTagIds,
        categories: taxonomyOverview.terms.categories ?? [],
        tags: taxonomyOverview.terms.tags ?? [],
      }
    : null;
  const seoDisplay = useMemo(() => {
    const context = resolveContentSlugRouteContext(siteSettings, type ?? "content");
    return resolveContentSlugDisplay(context, slug);
  }, [siteSettings, slug, type]);
  const taxonomySettingsHref = contentTypeId
    ? `/content-types/${encodeURIComponent(contentTypeId)}`
    : null;

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const { singular: typeSingular, plural: typePlural } = getContentTypeLabels(
    contentTypeName ?? type ?? ""
  );
  const typeLabel = typePlural;
  const editorLabel = `Edit ${typeSingular}`;
  const helpItems = [
    "Fields are defined by the content type schema.",
    "Media fields pull assets from the Media Library.",
    "Relation fields link entries together (e.g. Team → Projects).",
    "Use categories and tags to organize and filter content.",
  ];
  const checklist = buildEntryChecklist({
    title,
    slug,
    status,
    scheduledAt,
    fields,
    values,
  });
  const missingRequiredNames = new Set(checklist.missingRequiredFields.map((field) => field.name));
  const { groups, contentGroup, otherGroups } = useMemo(
    () => buildEntryFieldGroups(fields),
    [fields]
  );

  const metadataPanelProps = {
    status,
    onStatusChange: handleStatusChange,
    scheduledAt,
    onScheduledAtChange: handleScheduledAtChange,
    visibility,
    onVisibilityChange: handleVisibilityChange,
    accessPassword,
    onAccessPasswordChange: handleAccessPasswordChange,
    hasPassword: entry?.hasPassword ?? false,
    title,
    slug,
    seoPreviewUrl: seoDisplay.value,
    seoDescription,
    onSeoDescriptionChange: handleSeoDescriptionChange,
    checklist,
    taxonomy: taxonomyState,
    onCategoryChange: handleCategoryChange,
    onTagIdsChange: handleTagIdsChange,
    onCreateCategory: (name: string) => handleCreateTerm("category", name),
    onCreateTag: (name: string) => handleCreateTerm("tag", name),
    helpItems,
    taxonomySettingsHref,
    author: entry?.author ?? null,
    createdAt: entry?.createdAt,
    updatedAt: entry?.updatedAt,
    entryId: entry?.id,
    onSave: handleSaveMetadata,
    isSaving: isSavingMetadata,
    onDelete: () => setDeleteDialogOpen(true),
    isDeleting,
  };

  return (
    <AdminShell activeHref="/admin/entries" showSearch={false}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Entries", href: "/entries" }, { label: typeLabel }]}
          title={editorLabel}
          description="Compose and publish an entry in this content type."
          actions={
            <>
              <EntryEditorHeaderActions
                status={status}
                hasUnsavedChanges={hasAnyUnsavedChanges}
                isLoading={isLoading}
                isSaving={isSaving}
                isPublishing={isPublishing}
                onPreview={openPreview}
                onSaveDraft={() => void handleSaveDraft()}
                onPublish={handlePublish}
                onHistory={handleOpenRevisions}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 lg:hidden"
                onClick={() => setDetailsOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Details
              </Button>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load entry</AlertTitle>
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
                onClick={() => refreshEntry({ allowUnsaved: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {hasAnyUnsavedChanges ? (
          <Alert>
            <AlertTitle>Unsaved changes</AlertTitle>
            <AlertDescription>
              Save the entry content or metadata to keep your edits.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Content" description="The main body of this entry.">
              <div className="flex flex-col gap-6">
                <EntryTitleSlugFields
                  title={title}
                  slug={slug}
                  titleRef={titleRef}
                  onTitleChange={handleTitleChange}
                  onSlugChange={handleSlugChange}
                />
                {isLoading ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    Loading entry fields...
                  </div>
                ) : contentGroup ? (
                  <EntryFieldSections
                    sections={contentGroup.sections}
                    values={values}
                    relationTargets={relationTargets}
                    missingRequiredNames={missingRequiredNames}
                    onFieldChange={handleFieldChange}
                  />
                ) : groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    This content type has no fields yet.
                  </div>
                ) : null}
              </div>
            </SectionCard>
            {!isLoading
              ? otherGroups.map((group) => (
                  <SectionCard key={group.id} title={group.label}>
                    <EntryFieldSections
                      sections={group.sections}
                      values={values}
                      relationTargets={relationTargets}
                      missingRequiredNames={missingRequiredNames}
                      onFieldChange={handleFieldChange}
                    />
                  </SectionCard>
                ))
              : null}
          </div>
          <div className="hidden lg:block">
            <EntryMetadataPanel {...metadataPanelProps} scrollable={false} />
          </div>
        </div>
      </div>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Content details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit status, SEO, and metadata for this entry.
          </SheetDescription>
          <div className="min-h-0 flex-1">
            <EntryMetadataPanel {...metadataPanelProps} />
          </div>
        </SheetContent>
      </Sheet>
      {/* TASK-487-02-L02 mount point: the <EntryRevisionDrawer> (a Sheet sibling
          of the delete dialog) plugs in here, opened by the PageHeader "History"
          action (handleOpenRevisions). 514-03 provides the trigger + seam only —
          no revision fetch/render. */}
      <EntryDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteDialogOpen(false);
        }}
        title="Delete entry?"
        description={`Delete ${title || "this entry"}? This cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={() => void handleDeleteEntry()}
      />
      <RuntimePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Entry Preview"
        subtitle="Runtime preview (read-only, site theme)."
        canPreview={Boolean(type && id)}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        error={previewError}
        cannotPreviewMessage="Save this entry first to generate a runtime preview."
        iframeTitle="Entry runtime preview"
      />
    </AdminShell>
  );
}
