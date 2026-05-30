import { useId, type ComponentType, type CSSProperties, type ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import { parseRepeatableSlotId, resolveWidgetSlotTargets } from "../slots";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorContract,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

export type AccordionVariantId = "soft" | "bordered" | "compact";
export const accordionMotionTokens = ["none", "subtle", "smooth"] as const;
export const accordionPaddingTokens = ["sm", "md", "lg"] as const;
export const accordionRadiusTokens = ["sm", "md", "lg", "xl"] as const;
export const accordionSummaryFontSizeTokens = ["sm", "base", "lg"] as const;
export const accordionSummaryFontWeightTokens = ["medium", "semibold", "bold"] as const;
export const accordionMaxWidthTokens = ["sm", "md", "lg", "full"] as const;

export type AccordionMotion = (typeof accordionMotionTokens)[number];
export type AccordionPadding = (typeof accordionPaddingTokens)[number];
export type AccordionRadius = (typeof accordionRadiusTokens)[number];
export type AccordionSummaryFontSize = (typeof accordionSummaryFontSizeTokens)[number];
export type AccordionSummaryFontWeight = (typeof accordionSummaryFontWeightTokens)[number];
export type AccordionMaxWidth = (typeof accordionMaxWidthTokens)[number];

export type AccordionItem = {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
};

export type AccordionData = {
  items?: AccordionItem[];
  options?: {
    openMode?: "single" | "multiple";
    defaultOpenIds?: string[];
    collapsible?: boolean;
    initiallyOpenId?: string;
    allowMultiple?: boolean;
    motion?: AccordionMotion;
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    summaryTextColor?: string;
    descriptionTextColor?: string;
    summaryPadding?: AccordionPadding;
    contentPadding?: AccordionPadding;
    radius?: AccordionRadius;
    summaryFontSize?: AccordionSummaryFontSize;
    summaryFontWeight?: AccordionSummaryFontWeight;
  };
  layout?: {
    maxWidth?: AccordionMaxWidth;
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
          icon: { type: "string" },
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
        motion: { enum: accordionMotionTokens },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        summaryTextColor: { type: "string" },
        descriptionTextColor: { type: "string" },
        summaryPadding: { enum: accordionPaddingTokens },
        contentPadding: { enum: accordionPaddingTokens },
        radius: { enum: accordionRadiusTokens },
        summaryFontSize: { enum: accordionSummaryFontSizeTokens },
        summaryFontWeight: { enum: accordionSummaryFontWeightTokens },
      },
    },
    layout: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxWidth: { enum: accordionMaxWidthTokens },
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
    motion: "none",
  },
  style: {
    surfaceColor: "var(--color-surface)",
    borderColor: "var(--color-border)",
    summaryTextColor: "var(--color-text)",
  },
  layout: {
    maxWidth: "full",
  },
};

