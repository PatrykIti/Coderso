import { RefreshCcw, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiClientError } from "@/services/apiClient";
import { getContentTypeBySlug } from "@/services/contentTypesClient";
import {
  getEntry,
  previewEntry,
  publishEntry,
  updateEntryMetadata,
  updateEntry,
  type EntryDetail,
} from "@/services/entriesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { EntryEditorHeader, EntryEditorHeaderActions } from "./EntryEditorHeader";
import { EntryMetadataPanel, type EntryStatus } from "./EntryMetadataPanel";
import { FieldRenderer } from "./FieldRenderer";
import type { ContentField } from "../content-types/SchemaBuilder";
import {
  buildSchemaFromFields,
  fieldsFromSchema,
} from "../content-types/schemaMapping";

const resolveEntryParams = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "entries");
  if (index === -1) return { type: null, id: null };
  return { type: parts[index + 1] ?? null, id: parts[index + 2] ?? null };
};

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

function buildInitialValues(
  fields: ContentField[],
  data: Record<string, unknown>
) {
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

export function EntryEditor() {
  const [{ type, id }] = useState<{ type: string | null; id: string | null }>(() => {
    if (typeof window === "undefined") {
      return { type: null, id: null };
    }
    return resolveEntryParams(window.location.pathname);
  });
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [contentTypeName, setContentTypeName] = useState<string | null>(null);
  const [fields, setFields] = useState<ContentField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<EntryStatus>("draft");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const schemaFieldNames = useMemo(
    () => new Set(fields.map((field) => field.name)),
    [fields]
  );

  useEffect(() => {
    if (!type || !id) return;
    let active = true;
    Promise.all([getEntry(type, id), getContentTypeBySlug(type)])
      .then(([entryResult, contentType]) => {
        if (!active) return;
        if (!contentType) {
          setError("Content type not found.");
          return;
        }
        const mappedFields = fieldsFromSchema(contentType.schema);
        setFields(mappedFields);
        setEntry(entryResult);
        setContentTypeName(contentType.name);
        setTitle(entryResult.title);
        setSlug(entryResult.slug);
        setValues(buildInitialValues(mappedFields, entryResult.data ?? {}));
        setStatus(entryResult.status);
        setHasUnsavedChanges(false);
        setScheduledAt(entryResult.scheduledAt ?? "");
        setTags(entryResult.tags ?? []);
        setSeoDescription(entryResult.seo?.description ?? "");
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load entry.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, type]);

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (schemaFieldNames.has("title")) {
      setValues((prev) => ({ ...prev, title: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    if (schemaFieldNames.has("slug")) {
      setValues((prev) => ({ ...prev, slug: value }));
    }
    setHasUnsavedChanges(true);
  };

  const handlePreview = async () => {
    if (!type || !id) return;
    try {
      const result = await previewEntry(type, id, 30);
      if (typeof window !== "undefined") {
        window.open(result.previewUrl, "_blank", "noopener");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to generate preview.");
      }
    }
  };

  const buildPayloadData = () => {
    const schema = buildSchemaFromFields(fields);
    const data: Record<string, unknown> = {};
    Object.keys(schema.properties).forEach((key) => {
      if (values[key] !== undefined) data[key] = values[key];
    });
    if (schemaFieldNames.has("title")) data.title = title;
    if (schemaFieldNames.has("slug")) data.slug = slug;
    return data;
  };

  const handleSaveDraft = async () => {
    if (!type || !id) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateEntry(type, id, {
        title,
        slug,
        data: buildPayloadData(),
      });
      setEntry(updated);
      setStatus(updated.status);
      setScheduledAt(updated.scheduledAt ?? scheduledAt);
      setTags(updated.tags ?? tags);
      setSeoDescription(updated.seo?.description ?? seoDescription);
      setHasUnsavedChanges(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save entry.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!type || !id) return;
    setIsPublishing(true);
    setError(null);
    try {
      if (status === "published") {
        await handleSaveDraft();
      } else {
        await publishEntry(type, id);
        const updated = await getEntry(type, id);
        setEntry(updated);
        setStatus(updated.status);
        setScheduledAt(updated.scheduledAt ?? "");
        setTags(updated.tags ?? []);
        setSeoDescription(updated.seo?.description ?? "");
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to publish entry.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleStatusChange = async (nextStatus: EntryStatus) => {
    if (!type || !id) return;
    setStatus(nextStatus);
  };

  const handleGenerateSlug = () => {
    handleSlugChange(slugify(title));
  };

  const handleSaveMetadata = async () => {
    if (!type || !id) return;
    setIsSavingMetadata(true);
    setError(null);

    let scheduledAtIso: string | null = null;
    if (scheduledAt.trim()) {
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        setError("Schedule date must be a valid ISO timestamp.");
        setIsSavingMetadata(false);
        return;
      }
      scheduledAtIso = parsed.toISOString();
    }

    if (status === "scheduled" && !scheduledAtIso) {
      setError("Schedule date is required for scheduled entries.");
      setIsSavingMetadata(false);
      return;
    }

    try {
      const updated = await updateEntryMetadata(type, id, {
        status,
        scheduledAt: status === "scheduled" ? scheduledAtIso : null,
        tags,
        seo: { description: seoDescription },
      });
      setEntry(updated);
      setStatus(updated.status);
      setScheduledAt(updated.scheduledAt ?? "");
      setTags(updated.tags ?? []);
      setSeoDescription(updated.seo?.description ?? "");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save metadata.");
      }
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const contentFields = fields.filter(
    (field) => field.type !== "media" && field.type !== "relation"
  );
  const mediaFields = fields.filter((field) => field.type === "media");
  const relationFields = fields.filter((field) => field.type === "relation");

  return (
    <AdminShell
      activeHref="/admin/entries"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <EntryEditorHeader
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
          contentType={contentTypeName ?? type ?? "Entries"}
          entryLabel={entry?.title ?? "Edit Entry"}
        />
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 lg:hidden"
            onClick={() => setDetailsOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Details
          </Button>
          <EntryEditorHeaderActions
            status={status}
            onPreview={handlePreview}
            onPublish={handlePublish}
          />
        </div>
      }
    >
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <ScrollArea className="flex-1 bg-background">
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-10 py-10">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load entry</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {hasUnsavedChanges ? (
              <Alert>
                <AlertTitle>Unsaved changes</AlertTitle>
                <AlertDescription>
                  Save or publish the entry to keep your edits.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-4">
              <Textarea
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                rows={2}
                className="min-h-[96px] resize-none border-none bg-transparent p-0 text-4xl font-semibold leading-tight tracking-tight focus-visible:ring-0"
                placeholder="Enter post title..."
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
                    onClick={handleGenerateSlug}
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Loading entry fields...
              </div>
            ) : (
              <Tabs defaultValue="content" className="space-y-6">
                <TabsList variant="line">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="relations">Relations</TabsTrigger>
                </TabsList>
                <TabsContent value="content" className="space-y-6">
                  {contentFields.map((field) => (
                    <Card key={field.id}>
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">{field.label}</CardTitle>
                          {field.required ? <Badge variant="outline">Required</Badge> : null}
                        </div>
                        {field.help ? <CardDescription>{field.help}</CardDescription> : null}
                      </CardHeader>
                      <CardContent>
                        <FieldRenderer
                          field={field}
                          value={values[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="media" className="space-y-6">
                  {mediaFields.map((field) => (
                    <Card key={field.id}>
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">{field.label}</CardTitle>
                          {field.required ? <Badge variant="outline">Required</Badge> : null}
                        </div>
                        {field.help ? <CardDescription>{field.help}</CardDescription> : null}
                      </CardHeader>
                      <CardContent>
                        <FieldRenderer
                          field={field}
                          value={values[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="relations" className="space-y-6">
                  {relationFields.map((field) => (
                    <Card key={field.id}>
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base">{field.label}</CardTitle>
                          {field.required ? <Badge variant="outline">Required</Badge> : null}
                        </div>
                        {field.help ? <CardDescription>{field.help}</CardDescription> : null}
                      </CardHeader>
                      <CardContent>
                        <FieldRenderer
                          field={field}
                          value={values[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </ScrollArea>
        <aside className="hidden w-96 shrink-0 border-l bg-muted/30 lg:flex lg:flex-col">
          <ScrollArea className="flex-1">
            <div className="px-6 py-6">
              <EntryMetadataPanel
                status={status}
                onStatusChange={handleStatusChange}
                scheduledAt={scheduledAt}
                onScheduledAtChange={setScheduledAt}
                title={title}
                slug={slug}
                seoDescription={seoDescription}
                onSeoDescriptionChange={setSeoDescription}
                tags={tags}
                onTagsChange={setTags}
                author={entry?.author ?? null}
                onSave={handleSaveMetadata}
                isSaving={isSavingMetadata}
              />
            </div>
          </ScrollArea>
          <div className="border-t px-6 py-4">
            <Button
              className="w-full"
              onClick={handleSaveDraft}
              disabled={isSaving || isPublishing}
            >
              {isSaving ? "Saving..." : "Save draft"}
            </Button>
          </div>
        </aside>
      </div>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Entry details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit status, SEO, and metadata for this entry.
          </SheetDescription>
          <ScrollArea className="h-full">
            <div className="px-6 py-6">
              <EntryMetadataPanel
                status={status}
                onStatusChange={handleStatusChange}
                scheduledAt={scheduledAt}
                onScheduledAtChange={setScheduledAt}
                title={title}
                slug={slug}
                seoDescription={seoDescription}
                onSeoDescriptionChange={setSeoDescription}
                tags={tags}
                onTagsChange={setTags}
                author={entry?.author ?? null}
                onSave={handleSaveMetadata}
                isSaving={isSavingMetadata}
              />
            </div>
            <div className="border-t px-6 py-4">
              <Button
                className="w-full"
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing}
              >
                {isSaving ? "Saving..." : "Save draft"}
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
