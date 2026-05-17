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

export type TabsVariantId = "pills" | "underline" | "minimal";
export type TabsOrientation = "horizontal" | "vertical";

export type TabsItem = {
  id?: string;
  label?: string;
  description?: string;
};

export type TabsData = {
  items?: TabsItem[];
  options?: {
    defaultItemId?: string;
    activeId?: string;
    alignment?: "start" | "center" | "end";
    orientation?: TabsOrientation;
  };
  style?: {
    surfaceColor?: string;
    borderColor?: string;
    activeBackgroundColor?: string;
    activeTextColor?: string;
    inactiveTextColor?: string;
    panelBackgroundColor?: string;
  };
};

export const tabsItemMin = 2;
export const tabsItemMax = 6;

export const tabsPanelSlot = {
  id: "panel",
  label: "Panel",
  kind: "repeatable" as const,
  minItems: tabsItemMin,
  maxItems: tabsItemMax,
};

export const tabsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: tabsItemMin,
      maxItems: tabsItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaultItemId: { type: "string" },
        activeId: { type: "string" },
        alignment: { enum: ["start", "center", "end"] },
        orientation: { enum: ["horizontal", "vertical"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        activeBackgroundColor: { type: "string" },
        activeTextColor: { type: "string" },
        inactiveTextColor: { type: "string" },
        panelBackgroundColor: { type: "string" },
      },
    },
  },
};

export const tabsDefaults: TabsData = {
  items: [
    { id: "1", label: "Tab 1", description: "Primary details." },
    { id: "2", label: "Tab 2", description: "Secondary details." },
  ],
  options: {
    defaultItemId: "1",
    activeId: "1",
    alignment: "start",
    orientation: "horizontal",
  },
  style: {
    surfaceColor: "var(--color-surface)",
    borderColor: "var(--color-border)",
    activeBackgroundColor: "var(--color-text)",
    activeTextColor: "var(--color-background)",
    inactiveTextColor: "var(--color-text)",
    panelBackgroundColor: "var(--color-surface)",
  },
};

type NormalizedTabsItem = {
  id: string;
  label: string;
  description?: string;
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const alignmentClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeCount = (value: number) =>
  Math.max(tabsItemMin, Math.min(tabsItemMax, Math.floor(value)));

const resolveVariant = (variant: string): TabsVariantId => {
  if (variant === "underline" || variant === "minimal") return variant;
  return "pills";
};

const resolveAlignment = (
  value: string | undefined
): NonNullable<NonNullable<TabsData["options"]>["alignment"]> => {
  if (value === "center" || value === "end") return value;
  return "start";
};

const resolveOrientation = (value: string | undefined): TabsOrientation => {
  if (value === "vertical") return value;
  return "horizontal";
};

const normalizeItemId = (value: unknown, fallbackIndex: number, used: Set<string>) => {
  const trimmed = toTrimmedString(value) ?? String(fallbackIndex + 1);
  if (!used.has(trimmed)) {
    used.add(trimmed);
    return trimmed;
  }
  let next = fallbackIndex + 1;
  while (used.has(String(next))) {
    next += 1;
  }
  const resolved = String(next);
  used.add(resolved);
  return resolved;
};

export function normalizeTabsItems(
  items: TabsItem[] | undefined,
  desiredCount?: number
): NormalizedTabsItem[] {
  const source = Array.isArray(items) ? items : [];
  const count =
    typeof desiredCount === "number"
      ? normalizeCount(desiredCount)
      : normalizeCount(
          source.length > 0 ? source.length : (tabsDefaults.items?.length ?? tabsItemMin)
        );

  const used = new Set<string>();
  const normalized: NormalizedTabsItem[] = [];

  for (let index = 0; index < count; index += 1) {
    const raw = source[index] ?? tabsDefaults.items?.[index] ?? {};
    const id = normalizeItemId(raw.id, index, used);
    normalized.push({
      id,
      label: toTrimmedString(raw.label) ?? `Tab ${index + 1}`,
      description: toTrimmedString(raw.description) ?? undefined,
    });
  }

  return normalized;
}

export function normalizeTabsData(data: TabsData, desiredCount?: number): TabsData {
  const items = normalizeTabsItems(data.items, desiredCount);
  const requestedDefaultId = toTrimmedString(data.options?.defaultItemId ?? data.options?.activeId);
  const defaultItemId =
    requestedDefaultId && items.some((item) => item.id === requestedDefaultId)
      ? requestedDefaultId
      : (items[0]?.id ?? "1");

  const hasStyleObject = data.style !== undefined;

  return {
    items,
    options: {
      defaultItemId,
      activeId: defaultItemId,
      alignment: resolveAlignment(data.options?.alignment),
      orientation: resolveOrientation(data.options?.orientation),
    },
    style: {
      surfaceColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surfaceColor)
        : (tabsDefaults.style?.surfaceColor ?? "var(--color-surface)"),
      borderColor:
        toTrimmedString(data.style?.borderColor) ??
        tabsDefaults.style?.borderColor ??
        "var(--color-border)",
      activeBackgroundColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.activeBackgroundColor)
        : (tabsDefaults.style?.activeBackgroundColor ?? "var(--color-text)"),
      activeTextColor:
        toTrimmedString(data.style?.activeTextColor) ??
        tabsDefaults.style?.activeTextColor ??
        "var(--color-background)",
      inactiveTextColor:
        toTrimmedString(data.style?.inactiveTextColor) ??
        tabsDefaults.style?.inactiveTextColor ??
        "var(--color-text)",
      panelBackgroundColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.panelBackgroundColor)
        : (tabsDefaults.style?.panelBackgroundColor ?? "var(--color-surface)"),
    },
  };
}

