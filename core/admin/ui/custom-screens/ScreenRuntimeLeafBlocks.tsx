import type { ReactNode } from "react";
import { AlertTriangle, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { isEntryDataValue } from "@/services/entryData";
import { InlineEditWrapper } from "@/ui/authoring";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import {
  sanitizeScreenAuthoringUrl,
  type ScreenBlockV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import { firstScreenMediaAssetUuid } from "../../../services/customScreens/screenMediaIdentity";
import { readBindingPathValue } from "../../../services/utils/bindingPath";
import type { ContentField } from "../content-types/SchemaBuilder";
import {
  bindingAllowsWrite,
  editableTextValue,
  fieldTypeLabels,
  findField,
  formatRelatedTime,
  formatStatValue,
  isInlineEditableField,
  normalizeInlineFieldValue,
  readText,
  relatedInitials,
  resolveBlockBinding,
  screenImageRatioClass,
  stringifyValue,
  systemFieldLabels,
  type ScreenRuntimeContext,
} from "./screenRuntimeRendererModel";

const RuntimeToken = ({ children }: { children: ReactNode }) => (
  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
    {children}
  </span>
);

type ScreenRuntimeLeafBlockProps = {
  block: ScreenBlockV1;
  context: ScreenRuntimeContext;
};

export function ScreenRuntimeLeafBlock({ block, context }: ScreenRuntimeLeafBlockProps) {
  const commitBindingValue = (
    binding: ScreenFieldBinding,
    field: ContentField,
    nextValue: string
  ) => {
    if (field.name === "title") {
      context.onTitleChange?.(nextValue);
      return;
    }
    if (field.name === "slug") {
      context.onSlugChange?.(nextValue);
      return;
    }
    context.onFieldChange?.(binding.field, normalizeInlineFieldValue(nextValue, field));
  };

  const canWriteBinding = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
    context.mode === "entry" &&
    context.enableInlineFieldEditing &&
    Boolean(binding) &&
    bindingAllowsWrite(binding) &&
    Boolean(field) &&
    Boolean(
      field &&
      (field.name === "title" ||
        field.name === "slug" ||
        context.fields?.some((item) => item.name === field.name))
    );

  const canEditBindingInline = (binding: ScreenFieldBinding | null, field: ContentField | null) =>
    canWriteBinding(binding, field) &&
    Boolean(
      field && (field.name === "title" || field.name === "slug" || isInlineEditableField(field))
    );

  if (block.type === "record-header") {
    const readBoundValue = (propPath: string) => {
      const binding = resolveBlockBinding(context.bindings, block.id, propPath);
      return {
        binding,
        value: binding ? readBindingPathValue(context.values, binding.field) : block.data[propPath],
        field: binding ? findField(context.fields, binding.field) : null,
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
      if (context.mode === "builder" && item.binding) {
        const tokenLabel =
          item.field?.label ?? systemFieldLabels.get(item.binding.field) ?? item.binding.field;
        const Tag = as;
        return (
          <Tag className={context.presentation.withTextClassName(block.id, className)}>
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
          className={context.presentation.withTextClassName(block.id, className)}
          onCommit={(next) => {
            if (!item.binding || !item.field) return;
            commitBindingValue(item.binding, item.field, next);
          }}
        />
      );
    };
    return (
      <div className={cn("px-5 py-4", context.mode === "preview" && "rounded-xl bg-muted/20")}>
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
    const binding = resolveBlockBinding(context.bindings, block.id, "value");
    const fieldName =
      binding?.field ?? (typeof block.data.field === "string" ? block.data.field : "");
    const field = fieldName ? findField(context.fields, fieldName) : null;
    const defaultLabel =
      field?.label ?? (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
    const rawLabel = block.data.label;
    const label = typeof rawLabel === "string" ? rawLabel.trim() : defaultLabel;
    const tokenLabel = label || defaultLabel;
    const value = binding ? readBindingPathValue(context.values, binding.field) : undefined;
    const presentationMediaValue =
      field?.type === "media" ? context.presentation.readMediaSource(block.id).assetId : null;
    const displayValue = presentationMediaValue ?? value;
    const writable = bindingAllowsWrite(binding);
    const canEdit = canWriteBinding(binding, field);
    const showBindingBadges =
      context.mode === "preview" || (context.mode === "entry" && context.showFieldMetadata);
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {label ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
            ) : null}
            {context.mode === "builder" ? (
              <p
                className={context.presentation.withTextClassName(
                  block.id,
                  "mt-2 break-words text-base"
                )}
              >
                <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
              </p>
            ) : canEdit ? (
              field && binding && isInlineEditableField(field) ? (
                <InlineEditWrapper
                  as="p"
                  value={editableTextValue(value)}
                  editable
                  ariaLabel={tokenLabel}
                  placeholder="Empty"
                  className={context.presentation.withTextClassName(
                    block.id,
                    "mt-2 break-words text-base text-foreground"
                  )}
                  onCommit={(next) => commitBindingValue(binding, field, next)}
                />
              ) : (
                <div className={context.presentation.withTextClassName(block.id, "mt-3")}>
                  <FieldRenderer
                    field={field!}
                    value={isEntryDataValue(displayValue) ? displayValue : undefined}
                    onChange={(next) => context.onFieldChange?.(field!.name, next)}
                    relationTargets={context.relationTargets}
                    display="compact"
                  />
                </div>
              )
            ) : (
              <p
                className={context.presentation.withTextClassName(
                  block.id,
                  "mt-2 break-words text-base text-foreground"
                )}
              >
                {stringifyValue(displayValue)}
              </p>
            )}
          </div>
          {showBindingBadges ? (
            binding ? (
              <Badge variant={writable ? "default" : "outline"} className="shrink-0 text-[10px]">
                {writable ? "Editable" : "Read"}
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Unbound
              </Badge>
            )
          ) : null}
        </div>
        {readText(block.data, "helper") ? (
          <p className="mt-2 text-xs text-muted-foreground">{readText(block.data, "helper")}</p>
        ) : null}
        {field && (context.mode === "builder" || showBindingBadges) ? (
          <Badge variant="outline" className="mt-3 text-[10px] uppercase">
            {fieldTypeLabels[field.type as keyof typeof fieldTypeLabels] ?? field.type}
          </Badge>
        ) : null}
        {binding && !field ? (
          <p className="mt-2 text-xs text-destructive">
            The bound field `{binding.field}` is missing from this content type.
          </p>
        ) : null}
        {binding && context.fieldErrors[binding.field] ? (
          <p className="mt-2 text-xs text-destructive">{context.fieldErrors[binding.field]}</p>
        ) : null}
      </div>
    );
  }

  if (block.type === "rich-text") {
    return (
      <div
        className={cn(
          "px-4 py-3 text-sm text-muted-foreground",
          context.presentation.resolveTextClassName(block.id),
          context.mode === "preview" && "rounded-xl border bg-card"
        )}
      >
        {readText(block.data, "content", "Add supporting text")}
      </div>
    );
  }

  if (block.type === "heading") {
    const binding = resolveBlockBinding(context.bindings, block.id, "text");
    const label = readText(block.data, "label", "Heading");
    const level = typeof block.data.level === "number" ? block.data.level : 2;
    const align = readText(block.data, "align", "left");
    const staticText = readText(block.data, "text", label);
    const bound = binding ? readBindingPathValue(context.values, binding.field) : undefined;
    const content =
      context.mode === "builder" ? (
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
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        <Tag
          className={context.presentation.withTextClassName(
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
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        <p
          className={context.presentation.withTextClassName(
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
    const binding = resolveBlockBinding(context.bindings, block.id, "value");
    const rawLabel = block.data.label;
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "Stat";
    const tokenLabel = label || "Stat";
    const format = readText(block.data, "format", "number");
    const trend = readText(block.data, "trend", "auto");
    const raw = binding ? readBindingPathValue(context.values, binding.field) : undefined;
    const value =
      context.mode === "builder" ? (
        binding ? (
          <RuntimeToken>{`{{ ${tokenLabel} }}`}</RuntimeToken>
        ) : (
          "—"
        )
      ) : (
        formatStatValue(raw, format)
      );
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
        ) : null}
        <div
          className={context.presentation.withTextClassName(
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
    if (variant === "space") return <div className="h-6" />;
    if (variant === "label") {
      const label = readText(block.data, "label", "");
      return (
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="h-px flex-1 bg-border" />
          {label ? (
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          ) : null}
          <span className="h-px flex-1 bg-border" />
        </div>
      );
    }
    return (
      <div className="px-4 py-2">
        <hr className="border-border" />
      </div>
    );
  }

  if (block.type === "image") {
    const binding = resolveBlockBinding(context.bindings, block.id, "src");
    const label = readText(block.data, "label", "Image");
    const fit = readText(block.data, "fit", "cover");
    const ratioValue = typeof block.data.ratio === "string" ? block.data.ratio : "auto";
    const ratioClass = screenImageRatioClass[ratioValue];
    const presentationSource = context.presentation.readMediaSource(block.id);
    let rawImageSrc: unknown = null;
    if (presentationSource.present) {
      rawImageSrc = presentationSource.assetId
        ? (context.presentationMediaUrlsById?.[presentationSource.assetId] ?? null)
        : null;
    } else if (binding) {
      const boundAssetId = firstScreenMediaAssetUuid(
        readBindingPathValue(context.values, binding.field)
      );
      rawImageSrc = boundAssetId
        ? (context.presentationMediaUrlsById?.[boundAssetId] ?? null)
        : null;
    } else {
      rawImageSrc = block.data.src;
    }
    const safeImageSrc = sanitizeScreenAuthoringUrl(rawImageSrc, "media");
    if (safeImageSrc) {
      return (
        <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
          {ratioClass ? (
            <div className={cn("relative w-full overflow-hidden rounded-lg", ratioClass)}>
              <img
                src={safeImageSrc}
                alt={label}
                className={cn(
                  "h-full w-full",
                  fit === "contain" ? "object-contain" : "object-cover"
                )}
              />
            </div>
          ) : (
            <img
              src={safeImageSrc}
              alt={label}
              className={cn(
                "w-full rounded-lg",
                fit === "contain" ? "object-contain" : "object-cover"
              )}
            />
          )}
        </div>
      );
    }
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        <div
          data-image-disabled="true"
          className={cn(
            "flex w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground",
            ratioClass ?? "aspect-video"
          )}
        >
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
    const binding = resolveBlockBinding(context.bindings, block.id, "href");
    const label = readText(block.data, "label", "Button");
    const variant = readText(block.data, "variant", "primary");
    const action = readText(block.data, "action", "link");
    const boundHref = binding
      ? readBindingPathValue(context.values, binding.field)
      : block.data.href;
    const safeHref = sanitizeScreenAuthoringUrl(boundHref, "link");
    const canNavigate = context.mode !== "builder" && action === "link" && safeHref !== null;
    const disabled = action !== "link" || safeHref === null;
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
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
        {canNavigate ? (
          <a href={safeHref} className={ctaClass} data-screen-button-affordance="true">
            {label}
          </a>
        ) : (
          <span
            className={ctaClass}
            aria-disabled={disabled ? "true" : undefined}
            data-screen-button-affordance="true"
          >
            {label}
          </span>
        )}
      </div>
    );
  }

  if (block.type === "related-list") {
    const label = readText(block.data, "label", "Related list");
    const variant = readText(block.data, "variant", "checklist");
    const target = readText(block.data, "target", "records");
    const rows = context.mode === "builder" ? null : (context.relatedEntries[block.id] ?? null);
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
    if (rows == null) {
      return (
        <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
          <div className="mb-3 text-sm font-medium">{label}</div>
          {skeleton}
        </div>
      );
    }
    if (variant === "cards") {
      return (
        <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
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
    return (
      <div className={cn("px-4 py-3", context.mode === "preview" && "rounded-xl border bg-card")}>
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

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-4 text-sm text-muted-foreground",
        context.mode === "preview" && "rounded-xl border border-dashed bg-muted/20"
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium text-foreground">Legacy block placeholder</p>
        <p>{block.legacyWidgetType ?? block.type}</p>
      </div>
    </div>
  );
}
