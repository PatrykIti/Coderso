import type { ComponentType, CSSProperties } from "react";

import type { WidgetBindingTarget, WidgetDefinition, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type ScreenRecordHeaderVariantId = "card" | "compact";
export type ScreenRecordHeaderAlign = "start" | "center";

export type ScreenRecordHeaderData = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  align?: ScreenRecordHeaderAlign;
  style?: {
    frameBackground?: string;
    frameGradient?: string;
    frameBorderColor?: string;
    badgeBackground?: string;
    badgeBorderColor?: string;
  };
};

export const screenRecordHeaderSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    eyebrow: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    title: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    subtitle: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    description: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    badge: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] },
    align: { enum: ["start", "center"] },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        frameBackground: { type: "string" },
        frameGradient: { type: "string" },
        frameBorderColor: { type: "string" },
        badgeBackground: { type: "string" },
        badgeBorderColor: { type: "string" },
      },
    },
  },
} as const;

export const screenRecordHeaderDefaults: ScreenRecordHeaderData = {
  eyebrow: "Record overview",
  title: "Untitled record",
  subtitle: "Preview the primary content fields in one place.",
  description:
    "Use bindings to map the header title, subtitle, description, and badge to entry fields.",
  badge: "Draft",
  align: "start",
  style: {
    frameGradient:
      "linear-gradient(135deg, var(--color-bg), var(--color-bg), color-mix(in srgb, var(--color-muted) 30%, transparent))",
    frameBorderColor: "color-mix(in srgb, var(--color-border) 70%, transparent)",
    badgeBackground: "color-mix(in srgb, var(--color-muted) 60%, transparent)",
    badgeBorderColor: "color-mix(in srgb, var(--color-border) 70%, transparent)",
  },
};

export const screenRecordHeaderBindingTargets: WidgetBindingTarget[] = [
  {
    propPath: "eyebrow",
    label: "Eyebrow",
    description: "Compact context label above the main record title.",
    modes: ["read", "write"],
  },
  {
    propPath: "title",
    label: "Title",
    description: "Primary record title shown in the header.",
    modes: ["read", "write"],
  },
  {
    propPath: "subtitle",
    label: "Subtitle",
    description: "Supporting summary line below the main title.",
    modes: ["read", "write"],
  },
  {
    propPath: "description",
    label: "Description",
    description: "Longer supporting context for the selected record.",
    modes: ["read", "write"],
  },
  {
    propPath: "badge",
    label: "Badge",
    description: "Short status badge rendered next to the title.",
    modes: ["read", "write"],
  },
];

const stringifyPrimitive = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
};

const alignClassMap: Record<ScreenRecordHeaderAlign, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
};

export function resolveScreenRecordHeaderVariant(value: string): ScreenRecordHeaderVariantId {
  if (value === "compact") return value;
  return "card";
}

export function normalizeScreenRecordHeaderData(
  value: ScreenRecordHeaderData
): ScreenRecordHeaderData {
  const hasStyleObject = value.style !== undefined;
  const style = hasStyleObject
    ? (compactObject({
        frameBackground: resolveClearableStyleValue(value.style?.frameBackground),
        frameGradient: resolveClearableStyleValue(value.style?.frameGradient),
        frameBorderColor: resolveClearableStyleValue(value.style?.frameBorderColor),
        badgeBackground: resolveClearableStyleValue(value.style?.badgeBackground),
        badgeBorderColor: resolveClearableStyleValue(value.style?.badgeBorderColor),
      }) ?? {})
    : undefined;

  return {
    eyebrow: stringifyPrimitive(value.eyebrow) ?? screenRecordHeaderDefaults.eyebrow ?? "",
    title: stringifyPrimitive(value.title) ?? screenRecordHeaderDefaults.title ?? "",
    subtitle: stringifyPrimitive(value.subtitle) ?? screenRecordHeaderDefaults.subtitle ?? "",
    description:
      stringifyPrimitive(value.description) ?? screenRecordHeaderDefaults.description ?? "",
    badge: stringifyPrimitive(value.badge) ?? screenRecordHeaderDefaults.badge ?? "",
    align: value.align === "center" ? "center" : "start",
    ...(hasStyleObject ? { style } : {}),
  };
}

export function ScreenRecordHeaderBlock({
  data,
  variant,
}: {
  data: ScreenRecordHeaderData;
  variant: string;
}) {
  const normalized = normalizeScreenRecordHeaderData(data);
  const resolvedVariant = resolveScreenRecordHeaderVariant(variant);
  const align = normalized.align ?? "start";
  const hasStyleObject = normalized.style !== undefined;
  const frameStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.frameBackground),
    backgroundImage: resolveClearableStyleValue(normalized.style?.frameGradient),
    borderColor: resolveClearableStyleValue(normalized.style?.frameBorderColor),
  });
  const badgeStyle: CSSProperties | undefined = compactStyle({
    backgroundColor: resolveClearableStyleValue(normalized.style?.badgeBackground),
    borderColor: resolveClearableStyleValue(normalized.style?.badgeBorderColor),
  });
  const legacyFrameSurfaceClass =
    !hasStyleObject && resolvedVariant === "compact"
      ? "border-border/60 bg-background/70"
      : !hasStyleObject
        ? "border-border/70 bg-gradient-to-br from-background via-background to-muted/30"
        : undefined;
  const frameClassName =
    resolvedVariant === "compact"
      ? `rounded-2xl border p-4 ${legacyFrameSurfaceClass ?? ""}`
      : `rounded-3xl border p-6 shadow-sm ${legacyFrameSurfaceClass ?? ""}`;

  return (
    <div
      className={`${frameClassName} flex flex-col gap-3 ${alignClassMap[align]}`}
      style={frameStyle}
      data-screen-widget="record-header"
      data-screen-widget-variant={resolvedVariant}
    >
      {normalized.eyebrow?.trim() ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {normalized.eyebrow}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {normalized.title}
        </h2>
        {normalized.badge?.trim() ? (
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${
              hasStyleObject ? "" : "border-border/70 bg-muted/60"
            }`}
            style={badgeStyle}
          >
            {normalized.badge}
          </span>
        ) : null}
      </div>
      {normalized.subtitle?.trim() ? (
        <p className="text-base text-foreground/80">{normalized.subtitle}</p>
      ) : null}
      {normalized.description?.trim() ? (
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {normalized.description}
        </p>
      ) : null}
    </div>
  );
}

export function createScreenRecordHeaderWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ScreenRecordHeaderData>>;
  visual: ComponentType<WidgetEditorProps<ScreenRecordHeaderData>>;
  advanced: ComponentType<WidgetEditorProps<ScreenRecordHeaderData>>;
}): WidgetDefinition<ScreenRecordHeaderData> {
  return {
    type: "screen-record-header",
    title: "Screen Record Header",
    description: "Header block for record title, subtitle, status, and summary.",
    category: "content",
    variants: [
      { id: "card", label: "Card" },
      { id: "compact", label: "Compact" },
    ],
    schema: screenRecordHeaderSchema,
    defaults: screenRecordHeaderDefaults,
    editor: editors,
    render: ScreenRecordHeaderBlock,
  };
}