type ResolvedTabPanel = {
  slotId: string;
  instanceId: string;
  label: string;
  description: string | null;
  blocks: WidgetBlock[];
};

const resolvePanels = (
  data: TabsData,
  slotMap: Record<string, WidgetBlock[]>
): ResolvedTabPanel[] => {
  const slotTargets = resolveWidgetSlotTargets([tabsPanelSlot], slotMap).filter(
    (target) => target.definitionId === tabsPanelSlot.id
  );
  const normalized = normalizeTabsData(data, slotTargets.length);
  const items = normalizeTabsItems(normalized.items, slotTargets.length);
  const byId = new Map(items.map((item) => [item.id, item]));

  return slotTargets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const instanceId = parsed?.instanceId ?? String(index + 1);
    const source = byId.get(instanceId) ?? items[index];
    return {
      slotId: target.slotId,
      instanceId,
      label: source?.label ?? `Tab ${index + 1}`,
      description: source?.description ?? null,
      blocks: Array.isArray(slotMap[target.slotId]) ? slotMap[target.slotId]! : [],
    };
  });
};

const tabsRuntimeClientScript = `
(() => {
  if (typeof document === "undefined") return;

  const getTriggers = (root) =>
    Array.from(root.querySelectorAll("[data-coderso-tabs-trigger]")).filter(
      (node) => node instanceof HTMLElement,
    );

  const syncState = (root, activeId) => {
    root.setAttribute("data-coderso-tabs-active-id", activeId);

    getTriggers(root).forEach((trigger) => {
      const id = trigger.getAttribute("data-coderso-tabs-id");
      const isActive = id === activeId;
      trigger.setAttribute("aria-selected", isActive ? "true" : "false");
      trigger.setAttribute("data-state", isActive ? "active" : "inactive");
      trigger.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    root.querySelectorAll("[data-coderso-tabs-panel]").forEach((panel) => {
      const id = panel.getAttribute("data-coderso-tabs-id");
      const isActive = id === activeId;
      if (isActive) {
        panel.removeAttribute("hidden");
        panel.setAttribute("data-state", "active");
      } else {
        panel.setAttribute("hidden", "");
        panel.setAttribute("data-state", "inactive");
      }
    });
  };

  const focusAndActivate = (root, trigger) => {
    const activeId = trigger.getAttribute("data-coderso-tabs-id");
    if (!activeId) return;
    syncState(root, activeId);
    trigger.focus();
  };

  const handleClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest("[data-coderso-tabs-trigger]");
    if (!(trigger instanceof HTMLElement)) return;

    const root = trigger.closest("[data-coderso-tabs='1']");
    if (!(root instanceof HTMLElement)) return;

    const activeId = trigger.getAttribute("data-coderso-tabs-id");
    if (!activeId) return;

    syncState(root, activeId);
  };

  const handleKeydown = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest("[data-coderso-tabs-trigger]");
    if (!(trigger instanceof HTMLElement)) return;

    const root = trigger.closest("[data-coderso-tabs='1']");
    if (!(root instanceof HTMLElement)) return;

    const triggers = getTriggers(root);
    const currentIndex = triggers.indexOf(trigger);
    if (currentIndex < 0) return;

    const orientation = root.getAttribute("data-coderso-tabs-orientation") === "vertical"
      ? "vertical"
      : "horizontal";

    const moveNext =
      (orientation === "horizontal" && event.key === "ArrowRight") ||
      (orientation === "vertical" && event.key === "ArrowDown");
    const movePrev =
      (orientation === "horizontal" && event.key === "ArrowLeft") ||
      (orientation === "vertical" && event.key === "ArrowUp");

    if (!moveNext && !movePrev && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();

    if (event.key === "Home") {
      const first = triggers[0];
      if (first) focusAndActivate(root, first);
      return;
    }
    if (event.key === "End") {
      const last = triggers[triggers.length - 1];
      if (last) focusAndActivate(root, last);
      return;
    }

    const delta = moveNext ? 1 : -1;
    const nextIndex = (currentIndex + delta + triggers.length) % triggers.length;
    const next = triggers[nextIndex];
    if (next) focusAndActivate(root, next);
  };

  document.querySelectorAll("[data-coderso-tabs='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.codersoTabsBound === "true") return;
    root.dataset.codersoTabsBound = "true";
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    const activeId =
      root.getAttribute("data-coderso-tabs-active-id") ||
      getTriggers(root)[0]?.getAttribute("data-coderso-tabs-id");
    if (activeId) {
      syncState(root, activeId);
    }
  });
})();
`;

