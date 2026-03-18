import type { ComponentType } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetLayoutDefaults,
} from "../types";

export type ScreenFieldGroupVariantId = "card" | "subtle";

export type ScreenFieldGroupData = {
  title?: string;
  description?: string;
};

export const screenFieldGroupContentSlot = {
  id: "content",
  label: "Content",
  kind: "fixed" as const,
};

export const screenFieldGroupSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
} as const;

export const screenFieldGroupDefaults: ScreenFieldGroupData = {
  title: "Field group",
  description: "Group related record fields and widgets into one admin panel.",
};

export function resolveScreenFieldGroupVariant(
  value: string
): ScreenFieldGroupVariantId {
  if (value === "subtle") return value;
  return "card";
}

export function normalizeScreenFieldGroupData(
  value: ScreenFieldGroupData
): ScreenFieldGroupData {
  return {
    title:
      typeof value.title === "string"
        ? value.title
        : (screenFieldGroupDefaults.title ?? ""),
    description:
      typeof value.description === "string"
        ? value.description
        : (screenFieldGroupDefaults.description ?? ""),
  };
}

export function ScreenFieldGroupBlock({
  data,
  variant,
  slots,
  previewDevice,
  pageDefaults,
}: {
  data: ScreenFieldGroupData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
}) {
  const normalized = normalizeScreenFieldGroupData(data);
  const resolvedVariant = resolveScreenFieldGroupVariant(variant);
  const content = slots?.content ?? [];
  const frameClassName =
    resolvedVariant === "subtle"
      ? "rounded-2xl border border-border/50 bg-muted/20 p-4"
      : "rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm";

  return (
    <div
      className={`${frameClassName} space-y-4`}
      data-screen-widget="field-group"
      data-screen-widget-variant={resolvedVariant}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{normalized.title}</p>
        {normalized.description?.trim() ? (
          <p className="text-sm text-muted-foreground">{normalized.description}</p>
        ) : null}
      </div>
      <div className="space-y-4">
        {content.length > 0 ? (
          content.map((block) => (
            <WidgetRenderer
              key={block.id}
              block={block}
              previewDevice={previewDevice}
              pageDefaults={pageDefaults}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
            Add screen field widgets into this group.
          </div>
        )}
      </div>
    </div>
  );
}

export function createScreenFieldGroupWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ScreenFieldGroupData>>;
  visual: ComponentType<WidgetEditorProps<ScreenFieldGroupData>>;
  advanced: ComponentType<WidgetEditorProps<ScreenFieldGroupData>>;
}): WidgetDefinition<ScreenFieldGroupData> {
  return {
    type: "screen-field-group",
    title: "Screen Field Group",
    description: "Panel wrapper for grouping related screen field widgets.",
    category: "layout",
    variants: [
      { id: "card", label: "Card" },
      { id: "subtle", label: "Subtle" },
    ],
    schema: screenFieldGroupSchema,
    defaults: screenFieldGroupDefaults,
    slots: [screenFieldGroupContentSlot],
    editor: editors,
    render: ScreenFieldGroupBlock,
  };
}
