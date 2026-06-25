import type { ReactNode } from "react";
import { AlertTriangle, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { InlineEditWrapper, selectionBorder } from "@/ui/authoring";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type {
  ScreenEntryPresentationOverrideDraft,
  ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { readBindingPathValue } from "../../../services/utils/bindingPath";
import type { ContentField } from "../content-types/SchemaBuilder";

type ScreenRuntimeRendererProps = {
  document: ScreenDocumentV1;
  bindings: ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: ContentField[];
  fieldErrors?: Record<string, string>;
  presentationOverrides?: ScreenEntryPresentationOverrideDraft[];
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

const presentationTextSizeClassMap: Record<string, string> = {
  "2xs": "text-[0.625rem] leading-4",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const presentationTextEmphasisClassMap: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const presentationToneClassMap: Record<string, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  strong: "text-foreground",
  neutral: "text-neutral-700",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  accent: "text-accent-foreground",
  success: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-destructive",
  info: "text-sky-700",
};

const stringifyValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "Empty";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const editableTextValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const normalizeInlineFieldValue = (value: string, field: ContentField) => {
  if (field.type === "number") {
    if (!value.trim()) return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
};

const isInlineEditableField = (field: ContentField) =>
  field.type === "text" || field.type === "number" || field.type === "select";

const readText = (data: Record<string, unknown>, key: string, fallback = "") => {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const findField = (fields: ContentField[] | undefined, fieldName: string) =>
  fields?.find((field) => field.name === fieldName) ?? systemFieldMap.get(fieldName) ?? null;

const resolveBlockBinding = (bindings: ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

const bindingAllowsWrite = (binding: ScreenFieldBinding | null | undefined) =>
  binding?.mode === "write" || binding?.mode === "readwrite";

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
  presentationOverrides = [],
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
  const presentationOverrideMap = new Map<string, string>();
  const blocksWithPresentationOverrides = new Set<string>();
  for (const override of presentationOverrides) {
    presentationOverrideMap.set(`${override.blockId}\u0000${override.propPath}`, override.value);
    blocksWithPresentationOverrides.add(override.blockId);
  }

  const readPresentationOverride = (
    blockId: string,
    propPath: ScreenEntryPresentationOverridePropPath
  ) => presentationOverrideMap.get(`${blockId}\u0000${propPath}`) ?? null;

  const resolveTextPresentationClassName = (blockId: string) => {
    const textSize = readPresentationOverride(blockId, "textSize");
    const textEmphasis = readPresentationOverride(blockId, "textEmphasis");
    const tone = readPresentationOverride(blockId, "tone");
    return cn(
      textSize ? presentationTextSizeClassMap[textSize] : undefined,
      textEmphasis ? presentationTextEmphasisClassMap[textEmphasis] : undefined,
      tone ? presentationToneClassMap[tone] : undefined
    );
  };

  const withTextPresentation = (blockId: string, className: string) =>
    cn(className, resolveTextPresentationClassName(blockId));

  const readMediaPresentationValue = (blockId: string) =>
    readPresentationOverride(blockId, "mediaAssetId") ?? readPresentationOverride(blockId, "image");

  const renderBlock = (block: ScreenBlockV1): ReactNode => {
    const selected = selectedBlockId === block.id;
    const isInteractive = mode !== "preview" && Boolean(onSelectBlock);
    const wrapperClass = cn(
      "group relative transition",
      mode === "preview"
        ? "rounded-xl border bg-background shadow-sm"
        : cn(
            "bg-background/90",
            selectionBorder({
              level: "item",
              selected,
              interactive: isInteractive,
            })
          )
    );

    const wrap = (content: ReactNode) => (
      <div
        key={block.id}
        className={wrapperClass}
        data-screen-block-id={block.id}
        data-screen-block-type={block.type}
        data-screen-presentation-override={
          blocksWithPresentationOverrides.has(block.id) ? "true" : undefined
        }
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
          <div className="flex items-center justify-between gap-3 px-4 pt-3 text-xs text-muted-foreground">
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

    const commitBindingValue = (
      binding: ScreenFieldBinding,
      field: ContentField,
      nextValue: string
    ) => {
      if (field.name === "title") {
        onTitleChange?.(nextValue);
        return;
      }
      if (field.name === "slug") {
        onSlugChange?.(nextValue);
        return;
      }
      onFieldChange?.(binding.field, normalizeInlineFieldValue(nextValue, field));
    };

    const canWriteBinding = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
      mode === "entry" &&
      enableInlineFieldEditing &&
      Boolean(binding) &&
      bindingAllowsWrite(binding) &&
      Boolean(field) &&
      Boolean(
        field &&
        (field.name === "title" ||
          field.name === "slug" ||
          fields?.some((item) => item.name === field.name))
      );

    const canEditBindingInline = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
      canWriteBinding(binding, field) &&
      Boolean(
        field && (field.name === "title" || field.name === "slug" || isInlineEditableField(field))
      );

    if (block.type === "record-header") {
      const readBoundValue = (propPath: string) => {
        const binding = resolveBlockBinding(bindings, block.id, propPath);
        return {
          binding,
          value: binding ? readBindingPathValue(values, binding.field) : block.data[propPath],
          field: binding ? findField(fields, binding.field) : null,
        };
      };
      const title = readBoundValue("title");
      const eyebrow = readBoundValue("eyebrow");
      const subtitle = readBoundValue("subtitle");
      const renderHeaderText = (
        propPath: "title" | "eyebrow" | "subtitle",
        item: ReturnType<typeof readBoundValue>,
        className: string,
        as: "p" | "h2",
        fallback = ""
      ) => {
        const text = item.binding
          ? editableTextValue(item.value)
          : readText(block.data, propPath, fallback);
        const displayText = text || fallback;
        const editable =
          item.binding !== null &&
          item.field !== null &&
          canEditBindingInline(item.binding, item.field);
        if (!displayText && !editable) return null;
        return (
          <InlineEditWrapper
            as={as}
            value={text}
            placeholder={fallback}
            editable={editable}
            ariaLabel={item.field?.label ?? propPath}
            className={withTextPresentation(block.id, className)}
            onCommit={(next) => {
              if (!item.binding || !item.field) return;
              commitBindingValue(item.binding, item.field, next);
            }}
          />
        );
      };
      return wrap(
        <div className={cn("px-5 py-4", mode === "preview" && "rounded-xl bg-muted/20")}>
          {renderHeaderText(
            "eyebrow",
            eyebrow,
            "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
            "p"
          )}
          {renderHeaderText(
            "title",
            title,
            "mt-1 block text-2xl font-semibold text-foreground",
            "h2",
            "Record"
          )}
          {renderHeaderText("subtitle", subtitle, "mt-1 text-sm text-muted-foreground", "p")}
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
      const presentationMediaValue =
        field?.type === "media" ? readMediaPresentationValue(block.id) : null;
      const displayValue = presentationMediaValue ?? value;
      const writable = bindingAllowsWrite(binding);
      const canEdit = canWriteBinding(binding, field);
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              {canEdit ? (
                field && binding && isInlineEditableField(field) ? (
                  <InlineEditWrapper
                    as="p"
                    value={editableTextValue(value)}
                    editable
                    ariaLabel={label}
                    placeholder="Empty"
                    className={withTextPresentation(
                      block.id,
                      "mt-2 break-words text-base text-foreground"
                    )}
                    onCommit={(next) => commitBindingValue(binding, field, next)}
                  />
                ) : (
                  <div className={withTextPresentation(block.id, "mt-3")}>
                    <FieldRenderer
                      field={field!}
                      value={displayValue}
                      onChange={(next) => onFieldChange?.(field!.name, next)}
                      relationTargets={relationTargets}
                      display="compact"
                    />
                  </div>
                )
              ) : (
                <p
                  className={withTextPresentation(
                    block.id,
                    "mt-2 break-words text-base text-foreground"
                  )}
                >
                  {stringifyValue(displayValue)}
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
        <section className={cn("p-4", mode === "preview" && "rounded-xl border bg-card")}>
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
        <div className={cn("p-4", mode === "preview" && "rounded-xl border bg-card")}>
          {renderSlots(block.slots, renderBlock, { columns: true })}
        </div>
      );
    }

    if (block.type === "rich-text") {
      return wrap(
        <div
          className={cn(
            "px-4 py-3 text-sm text-muted-foreground",
            resolveTextPresentationClassName(block.id),
            mode === "preview" && "rounded-xl border bg-card"
          )}
        >
          {readText(block.data, "content", "Add supporting text")}
        </div>
      );
    }

    return wrap(
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-4 text-sm text-muted-foreground",
          mode === "preview" && "rounded-xl border border-dashed bg-muted/20"
        )}
      >
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
              "relative p-4 transition",
              mode === "preview"
                ? "rounded-2xl border bg-background/80"
                : cn(
                    "bg-background/60",
                    selectionBorder({
                      level: "container",
                      selected,
                      interactive: isInteractive,
                    })
                  )
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