export const accordionEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "accordion.wizard.starter-setup",
      title: "Starter items",
      role: "setup",
      writablePaths: ["options.defaultOpenIds"],
      readOnlyPaths: ["slots.item", "items.*.title", "items.*.description"],
    },
    {
      mode: "visual",
      id: "accordion.visual.variant",
      title: "Variant",
      role: "visual",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "accordion.visual.item-content",
      title: "Item content",
      role: "content",
      writablePaths: ["items.*.title", "items.*.description", "items.*.icon"],
    },
    {
      mode: "visual",
      id: "accordion.visual.behavior-style",
      title: "Behavior and Style",
      role: "visual",
      writablePaths: [
        "options.openMode",
        "options.collapsible",
        "options.motion",
        "layout.maxWidth",
        "style.summaryPadding",
        "style.contentPadding",
        "style.radius",
        "style.summaryFontSize",
        "style.summaryFontWeight",
        "style.surfaceColor",
        "style.borderColor",
        "style.summaryTextColor",
        "style.descriptionTextColor",
      ],
      readOnlyPaths: ["options.defaultOpenIds"],
    },
    {
      mode: "advanced",
      id: "accordion.advanced.behavior-summary",
      title: "Behavior summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "options.openMode",
        "options.defaultOpenIds",
        "options.collapsible",
        "options.motion",
      ],
    },
    {
      mode: "advanced",
      id: "accordion.advanced.item-summary",
      title: "Saved items summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["items.*.title", "items.*.description", "items.*.icon"],
    },
    {
      mode: "advanced",
      id: "accordion.advanced.display-summary",
      title: "Saved display summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: [
        "variant",
        "layout.maxWidth",
        "style.summaryPadding",
        "style.contentPadding",
        "style.summaryFontSize",
        "style.summaryFontWeight",
        "style.surfaceColor",
        "style.borderColor",
        "style.summaryTextColor",
        "style.descriptionTextColor",
      ],
    },
    {
      mode: "advanced",
      id: "accordion.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

type NormalizedAccordionItem = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeShortPlainText = (value: unknown, maxLength: number) => {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
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

const isAllowedToken = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === "string" && allowed.includes(value as T);

const resolveOptionalToken = <T extends string>(value: unknown, allowed: readonly T[]) =>
  isAllowedToken(value, allowed) ? value : undefined;

const resolveToken = <T extends string>(value: unknown, fallback: T, allowed: readonly T[]) =>
  isAllowedToken(value, allowed) ? value : fallback;

const normalizeAccordionColor = (value: unknown, fallback?: string) =>
  toTrimmedString(value) ?? fallback;

export const accordionVariantFallbackTokenMap: Record<
  AccordionVariantId,
  {
    contentPadding: AccordionPadding;
    radius: AccordionRadius;
    summaryFontSize: AccordionSummaryFontSize;
    summaryFontWeight: AccordionSummaryFontWeight;
    summaryPadding: AccordionPadding;
  }
> = {
  soft: {
    contentPadding: "md",
    radius: "lg",
    summaryFontSize: "base",
    summaryFontWeight: "semibold",
    summaryPadding: "md",
  },
  bordered: {
    contentPadding: "md",
    radius: "md",
    summaryFontSize: "sm",
    summaryFontWeight: "semibold",
    summaryPadding: "md",
  },
  compact: {
    contentPadding: "sm",
    radius: "sm",
    summaryFontSize: "sm",
    summaryFontWeight: "medium",
    summaryPadding: "sm",
  },
};

const accordionPaddingClassMap: Record<AccordionPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const accordionSummaryPaddingClassMap: Record<AccordionPadding, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-5 py-4",
};

const accordionRadiusClassMap: Record<AccordionRadius, string> = {
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};

const accordionSummaryFontSizeClassMap: Record<AccordionSummaryFontSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

const accordionSummaryFontWeightClassMap: Record<AccordionSummaryFontWeight, string> = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const accordionMaxWidthClassMap: Record<AccordionMaxWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  full: "max-w-none",
};

const accordionMotionClassMap: Record<AccordionMotion, string> = {
  none: "",
  subtle: "motion-safe:transition-colors motion-safe:duration-150",
  smooth: "motion-safe:transition-all motion-safe:duration-200",
};

const accordionMotionChevronClassMap: Record<AccordionMotion, string> = {
  none: "",
  subtle: "motion-safe:transition-transform motion-safe:duration-150",
  smooth: "motion-safe:transition-transform motion-safe:duration-200",
};

export const accordionVariantFallbackClassMap: Record<
  AccordionVariantId,
  {
    contentPaddingClass: string;
    radiusClass: string;
    summaryFontSizeClass: string;
    summaryFontWeightClass: string;
    summaryPaddingClass: string;
  }
