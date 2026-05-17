import type { ComponentType, CSSProperties, ReactNode } from "react";

import { renderEditorPlaceholder } from "../renderContext";
import { WidgetRenderer } from "../renderers/widgetRenderer";
import { parseRepeatableSlotId, resolveWidgetSlotTargets } from "../slots";
import type {
  DeviceTarget,
  WidgetBlock,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

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
    return "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold";
  }
  if (variant === "compact") {
    return "flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium";
  }
  return "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-base font-semibold";
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
  const rootInstanceId = createWidgetInstanceId(
    "accordion",
    blockId,
    resolvedItems[0]?.instanceId ?? "group"
  );
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

  return (
    <div
      role="group"
      aria-label="Accordion"
      className="space-y-3"
      data-coderso-accordion="1"
      data-coderso-accordion-variant={resolvedVariant}
      data-coderso-accordion-count={String(resolvedItems.length)}
      data-coderso-accordion-open-mode={openMode}
      data-coderso-accordion-collapsible={String(collapsible)}
    >
      {resolvedItems.map((item, index) => {
        const shouldOpen =
          openMode === "multiple"
            ? defaultOpenIds.includes(item.instanceId)
            : item.instanceId === (defaultOpenIds[0] ?? resolvedItems[0]?.instanceId);

        return (
          <details
            key={`${item.slotId}-${openMode}-${collapsible ? "collapsible" : "locked"}-${shouldOpen ? "open" : "closed"}`}
            open={shouldOpen}
            name={openMode === "multiple" ? undefined : detailsGroupName}
            className={resolveContainerClass(resolvedVariant)}
            style={containerStyle}
            data-coderso-accordion-item={item.instanceId}
            data-coderso-accordion-item-details
          >
            <summary
              id={scopedId(rootInstanceId, `summary-${item.instanceId}`)}
              aria-controls={scopedId(rootInstanceId, `content-${item.instanceId}`)}
              aria-expanded={shouldOpen ? "true" : "false"}
              className={resolveSummaryClass(resolvedVariant)}
              style={summaryStyle}
              data-coderso-accordion-summary
            >
              <span>{item.title}</span>
              <span aria-hidden="true" className="text-xs text-[var(--color-text)]/60">
                ▾
              </span>
            </summary>
            <div
              id={scopedId(rootInstanceId, `content-${item.instanceId}`)}
              role="region"
              aria-labelledby={scopedId(rootInstanceId, `summary-${item.instanceId}`)}
              className={joinClasses(
                "space-y-4 border-t",
                resolvedVariant === "compact" ? "p-3" : "p-4"
              )}
              style={{ borderColor: style.borderColor }}
            >
              {item.description ? (
                <p className="text-sm text-[var(--color-text)]/70">{item.description}</p>
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
    render: AccordionBlock,
  };
}
