import {
  Image,
  Link2,
  PlusCircle,
  Save,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  getContentType,
  listContentTypes,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ContentTypeSidebar } from "./ContentTypeSidebar";
import { FieldCard } from "./FieldCard";
import { SchemaPreviewPanel } from "./SchemaPreviewPanel";
import {
  buildSchemaFromFields,
  fieldsFromSchema,
  type ContentSchema,
} from "./schemaMapping";

const resolveContentTypeId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "content-types");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

const iconForType = (type: string) => {
  switch (type) {
    case "media":
      return <Image className="h-5 w-5" />;
    case "relation":
      return <Link2 className="h-5 w-5" />;
    default:
      return <Type className="h-5 w-5" />;
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    case "select":
      return "Select";
    case "media":
      return "Media";
    case "relation":
      return "Relation";
    case "richtext":
      return "Rich text";
    default:
      return "String";
  }
};

export function SchemaBuilderPage() {
  const [typeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveContentTypeId(window.location.pathname);
  });
  const [contentType, setContentType] = useState<ContentTypeSummary | null>(null);
  const [fields, setFields] = useState(() => fieldsFromSchema(buildSchemaFromFields([])));
  const [schema, setSchema] = useState<ContentSchema>(buildSchemaFromFields([]));
  const [list, setList] = useState<ContentTypeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listContentTypes()
      .then((types) => {
        if (active) setList(types);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!typeId) return;
    let active = true;
    getContentType(typeId)
      .then((result) => {
        if (!active) return;
        setContentType(result);
        const mappedFields = fieldsFromSchema(result.schema);
        setFields(mappedFields);
        setSchema(buildSchemaFromFields(mappedFields));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load schema.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [typeId]);

  const cards = useMemo(
    () =>
      fields.map((field, index) => (
        <FieldCard
          key={field.id}
          name={field.label}
          typeLabel={typeLabel(field.type)}
          description={field.help}
          badges={field.required ? ["Required"] : undefined}
          icon={iconForType(field.type)}
          expanded={index === 0}
          settings={{
            displayName: field.label,
            apiId: field.name,
            fieldType: field.type,
            description: field.help,
            validation: { required: field.required },
            helpText: field.help,
            typeOptions: ["text", "rich-text", "media", "relation"],
          }}
        />
      )),
    [fields]
  );

  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={<SchemaPreviewPanel schema={schema} />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span>Schema Builder</span>
          <span>/</span>
          <span className="text-foreground">
            {contentType?.name ?? "Content Type"}
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost">Discard</Button>
          <Button className="gap-2" disabled>
            <Save className="h-4 w-4" />
            Save schema
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title={contentType?.name ?? "Schema Builder"}
          description={
            contentType
              ? `Edit schema for ${contentType.name}.`
              : "Define the structure for your content type."
          }
          actions={
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Edit metadata
            </Button>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load schema</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex gap-6">
          <aside className="hidden w-72 shrink-0 overflow-hidden rounded-xl border bg-background lg:block">
            <ContentTypeSidebar
              items={list.map((item) => ({
                id: item.id,
                name: item.name,
              }))}
              activeId={contentType?.id}
              onSelect={(id) => {
                if (typeof window !== "undefined") {
                  window.location.assign(`/admin/content-types/${id}/schema`);
                }
              }}
            />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {isLoading ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                Loading fields...
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No fields defined yet.
              </div>
            ) : (
              cards
            )}
            <Button variant="outline" className="w-full gap-2" disabled>
              <PlusCircle className="h-4 w-4" />
              Add new field
            </Button>
          </div>
        </div>
      </div>
    </SplitShell>
  );
}