> = Object.fromEntries(
  Object.entries(accordionVariantFallbackTokenMap).map(([variant, fallback]) => [
    variant,
    {
      contentPaddingClass: accordionPaddingClassMap[fallback.contentPadding],
      radiusClass: accordionRadiusClassMap[fallback.radius],
      summaryFontSizeClass: accordionSummaryFontSizeClassMap[fallback.summaryFontSize],
      summaryFontWeightClass: accordionSummaryFontWeightClassMap[fallback.summaryFontWeight],
      summaryPaddingClass: accordionSummaryPaddingClassMap[fallback.summaryPadding],
    },
  ])
) as Record<
  AccordionVariantId,
  {
    contentPaddingClass: string;
    radiusClass: string;
    summaryFontSizeClass: string;
    summaryFontWeightClass: string;
    summaryPaddingClass: string;
  }
>;

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
      icon: normalizeShortPlainText(raw.icon, 24),
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
  const collapsible =
    typeof data.options?.collapsible === "boolean"
      ? data.options.collapsible
      : (accordionDefaults.options?.collapsible ?? true);
  const hasExplicitDefaultOpenIds = Array.isArray(data.options?.defaultOpenIds);
  const explicitDefaultOpenIds = hasExplicitDefaultOpenIds
    ? (data.options?.defaultOpenIds ?? [])
    : undefined;
  const defaultOpenIdsRaw =
    explicitDefaultOpenIds ?? (legacyInitialId ? [legacyInitialId] : undefined) ?? [];
  const defaultOpenIds = Array.from(
    new Set(
      defaultOpenIdsRaw
        .map((value) => toTrimmedString(value))
        .filter((value): value is string => typeof value === "string" && itemIds.has(value))
    )
  );
  const wantsAllClosed =
    hasExplicitDefaultOpenIds && explicitDefaultOpenIds?.length === 0 && collapsible;
  const normalizedDefaultOpenIds = wantsAllClosed
    ? []
    : defaultOpenIds.length > 0
      ? openMode === "multiple"
        ? defaultOpenIds
        : [defaultOpenIds[0]!]
      : items[0]?.id
        ? [items[0].id]
        : [];
  const initiallyOpenId = normalizedDefaultOpenIds[0] ?? undefined;

  const hasStyleObject = data.style !== undefined;

  return {
    items,
    options: {
      openMode,
      defaultOpenIds: normalizedDefaultOpenIds,
      collapsible,
      initiallyOpenId,
      allowMultiple: openMode === "multiple",
      motion: resolveToken(
        data.options?.motion,
        accordionDefaults.options?.motion ?? "none",
        accordionMotionTokens
      ),
    },
    style: {
      surfaceColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surfaceColor)
        : (accordionDefaults.style?.surfaceColor ?? "var(--color-surface)"),
      borderColor: normalizeAccordionColor(
        data.style?.borderColor,
        accordionDefaults.style?.borderColor ?? "var(--color-border)"
      ),
      summaryTextColor: normalizeAccordionColor(
        data.style?.summaryTextColor,
        accordionDefaults.style?.summaryTextColor ?? "var(--color-text)"
      ),
      descriptionTextColor: normalizeAccordionColor(data.style?.descriptionTextColor),
      summaryPadding: resolveOptionalToken(data.style?.summaryPadding, accordionPaddingTokens),
      contentPadding: resolveOptionalToken(data.style?.contentPadding, accordionPaddingTokens),
      radius: resolveOptionalToken(data.style?.radius, accordionRadiusTokens),
      summaryFontSize: resolveOptionalToken(
        data.style?.summaryFontSize,
        accordionSummaryFontSizeTokens
      ),
      summaryFontWeight: resolveOptionalToken(
        data.style?.summaryFontWeight,
        accordionSummaryFontWeightTokens
      ),
    },
    layout: {
      maxWidth: resolveToken(
        data.layout?.maxWidth,
        accordionDefaults.layout?.maxWidth ?? "full",
        accordionMaxWidthTokens
      ),
    },
  };
}

type ResolvedAccordionItem = {
  slotId: string;
  instanceId: string;
  title: string;
  description: string | null;
  icon: string | null;
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
      icon: source?.icon ?? null,
      blocks: Array.isArray(slotMap[target.slotId]) ? slotMap[target.slotId]! : [],
    };
  });
};

