import type { ComponentType, CSSProperties } from "react";

import { WidgetRenderer } from "../renderers/widgetRenderer";
import { parseRepeatableSlotId, resolveWidgetSlotTargets } from "../slots";
import type { DeviceTarget, WidgetBlock, WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type AccordionVariantId = "soft" | "bordered" | "compact";

export type AccordionItem = {
  id?: string;
  title?: string;
  description?: string;
};

export type AccordionData = {
  items?: AccordionItem[];
  options?: {
    openMode?: "single" | "multiple";
    defaultOpenIds?: string[];
    collapsible?: boolean;
    initiallyOpenId?: string;
    allowMultiple?: boolean;
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    summaryTextColor?: string;
  };
};

export const accordionItemMin = 2;
export const accordionItemMax = 8;

export const accordionItemSlot = {
  id: "item",
  label: "Item",
  kind: "repeatable" as const,
  minItems: accordionItemMin,
  maxItems: accordionItemMax,
};

export const accordionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: accordionItemMin,
      maxItems: accordionItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        openMode: { enum: ["single", "multiple"] },
        defaultOpenIds: {
          type: "array",
          maxItems: accordionItemMax,
          items: { type: "string" },
        },
        collapsible: { type: "boolean" },
        initiallyOpenId: { type: "string" },
        allowMultiple: { type: "boolean" },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        summaryTextColor: { type: "string" },
      },
    },
  },
};

export const accordionDefaults: AccordionData = {
  items: [
    {
      id: "1",
      title: "Section 1",
      description: "Open this panel to reveal the first content area.",
    },
    {
      id: "2",
      title: "Section 2",
      description: "Use additional sections for FAQs or grouped details.",
    },
  ],
  options: {
    openMode: "single",
    defaultOpenIds: ["1"],
    collapsible: true,
    initiallyOpenId: "1",
    allowMultiple: false,
  },
  style: {
    surfaceColor: "var(--color-surface)",
    borderColor: "var(--color-border)",
    summaryTextColor: "var(--color-text)",
  },
};

type NormalizedAccordionItem = {
  id: string;
  title: string;
  description?: string;
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCount = (value: number) =>
  Math.max(accordionItemMin, Math.min(accordionItemMax, Math.floor(value)));

const resolveVariant = (variant: string): AccordionVariantId => {
  if (variant === "bordered" || variant === "compact") return variant;
  return "soft";
};

const normalizeItemId = (value: unknown, fallbackIndex: number, used: Set<string>) => {
  const id = toTrimmedString(value) ?? String(fallbackIndex + 1);
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let next = fallbackIndex + 1;
  while (used.has(String(next))) {
    next += 1;
  }
  const resolved = String(next);
  used.add(resolved);
  return resolved;
};

export function normalizeAccordionItems(
  items: AccordionItem[] | undefined,
  desiredCount?: number
): NormalizedAccordionItem[] {
  const source = Array.isArray(items) ? items : [];
  const count =
    typeof desiredCount === "number"
      ? normalizeCount(desiredCount)
      : normalizeCount(
          source.length > 0 ? source.length : (accordionDefaults.items?.length ?? accordionItemMin)
        );

  const used = new Set<string>();
  const normalized: NormalizedAccordionItem[] = [];

  for (let index = 0; index < count; index += 1) {
    const raw = source[index] ?? accordionDefaults.items?.[index] ?? {};
    const id = normalizeItemId(raw.id, index, used);
    normalized.push({
      id,
      title: toTrimmedString(raw.title) ?? `Section ${index + 1}`,
      description: toTrimmedString(raw.description) ?? undefined,
    });
  }

  return normalized;
}

export function normalizeAccordionData(data: AccordionData, desiredCount?: number): AccordionData {
  const items = normalizeAccordionItems(data.items, desiredCount);
  const itemIds = new Set(items.map((item) => item.id));
  const legacyInitialId = toTrimmedString(data.options?.initiallyOpenId);
  const openMode =
    data.options?.openMode === "multiple" || data.options?.allowMultiple === true
      ? "multiple"
      : "single";
  const defaultOpenIdsRaw = Array.isArray(data.options?.defaultOpenIds)
    ? data.options?.defaultOpenIds
    : legacyInitialId
      ? [legacyInitialId]
      : [];
  const defaultOpenIds = Array.from(
    new Set(
      defaultOpenIdsRaw
        .map((value) => toTrimmedString(value))
        .filter((value): value is string => typeof value === "string" && itemIds.has(value))
    )
  );
  const normalizedDefaultOpenIds =
    defaultOpenIds.length > 0
      ? openMode === "multiple"
        ? defaultOpenIds
        : [defaultOpenIds[0]!]
      : items[0]?.id
        ? [items[0].id]
        : ["1"];
  const initiallyOpenId = normalizedDefaultOpenIds[0] ?? items[0]?.id ?? "1";

  const hasStyleObject = data.style !== undefined;

  return {
    items,
    options: {
      openMode,
      defaultOpenIds: normalizedDefaultOpenIds,
      collapsible:
        typeof data.options?.collapsible === "boolean"
          ? data.options.collapsible
          : (accordionDefaults.options?.collapsible ?? true),
      initiallyOpenId,
      allowMultiple: openMode === "multiple",
    },
    style: {
      surfaceColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surfaceColor)
        : (accordionDefaults.style?.surfaceColor ?? "var(--color-surface)"),
      borderColor:
        toTrimmedString(data.style?.borderColor) ??
        accordionDefaults.style?.borderColor ??
        "var(--color-border)",
      summaryTextColor:
        toTrimmedString(data.style?.summaryTextColor) ??
        accordionDefaults.style?.summaryTextColor ??
        "var(--color-text)",
    },
  };
}

