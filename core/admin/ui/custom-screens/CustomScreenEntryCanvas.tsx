import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import type { WidgetBlock } from "../../../widgets/types";
import { WidgetRenderer } from "../../../widgets/renderers/widgetRenderer";
import {
  applyBindingsToBlockData,
  getWidgetBindings,
} from "../../../services/customScreens/bindingResolver";
import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import {
  normalizeScreenFieldGroupData,
  type ScreenFieldGroupData,
} from "../../../widgets/core/screenFieldGroup";
import {
  normalizeScreenFieldValueData,
  type ScreenFieldValueData,
} from "../../../widgets/core/screenFieldValue";
import {
  normalizeScreenRecordHeaderData,
  type ScreenRecordHeaderData,
} from "../../../widgets/core/screenRecordHeader";
import {
  normalizeScreenTwoColumnData,
  type ScreenTwoColumnData,
} from "../../../widgets/core/screenTwoColumn";
import type { ContentField } from "../content-types/SchemaBuilder";

type CustomScreenEntryCanvasProps = {
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  fieldValues: Record<string, unknown>;
  fieldErrors: Record<string, string>;
  fields: ContentField[];
  relationTargets: Array<{ slug: string; name: string }>;
  onFieldChange: (field: string, value: unknown) => void;
  onTitleChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string) => void;
  onEditBlock?: (blockId: string) => void;
};

const fieldTypeLabels = {
  text: "Text",
  number: "Number",
  boolean: "Boolean",
  select: "Select",
  media: "Media",
  relation: "Relation",
  richtext: "Rich text",
} as const;

const renderFallbackBlock = (
  block: WidgetBlock,
  bindings: CustomScreenBinding[],
  fieldValues: Record<string, unknown>
) => (
  <WidgetRenderer
    block={{
      ...block,
      data: applyBindingsToBlockData(block.data ?? {}, block.id, bindings, fieldValues),
    }}
  />
);