const resolveAccordionRenderClasses = (data: AccordionData, variant: AccordionVariantId) => {
  const fallback = accordionVariantFallbackClassMap[variant];
  const layout = data.layout ?? accordionDefaults.layout ?? {};
  const style = data.style ?? accordionDefaults.style ?? {};
  const motion = data.options?.motion ?? accordionDefaults.options?.motion ?? "none";

  return {
    contentPaddingClass: style.contentPadding
      ? accordionPaddingClassMap[style.contentPadding]
      : fallback.contentPaddingClass,
    maxWidthClass: accordionMaxWidthClassMap[layout.maxWidth ?? "full"],
    radiusClass: style.radius ? accordionRadiusClassMap[style.radius] : fallback.radiusClass,
    summaryMotionClass: accordionMotionClassMap[motion],
    summaryPaddingClass: style.summaryPadding
      ? accordionSummaryPaddingClassMap[style.summaryPadding]
      : fallback.summaryPaddingClass,
    summaryTextClass: joinClasses(
      style.summaryFontSize
        ? accordionSummaryFontSizeClassMap[style.summaryFontSize]
        : fallback.summaryFontSizeClass,
      style.summaryFontWeight
        ? accordionSummaryFontWeightClassMap[style.summaryFontWeight]
        : fallback.summaryFontWeightClass
    ),
    chevronMotionClass: accordionMotionChevronClassMap[motion],
  };
};

const accordionRuntimeClientScript = `
(() => {
  if (typeof document === "undefined") return;

  const syncState = (root) => {
    const items = Array.from(root.querySelectorAll("[data-coderso-accordion-item-details]")).filter(
      (node) => node instanceof HTMLDetailsElement,
    );

    items.forEach((details) => {
      const summary = details.querySelector("[data-coderso-accordion-summary]");
      if (!(summary instanceof HTMLElement)) return;
      summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    });

    return items;
  };

  const ensureOpenItem = (root, preferred) => {
    if (root.dataset.codersoAccordionCollapsible !== "false") return;
    const items = syncState(root);
    if (items.some((details) => details.open)) return;
    const fallback =
      preferred instanceof HTMLDetailsElement ? preferred : items[0];
    if (!(fallback instanceof HTMLDetailsElement)) return;
    fallback.open = true;
    syncState(root);
  };

  document.querySelectorAll("[data-coderso-accordion='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.codersoAccordionBound === "true") return;
    root.dataset.codersoAccordionBound = "true";

    const items = syncState(root);
    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        ensureOpenItem(root, details);
        syncState(root);
      });
    });

    ensureOpenItem(root, items.find((details) => details.open));
    syncState(root);
  });
})();
`;

const getAccordionRuntimeClientScript = () => accordionRuntimeClientScript;

