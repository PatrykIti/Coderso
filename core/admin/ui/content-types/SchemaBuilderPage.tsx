import {
  Binary,
  GitBranch,
  Hash,
  Image as ImageIcon,
  ListChecks,
  Type,
  WholeWord,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedContentTypes,
  getContentTypeCached,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";

import { ContentTypeSidebar } from "./ContentTypeSidebar";
import { SchemaPreviewPanel } from "./SchemaPreviewPanel";
import { buildSchemaFromFields, fieldsFromSchema, type ContentSchema } from "./schemaMapping";
import { type ContentField, type FieldType } from "./SchemaBuilder";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

const FIELD_TYPES: Array<{ type: FieldType; label: string; icon: ReactNode }> = [
  { type: "text", label: "Text", icon: <Type /> },
  { type: "number", label: "Number", icon: <Hash /> },
  { type: "boolean", label: "Boolean", icon: <Binary /> },
  { type: "richtext", label: "Rich text", icon: <WholeWord /> },
  { type: "media", label: "Media", icon: <ImageIcon /> },
  { type: "relation", label: "Relation", icon: <GitBranch /> },
  { type: "select", label: "Select", icon: <ListChecks /> },
];

const iconForType = (type: FieldType): ReactNode => {
  switch (type) {
    case "number":
      return <Hash className="size-4" />;
    case "boolean":
      return <Binary className="size-4" />;
    case "select":
      return <ListChecks className="size-4" />;
    case "media":
      return <ImageIcon className="size-4" />;
    case "relation":
      return <GitBranch className="size-4" />;
    case "richtext":
      return <WholeWord className="size-4" />;
    default:
      return <Type className="size-4" />;
  }
};

const typeLabel = (type: FieldType) =>
  FIELD_TYPES.find((item) => item.type === type)?.label ?? "Text";

function FieldNode({
  icon,
  name,
  type,
  selected,
  onSelect,
}: {
  icon: ReactNode;
  name: string;
  type: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-row items-center gap-3 rounded-2xl border bg-card p-4 text-left shadow-soft transition-colors",
        selected ? "border-2 border-primary" : "border-border hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl [&_svg]:size-4",
          selected ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{type}</div>
      </div>
      <span
        className={cn("size-2.5 rounded-full", selected ? "bg-primary" : "bg-muted-foreground/30")}
      />
    </button>
  );
}

function InspectorRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">{value}</div>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
      <div className="text-sm font-medium">{label}</div>
      <Badge variant={on ? "success" : "outline"}>{on ? "On" : "Off"}</Badge>
    </div>
  );
}

function FieldInspector({ field }: { field: ContentField | null }) {
  if (!field) {
    return <p className="text-sm text-muted-foreground">Select a field to inspect its settings.</p>;
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">{field.label}</span>
        <Badge variant="soft">{typeLabel(field.type)}</Badge>
      </div>
      <InspectorRow label="Label" value={field.label} />
      <InspectorRow
        label="API id"
        value={<span className="font-mono text-xs">{field.name}</span>}
      />
      <InspectorRow label="Field type" value={typeLabel(field.type)} />
      <ToggleRow label="Required" on={field.required} />
      <InspectorRow label="Default value" value={field.defaultValue || "—"} />
      <InspectorRow label="Help text" value={field.help || "—"} />
    </div>
  );
}

export function SchemaBuilderPage() {
  const { navigate } = useAdminRouter();
  const [typeId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveContentTypeIdFromPath(window.location.pathname);
  });
  const initialCachedList = getCachedContentTypes();
  const initialCachedType =
    typeId && initialCachedList
      ? (initialCachedList.find((item) => item.id === typeId) ?? null)
      : null;
  const initialFields = initialCachedType
    ? fieldsFromSchema(initialCachedType.schema)
    : fieldsFromSchema(buildSchemaFromFields([]));
  const [contentType, setContentType] = useState<ContentTypeSummary | null>(initialCachedType);
  const [fields, setFields] = useState(initialFields);
  const [schema, setSchema] = useState<ContentSchema>(buildSchemaFromFields(initialFields));
  const [list, setList] = useState<ContentTypeSummary[]>(initialCachedList ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCachedType);
  const [error, setError] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    () => initialFields[0]?.id ?? null
  );

  useEffect(() => {
    let active = true;
    listContentTypesCached({ force: true })
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
    getContentTypeCached(typeId, { force: true })
      .then((result) => {
        if (!active || !result) return;
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

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? fields[0] ?? null,
    [fields, selectedFieldId]
  );

  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={<SchemaPreviewPanel schema={schema} />}
      breadcrumbs={["Content", "Schema Builder", contentType?.name ?? "Content Type"]}
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost">Discard</Button>
          <Button className="gap-2" disabled>
            Save schema
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title={contentType?.name ?? "Schema Builder"}
          description="Compose your content model visually."
          icon={<GitBranch />}
          actions={<Badge variant="outline">{fields.length} fields</Badge>}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load schema</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
          <div className="flex flex-col gap-5">
            <div className="hidden h-[340px] overflow-hidden rounded-2xl border bg-card shadow-soft lg:block">
              <ContentTypeSidebar
                items={list.map((item) => ({ id: item.id, name: item.name }))}
                activeId={contentType?.id}
                onSelect={(id) => {
                  navigate(`/content-types/${id}/schema`);
                }}
              />
            </div>
            <SectionCard title="Field types">
              <div className="flex flex-col gap-1">
                {FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    type="button"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-soft [&_svg]:size-4 [&_svg]:text-muted-foreground"
                  >
                    {fieldType.icon}
                    {fieldType.label}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Schema builder">
            <div className="mx-auto flex max-w-xl flex-col items-stretch gap-3">
              {isLoading ? (
                <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                  Loading fields...
                </div>
              ) : fields.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No fields defined yet.
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col items-stretch gap-3">
                    {index > 0 ? <span className="mx-auto h-4 w-px bg-border" /> : null}
                    <FieldNode
                      icon={iconForType(field.type)}
                      name={field.label}
                      type={`${typeLabel(field.type)}${field.required ? " · required" : ""}`}
                      selected={field.id === selectedField?.id}
                      onSelect={() => setSelectedFieldId(field.id)}
                    />
                  </div>
                ))
              )}
              <button
                type="button"
                disabled
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground disabled:opacity-60"
              >
                <Hash className="size-4" /> Add new field
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Field settings">
            <FieldInspector field={selectedField} />
          </SectionCard>
        </div>
      </div>
    </SplitShell>
  );
}
