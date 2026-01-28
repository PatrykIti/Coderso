import { Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiClientError } from "@/services/apiClient";
import {
  getContentType,
  updateContentType,
} from "@/services/contentTypesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ContentTypePreviewPanel } from "./ContentTypePreviewPanel";
import { SchemaBuilder, type ContentField } from "./SchemaBuilder";
import {
  buildSchemaFromFields,
  fieldsFromSchema,
} from "./schemaMapping";

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

const resolveContentTypeId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "content-types");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

export function ContentTypeEditor() {
  const [typeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveContentTypeId(window.location.pathname);
  });
  const [name, setName] = useState("" as string);
  const [slug, setSlug] = useState("" as string);
  const [fields, setFields] = useState<ContentField[]>(defaultFields);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!typeId) return;
    let active = true;
    getContentType(typeId)
      .then((result) => {
        if (!active) return;
        setName(result.name);
        setSlug(result.slug);
        setFields(fieldsFromSchema(result.schema));
        setHasUnsavedChanges(false);
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
    return () => {
      active = false;
    };
  }, [typeId]);

  const schema = useMemo(() => buildSchemaFromFields(fields), [fields]);

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
      setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);
  };

  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={
        <ContentTypePreviewPanel name={name} slug={slug} fields={fields} />
      }
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Content Types</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
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
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader
          title="Content Type Editor"
          description="Define schema fields and validation rules."
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load content type</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setHasUnsavedChanges(true);
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
                setHasUnsavedChanges(true);
              }}
              disabled={isLoading}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Loading schema builder...
          </div>
        ) : (
          <SchemaBuilder fields={fields} onChange={handleFieldChange} />
        )}
      </div>
    </SplitShell>
  );
}
