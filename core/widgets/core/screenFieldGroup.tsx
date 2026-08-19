import type { ComponentType, CSSProperties, ReactNode } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorBundle,
  WidgetLayoutDefaults,
} from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type ScreenFieldGroupVariantId = "card" | "subtle";

export type ScreenFieldGroupData = {
  title?: string;
  description?: string;
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
  };
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
    title: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    description: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameBorderColor: { type: "string" },
      },
    },
  },
} as const;

export const screenFieldGroupDefaults: ScreenFieldGroupData = {
  title: "Field group",
  description: "Group related record fields and widgets into one admin panel.",
  style: {
    frameBackground: "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    frameBorderColor: "color-mix(in srgb, var(--color-border) 70%, transparent)",
  },
};

export function resolveScreenFieldGroupVariant(value: string): ScreenFieldGroupVariantId {
  if (value === "subtle") return value;
  return "card";
}

export function normalizeScreenFieldGroupData(value: ScreenFieldGroupData): ScreenFieldGroupData {
  const hasStyleObject = value.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(value.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(value.style?.frameBorderColor),
      }) ?? {})
    : undefined;

  return {
    title: typeof value.title === "string" ? value.title : (screenFieldGroupDefaults.title ?? ""),
    description:
      typeof value.description === "string"
        ? value.description
        : (screenFieldGroupDefaults.description ?? ""),
    ...(hasStyleObject ? { style } : {}),
  };
}

export function ScreenFieldGroupBlock({
  data,
  variant,
  slots,
  previewDevice,
  pageDefaults,
  renderBlock,
}: {
  data: ScreenFieldGroupData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  pageDefaults?: WidgetLayoutDefaults;
  renderBlock?: (block: WidgetBlock) => ReactNode;
}) {
  const normalized = normalizeScreenFieldGroupData(data);
  const resolvedVariant = resolveScreenFieldGroupVariant(variant);
  const content = slots?.content ?? [];
  const hasStyleObject = normalized.style !== undefined;
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const legacyFrameSurfaceClass =
    !hasStyleObject && resolvedVariant === "subtle"
      ? "border-border/50 bg-muted/20"
      : !hasStyleObject
        ? "border-border/70 bg-background/80"
        : undefined;
  const frameClassName =
    resolvedVariant === "subtle"
      ? `rounded-2xl border p-4 ${legacyFrameSurfaceClass ?? ""}`
      : `rounded-3xl border p-5 shadow-sm ${legacyFrameSurfaceClass ?? ""}`;

  return (
    <div
      className={`${frameClassName} space-y-4`}
      style={frameStyle}
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
            <div key={block.id}>
              {renderBlock ? (
                renderBlock(block)
              ) : (
                <WidgetRenderer
                  block={block}
                  previewDevice={previewDevice}
                  pageDefaults={pageDefaults}
                />
              )}
            </div>
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

export function createScreenFieldGroupWidget(
  editors: WidgetEditorBundle<ScreenFieldGroupData>
): WidgetDefinition<ScreenFieldGroupData> {
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
