import type { ReactNode } from "react";
import { AlertTriangle, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import { readBindingPathValue } from "../../../services/utils/bindingPath";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenRuntimeRendererProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: ContentField[];
  fieldErrors?: Record<string, string>;
  relationTargets?: Array<{ slug: string; name: string }>;
  mode: "builder" | "preview" | "entry";
  selectedSectionId?: string | null;
  selectedBlockId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onSelectBlock?: (blockId: string) => void;
  onFieldChange?: (field: string, value: unknown) => void;
  onTitleChange?: (value: string) => void;
  onSlugChange?: (value: string) => void;
  renderBuilderActions?: (block: ScreenBlockV1) => ReactNode;
  enableInlineFieldEditing?: boolean;
  emptyMessage?: string;
};

const systemFieldLabels = new Map([
  ["title", "Title"],
  ["slug", "Slug"],
  ["status", "Status"],
  ["createdAt", "Created"],
  ["updatedAt", "Updated"],
  ["publishedAt", "Published"],
]);

const systemFieldMap = new Map<string, ContentField>([
  [
    "title",
    {
      id: "system-title",
      name: "title",
      type: "text",
      label: "Title",
    },
  ],
  [
    "slug",
    {
      id: "system-slug",
      name: "slug",
      type: "text",
      label: "Slug",
    },
  ],
]);

const fieldTypeLabels = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  select: "Select",
  media: "Media",
  relation: "Relation",
  richtext: "Rich text",
} as const;

const stringifyValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "Empty";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const readText = (data: Record<string, unknown>, key: string, fallback = "") => {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const findField = (fields: ContentField[] | undefined, fieldName: string) =>
  fields?.find((field) => field.name === fieldName) ?? systemFieldMap.get(fieldName) ?? null;

const resolveBlockBinding = (bindings: ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

const renderSlots = (
  slots: Record<string, ScreenBlockV1[]> | undefined,
  renderBlock: (block: ScreenBlockV1) => ReactNode,
  options?: { columns?: boolean }
) => {
  if (!slots) return null;
  const entries = Object.entries(slots);
  if (entries.length === 0) return null;
  return (
    <div className={options?.columns ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
      {entries.map(([slotId, blocks]) => (
        <div key={slotId} className="min-w-0 space-y-3" data-screen-runtime-slot={slotId}>
          {blocks.length > 0 ? (
            blocks.map((block) => renderBlock(block))
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              Empty {slotId}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export function ScreenRuntimeRenderer({
  document,
  bindings,
  values,
  fields,
  fieldErrors = {},
  relationTargets = [],
  mode,
  selectedSectionId,
  selectedBlockId,
  onSelectSection,
  onSelectBlock,
  onFieldChange,
  onTitleChange,
  onSlugChange,
  renderBuilderActions,
  enableInlineFieldEditing = false,
  emptyMessage,
}: ScreenRuntimeRendererProps) {
  const renderBlock = (block: ScreenBlockV1): ReactNode => {
    const selected = selectedBlockId === block.id;
    const isInteractive = mode !== "preview" && Boolean(onSelectBlock);
    const wrapperClass = cn(
      "group relative rounded-xl transition",
      mode === "builder" && "border bg-background shadow-sm",
      mode === "entry" && "border border-transparent bg-background hover:border-primary/30",
      selected && "ring-2 ring-primary/35"
    );

    const wrap = (content: ReactNode) => (
      <div
        key={block.id}
        className={wrapperClass}
        data-screen-block-id={block.id}
        data-screen-block-type={block.type}
        data-selected={selected ? "true" : "false"}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={
          isInteractive
            ? (event) => {
                event.stopPropagation();
                onSelectBlock?.(block.id);
              }
            : undefined
        }
        onKeyDown={
          isInteractive
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectBlock?.(block.id);
                }
              }
            : undefined
        }
      >
        {mode === "builder" ? (
          <div className="flex items-center justify-between gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 font-semibold uppercase">
              <GripVertical className="h-3.5 w-3.5" />
              {block.type}
            </span>
            {renderBuilderActions?.(block)}
          </div>
        ) : null}
        <div className={mode === "builder" ? "p-4" : undefined}>{content}</div>
      </div>
    );

    if (block.type === "record-header") {
      const readBoundText = (propPath: string, fallback = "") => {
        const binding = resolveBlockBinding(bindings, block.id, propPath);
        return binding
          ? stringifyValue(readBindingPathValue(values, binding.field))
          : readText(block.data, propPath, fallback);
      };
      const title = readBoundText("title", "Record");
      const eyebrow = readBoundText("eyebrow");
      const subtitle = readBoundText("subtitle");
      return wrap(
        <div className="rounded-xl bg-muted/20 px-5 py-4">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      );
    }

    if (block.type === "field") {
      const binding = resolveBlockBinding(bindings, block.id, "value");
      const fieldName =
        binding?.field ?? (typeof block.data.field === "string" ? block.data.field : "");
      const field = fieldName ? findField(fields, fieldName) : null;
      const label =
        readText(block.data, "label") ||
        field?.label ||
        (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
      const value = binding ? readBindingPathValue(values, binding.field) : undefined;
      const writable = binding?.mode === "write" || binding?.mode === "readwrite";
      const canEdit =
        mode === "entry" &&
        enableInlineFieldEditing &&
        writable &&
        field &&
        (field.name === "title" ||
          field.name === "slug" ||
          fields?.some((item) => item.name === field.name));
      return wrap(
        <div className="rounded-xl border bg-card px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              {canEdit ? (
                <div className="mt-3">
                  {field.name === "title" ? (
                    <Input
                      aria-label={label}
                      value={String(values.title ?? "")}
                      onChange={(event) => onTitleChange?.(event.target.value)}
                      className="h-9"
                    />
                  ) : field.name === "slug" ? (
                    <Input
                      aria-label={label}
                      value={String(values.slug ?? "")}
                      onChange={(event) => onSlugChange?.(event.target.value)}
                      className="h-9"
                    />
                  ) : (
                    <FieldRenderer
                      field={field}
                      value={values[field.name]}
                      onChange={(next) => onFieldChange?.(field.name, next)}
                      relationTargets={relationTargets}
                      display="compact"
                    />
                  )}
                </div>
              ) : (
                <p className="mt-2 break-words text-base text-foreground">
                  {stringifyValue(value)}
                </p>
              )}
            </div>
            {binding ? (
              <Badge variant={writable ? "default" : "outline"} className="shrink-0 text-[10px]">
                {writable ? "Editable" : "Read"}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Unbound
              </Badge>
            )}
          </div>
          {readText(block.data, "helper") ? (
            <p className="mt-2 text-xs text-muted-foreground">{readText(block.data, "helper")}</p>
          ) : null}
          {field ? (
            <Badge variant="outline" className="mt-3 text-[10px] uppercase">
              {fieldTypeLabels[field.type as keyof typeof fieldTypeLabels] ?? field.type}
            </Badge>
          ) : null}
          {binding && !field ? (
            <p className="mt-2 text-xs text-destructive">
              The bound field `{binding.field}` is missing from this content type.
            </p>
          ) : null}
          {binding && fieldErrors[binding.field] ? (
            <p className="mt-2 text-xs text-destructive">{fieldErrors[binding.field]}</p>
          ) : null}
        </div>
      );
    }

    if (block.type === "field-group") {
      return wrap(
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold">{readText(block.data, "title", "Group")}</h3>
            {readText(block.data, "description") ? (
              <p className="text-sm text-muted-foreground">{readText(block.data, "description")}</p>
            ) : null}
          </div>
          {renderSlots(block.slots, renderBlock)}
        </section>
      );
    }

    if (block.type === "columns") {
      return wrap(
        <div className="rounded-xl border bg-card p-4">
          {renderSlots(block.slots, renderBlock, { columns: true })}
        </div>
      );
    }

    if (block.type === "rich-text") {
      return wrap(
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          {readText(block.data, "content", "Add supporting text")}
        </div>
      );
    }

    return wrap(
      <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Legacy block placeholder</p>
          <p>{block.legacyWidgetType ?? block.type}</p>
        </div>
      </div>
    );
  };

  const hasBlocks = document.sections.some((section) => section.blocks.length > 0);
  if (!hasBlocks) {
    return (
      <div className="rounded-xl border border-dashed bg-background/40 px-8 py-16 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Add screen blocks to compose this view."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {document.sections.map((section) => {
        const selected = selectedSectionId === section.id;
        const isInteractive = mode === "builder" && Boolean(onSelectSection);
        const title =
          typeof section.data.title === "string" && section.data.title.trim()
            ? section.data.title.trim()
            : section.label || "Section";
        return (
          <section
            key={section.id}
            className={cn(
              "relative rounded-2xl border bg-background/80 p-4 transition",
              mode === "builder" && "shadow-sm hover:border-primary/30",
              selected && "ring-2 ring-primary/35"
            )}
            data-screen-section-id={section.id}
            data-screen-section-type={section.type}
            data-selected={selected ? "true" : "false"}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={
              isInteractive
                ? (event) => {
                    event.stopPropagation();
                    onSelectSection?.(section.id);
                  }
                : undefined
            }
            onKeyDown={
              isInteractive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onSelectSection?.(section.id);
                    }
                  }
                : undefined
            }
          >
            {mode === "builder" ? (
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-semibold uppercase">{title}</span>
                <span className="font-mono">{section.id}</span>
              </div>
            ) : null}
            <div className="space-y-4">
              {section.blocks.length > 0 ? (
                section.blocks.map((block) => renderBlock(block))
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Empty section
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
