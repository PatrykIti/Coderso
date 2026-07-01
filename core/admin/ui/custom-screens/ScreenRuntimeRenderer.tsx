import type { ReactNode } from "react";
import { AlertTriangle, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { InlineEditWrapper, selectionBorder } from "@/ui/authoring";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  screenBlockLabels,
  type ScreenBlockKind,
} from "../../../services/customScreens/screenDocumentOps";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
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
  /**
   * Host-precomputed related entries keyed by `related-list` block id (TASK-498-03).
   * The renderer stays pure — the admin host resolves relation IDs → summaries via
   * `resolveRelatedEntries` + `listEntriesCached` and passes the map in. Undefined for a
   * block means "not resolved yet" → the block renders its loading skeleton.
   */
  relatedEntries?: Record<string, RelatedEntrySummary[]>;
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
  neutral: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  accent: "text-accent-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
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

// TASK-498-02 B-runtime: the muted mono `{{ token }}` shown in builder mode for the
// data-oriented kinds (prototype `Token`, CustomScreenEditorPreview.tsx:58-70).
const RuntimeToken = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
    {children}
  </span>
);

const formatStatValue = (value: unknown, format: string) => {
  if (value === undefined || value === null || value === "") return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (format === "percent") return `${numeric}%`;
  if (format === "money") return `$${numeric}`;
  return String(numeric);
};

const formatRelatedTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const relatedInitials = (title: string): string => {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolveMediaSrc = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string" && item.trim());
    return typeof first === "string" ? first : null;
  }
  return null;
};

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
  relatedEntries = {},
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
    // TASK-498-01 A2: in builder mode a block renders as a corner-tag card
    // (`rounded-2xl bg-card p-5` + the selection border), mirroring the prototype
    // Section (CustomScreenEditorPreview.tsx:28-56) — NOT the old uppercase type
    // strip. Entry mode keeps the flat inline surface; preview keeps its soft card.
    const wrapperClass = cn(
      "group relative transition",
      mode === "preview"
        ? "rounded-xl border bg-background shadow-sm"
        : mode === "builder"
          ? cn(
              selectionBorder({
                level: "item",
                selected,
                interactive: isInteractive,
              }),
              "rounded-2xl bg-card p-5"
            )
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
          <>
            <Badge
              variant="outline"
              className="absolute -top-2 left-3 z-10 px-1.5 py-0 text-[10px] font-medium"
            >
              {screenBlockLabels[block.type as ScreenBlockKind] ?? block.type}
            </Badge>
            {renderBuilderActions ? (
              <div className="absolute -top-2 right-3 z-10">{renderBuilderActions(block)}</div>
            ) : null}
          </>
        ) : null}
        {content}
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
        // TASK-498-01 A3: builder mode renders a bound header line as a muted mono
        // `{{ label }}` Token (graphical schema) — never the resolved value or an
        // inline-edit surface. Entry/preview resolve the real value below.
        if (mode === "builder" && item.binding) {
          const tokenLabel =
            item.field?.label ?? systemFieldLabels.get(item.binding.field) ?? item.binding.field;
          const Tag = as;
          return (
            <Tag className={withTextPresentation(block.id, className)}>
              <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
            </Tag>
          );
        }
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
              {mode === "builder" ? (
                // TASK-498-01 A3: builder mode shows the muted `{{ label }}` Token in
                // place of the resolved value / inline-edit surface (graphical schema).
                <p className={withTextPresentation(block.id, "mt-2 break-words text-base")}>
                  <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
                </p>
              ) : canEdit ? (
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
            {mode === "builder" ? null : binding ? (
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

    if (block.type === "heading") {
      const binding = resolveBlockBinding(bindings, block.id, "text");
      const label = readText(block.data, "label", "Heading");
      const level = typeof block.data.level === "number" ? block.data.level : 2;
      const align = readText(block.data, "align", "left");
      const staticText = readText(block.data, "text", label);
      const bound = binding ? readBindingPathValue(values, binding.field) : undefined;
      const content =
        mode === "builder" ? (
          binding ? (
            <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
          ) : (
            staticText
          )
        ) : binding ? (
          stringifyValue(bound)
        ) : (
          staticText
        );
      const alignClass =
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
      const sizeClass = level === 1 ? "text-3xl" : level === 3 ? "text-lg" : "text-2xl";
      const Tag = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <Tag
            className={withTextPresentation(
              block.id,
              cn("font-semibold text-foreground", sizeClass, alignClass)
            )}
          >
            {content}
          </Tag>
        </div>
      );
    }

    if (block.type === "text") {
      const tone = readText(block.data, "tone", "default");
      const content = readText(block.data, "content", "Add supporting text");
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <p
            className={withTextPresentation(
              block.id,
              cn("text-sm", tone === "muted" ? "text-muted-foreground" : "text-foreground")
            )}
          >
            {content}
          </p>
        </div>
      );
    }

    if (block.type === "stat") {
      const binding = resolveBlockBinding(bindings, block.id, "value");
      const label = readText(block.data, "label", "Stat");
      const format = readText(block.data, "format", "number");
      const trend = readText(block.data, "trend", "auto");
      const raw = binding ? readBindingPathValue(values, binding.field) : undefined;
      const value =
        mode === "builder" ? (
          binding ? (
            <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
          ) : (
            "—"
          )
        ) : (
          formatStatValue(raw, format)
        );
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={withTextPresentation(
              block.id,
              "mt-1 text-2xl font-semibold text-foreground"
            )}
          >
            {value}
          </div>
          {trend && trend !== "auto" ? (
            <Badge variant="outline" className="mt-2 text-[10px] uppercase">
              {trend}
            </Badge>
          ) : null}
        </div>
      );
    }

    if (block.type === "divider") {
      const variant = readText(block.data, "variant", "line");
      if (variant === "space") {
        return wrap(<div className="h-6" />);
      }
      if (variant === "label") {
        const label = readText(block.data, "label", "");
        return wrap(
          <div className="flex items-center gap-3 px-4 py-2">
            <span className="h-px flex-1 bg-border" />
            {label ? (
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            ) : null}
            <span className="h-px flex-1 bg-border" />
          </div>
        );
      }
      return wrap(
        <div className="px-4 py-2">
          <hr className="border-border" />
        </div>
      );
    }

    if (block.type === "image") {
      const binding = resolveBlockBinding(bindings, block.id, "src");
      const label = readText(block.data, "label", "Image");
      const fit = readText(block.data, "fit", "cover");
      const bound = binding ? readBindingPathValue(values, binding.field) : undefined;
      const src = readMediaPresentationValue(block.id) ?? resolveMediaSrc(bound);
      if (mode !== "builder" && src) {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            <img
              src={src}
              alt={label}
              className={cn(
                "w-full rounded-lg",
                fit === "contain" ? "object-contain" : "object-cover"
              )}
            />
          </div>
        );
      }
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            {binding ? (
              <RuntimeToken>{`{{ ${label} }}`}</RuntimeToken>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                {label}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (block.type === "button") {
      const binding = resolveBlockBinding(bindings, block.id, "href");
      const label = readText(block.data, "label", "Button");
      const variant = readText(block.data, "variant", "primary");
      const action = readText(block.data, "action", "link");
      const boundHref = binding ? readBindingPathValue(values, binding.field) : block.data.href;
      const href = typeof boundHref === "string" ? boundHref : undefined;
      const variantClass =
        variant === "secondary"
          ? "bg-secondary text-secondary-foreground"
          : variant === "ghost"
            ? "border border-border text-foreground"
            : "bg-primary text-primary-foreground";
      const ctaClass = cn(
        "inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium",
        variantClass
      );
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          {mode !== "builder" && action === "link" && href ? (
            <a href={href} className={ctaClass}>
              {label}
            </a>
          ) : (
            <span className={ctaClass}>{label}</span>
          )}
        </div>
      );
    }

    if (block.type === "tabs") {
      const tabs = Array.isArray(block.data.tabs)
        ? (block.data.tabs as Array<Record<string, unknown>>)
        : [];
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="flex flex-wrap gap-2 border-b border-border pb-2">
            {tabs.map((tab, index) => {
              const tabId = typeof tab.id === "string" ? tab.id : `tab-${index + 1}`;
              const tabLabel = typeof tab.label === "string" && tab.label ? tab.label : tabId;
              return (
                <span
                  key={tabId}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    index === 0 ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                >
                  {tabLabel}
                </span>
              );
            })}
          </div>
          <div className="mt-3 space-y-4">
            {tabs.map((tab, index) => {
              const tabId = typeof tab.id === "string" ? tab.id : `tab-${index + 1}`;
              const slotBlocks = block.slots?.[tabId] ?? [];
              return (
                <div key={tabId} className="space-y-3" data-screen-runtime-tab={tabId}>
                  {slotBlocks.length > 0 ? (
                    slotBlocks.map((child) => renderBlock(child))
                  ) : (
                    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                      Empty {typeof tab.label === "string" && tab.label ? tab.label : tabId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (block.type === "related-list") {
      // TASK-498-03 B3.3 — render host-precomputed related entries for the
      // checklist / activity / cards variants; builder mode + unresolved (undefined
      // in `relatedEntries`) render the loading skeleton
      // (prototype CustomScreenEditorPreview.tsx:164-183). Display-only: no write-back.
      const label = readText(block.data, "label", "Related list");
      const variant = readText(block.data, "variant", "checklist");
      const target = readText(block.data, "target", "records");
      // `null` = builder or not-yet-resolved → skeleton; array (incl. empty) = resolved.
      const rows = mode === "builder" ? null : (relatedEntries[block.id] ?? null);

      const skeleton = (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="size-8 shrink-0 rounded-lg bg-muted" />
              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-2/3 rounded bg-muted-foreground/20" />
                <div className="mt-1.5 h-2 w-1/3 rounded bg-muted-foreground/10" />
              </div>
              <span className="inline-flex shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-soft-foreground">
                Chip
              </span>
            </div>
          ))}
        </div>
      );

      const emptyState = <p className="text-sm text-muted-foreground">No related {target}.</p>;

      // Loading / builder skeleton (label above the shimmer rows, no border).
      if (rows == null) {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            <div className="mb-3 text-sm font-medium">{label}</div>
            {skeleton}
          </div>
        );
      }

      // Cards variant — a grid of title + status chip + displayValue.
      if (variant === "cards") {
        return wrap(
          <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
            <div className="mb-3 text-sm font-medium">{label}</div>
            {rows.length === 0 ? (
              emptyState
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-border bg-card p-3"
                    data-screen-related-entry={row.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {row.title}
                      </p>
                      {row.status ? (
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                          {row.status}
                        </Badge>
                      ) : null}
                    </div>
                    {row.displayValue ? (
                      <p className="mt-1 text-xs text-muted-foreground">{row.displayValue}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // checklist / activity — bordered card with a header label + divided rows
      // (prototype CustomScreenEntryEditorPreview.tsx:195-235).
      return wrap(
        <div className={cn("px-4 py-3", mode === "preview" && "rounded-xl border bg-card")}>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{label}</div>
            {rows.length === 0 ? (
              <div className="px-4 py-3">{emptyState}</div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row) =>
                  variant === "activity" ? (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      data-screen-related-entry={row.id}
                    >
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-medium text-muted-foreground"
                      >
                        {relatedInitials(row.title)}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{row.title}</span>
                        {row.displayValue ? (
                          <span className="text-muted-foreground"> {row.displayValue}</span>
                        ) : null}
                      </p>
                      {row.updatedAt ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelatedTime(row.updatedAt)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                      data-screen-related-entry={row.id}
                    >
                      <Checkbox aria-label={row.title} />
                      <span className="min-w-0 flex-1 truncate text-sm">{row.title}</span>
                      {row.status ? (
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                          {row.status}
                        </Badge>
                      ) : null}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
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
              // TASK-498-01 A3: builder section header is the human title only —
              // no `font-mono section.id` debug string.
              <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                {title}
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
