import {
  Binary,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Hash,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Type,
  WholeWord,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  getCachedContentTypes,
  getContentTypeCached,
  listContentTypesCached,
  updateContentType,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";

import { ContentTypeSidebar } from "./ContentTypeSidebar";
import { SchemaPreviewPanel } from "./SchemaPreviewPanel";
import { buildSchemaFromFields, fieldsFromSchema, type ContentSchema } from "./schemaMapping";
import {
  FIELD_TYPE_LABELS,
  FieldSettingsPanel,
  makeUniqueFieldName,
  validateFieldName,
  type ContentField,
  type FieldType,
} from "./SchemaBuilder";
import { resolveContentTypeIdFromPath } from "./pathResolvers";

// Palette order mirrors the prototype (`SchemaBuilderPreview.tsx:107-114`) byte-for-byte for the
// first 8 entries — Text, Number, Boolean, Date, Rich text, Media, Relation, Select — then appends
// `slug` (no prototype palette entry) as a beyond-prototype extension enabled by 513-02's union
// widening. Labels are derived from the canonical FIELD_TYPE_LABELS map (513-02) via `typeLabel`;
// only the per-type `icon` is 513-05-local.
const FIELD_TYPES: Array<{ type: FieldType; icon: ReactNode }> = [
  { type: "text", icon: <Type /> },
  { type: "number", icon: <Hash /> },
  { type: "boolean", icon: <Binary /> },
  { type: "date", icon: <CalendarDays /> },
  { type: "richtext", icon: <WholeWord /> },
  { type: "media", icon: <ImageIcon /> },
  { type: "relation", icon: <GitBranch /> },
  { type: "select", icon: <ListChecks /> },
  { type: "slug", icon: <Link2 /> },
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
    case "date":
      return <CalendarDays className="size-4" />;
    case "slug":
      return <Link2 className="size-4" />;
    default:
      return <Type className="size-4" />;
  }
};

const typeLabel = (type: FieldType) => FIELD_TYPE_LABELS[type];

function FieldNode({
  icon,
  name,
  type,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  icon: ReactNode;
  name: string;
  type: string;
  selected?: boolean;
  onSelect: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        } else if (event.key === "ArrowUp") {
          if (canMoveUp) {
            event.preventDefault();
            onMoveUp?.();
          }
        } else if (event.key === "ArrowDown") {
          if (canMoveDown) {
            event.preventDefault();
            onMoveDown?.();
          }
        }
      }}
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
      <div className="flex flex-col">
        <button
          type="button"
          aria-label="Move field up"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp?.();
          }}
          className="flex items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Move field down"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown?.();
          }}
          className="flex items-center justify-center rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      <span
        className={cn("size-2.5 rounded-full", selected ? "bg-primary" : "bg-muted-foreground/30")}
      />
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
  // snapshot of the last-persisted field list — Discard target + dirty baseline
  const [lastLoaded, setLastLoaded] = useState<ContentField[]>(initialFields);
  const [list, setList] = useState<ContentTypeSummary[]>(initialCachedList ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCachedType);
  const [isSaving, setIsSaving] = useState(false);
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
        setLastLoaded(mappedFields);
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

  // Derived — REPLACES the stale `useState(buildSchemaFromFields(...))`; the explicit
  // <ContentSchema> type-arg keeps the `type ContentSchema` import used.
  const schema = useMemo<ContentSchema>(() => buildSchemaFromFields(fields), [fields]);
  const isDirty = useMemo(
    () => JSON.stringify(fields) !== JSON.stringify(lastLoaded),
    [fields, lastLoaded]
  );
  const existingNames = useMemo(
    () => fields.map((field) => ({ id: field.id, name: field.name })),
    [fields]
  );
  const relationTargets = useMemo(() => list.map(({ slug, name }) => ({ slug, name })), [list]);
  const nameError = useMemo(
    () =>
      selectedField ? validateFieldName(selectedField.name, existingNames, selectedField.id) : null,
    [selectedField, existingNames]
  );
  const defaultError = useMemo(
    () =>
      selectedField?.required && !selectedField.defaultValue
        ? "Required fields need a default value."
        : null,
    [selectedField]
  );
  const relationError = useMemo(
    () =>
      selectedField?.type === "relation" && !selectedField.relation?.target
        ? "Select a related content type."
        : null,
    [selectedField]
  );
  const hasBlockingError = useMemo(
    () => fields.some((field) => validateFieldName(field.name, existingNames, field.id) != null),
    [fields, existingNames]
  );
  const saveDisabled = isLoading || isSaving || fields.length === 0 || hasBlockingError;

  function addFieldOfType(type: FieldType) {
    const name = makeUniqueFieldName(type, existingNames);
    const field: ContentField = {
      id: crypto.randomUUID(),
      name,
      type,
      label: typeLabel(type),
      keyAuto: true,
      required: false,
    };
    setFields((prev) => [...prev, field]);
    setSelectedFieldId(field.id);
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const i = prev.findIndex((field) => field.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function validateFields(): string | null {
    for (const field of fields) {
      const fieldNameError = validateFieldName(field.name, existingNames, field.id);
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
  }

  async function handleSave() {
    if (!typeId || isSaving) return;
    const validationError = validateFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const nextSchema = buildSchemaFromFields(fields);
      await updateContentType(typeId, { schema: nextSchema });
      setLastLoaded(fields);
      toast.success("Schema saved");
    } catch (err) {
      setError(isApiClientError(err) ? err.message : "Failed to save schema.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setFields(lastLoaded);
    setSelectedFieldId(lastLoaded[0]?.id ?? null);
    setError(null);
  }

  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={<SchemaPreviewPanel schema={schema} />}
      breadcrumbs={["Content", "Schema Builder", contentType?.name ?? "Content Type"]}
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleDiscard} disabled={!isDirty || isSaving}>
            Discard
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saveDisabled}>
            {isSaving ? "Saving…" : "Save schema"}
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
                    onClick={() => addFieldOfType(fieldType.type)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-primary-soft [&_svg]:size-4 [&_svg]:text-muted-foreground"
                  >
                    {fieldType.icon}
                    {typeLabel(fieldType.type)}
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
                      canMoveUp={index !== 0}
                      canMoveDown={index !== fields.length - 1}
                      onMoveUp={() => moveField(field.id, -1)}
                      onMoveDown={() => moveField(field.id, 1)}
                    />
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => addFieldOfType("text")}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Hash className="size-4" /> Add new field
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Field settings">
            <FieldSettingsPanel
              field={selectedField}
              nameError={nameError}
              defaultError={defaultError}
              relationError={relationError}
              relationTargets={relationTargets}
              existingNames={existingNames}
              onChange={(next) => {
                setFields((prev) => prev.map((field) => (field.id === next.id ? next : field)));
              }}
              onRemove={() => {
                if (!selectedField) return;
                const i = fields.findIndex((field) => field.id === selectedField.id);
                const next = fields.filter((field) => field.id !== selectedField.id);
                setFields(next);
                setSelectedFieldId(next[i]?.id ?? next[i - 1]?.id ?? next[0]?.id ?? null);
              }}
              className="h-auto overflow-visible"
            />
          </SectionCard>
        </div>
      </div>
    </SplitShell>
  );
}
