import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type ScreenRecordHeaderVariantId = "card" | "compact";
export type ScreenRecordHeaderAlign = "start" | "center";

export type ScreenRecordHeaderData = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  align?: ScreenRecordHeaderAlign;
};

export const screenRecordHeaderSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    eyebrow: { type: "string" },
    title: { type: "string" },
    subtitle: { type: "string" },
    description: { type: "string" },
    badge: { type: "string" },
    align: { enum: ["start", "center"] },
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
};

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

export function resolveScreenRecordHeaderVariant(
  value: string
): ScreenRecordHeaderVariantId {
  if (value === "compact") return value;
  return "card";
}

export function normalizeScreenRecordHeaderData(
  value: ScreenRecordHeaderData
): ScreenRecordHeaderData {
  return {
    eyebrow: stringifyPrimitive(value.eyebrow) ?? (screenRecordHeaderDefaults.eyebrow ?? ""),
    title: stringifyPrimitive(value.title) ?? (screenRecordHeaderDefaults.title ?? ""),
    subtitle:
      stringifyPrimitive(value.subtitle) ?? (screenRecordHeaderDefaults.subtitle ?? ""),
    description:
      stringifyPrimitive(value.description) ??
      (screenRecordHeaderDefaults.description ?? ""),
    badge: stringifyPrimitive(value.badge) ?? (screenRecordHeaderDefaults.badge ?? ""),
    align: value.align === "center" ? "center" : "start",
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
  const frameClassName =
    resolvedVariant === "compact"
      ? "rounded-2xl border border-border/60 bg-background/70 p-4"
      : "rounded-3xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm";

  return (
    <div
      className={`${frameClassName} flex flex-col gap-3 ${alignClassMap[align]}`}
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
          <span className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
