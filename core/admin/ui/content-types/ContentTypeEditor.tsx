import { Save, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  getCachedContentTypes,
  getContentTypeCached,
  listContentTypesCached,
  updateContentType,
} from "@/services/contentTypesClient";
import { listTaxonomies, updateTaxonomyConfig } from "@/services/taxonomyClient";
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
  const [typeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveContentTypeIdFromPath(window.location.pathname);
  });
  const [name, setName] = useState("" as string);
  const [slug, setSlug] = useState("" as string);
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
  const [taxonomyConfig, setTaxonomyConfig] = useState({
    categories: false,
    tags: false,
  });
  const [isTaxonomySaving, setIsTaxonomySaving] = useState(false);

  const applyContentType = useCallback((result: { name: string; slug: string; schema: ContentSchema }) => {
    setName(result.name);
    setSlug(result.slug);
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
  }, [refreshContentType, typeId]);

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
      required: false,
    };
    handleFieldChange([...fields, nextField]);
    setSelectedFieldId(nextField.id);
  };

  const handleSave = async () => {
    if (!typeId) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateContentType(typeId, {
        name: name.trim(),
        slug: slug.trim(),
        schema,
      });
      setName(updated.name);
      setSlug(updated.slug);
      setFields(fieldsFromSchema(updated.schema));
      setUnsavedChanges(false);
      setRemoteUpdatePending(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save content type.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSave();
  };

  const handleFieldChange = (next: ContentField[]) => {
    setFields(next);
    setUnsavedChanges(true);
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
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b px-6 py-6">
          <PageHeader
            title="Content Type Editor"
            description="Define schema fields and validation rules."
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
                onClick={handleSave}
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
        <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 py-6">
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
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
              <FieldsListPanel
                className="lg:hidden flex-1 min-h-0"
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
                onChange={(next) => {
                  handleFieldChange(
                    fields.map((field) => (field.id === next.id ? next : field))
                  );
                }}
                onRemove={() => {
                  if (!selectedField) return;
                  handleFieldChange(fields.filter((field) => field.id !== selectedField.id));
                }}
                className="hidden lg:flex flex-1 min-h-0"
              />
            </div>
          )}
        </div>
      </div>
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
              onChange={(next) => {
                handleFieldChange(
                  fields.map((field) => (field.id === next.id ? next : field))
                );
              }}
              onRemove={() => {
                if (!selectedField) return;
                handleFieldChange(fields.filter((field) => field.id !== selectedField.id));
                setDetailsOpen(false);
              }}
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
    </EditorShell>
  );
}
