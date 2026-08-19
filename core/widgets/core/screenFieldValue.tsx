import type { ComponentType, CSSProperties } from "react";

import type { WidgetBindingTarget, WidgetDefinition, WidgetEditorBundle } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type ScreenFieldValueVariantId = "stacked" | "inline";
export type ScreenFieldValueTone = "default" | "strong" | "muted";

export type ScreenFieldValueData = {
  label?: string;
  value?: string;
  helper?: string;
  tone?: ScreenFieldValueTone;
  style?: {
    frameBackground?: string;
    frameBorderColor?: string;
  };
};

export const screenFieldValueSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    label: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    value: {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        {
          type: "array",
          items: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
        },
      ],
    },
    helper: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    tone: { enum: ["default", "strong", "muted"] },
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

export const screenFieldValueDefaults: ScreenFieldValueData = {
  label: "Field label",
  value: "Mapped field value",
  helper: "Optional helper text for editors and reviewers.",
  tone: "default",
  style: {
    frameBackground: "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    frameBorderColor: "color-mix(in srgb, var(--color-border) 60%, transparent)",
  },
};

export const screenFieldValueBindingTargets: WidgetBindingTarget[] = [
  {
    propPath: "label",
    label: "Label",
    description: "Field label shown above or beside the mapped value.",
    modes: ["read"],
  },
  {
    propPath: "value",
    label: "Value",
    description: "Primary field value rendered from the selected record.",
    modes: ["read", "write"],
  },
  {
    propPath: "helper",
    label: "Helper",
    description: "Supporting helper copy rendered below the mapped value.",
    modes: ["read"],
  },
];

const stringifyPrimitive = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
          ? String(item)
          : ""
      )
      .filter(Boolean)
      .join(", ");
  }
  return null;
};

const toneClassMap: Record<ScreenFieldValueTone, string> = {
  default: "text-foreground",
  strong: "text-foreground font-semibold",
  muted: "text-muted-foreground",
};

export function resolveScreenFieldValueVariant(value: string): ScreenFieldValueVariantId {
  if (value === "inline") return value;
  return "stacked";
}

export function normalizeScreenFieldValueData(value: ScreenFieldValueData): ScreenFieldValueData {
  const hasStyleObject = value.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(value.style?.frameBackground),
        frameBorderColor: resolveClearableStyleValue(value.style?.frameBorderColor),
      }) ?? {})
    : undefined;

  return {
    label: stringifyPrimitive(value.label) ?? screenFieldValueDefaults.label ?? "",
    value: stringifyPrimitive(value.value) ?? screenFieldValueDefaults.value ?? "",
    helper: stringifyPrimitive(value.helper) ?? screenFieldValueDefaults.helper ?? "",
    tone: value.tone === "strong" || value.tone === "muted" ? value.tone : "default",
    ...(hasStyleObject ? { style } : {}),
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
  const hasStyleObject = normalized.style !== undefined;
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const legacyFrameSurfaceClass = hasStyleObject
    ? ""
    : resolvedVariant === "inline"
      ? "border-border/60 bg-background/60"
      : "border-border/60 bg-background/70";

  if (resolvedVariant === "inline") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${legacyFrameSurfaceClass}`}
        style={frameStyle}
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
      className={`space-y-2 rounded-2xl border p-4 ${legacyFrameSurfaceClass}`}
      style={frameStyle}
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

export function createScreenFieldValueWidget(
  editors: WidgetEditorBundle<ScreenFieldValueData>
): WidgetDefinition<ScreenFieldValueData> {
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