export function CustomScreenEntryCanvas({
  blocks,
  bindings,
  fieldValues,
  fieldErrors,
  fields,
  relationTargets,
  onFieldChange,
  onTitleChange,
  onSlugChange,
  selectedBlockId,
  onSelectBlock,
  onEditBlock,
}: CustomScreenEntryCanvasProps) {
  const fieldMap = new Map(fields.map((field) => [field.name, field] as const));
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

  const wrapSelectableBlock = (block: WidgetBlock, content: ReactNode) => {
    const isSelected = selectedBlockId === block.id;
    return (
      <div
        key={block.id}
        className={`group relative rounded-3xl transition ${
          isSelected ? "ring-2 ring-primary/30" : "hover:ring-2 hover:ring-primary/15"
        }`}
        onClick={() => onSelectBlock?.(block.id)}
      >
        <div className="absolute right-3 top-3 z-10 opacity-0 transition group-hover:opacity-100 group-hover:pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="bg-background/90 backdrop-blur"
            onClick={(event) => {
              event.stopPropagation();
              onEditBlock?.(block.id);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
        {content}
      </div>
    );
  };

  const renderBlock = (block: WidgetBlock): ReactNode => {
    const blockBindings = getWidgetBindings(bindings, block.id, {
      includeRead: true,
      includeWrite: true,
    });

    if (block.type === "screen-field-value") {
      const data = normalizeScreenFieldValueData(
        applyBindingsToBlockData(
          (block.data ?? {}) as ScreenFieldValueData,
          block.id,
          bindings,
          fieldValues
        ) as ScreenFieldValueData
      );
      const writeBinding = blockBindings.find(
        (binding) =>
          (binding.mode === "write" || binding.mode === "readwrite") &&
          binding.propPath === "value" &&
          (fieldMap.has(binding.field) || systemFieldMap.has(binding.field))
      );
      const field = writeBinding
        ? (fieldMap.get(writeBinding.field) ?? systemFieldMap.get(writeBinding.field) ?? null)
        : null;

      return wrapSelectableBlock(
        block,
        <div className="rounded-2xl border p-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {data.label}
            </p>
            {field ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                {fieldTypeLabels[field.type as keyof typeof fieldTypeLabels] ?? field.type}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3">
            {field && writeBinding ? (
              writeBinding.field === "title" ? (
                <input
                  value={String(fieldValues.title ?? "")}
                  onChange={(event) => onTitleChange(event.target.value)}
                  className="h-9 w-full rounded-md border px-3 py-2 text-sm"
                />
              ) : writeBinding.field === "slug" ? (
                <input
                  value={String(fieldValues.slug ?? "")}
                  onChange={(event) => onSlugChange(event.target.value)}
                  className="h-9 w-full rounded-md border px-3 py-2 text-sm"
                />
              ) : (
                <FieldRenderer
                  field={field}
                  value={fieldValues[writeBinding.field]}
                  onChange={(next) => onFieldChange(writeBinding.field, next)}
                  relationTargets={relationTargets}
                  display="compact"
                />
              )
            ) : (
              <p className="text-sm text-foreground">{data.value}</p>
            )}
          </div>
          {data.helper?.trim() ? (
            <p className="mt-2 text-xs text-muted-foreground">{data.helper}</p>
          ) : null}
          {writeBinding && fieldErrors[writeBinding.field] ? (
            <p className="mt-2 text-xs text-destructive">{fieldErrors[writeBinding.field]}</p>
          ) : null}
        </div>
      );
    }

    if (block.type === "screen-record-header") {
      const data = normalizeScreenRecordHeaderData(
        applyBindingsToBlockData(
          (block.data ?? {}) as ScreenRecordHeaderData,
          block.id,
          bindings,
          fieldValues
        ) as ScreenRecordHeaderData
      );

      return wrapSelectableBlock(
        block,
        <div className="rounded-3xl border p-6 shadow-sm">
          {data.eyebrow?.trim() ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {data.eyebrow}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{data.title}</h2>
            {data.badge?.trim() ? (
              <span className="rounded-full border bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {data.badge}
              </span>
            ) : null}
          </div>
          {data.subtitle?.trim() ? (
            <p className="mt-3 text-base text-foreground/80">{data.subtitle}</p>
          ) : null}
          {data.description?.trim() ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.description}</p>
          ) : null}
        </div>
      );
    }

    if (block.type === "screen-field-group") {
      const data = normalizeScreenFieldGroupData((block.data ?? {}) as ScreenFieldGroupData);
      const content = Array.isArray(block.slots?.content) ? block.slots?.content : [];

      return wrapSelectableBlock(
        block,
        <div className="space-y-4 rounded-3xl border p-5 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{data.title}</p>
            {data.description?.trim() ? (
              <p className="text-sm text-muted-foreground">{data.description}</p>
            ) : null}
          </div>
          <div className="space-y-4">
            {content.length > 0 ? (
              content.map((child: WidgetBlock) => renderBlock(child) as ReactNode)
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                Add screen field widgets into this group.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (block.type === "screen-two-column") {
      const data = normalizeScreenTwoColumnData((block.data ?? {}) as ScreenTwoColumnData);
      const left = Array.isArray(block.slots?.left) ? block.slots.left : [];
      const right = Array.isArray(block.slots?.right) ? block.slots.right : [];

      const renderColumn = (title: string | undefined, items: WidgetBlock[], column: string) => (
        <div
          key={`${block.id}-${column}`}
          className="space-y-4 rounded-3xl border bg-background/60 p-4"
        >
          {title?.trim() ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
          ) : null}
          {items.length > 0 ? (
            items.map((child: WidgetBlock) => renderBlock(child) as ReactNode)
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
              Drop screen widgets into this column.
            </div>
          )}
        </div>
      );

      return wrapSelectableBlock(
        block,
        <div className="grid gap-6 lg:grid-cols-2">
          {renderColumn(data.leftTitle, left, "left")}
          {renderColumn(data.rightTitle, right, "right")}
        </div>
      );
    }

    return wrapSelectableBlock(block, renderFallbackBlock(block, bindings, fieldValues));
  };

  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-background/40 px-8 py-16 text-center text-sm text-muted-foreground">
        Add screen widgets in the builder to compose this record editor.
      </div>
    );
  }

  return <div className="space-y-6">{blocks.map((block) => renderBlock(block) as ReactNode)}</div>;
}
