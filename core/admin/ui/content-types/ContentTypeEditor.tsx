import { Copy, Save, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  type ContentSchema,
  deleteContentType,
  duplicateContentType,
  getCachedContentTypes,
  getContentTypeCached,
  listContentTypesCached,
  updateContentType,
} from "@/services/contentTypesClient";
import { listTaxonomies, updateTaxonomyConfig } from "@/services/taxonomyClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ContentTypePreviewPanel } from "./ContentTypePreviewPanel";
import {
  FieldSettingsPanel,
  FieldsListPanel,
  validateFieldName,
  type ContentField,
} from "./SchemaBuilder";
import {
  buildSchemaFromFields,
  fieldsFromSchema,
} from "./schemaMapping";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

const defaultFields: ContentField[] = [
  {
    id: "field-title",
    name: "title",
    type: "text",
    label: "Title",
    required: true,
    help: "Short title for listings",
  },
  {
    id: "field-body",
    name: "body",
    type: "richtext",
    label: "Body",
  },
];

export function ContentTypeEditor() {
  const { navigate } = useAdminRouter();
  const [typeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveContentTypeIdFromPath(window.location.pathname);
  });
  const [name, setName] = useState("" as string);
  const [slug, setSlug] = useState("" as string);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [fields, setFields] = useState<ContentField[]>(defaultFields);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const setUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [relationTargets, setRelationTargets] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    defaultFields[0]?.id ?? null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewHidden, setPreviewHidden] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [pendingFieldRemoval, setPendingFieldRemoval] = useState<ContentField | null>(null);
  const [lastRemovedField, setLastRemovedField] = useState<{
    field: ContentField;
    index: number;
  } | null>(null);
  const [taxonomyConfig, setTaxonomyConfig] = useState({
    categories: false,
    tags: false,
  });
  const [isTaxonomySaving, setIsTaxonomySaving] = useState(false);

  const applyContentType = useCallback((result: { name: string; slug: string; schema: ContentSchema; status?: "draft" | "published" }) => {
    setName(result.name);
    setSlug(result.slug);
    setStatus(result.status ?? "draft");
    const mappedFields = fieldsFromSchema(result.schema);
    setFields(mappedFields);
    setUnsavedChanges(false);
    setRemoteUpdatePending(false);
    setSelectedFieldId(mappedFields[0]?.id ?? null);
  }, []);

  const refreshContentType = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!typeId) return;
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      try {
        const result = await getContentTypeCached(typeId, { force: true });
        if (!result) return;
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyContentType(result);
        setError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load content type.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyContentType, typeId]
  );

  useEffect(() => {
    if (!typeId) return;
    let active = true;

    const cached = getCachedContentTypes();
    const cachedType = cached?.find((type) => type.id === typeId) ?? null;
    if (cachedType) {
      applyContentType(cachedType);
      setError(null);
      setIsLoading(false);
    }

    refreshContentType({ setLoading: !cachedType }).catch(() => undefined);

    (async () => {
      try {
        const { items } = await listTaxonomies(typeId);
        if (!active) return;
        setTaxonomyConfig({
          categories: items.some((item) => item.kind === "category"),
          tags: items.some((item) => item.kind === "tag"),
        });
      } catch {
        if (!active) return;
        setTaxonomyConfig({ categories: false, tags: false });
      }
    })();

    return () => {
      active = false;
    };
  }, [applyContentType, refreshContentType, typeId]);

  useEffect(() => {
    if (!typeId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.contentTypeDetail(typeId)) return;
      refreshContentType({ setLoading: false }).catch(() => undefined);
    });
  }, [refreshContentType, typeId]);

  useEffect(() => {
    let active = true;
    const cached = getCachedContentTypes();
    if (cached) {
      setRelationTargets(cached.map((type) => ({ slug: type.slug, name: type.name })));
    }
    listContentTypesCached()
      .then((types) => {
        if (!active) return;
        setRelationTargets(types.map((type) => ({ slug: type.slug, name: type.name })));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    if (fields.length === 0) {
      setSelectedFieldId(null);
      return;
    }
    if (!selectedFieldId || !fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0]?.id ?? null);
    }
  }, [fields, selectedFieldId]);

  const schema = useMemo(() => buildSchemaFromFields(fields), [fields]);

  const handleAddField = () => {
    const suffix = fields.length + 1;
    const nameValue = `field-${suffix}`;
    const nextField: ContentField = {
      id: crypto.randomUUID(),
      name: nameValue,
      type: "text",
      label: "New field",
      keyAuto: true,
      required: false,
    };
    handleFieldChange([...fields, nextField]);
    setSelectedFieldId(nextField.id);
  };

  const validateFieldsForSave = () => {
    const names = fields.map((field) => ({ id: field.id, name: field.name }));
    for (const field of fields) {
      const fieldNameError = validateFieldName(field.name, names, field.id);
      if (fieldNameError) return fieldNameError;
      if (field.type === "select") {
        const optionValues = new Set<string>();
        for (const option of field.options ?? []) {
          if (!option.label.trim() || !option.value.trim()) {
            return "Select options need labels and values.";
          }
          if (optionValues.has(option.value)) {
            return "Select option values must be unique.";
          }
          optionValues.add(option.value);
        }
      }
      if (field.type === "number") {
        const { min, max, step, format } = field.number ?? {};
        if (typeof min === "number" && typeof max === "number" && min > max) {
          return "Number field minimum cannot exceed maximum.";
        }
        if (typeof step === "number" && step <= 0) {
          return "Number field step must be positive.";
        }
        if (
          format === "integer" &&
          field.defaultValue &&
          !Number.isInteger(Number(field.defaultValue))
        ) {
          return "Integer number fields cannot use decimal defaults.";
        }
      }
    }
    return null;
  };

  const handleSave = async (nextStatus: "draft" | "published" = "draft") => {
    if (!typeId) return;
    const validationError = validateFieldsForSave();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateContentType(typeId, {
        name: name.trim(),
        slug: slug.trim(),
        schema,
        status: nextStatus,
      });
      setName(updated.name);
      setSlug(updated.slug);
      setStatus(updated.status);
      setFields(fieldsFromSchema(updated.schema));
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      toast.success(
        nextStatus === "published" ? "Content type published." : "Draft saved."
      );
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError("Failed to save content type.");
        toast.error("Failed to save content type.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave("published");
  };

  const handleDuplicate = async () => {
    if (!typeId) return;
    setIsDuplicating(true);
    setError(null);
    try {
      const duplicated = await duplicateContentType(typeId);
      toast.success(`Duplicated "${duplicated.name}".`);
      navigate(`/content-types/${encodeURIComponent(duplicated.id)}`);
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to duplicate content type.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!typeId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteContentType(typeId);
      toast.success(`Deleted "${name}".`);
      setDeleteDialogOpen(false);
      navigate("/content-types");
    } catch (err) {
      const message = isApiClientError(err)
        ? err.message
        : "Failed to delete content type.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFieldChange = (next: ContentField[]) => {
    setFields(next);
    setUnsavedChanges(true);
  };

  const requestFieldRemoval = () => {
    if (!selectedField) return;
    setPendingFieldRemoval(selectedField);
  };

  const confirmFieldRemoval = () => {
    if (!pendingFieldRemoval) return;
    const index = fields.findIndex((field) => field.id === pendingFieldRemoval.id);
    const next = fields.filter((field) => field.id !== pendingFieldRemoval.id);
    handleFieldChange(next);
    setSelectedFieldId(next[index]?.id ?? next[index - 1]?.id ?? next[0]?.id ?? null);
    setLastRemovedField({ field: pendingFieldRemoval, index: Math.max(0, index) });
    setPendingFieldRemoval(null);
    setDetailsOpen(false);
  };

  const undoFieldRemoval = () => {
    if (!lastRemovedField) return;
    const next = [...fields];
    next.splice(Math.min(lastRemovedField.index, next.length), 0, lastRemovedField.field);
    handleFieldChange(next);
    setSelectedFieldId(lastRemovedField.field.id);
    setLastRemovedField(null);
  };

  const handleTaxonomyToggle = async (
    key: "categories" | "tags",
    enabled: boolean
  ) => {
    if (!typeId) return;
    const previous = taxonomyConfig;
    setTaxonomyConfig((prev) => ({ ...prev, [key]: enabled }));
    setIsTaxonomySaving(true);
    try {
      const { items } = await updateTaxonomyConfig(typeId, { [key]: enabled });
      setTaxonomyConfig({
        categories: items.some((item) => item.kind === "category"),
        tags: items.some((item) => item.kind === "tag"),
      });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update taxonomy settings.");
      }
      setTaxonomyConfig(previous);
    } finally {
      setIsTaxonomySaving(false);
    }
  };

  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? null;
  const nameError = useMemo(() => {
    if (!selectedField) return null;
    const names = fields.map((field) => ({ id: field.id, name: field.name }));
    return validateFieldName(selectedField.name, names, selectedField.id);
  }, [fields, selectedField]);
  const defaultError =
    selectedField?.required && !selectedField.defaultValue
      ? "Required fields need a default value."
      : null;
  const relationError =
    selectedField?.type === "relation" && !selectedField.relation?.target
      ? "Select a related content type."
      : null;

  return (
    <EditorShell
      activeHref="/admin/content-types"
      leftPanel={
        <FieldsListPanel
          fields={fields}
          selectedId={selectedFieldId}
          onSelect={(id) => setSelectedFieldId(id)}
          onAdd={handleAddField}
        />
      }
      rightPanel={
        previewHidden ? null : (
          <div className="flex h-full min-h-0 flex-col overflow-y-auto p-6">
            <ContentTypePreviewPanel name={name} slug={slug} fields={fields} />
          </div>
        )
      }
      rightPanelClassName="p-0"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Content Types</span>
        </div>
      }
    >
      <>
        <div className="border-b px-6 py-6">
          <PageHeader
            title="Content Type Editor"
            description="Define schema fields and validation rules."
            actions={<Badge variant="outline">{status}</Badge>}
          />
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Unable to load content type</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {remoteUpdatePending ? (
            <Alert className="mt-4">
              <AlertTitle>Updated in another tab</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>New changes are available. Refresh to load the latest version.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshContentType({ allowUnsaved: true })}
                >
                  Refresh
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {hasUnsavedChanges ? (
            <Alert className="mt-4">
              <AlertTitle>Unsaved changes</AlertTitle>
              <AlertDescription>
                Remember to save your content type before leaving this screen.
              </AlertDescription>
            </Alert>
          ) : null}
          {lastRemovedField ? (
            <Alert className="mt-4">
              <AlertTitle>Field removed</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {lastRemovedField.field.label} was removed from the local draft.
                </span>
                <Button variant="outline" size="sm" onClick={undoFieldRemoval}>
                  Undo
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <div className="sticky top-0 z-10 border-b bg-background/80 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setPreviewHidden((prev) => !prev)}
            >
              {previewHidden ? "Show preview" : "Hide preview"}
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleDuplicate}
                disabled={isSaving || isLoading || isDuplicating}
              >
                <Copy className="h-4 w-4" />
                {isDuplicating ? "Duplicating..." : "Duplicate"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void handleSave("draft")}
                disabled={isSaving || isLoading}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handlePublish}
                disabled={isSaving || isLoading}
              >
                <Send className="h-4 w-4" />
                Publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isSaving || isLoading}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
        <div className="sticky top-0 z-10 border-b bg-background/80 px-6 py-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsOpen(true)}
              disabled={!selectedField}
            >
              Field details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewSheetOpen(true)}
            >
              Schema preview
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Name
              </label>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setUnsavedChanges(true);
                }}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Slug
              </label>
              <Input
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setUnsavedChanges(true);
                }}
                disabled={isLoading}
              />
            </div>
          </div>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Taxonomies</CardTitle>
              <CardDescription>
                Enable categories and tags for entries of this content type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-xs text-muted-foreground">
                    Single category selector per entry.
                  </p>
                </div>
                <Switch
                  checked={taxonomyConfig.categories}
                  onCheckedChange={(checked) =>
                    void handleTaxonomyToggle("categories", checked === true)
                  }
                  disabled={isLoading || isTaxonomySaving}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Tags</p>
                  <p className="text-xs text-muted-foreground">
                    Multi-tag selector with quick add.
                  </p>
                </div>
                <Switch
                  checked={taxonomyConfig.tags}
                  onCheckedChange={(checked) =>
                    void handleTaxonomyToggle("tags", checked === true)
                  }
                  disabled={isLoading || isTaxonomySaving}
                />
              </div>
            </CardContent>
          </Card>
          {isLoading ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Loading schema builder...
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <FieldsListPanel
                className="lg:hidden"
                fields={fields}
                selectedId={selectedFieldId}
                onSelect={(id) => setSelectedFieldId(id)}
                onAdd={handleAddField}
              />
              <FieldSettingsPanel
                field={selectedField}
                nameError={nameError}
                defaultError={defaultError}
                relationError={relationError}
                relationTargets={relationTargets}
                existingNames={fields.map((field) => ({ id: field.id, name: field.name }))}
                onChange={(next) => {
                  handleFieldChange(
                    fields.map((field) => (field.id === next.id ? next : field))
                  );
                }}
                onRemove={requestFieldRemoval}
                className="hidden lg:flex h-auto overflow-visible"
              />
              <Card className="border-destructive/30">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Delete the content type schema only when no entries or dependent owners use it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    This action is blocked by the server if entries, screens, routes,
                    taxonomies, or listings still reference this type.
                  </div>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete type
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Field details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit the selected field details.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <FieldSettingsPanel
              field={selectedField}
              nameError={nameError}
              defaultError={defaultError}
              relationError={relationError}
              relationTargets={relationTargets}
              existingNames={fields.map((field) => ({ id: field.id, name: field.name }))}
              onChange={(next) => {
                handleFieldChange(
                  fields.map((field) => (field.id === next.id ? next : field))
                );
              }}
              onRemove={requestFieldRemoval}
            />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Schema preview</SheetTitle>
          <SheetDescription className="sr-only">
            View the generated JSON schema.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <ContentTypePreviewPanel name={name} slug={slug} fields={fields} />
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete content type?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{name}</span>{" "}
              ({slug}) will be removed only if no entries or dependent owners
              reference it.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
            The server blocks deletion for entries, custom screens, taxonomies,
            content routes, and listings. This cannot be undone after it succeeds.
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(pendingFieldRemoval)}
        onOpenChange={(open) => {
          if (!open) setPendingFieldRemoval(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove field?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">
                {pendingFieldRemoval?.label}
              </span>{" "}
              ({pendingFieldRemoval?.name}) will be removed from this local schema draft.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            Removing a field can affect existing entries after you save the schema.
            You can undo the local removal before saving.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingFieldRemoval(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmFieldRemoval}>
              Remove field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EditorShell>
  );
}
