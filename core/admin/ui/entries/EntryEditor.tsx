import { Eye, RefreshCcw, Save, Send, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { getContentTypeBySlug, listContentTypes } from "@/services/contentTypesClient";
import {
  getEntry,
  previewEntry,
  publishEntry,
  updateEntryMetadata,
  updateEntry,
  type EntryDetail,
} from "@/services/entriesClient";
import {
  createTaxonomyTerm,
  getTaxonomyOverview,
  type ContentTerm,
  type TaxonomyOverview,
} from "@/services/taxonomyClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { EntryEditorHeader } from "./EntryEditorHeader";
import { EntryMetadataPanel, type EntryStatus } from "./EntryMetadataPanel";
import { getContentTypeLabels } from "./contentTypeLabels";
import { buildEntryChecklist } from "./entryChecklist";
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
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [relationTargets, setRelationTargets] = useState<
    Array<{ slug: string; name: string }>
  >([]);
  const [taxonomyOverview, setTaxonomyOverview] = useState<TaxonomyOverview | null>(
    null
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const schemaFieldNames = useMemo(
    () => new Set(fields.map((field) => field.name)),
    [fields]
  );

  useEffect(() => {
    if (!type || !id) return;
    let active = true;
    setTaxonomyOverview(null);
    setSelectedCategoryId(null);
    setSelectedTagIds([]);
    Promise.all([getEntry(type, id), getContentTypeBySlug(type)])
      .then(async ([entryResult, contentType]) => {
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
        setSeoDescription(entryResult.seo?.description ?? "");
        setError(null);

        let overview: TaxonomyOverview | null = null;
        try {
          overview = await getTaxonomyOverview(contentType.id);
        } catch {
          overview = null;
        }
        if (!active) return;
        setTaxonomyOverview(overview);
        setSelectedCategoryId(entryResult.taxonomy?.category?.id ?? null);
        setSelectedTagIds(entryResult.taxonomy?.tags?.map((tag) => tag.id) ?? []);
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

  useEffect(() => {
    let active = true;
    listContentTypes()
      .then((types) => {
        if (!active) return;
        setRelationTargets(types.map((item) => ({ slug: item.slug, name: item.name })));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
    if (checklist.blockingIssues.length > 0) {
      setError(checklist.blockingIssues.join(" "));
      return;
    }
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
      const categoryEnabled = Boolean(taxonomyOverview?.taxonomies.category);
      const tagEnabled = Boolean(taxonomyOverview?.taxonomies.tag);
      const taxonomyPayload =
        categoryEnabled || tagEnabled
          ? {
              categoryId: categoryEnabled ? selectedCategoryId : null,
              tagIds: tagEnabled ? selectedTagIds : [],
            }
          : undefined;

      const updated = await updateEntryMetadata(type, id, {
        status,
        scheduledAt: status === "scheduled" ? scheduledAtIso : null,
        taxonomy: taxonomyPayload,
        seo: { description: seoDescription },
      });
      setEntry(updated);
      setStatus(updated.status);
      setScheduledAt(updated.scheduledAt ?? "");
      setSeoDescription(updated.seo?.description ?? "");
      setSelectedCategoryId(updated.taxonomy?.category?.id ?? null);
      setSelectedTagIds(updated.taxonomy?.tags?.map((tag) => tag.id) ?? []);
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

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const { singular: typeSingular, plural: typePlural } = getContentTypeLabels(
    contentTypeName ?? type ?? ""
  );
  const helpItems = [
    "Fields are defined by the content type schema.",
    "Media fields pull assets from the Media Library.",
    "Relation fields link entries together (e.g. Team → Projects).",
    "Use categories and tags to organize and filter content.",
  ];
  const checklist = useMemo(
    () =>
      buildEntryChecklist({
        title,
        slug,
        status,
        scheduledAt,
        fields,
        values,
      }),
    [fields, scheduledAt, slug, status, title, values]
  );
  const missingRequiredNames = useMemo(
    () => new Set(checklist.missingRequiredFields.map((field) => field.name)),
    [checklist.missingRequiredFields]
  );
  const tabGroups = useMemo(() => {
    const resolveTabLabel = (field: ContentField) => {
      const explicitTab = field.layout?.tab?.trim();
      if (explicitTab) return explicitTab;
      if (field.type === "media") return "Media";
      if (field.type === "relation") return "Relations";
      return "Content";
    };

    const tabs = new Map<
      string,
      { label: string; sections: Map<string, { label: string | null; fields: ContentField[] }> }
    >();
    const tabOrder: string[] = [];

    fields.forEach((field) => {
      const tabLabel = resolveTabLabel(field);
      if (!tabs.has(tabLabel)) {
        tabs.set(tabLabel, { label: tabLabel, sections: new Map() });
        tabOrder.push(tabLabel);
      }
      const sectionLabel = field.layout?.section?.trim() ?? "";
      const tab = tabs.get(tabLabel);
      if (!tab) return;
      if (!tab.sections.has(sectionLabel)) {
        tab.sections.set(sectionLabel, {
          label: sectionLabel ? sectionLabel : null,
          fields: [],
        });
      }
      tab.sections.get(sectionLabel)?.fields.push(field);
    });

    return tabOrder.map((label, index) => {
      const tab = tabs.get(label);
      return {
        id: slugify(label) || `tab-${index + 1}`,
        label,
        sections: tab ? Array.from(tab.sections.values()) : [],
      };
    });
  }, [fields]);
  const [activeTab, setActiveTab] = useState("content");

  useEffect(() => {
    if (tabGroups.length === 0) return;
    const hasActive = tabGroups.some((tab) => tab.id === activeTab);
    if (!hasActive) setActiveTab(tabGroups[0].id);
  }, [activeTab, tabGroups]);

  return (
    <AdminShell
      activeHref="/admin/entries"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <EntryEditorHeader
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
          contentType={typePlural}
          entryLabel={entry?.title ?? `Edit ${typeSingular}`}
        />
      }
    >
      <div className="flex h-full min-h-0">
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="sticky top-0 z-10 w-full border-b bg-background/80 px-6 py-3 backdrop-blur">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handlePreview}
                  disabled={isLoading}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isLoading}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save draft"}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handlePublish}
                    disabled={isPublishing || isLoading}
                  >
                    <Send className="h-4 w-4" />
                    {status === "published" ? "Update" : "Publish"}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setDetailsOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Details
                </Button>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
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
                ref={titleRef}
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                rows={1}
                className="min-h-0 h-auto resize-none overflow-hidden rounded-lg border bg-background px-3 py-1 text-3xl font-semibold leading-tight tracking-tight focus-visible:ring-1 focus-visible:ring-ring"
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
            ) : tabGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                This content type has no fields yet.
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList variant="line">
                  {tabGroups.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {tabGroups.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-8">
                    {tab.sections.map((section, index) => (
                      <div key={`${tab.id}-${section.label ?? "default"}-${index}`} className="space-y-4">
                        {section.label ? (
                          <div className="flex items-center gap-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {section.label}
                            </h4>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        ) : null}
                        <div className="grid gap-4 md:grid-cols-12">
                          {section.fields.map((field) => {
                            const width = field.layout?.width ?? "full";
                            const colSpan =
                              width === "half" ? "md:col-span-6" : "md:col-span-12";
                            const isCompact = field.layout?.display === "compact";
                            const isMissing = missingRequiredNames.has(field.name);
                            const requiredBadgeClass = isMissing
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : undefined;
                            return (
                              <div key={field.id} className={colSpan}>
                                <Card
                                  className={[
                                    isCompact ? "border-dashed" : "",
                                    isMissing ? "border-destructive/40 bg-destructive/5" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                >
                                  <CardHeader className={isCompact ? "space-y-1 pb-3" : "space-y-2"}>
                                    <div className="flex items-center justify-between gap-3">
                                      <CardTitle className="text-base">{field.label}</CardTitle>
                                      {field.required ? (
                                        <Badge variant="outline" className={requiredBadgeClass}>
                                          Required
                                        </Badge>
                                      ) : null}
                                    </div>
                                    {field.help ? (
                                      <CardDescription>{field.help}</CardDescription>
                                    ) : null}
                                    {isMissing ? (
                                      <p className="text-xs font-semibold text-destructive">
                                        Required field missing.
                                      </p>
                                    ) : null}
                                  </CardHeader>
                                  <CardContent className={isCompact ? "pt-0" : undefined}>
                                    <FieldRenderer
                                      field={field}
                                      value={values[field.name]}
                                      onChange={(value) => handleFieldChange(field.name, value)}
                                      relationTargets={relationTargets}
                                      display={field.layout?.display}
                                    />
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            )}
            </div>
          </ScrollArea>
        </div>
        <aside className="hidden min-h-0 w-96 shrink-0 border-l bg-muted/30 lg:flex lg:flex-col">
          <ScrollArea className="flex-1 min-h-0">
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
                checklist={checklist}
                taxonomy={taxonomyState}
                onCategoryChange={setSelectedCategoryId}
                onTagIdsChange={setSelectedTagIds}
                onCreateCategory={(name) => handleCreateTerm("category", name)}
                onCreateTag={(name) => handleCreateTerm("tag", name)}
                helpItems={helpItems}
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
          <SheetTitle className="sr-only">Content details</SheetTitle>
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
                checklist={checklist}
                taxonomy={taxonomyState}
                onCategoryChange={setSelectedCategoryId}
                onTagIdsChange={setSelectedTagIds}
                onCreateCategory={(name) => handleCreateTerm("category", name)}
                onCreateTag={(name) => handleCreateTerm("tag", name)}
                helpItems={helpItems}
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
