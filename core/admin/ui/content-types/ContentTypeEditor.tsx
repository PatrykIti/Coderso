import {
  Boxes,
  Copy,
  ExternalLink,
  GitBranch,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  type ContentSchema,
  type ContentTypeConfig,
  deleteContentType,
  duplicateContentType,
  getCachedContentTypes,
  getContentTypeCached,
  listContentTypesCached,
  updateContentType,
} from "@/services/contentTypesClient";
import { listTaxonomies, updateTaxonomyConfig } from "@/services/taxonomyClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

import { ContentTypeFieldsPanel } from "./ContentTypeFieldsPanel";
import { ContentTypePermissionsPanel } from "./ContentTypePermissionsPanel";
import { ContentTypePreviewPanel } from "./ContentTypePreviewPanel";
import { ContentTypeSettingsCard } from "./ContentTypeSettingsCard";
import {
  FieldSettingsPanel,
  makeUniqueFieldName,
  validateFieldName,
  type ContentField,
} from "./SchemaBuilder";
import { buildSchemaFromFields, fieldsFromSchema } from "./schemaMapping";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

type EditorTab = "fields" | "relations" | "settings" | "permissions";

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
  const initialCachedType = useMemo(() => {
    if (!typeId) return null;
    return getCachedContentTypes()?.find((type) => type.id === typeId) ?? null;
  }, [typeId]);
  const initialFields = useMemo(
    () => (initialCachedType ? fieldsFromSchema(initialCachedType.schema) : defaultFields),
    [initialCachedType]
  );
  const initialRelationTargets = useMemo(
    () =>
      (getCachedContentTypes() ?? []).map((type) => ({
        slug: type.slug,
        name: type.name,
      })),
    []
  );
  const [name, setName] = useState(() => initialCachedType?.name ?? "");
  const [slug, setSlug] = useState(() => initialCachedType?.slug ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    () => initialCachedType?.status ?? "draft"
  );
  const [config, setConfig] = useState<ContentTypeConfig>(() => initialCachedType?.config ?? {});
  const [fields, setFields] = useState<ContentField[]>(() => initialFields);
  const [isLoading, setIsLoading] = useState(() => !initialCachedType);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const setUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [relationTargets, setRelationTargets] = useState<Array<{ slug: string; name: string }>>(
    () => initialRelationTargets
  );
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    () => initialFields[0]?.id ?? null
  );
  const [tab, setTab] = useState<EditorTab>("fields");
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const applyContentType = useCallback(
    (result: {
      name: string;
      slug: string;
      schema: ContentSchema;
      status?: "draft" | "published";
      config?: ContentTypeConfig;
    }) => {
      setName(result.name);
      setSlug(result.slug);
      setStatus(result.status ?? "draft");
      setConfig(result.config ?? {});
      const mappedFields = fieldsFromSchema(result.schema);
      setFields(mappedFields);
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      setSelectedFieldId(mappedFields[0]?.id ?? null);
    },
    []
  );

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

    getContentTypeCached(typeId, { force: true })
      .then((result) => {
        if (!active || !result) return;
        applyContentType(result);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load content type.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

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
  }, [applyContentType, typeId]);

  useEffect(() => {
    if (!typeId) return;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.contentTypeDetail(typeId)) return;
      refreshContentType({ setLoading: false }).catch(() => undefined);
    });
  }, [refreshContentType, typeId]);

  useEffect(() => {
    let active = true;
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
  const activeSelectedFieldId =
    selectedFieldId && fields.some((field) => field.id === selectedFieldId)
      ? selectedFieldId
      : (fields[0]?.id ?? null);

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
    if (!typeId || isSaving) return;
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
        config,
      });
      setName(updated.name);
      setSlug(updated.slug);
      setStatus(updated.status);
      setConfig(updated.config ?? {});
      setFields(fieldsFromSchema(updated.schema));
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
      setLastSavedAt(new Date());
      toast.success(nextStatus === "published" ? "Content type published." : "Draft saved.");
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

  // Cmd/Ctrl+S keyboard save (POST-editor ergonomics parity). Ref so the listener always
  // sees the latest handler (which itself guards on `isSaving`/`typeId`).
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === "s" || event.key === "S")) {
        event.preventDefault();
        void handleSaveRef.current("draft");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleDuplicate = async () => {
    if (!typeId) return;
    setIsDuplicating(true);
    setError(null);
    try {
      const duplicated = await duplicateContentType(typeId);
      toast.success(`Duplicated "${duplicated.name}".`);
      navigate(`/advanced/engine/${encodeURIComponent(duplicated.id)}`);
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to duplicate content type.";
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
      navigate("/advanced/engine");
    } catch (err) {
      const message = isApiClientError(err) ? err.message : "Failed to delete content type.";
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

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return; // no-op guard
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= fields.length || toIndex >= fields.length) {
      return; // bounds guard (drop-outside / stale index)
    }
    const next = fields.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    handleFieldChange(next); // order PERSISTS via buildSchemaFromFields xFieldConfig.order (513-02)
  };

  const handleDuplicateField = (id: string) => {
    const src = fields.find((field) => field.id === id);
    if (!src) return;
    const existingNames = fields.map((field) => ({ id: field.id, name: field.name }));
    const clone: ContentField = {
      ...src,
      id: crypto.randomUUID(),
      name: makeUniqueFieldName(src.name, existingNames),
      label: `${src.label} copy`,
    };
    const at = fields.findIndex((field) => field.id === id);
    handleFieldChange([...fields.slice(0, at + 1), clone, ...fields.slice(at + 1)]);
    setSelectedFieldId(clone.id);
  };

  const requestFieldRemoval = (id?: string) => {
    const target = id ? (fields.find((field) => field.id === id) ?? null) : selectedField;
    if (!target) return;
    setPendingFieldRemoval(target);
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

  const handleTaxonomyToggle = async (key: "categories" | "tags", enabled: boolean) => {
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

  const selectedField = fields.find((field) => field.id === activeSelectedFieldId) ?? null;
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
  const relationFields = useMemo(
    () => fields.filter((field) => field.type === "relation"),
    [fields]
  );

  const displayName = name || "Content type";
  const openSchema = () => {
    if (!typeId) return;
    navigate(`/advanced/engine/${encodeURIComponent(typeId)}/schema`);
  };

  const savedHint = hasUnsavedChanges
    ? "Unsaved changes"
    : lastSavedAt
      ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : null;

  return (
    <AdminShell activeHref="/admin/content-types" breadcrumbs={["Content", "Content Types"]}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          breadcrumbs={[{ label: "Engine", href: "/advanced/engine" }, { label: displayName }]}
          icon={<Boxes />}
          title={
            <span className="flex items-center gap-2">
              {displayName}
              <Badge variant="soft" className="capitalize">
                {status}
              </Badge>
            </span>
          }
          description="Define the fields and behavior of this content type."
          actions={
            <>
              {savedHint ? (
                <span className="hidden text-xs text-muted-foreground sm:inline">{savedHint}</span>
              ) : null}
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={openSchema}
                disabled={!typeId || isLoading}
              >
                <ExternalLink className="size-4" /> Open schema
              </Button>
              <Button
                className="gap-1.5"
                onClick={() => void handleSave("draft")}
                disabled={isSaving || isLoading}
              >
                <Save className="size-4" /> {isSaving ? "Saving..." : "Save"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="More actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={isSaving || isLoading}
                    onSelect={() => void handlePublish()}
                  >
                    <Send className="size-4" /> Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setPreviewSheetOpen(true)}>
                    <PanelsTopLeft className="size-4" /> Schema preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!typeId || isLoading}
                    onSelect={() => {
                      if (!typeId) return;
                      navigate(`/advanced/engine/${encodeURIComponent(typeId)}/collection`);
                    }}
                  >
                    <PanelsTopLeft className="size-4" /> Collection workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isSaving || isLoading || isDuplicating}
                    onSelect={() => void handleDuplicate()}
                  >
                    <Copy className="size-4" /> {isDuplicating ? "Duplicating..." : "Duplicate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    disabled={isSaving || isLoading}
                    onSelect={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load content type</AlertTitle>
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
                onClick={() => refreshContentType({ allowUnsaved: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {hasUnsavedChanges ? (
          <Alert>
            <AlertTitle>Unsaved changes</AlertTitle>
            <AlertDescription>
              Remember to save your content type before leaving this screen.
            </AlertDescription>
          </Alert>
        ) : null}
        {lastRemovedField ? (
          <Alert>
            <AlertTitle>Field removed</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{lastRemovedField.field.label} was removed from the local draft.</span>
              <Button variant="outline" size="sm" onClick={undoFieldRemoval}>
                Undo
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={tab} onValueChange={(value) => setTab(value as EditorTab)}>
          <TabsList variant="line">
            <TabsTrigger value="fields">
              Fields
              <Badge variant="soft" className="ml-1.5">
                {fields.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="relations">
              Relations
              <Badge variant="soft" className="ml-1.5">
                {relationFields.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "fields" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-5">
              <SectionCard
                title="Fields"
                description="Drag to reorder. Click a field to edit it."
                padded={false}
                action={
                  <Button variant="soft" size="sm" className="gap-1.5" onClick={handleAddField}>
                    <Plus className="size-4" /> Add field
                  </Button>
                }
              >
                <ContentTypeFieldsPanel
                  fields={fields}
                  selectedId={activeSelectedFieldId}
                  onSelect={(id) => setSelectedFieldId(id)}
                  onReorder={handleReorder}
                  onDuplicateField={handleDuplicateField}
                  onDeleteField={(id) => requestFieldRemoval(id)}
                />
              </SectionCard>

              <div className="lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsOpen(true)}
                  disabled={!selectedField}
                >
                  Edit field details
                </Button>
              </div>

              <SectionCard
                title="Field settings"
                description="Configure the selected field."
                className="hidden lg:block"
              >
                <FieldSettingsPanel
                  field={selectedField}
                  nameError={nameError}
                  defaultError={defaultError}
                  relationError={relationError}
                  relationTargets={relationTargets}
                  existingNames={fields.map((field) => ({ id: field.id, name: field.name }))}
                  onChange={(next) => {
                    handleFieldChange(fields.map((field) => (field.id === next.id ? next : field)));
                  }}
                  onRemove={() => requestFieldRemoval()}
                  className="h-auto overflow-visible"
                />
              </SectionCard>
            </div>

            <ContentTypeSettingsCard
              slug={slug}
              config={config}
              disabled={isLoading}
              onSlugChange={(next) => {
                setSlug(next);
                setUnsavedChanges(true);
              }}
              onConfigChange={(next) => {
                setConfig(next);
                setUnsavedChanges(true);
              }}
            />
          </div>
        ) : null}

        {tab === "relations" ? (
          <SectionCard
            title="Relations"
            description="Fields that link this type to other content types."
          >
            {relationFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No relation fields yet. Add a field of type &ldquo;Relation&rdquo; to link this type
                to another content type.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {relationFields.map((field) => {
                  const target = relationTargets.find(
                    (item) => item.slug === field.relation?.target
                  );
                  return (
                    <div key={field.id} className="flex items-center gap-3 py-3">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                        <GitBranch className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{field.label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {target?.name ?? field.relation?.target ?? "Not linked"}
                          {field.relation?.multiple ? " · many" : " · one"}
                        </div>
                      </div>
                      <Badge variant="soft">Relation</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        ) : null}

        {tab === "settings" ? (
          <div className="flex flex-col gap-6">
            <SectionCard title="Details" description="Identify this content type.">
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
              </div>
            </SectionCard>
            <SectionCard
              title="Taxonomies"
              description="Enable categories and tags for entries of this content type."
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
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
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
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
              </div>
            </SectionCard>
            <Card className="border-destructive/30">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Delete the content type schema only when no entries or dependent owners use it.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  This action is blocked by the server if entries, screens, routes, taxonomies, or
                  listings still reference this type.
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
        ) : null}

        {tab === "permissions" ? (
          <ContentTypePermissionsPanel
            permissions={config.permissions}
            disabled={isLoading}
            onChange={(matrix) => {
              const next: ContentTypeConfig = { ...config };
              if (Object.keys(matrix).length > 0) next.permissions = matrix;
              else delete next.permissions;
              setConfig(next);
              setUnsavedChanges(true);
            }}
          />
        ) : null}
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Field details</SheetTitle>
          <SheetDescription className="sr-only">Edit the selected field details.</SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <FieldSettingsPanel
              field={selectedField}
              nameError={nameError}
              defaultError={defaultError}
              relationError={relationError}
              relationTargets={relationTargets}
              existingNames={fields.map((field) => ({ id: field.id, name: field.name }))}
              onChange={(next) => {
                handleFieldChange(fields.map((field) => (field.id === next.id ? next : field)));
              }}
              onRemove={() => requestFieldRemoval()}
            />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Schema preview</SheetTitle>
          <SheetDescription className="sr-only">View the generated JSON schema.</SheetDescription>
          <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
            <ContentTypePreviewPanel name={name} slug={slug} fields={fields} />
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete content type?"
        description={
          <>
            <span className="font-medium text-foreground">{name}</span> ({slug}) will be removed
            only if no entries or dependent owners reference it.
          </>
        }
        confirmLabel="Delete type"
        confirmingLabel="Deleting..."
        isConfirming={isDeleting}
        onConfirm={handleDelete}
      >
        The server blocks deletion for entries, custom screens, taxonomies, content routes, and
        listings. This cannot be undone after it succeeds.
      </ConfirmActionDialog>
      <ConfirmActionDialog
        open={Boolean(pendingFieldRemoval)}
        onOpenChange={(open) => {
          if (!open) setPendingFieldRemoval(null);
        }}
        title="Remove field?"
        description={
          <>
            <span className="font-medium text-foreground">{pendingFieldRemoval?.label}</span> (
            {pendingFieldRemoval?.name}) will be removed from this local schema draft.
          </>
        }
        confirmLabel="Remove field"
        tone="warning"
        onConfirm={confirmFieldRemoval}
      >
        Removing a field can affect existing entries after you save the schema. You can undo the
        local removal before saving.
      </ConfirmActionDialog>
    </AdminShell>
  );
}