const getTabsRuntimeClientScript = () => tabsRuntimeClientScript;

const resolveTriggerClasses = (variant: TabsVariantId) => {
  if (variant === "underline") {
    return "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-current";
  }
  if (variant === "minimal") {
    return "rounded-md px-2 py-1.5 data-[state=active]:underline";
  }
  return "rounded-full border px-3 py-1.5 data-[state=active]:border-transparent";
};

export function TabsBlock({
  data,
  variant,
  slots,
  previewDevice,
  renderContext,
  renderBlock,
  blockId,
}: {
  data: TabsData;
  variant: string;
  slots?: Record<string, WidgetBlock[]>;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: (block: WidgetBlock, context?: WidgetRenderContext) => ReactNode;
  blockId?: string;
}) {
  const slotMap = slots && typeof slots === "object" && !Array.isArray(slots) ? slots : {};
  const panels = resolvePanels(data, slotMap);
  const normalized = normalizeTabsData(data, panels.length);
  const resolvedVariant = resolveVariant(variant);
  const activeId =
    normalized.options?.defaultItemId &&
    panels.some((panel) => panel.instanceId === normalized.options?.defaultItemId)
      ? normalized.options.defaultItemId
      : (panels[0]?.instanceId ?? "1");
  const style = normalized.style ?? tabsDefaults.style!;
  const orientation = normalized.options?.orientation ?? "horizontal";
  const rootInstanceId = createWidgetInstanceId("tabs", blockId, activeId || "tabs");

  const containerStyle: CSSProperties =
    compactStyle({
      borderColor: style.borderColor,
      backgroundColor: resolveClearableStyleValue(style.surfaceColor),
    }) ?? {};

  const triggerStyle: CSSProperties = {
    color: style.inactiveTextColor,
  };

  const activeTriggerStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.activeBackgroundColor),
      color: style.activeTextColor,
      borderColor: resolveClearableStyleValue(style.activeBackgroundColor),
    }) ?? {};

  const panelStyle: CSSProperties =
    compactStyle({
      borderColor: style.borderColor,
      backgroundColor: resolveClearableStyleValue(style.panelBackgroundColor),
    }) ?? {};

  return (
    <div
      className="space-y-4 rounded-xl border p-4"
      style={containerStyle}
      data-coderso-tabs="1"
      data-coderso-tabs-variant={resolvedVariant}
      data-coderso-tabs-active-id={activeId}
      data-coderso-tabs-panels={String(panels.length)}
      data-coderso-tabs-orientation={orientation}
    >
      <div
        role="tablist"
        aria-orientation={orientation}
        className={joinClasses(
          orientation === "vertical" ? "flex flex-col gap-2" : "flex flex-wrap gap-2",
          alignmentClassMap[normalized.options?.alignment ?? "start"]
        )}
      >
        {panels.map((panel) => {
          const isActive = panel.instanceId === activeId;
          const triggerId = scopedId(rootInstanceId, `trigger-${panel.instanceId}`);
          const panelId = scopedId(rootInstanceId, `panel-${panel.instanceId}`);
          return (
            <button
              key={panel.slotId}
              id={triggerId}
              type="button"
              role="tab"
              data-coderso-tabs-trigger
              data-coderso-tabs-id={panel.instanceId}
              data-state={isActive ? "active" : "inactive"}
              aria-selected={isActive ? "true" : "false"}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className={joinClasses(
                "text-sm font-medium transition",
                resolveTriggerClasses(resolvedVariant)
              )}
              style={isActive ? activeTriggerStyle : triggerStyle}
            >
              {panel.label}
            </button>
          );
        })}
      </div>

      {panels.map((panel) => {
        const isActive = panel.instanceId === activeId;
        const triggerId = scopedId(rootInstanceId, `trigger-${panel.instanceId}`);
        const panelId = scopedId(rootInstanceId, `panel-${panel.instanceId}`);
        return (
          <div
            key={`${panel.slotId}-panel`}
            id={panelId}
            role="tabpanel"
            data-coderso-tabs-panel
            data-coderso-tabs-id={panel.instanceId}
            data-state={isActive ? "active" : "inactive"}
            aria-labelledby={triggerId}
            hidden={!isActive}
            className="rounded-lg border p-4"
            style={panelStyle}
          >
            {panel.description ? (
              <p className="mb-3 text-sm text-[var(--color-text)]/70">{panel.description}</p>
            ) : null}
            {panel.blocks.length > 0
              ? panel.blocks.map((block) =>
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
              : renderEditorPlaceholder("Add widgets to this tab panel.", renderContext)}
          </div>
        );
      })}

      <script dangerouslySetInnerHTML={{ __html: getTabsRuntimeClientScript() }} />
    </div>
  );
}

export function createTabsWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<TabsData>>;
  visual: ComponentType<WidgetEditorProps<TabsData>>;
  advanced: ComponentType<WidgetEditorProps<TabsData>>;
}): WidgetDefinition<TabsData> {
  return {
    type: "tabs",
    title: "Tabs",
    description: "Switch between grouped content panels.",
    category: "layout",
    variants: [
      {
        id: "pills",
        label: "Pills",
        description: "Rounded segmented tab triggers.",
      },
      {
        id: "underline",
        label: "Underline",
        description: "Link-style tabs with active underline.",
      },
      {
        id: "minimal",
        label: "Minimal",
        description: "Compact label tabs with minimal chrome.",
      },
    ],
    schema: tabsSchema,
    defaults: tabsDefaults,
    slots: [tabsPanelSlot],
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TabsBlock,
  };
}
