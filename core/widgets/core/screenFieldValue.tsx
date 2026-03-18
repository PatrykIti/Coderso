import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type ScreenFieldValueVariantId = "stacked" | "inline";
export type ScreenFieldValueTone = "default" | "strong" | "muted";

export type ScreenFieldValueData = {
  label?: string;
  value?: string;
  helper?: string;
  tone?: ScreenFieldValueTone;
};

export const screenFieldValueSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    value: { type: "string" },
    helper: { type: "string" },
    tone: { enum: ["default", "strong", "muted"] },
  },
} as const;

export const screenFieldValueDefaults: ScreenFieldValueData = {
  label: "Field label",
  value: "Mapped field value",
  helper: "Optional helper text for editors and reviewers.",
  tone: "default",
};

const toneClassMap: Record<ScreenFieldValueTone, string> = {
  default: "text-foreground",
  strong: "text-foreground font-semibold",
  muted: "text-muted-foreground",
};

export function resolveScreenFieldValueVariant(
  value: string
): ScreenFieldValueVariantId {
  if (value === "inline") return value;
  return "stacked";
}

export function normalizeScreenFieldValueData(
  value: ScreenFieldValueData
): ScreenFieldValueData {
  return {
    label:
      typeof value.label === "string"
        ? value.label
        : (screenFieldValueDefaults.label ?? ""),
    value:
      typeof value.value === "string"
        ? value.value
        : (screenFieldValueDefaults.value ?? ""),
    helper:
      typeof value.helper === "string"
        ? value.helper
        : (screenFieldValueDefaults.helper ?? ""),
    tone:
      value.tone === "strong" || value.tone === "muted" ? value.tone : "default",
  };
}

export function ScreenFieldValueBlock({
  data,
  variant,
}: {
  data: ScreenFieldValueData;
  variant: string;
}) {
  const normalized = normalizeScreenFieldValueData(data);
  const resolvedVariant = resolveScreenFieldValueVariant(variant);
  const tone = normalized.tone ?? "default";

  if (resolvedVariant === "inline") {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
        data-screen-widget="field-value"
        data-screen-widget-variant="inline"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {normalized.label}
          </p>
          {normalized.helper?.trim() ? (
            <p className="text-xs text-muted-foreground">{normalized.helper}</p>
          ) : null}
        </div>
        <p className={`text-base ${toneClassMap[tone]}`}>{normalized.value}</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4"
      data-screen-widget="field-value"
      data-screen-widget-variant="stacked"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {normalized.label}
      </p>
      <p className={`text-lg ${toneClassMap[tone]}`}>{normalized.value}</p>
      {normalized.helper?.trim() ? (
        <p className="text-xs leading-5 text-muted-foreground">{normalized.helper}</p>
      ) : null}
    </div>
  );
}

export function createScreenFieldValueWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ScreenFieldValueData>>;
  visual: ComponentType<WidgetEditorProps<ScreenFieldValueData>>;
  advanced: ComponentType<WidgetEditorProps<ScreenFieldValueData>>;
}): WidgetDefinition<ScreenFieldValueData> {
  return {
    type: "screen-field-value",
    title: "Screen Field Value",
    description: "Display a mapped content field as a readable admin card or row.",
    category: "content",
    variants: [
      { id: "stacked", label: "Stacked" },
      { id: "inline", label: "Inline" },
    ],
    schema: screenFieldValueSchema,
    defaults: screenFieldValueDefaults,
    editor: editors,
    render: ScreenFieldValueBlock,
  };
}