export function AccordionBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
  blockId,
}: {
  data: AccordionData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
  blockId?: string;
}) {
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const resolvedItems = resolveAccordionItems(data, slotMap);
  const normalized = normalizeAccordionData(data, resolvedItems.length);
  const resolvedVariant = resolveVariant(variant);
  const openMode = normalized.options?.openMode ?? "single";
  const collapsible = normalized.options?.collapsible ?? true;
  const defaultOpenIds =
    normalized.options?.defaultOpenIds?.filter((id) =>
      resolvedItems.some((item) => item.instanceId === id)
    ) ?? [];
  const style = normalized.style ?? accordionDefaults.style!;
  const renderClasses = resolveAccordionRenderClasses(normalized, resolvedVariant);
  const reactRenderInstanceId = useId();
  const baseRootInstanceId = createWidgetInstanceId(
    "accordion",
    blockId,
    resolvedItems[0]?.instanceId ?? "group"
  );
  const rootInstanceId =
    renderContext?.mode === "editor-preview" || renderContext?.mode === "admin-preview"
      ? scopedId(baseRootInstanceId, `preview-${reactRenderInstanceId}`)
      : baseRootInstanceId;
  const detailsGroupName = scopedId(rootInstanceId, "group");

  const containerStyle: CSSProperties =
    compactStyle({
      borderColor: style.borderColor,
      backgroundColor: resolveClearableStyleValue(style.surfaceColor),
    }) ?? {};

  const summaryStyle: CSSProperties = {
    color: style.summaryTextColor,
    borderColor: style.borderColor,
  };
  const descriptionStyle =
    compactStyle({
      color: style.descriptionTextColor,
    }) ?? undefined;

  return (
    <div
      role="group"
      aria-label="Accordion"
      className={joinClasses("w-full space-y-3", renderClasses.maxWidthClass)}
      data-coderso-accordion="1"
      data-coderso-accordion-variant={resolvedVariant}
      data-coderso-accordion-count={String(resolvedItems.length)}
      data-coderso-accordion-open-mode={openMode}
      data-coderso-accordion-collapsible={String(collapsible)}
      data-coderso-accordion-motion={normalized.options?.motion ?? "none"}
    >
      {resolvedItems.map((item, index) => {
        const shouldOpen =
          openMode === "multiple"
            ? defaultOpenIds.includes(item.instanceId)
            : defaultOpenIds.length === 0
              ? false
              : item.instanceId === defaultOpenIds[0];

        return (
          <details
            key={`${item.slotId}-${openMode}-${collapsible ? "collapsible" : "locked"}-${shouldOpen ? "open" : "closed"}`}
            open={shouldOpen}
            name={openMode === "multiple" ? undefined : detailsGroupName}
            className={joinClasses("group overflow-hidden border", renderClasses.radiusClass)}
            style={containerStyle}
            data-coderso-accordion-item={item.instanceId}
            data-coderso-accordion-item-details
            onToggle={(event) => {
              const summary = event.currentTarget.querySelector("[data-coderso-accordion-summary]");
              if (summary instanceof HTMLElement) {
                summary.setAttribute("aria-expanded", event.currentTarget.open ? "true" : "false");
              }
            }}
          >
            <summary
              id={scopedId(rootInstanceId, `summary-${item.instanceId}`)}
              aria-controls={scopedId(rootInstanceId, `content-${item.instanceId}`)}
              aria-expanded={shouldOpen ? "true" : "false"}
              className={joinClasses(
                "flex cursor-pointer list-none items-center justify-between gap-3",
                renderClasses.summaryPaddingClass,
                renderClasses.summaryTextClass,
                renderClasses.summaryMotionClass
              )}
              style={summaryStyle}
              data-coderso-accordion-summary
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon ? (
                  <span aria-hidden="true" className="shrink-0">
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0">{item.title}</span>
              </span>
              <span
                aria-hidden="true"
                className={joinClasses(
                  "shrink-0 text-xs opacity-60 [[open]_&]:rotate-180",
                  renderClasses.chevronMotionClass
                )}
              >
                ▾
              </span>
            </summary>
            <div
              id={scopedId(rootInstanceId, `content-${item.instanceId}`)}
              role="region"
              aria-labelledby={scopedId(rootInstanceId, `summary-${item.instanceId}`)}
              className={joinClasses("space-y-4 border-t", renderClasses.contentPaddingClass)}
              style={{ borderColor: style.borderColor }}
            >
              {item.description ? (
                <p className="text-sm" style={descriptionStyle}>
                  {item.description}
                </p>
              ) : null}
              {item.blocks.length > 0
                ? item.blocks.map((block) =>
                    renderBlock ? (
                      <div key={block.id}>{renderBlock(block, renderContext)}</div>
                    ) : (
                      <WidgetRenderer
                        key={block.id}
                        block={block}
                        previewDevice={previewDevice}
                        renderContext={renderContext}
                      />
                    )
                  )
                : renderEditorPlaceholder("Add widgets to this accordion item.", renderContext)}
            </div>
          </details>
        );
      })}
      <script dangerouslySetInnerHTML={{ __html: getAccordionRuntimeClientScript() }} />
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
    editorContract: accordionEditorContract,
    render: AccordionBlock,
  };
}
