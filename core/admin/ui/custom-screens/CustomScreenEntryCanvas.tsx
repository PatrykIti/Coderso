import type { ReactNode } from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldRenderer } from "@/ui/entries/FieldRenderer";
import type { WidgetBlock } from "../../../widgets/types";
import { getWidgetBindings } from "../../../services/customScreens/bindingResolver";
import type { CustomScreenBinding } from "../../../services/customScreens/customScreenSchemas";
import {
  normalizeScreenFieldValueData,
  type ScreenFieldValueData,
} from "../../../widgets/core/screenFieldValue";
import type { ContentField } from "../content-types/SchemaBuilder";
import { resolveScreenWidgetBlock, ScreenWidgetReadOnlyBlock } from "./screenWidgetRenderBridge";

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
        data-selected-block-id={block.id}
        data-selected={isSelected ? "true" : "false"}
        className={`group relative rounded-3xl transition ${
          isSelected ? "ring-2 ring-primary/30" : "hover:ring-2 hover:ring-primary/15"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onSelectBlock?.(block.id);
        }}
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
    const resolvedBlock = resolveScreenWidgetBlock({
      block,
      bindings,
      fieldValues,
    });
    const blockBindings = getWidgetBindings(bindings, block.id, {
      includeRead: true,
      includeWrite: true,
    });

    if (resolvedBlock.type === "screen-field-value") {
      const data = normalizeScreenFieldValueData(
        (resolvedBlock.data ?? {}) as ScreenFieldValueData
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
        writeBinding && field ? (
          <div className="rounded-2xl border p-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {data.label}
              </p>
              <Badge variant="outline" className="text-[10px] uppercase">
                {fieldTypeLabels[field.type as keyof typeof fieldTypeLabels] ?? field.type}
              </Badge>
            </div>
            <div className="mt-3">
              {writeBinding.field === "title" ? (
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
              )}
            </div>
            {data.helper?.trim() ? (
              <p className="mt-2 text-xs text-muted-foreground">{data.helper}</p>
            ) : null}
            {fieldErrors[writeBinding.field] ? (
              <p className="mt-2 text-xs text-destructive">{fieldErrors[writeBinding.field]}</p>
            ) : null}
          </div>
        ) : (
          <ScreenWidgetReadOnlyBlock
            block={resolvedBlock}
            renderNestedBlock={(child) => renderBlock(child)}
          />
        )
      );
    }

    return wrapSelectableBlock(
      block,
      <ScreenWidgetReadOnlyBlock
        block={resolvedBlock}
        renderNestedBlock={(child) => renderBlock(child)}
      />
    );
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