type ResolvedAccordionItem = {
  slotId: string;
  instanceId: string;
  title: string;
  description: string | null;
  blocks: WidgetBlock[];
};

const resolveAccordionItems = (
  data: AccordionData,
  slotMap: Record<string, WidgetBlock[]>
): ResolvedAccordionItem[] => {
  const slotTargets = resolveWidgetSlotTargets([accordionItemSlot], slotMap).filter(
    (target) => target.definitionId === accordionItemSlot.id
  );
  const normalized = normalizeAccordionData(data, slotTargets.length);
  const items = normalizeAccordionItems(normalized.items, slotTargets.length);
  const byId = new Map(items.map((item) => [item.id, item]));

  return slotTargets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const instanceId = parsed?.instanceId ?? String(index + 1);
    const source = byId.get(instanceId) ?? items[index];

    return {
      slotId: target.slotId,
      instanceId,
      title: source?.title ?? `Section ${index + 1}`,
      description: source?.description ?? null,
      blocks: Array.isArray(slotMap[target.slotId]) ? slotMap[target.slotId]! : [],
    };
  });
};

const resolveContainerClass = (variant: AccordionVariantId) => {
  if (variant === "bordered") return "rounded-lg border";
  if (variant === "compact") return "rounded-md border";
  return "rounded-xl border";
};

const resolveSummaryClass = (variant: AccordionVariantId) => {
  if (variant === "bordered") {
    return "cursor-pointer list-none px-4 py-3 text-sm font-semibold";
  }
  if (variant === "compact") {
    return "cursor-pointer list-none px-3 py-2 text-sm font-medium";
  }
  return "cursor-pointer list-none px-4 py-3.5 text-base font-semibold";
};

export function AccordionBlock({
  data,
  variant,
  slots,
  previewDevice,
}: {
  data: AccordionData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
}) {
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const resolvedItems = resolveAccordionItems(data, slotMap);
  const normalized = normalizeAccordionData(data, resolvedItems.length);
  const resolvedVariant = resolveVariant(variant);
  const openMode = normalized.options?.openMode ?? "single";
  const defaultOpenIds =
    normalized.options?.defaultOpenIds?.filter((id) =>
      resolvedItems.some((item) => item.instanceId === id)
    ) ?? [];
  const detailsGroupName = `nextless-accordion-${resolvedItems[0]?.instanceId ?? "group"}`;
  const style = normalized.style ?? accordionDefaults.style!;

  const containerStyle: CSSProperties =
    compactStyle({
      borderColor: style.borderColor,
      backgroundColor: resolveClearableStyleValue(style.surfaceColor),
    }) ?? {};

  const summaryStyle: CSSProperties = {
    color: style.summaryTextColor,
    borderColor: style.borderColor,
  };

  return (
    <div
      className="space-y-3"
      data-nextless-accordion="1"
      data-nextless-accordion-variant={resolvedVariant}
      data-nextless-accordion-count={String(resolvedItems.length)}
    >
      {resolvedItems.map((item, index) => {
        const shouldOpen =
          openMode === "multiple"
            ? defaultOpenIds.includes(item.instanceId)
            : item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId) &&
              index === 0;

        return (
          <details
            key={item.slotId}
            open={shouldOpen}
            name={openMode === "multiple" ? undefined : detailsGroupName}
            className={resolveContainerClass(resolvedVariant)}
            style={containerStyle}
            data-nextless-accordion-item={item.instanceId}
          >
            <summary className={resolveSummaryClass(resolvedVariant)} style={summaryStyle}>
              {item.title}
            </summary>
            <div
              className={joinClasses(
                "space-y-4 border-t",
                resolvedVariant === "compact" ? "p-3" : "p-4"
              )}
              style={{ borderColor: style.borderColor }}
            >
              {item.description ? (
                <p className="text-sm text-[var(--color-text)]/70">{item.description}</p>
              ) : null}
              {item.blocks.length > 0 ? (
                item.blocks.map((block) => (
                  <WidgetRenderer key={block.id} block={block} previewDevice={previewDevice} />
                ))
              ) : (
                <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
                  Add widgets to this accordion item.
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function createAccordionWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<AccordionData>>;
  visual: ComponentType<WidgetEditorProps<AccordionData>>;
  advanced: ComponentType<WidgetEditorProps<AccordionData>>;
}): WidgetDefinition<AccordionData> {
  return {
    type: "accordion",
    title: "Accordion",
    description: "Expandable stacked content panels.",
    category: "layout",
    variants: [
      {
        id: "soft",
        label: "Soft",
        description: "Roomy cards with gentle spacing.",
      },
      {
        id: "bordered",
        label: "Bordered",
        description: "Structured accordion with stronger borders.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Dense accordion for space-constrained layouts.",
      },
    ],
    schema: accordionSchema,
    defaults: accordionDefaults,
    slots: [accordionItemSlot],
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: AccordionBlock,
  };
}
