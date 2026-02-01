import { Save, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import {
  getContentType,
  updateContentType,
} from "@/services/contentTypesClient";
import { EditorShell } from "@/ui/layouts/EditorShell";
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
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    defaultFields[0]?.id ?? null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewHidden, setPreviewHidden] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);

  useEffect(() => {
    if (!typeId) return;
    let active = true;
    getContentType(typeId)
      .then((result) => {
        if (!active) return;
        setName(result.name);
        setSlug(result.slug);
        const mappedFields = fieldsFromSchema(result.schema);
        setFields(mappedFields);
        setHasUnsavedChanges(false);
        setSelectedFieldId(mappedFields[0]?.id ?? null);
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
      ? "Relation target slug is required."
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
      topbarActions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-2 lg:inline-flex"
            onClick={() => setPreviewHidden((prev) => !prev)}
          >
            {previewHidden ? "Show preview" : "Hide preview"}
          </Button>
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
          {hasUnsavedChanges ? (
            <Alert className="mt-4">
              <AlertTitle>Unsaved changes</AlertTitle>
              <AlertDescription>
                Remember to save your content type before leaving this screen.
              </AlertDescription>
            </Alert>
          ) : null}
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
