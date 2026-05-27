import {
  useState,
  type CSSProperties,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

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
import { renderSharedWidgetRuntimeScript } from "../runtimeScripts";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";

export type TabsVariantId = "pills" | "underline" | "minimal";
export type TabsOrientation = "horizontal" | "vertical";
export type TabsTriggerOverflow = "wrap" | "scroll";
export type TabsSpacing = "sm" | "md" | "lg";
export type TabsTriggerTextSize = "xs" | "sm" | "base";
export type TabsTriggerFontWeight = "normal" | "medium" | "semibold";
export type TabsMotion = "none" | "fade" | "slide";

export type TabsItem = {
  id?: string;
  label?: string;
  description?: string;
  panelIntro?: string;
  triggerDescription?: string;
  icon?: string;
  disabled?: boolean;
};

export type TabsData = {
  items?: TabsItem[];
  options?: {
    defaultItemId?: string;
    activeId?: string;
    alignment?: "start" | "center" | "end";
    orientation?: TabsOrientation;
    triggerOverflow?: TabsTriggerOverflow;
    containerPadding?: TabsSpacing;
    triggerGap?: TabsSpacing;
    panelGap?: TabsSpacing;
    triggerTextSize?: TabsTriggerTextSize;
    triggerFontWeight?: TabsTriggerFontWeight;
    motion?: TabsMotion;
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
const tabsIconMaxLength = 16;
const defaultTabsTablistAriaLabel = "Content tabs";

export const tabsPanelSlot = {
  id: "panel",
  label: "Panel",
  kind: "repeatable" as const,
  minItems: tabsItemMin,
  maxItems: tabsItemMax,
};

const alignmentOptions = ["start", "center", "end"] as const;
const orientationOptions = ["horizontal", "vertical"] as const;
const legacyTriggerOverflowOptions = ["wrap", "scroll"] as const;
const spacingOptions = ["sm", "md", "lg"] as const;
const triggerTextSizeOptions = ["xs", "sm", "base"] as const;
const triggerFontWeightOptions = ["normal", "medium", "semibold"] as const;
const motionOptions = ["none", "fade", "slide"] as const;

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
          panelIntro: { type: "string" },
          triggerDescription: { type: "string" },
          icon: { type: "string", maxLength: tabsIconMaxLength },
          disabled: { type: "boolean" },
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaultItemId: { type: "string" },
        activeId: { type: "string" },
        alignment: { enum: [...alignmentOptions] },
        orientation: { enum: [...orientationOptions] },
        triggerOverflow: { enum: [...legacyTriggerOverflowOptions] },
        containerPadding: { enum: [...spacingOptions] },
        triggerGap: { enum: [...spacingOptions] },
        panelGap: { enum: [...spacingOptions] },
        triggerTextSize: { enum: [...triggerTextSizeOptions] },
        triggerFontWeight: { enum: [...triggerFontWeightOptions] },
        motion: { enum: [...motionOptions] },
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
    { id: "1", label: "Tab 1", panelIntro: "Primary details." },
    { id: "2", label: "Tab 2", panelIntro: "Secondary details." },
  ],
  options: {
    defaultItemId: "1",
    activeId: "1",
    alignment: "start",
    orientation: "horizontal",
    triggerOverflow: "wrap",
    containerPadding: "md",
    triggerGap: "md",
    panelGap: "md",
    triggerTextSize: "sm",
    triggerFontWeight: "medium",
    motion: "none",
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

export const tabsEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "tabs.wizard.structure-setup",
      title: "Starter tabs",
      role: "setup",
      writablePaths: ["items.count"],
    },
    {
      mode: "visual",
      id: "tabs.visual.variant",
      title: "Variant",
      role: "visual",
      writablePaths: ["variant"],
    },
    {
      mode: "visual",
      id: "tabs.visual.item-content",
      title: "Tab content",
      role: "content",
      writablePaths: [
        "items.*.label",
        "items.*.panelIntro",
        "items.*.triggerDescription",
        "items.*.icon",
        "items.*.disabled",
        "options.defaultItemId",
      ],
    },
    {
      mode: "visual",
      id: "tabs.visual.layout",
      title: "Layout",
      role: "layout",
      writablePaths: [
        "options.orientation",
        "options.alignment",
        "options.containerPadding",
        "options.triggerGap",
        "options.panelGap",
      ],
    },
    {
      mode: "visual",
      id: "tabs.visual.trigger-style",
      title: "Tab label style",
      role: "visual",
      writablePaths: ["options.triggerTextSize", "options.triggerFontWeight", "options.motion"],
    },
    {
      mode: "visual",
      id: "tabs.visual.colors",
      title: "Colors",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.activeBackgroundColor",
        "style.activeTextColor",
        "style.inactiveTextColor",
        "style.panelBackgroundColor",
      ],
    },
    {
      mode: "advanced",
      id: "tabs.advanced.behavior-summary",
      title: "Behavior summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "options.activeId",
        "options.defaultItemId",
        "options.triggerOverflow",
        "items.*.disabled",
      ],
    },
    {
      mode: "advanced",
      id: "tabs.advanced.item-summary",
      title: "Saved tabs summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: [
        "items.*.label",
        "items.*.panelIntro",
        "items.*.triggerDescription",
        "items.*.icon",
        "items.*.disabled",
      ],
    },
    {
      mode: "advanced",
      id: "tabs.advanced.display-summary",
      title: "Saved display summary",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: [
        "options.orientation",
        "options.alignment",
        "options.containerPadding",
        "options.triggerGap",
        "options.panelGap",
        "options.triggerTextSize",
        "options.triggerFontWeight",
        "options.motion",
        "style.surfaceColor",
        "style.borderColor",
        "style.activeBackgroundColor",
        "style.activeTextColor",
        "style.inactiveTextColor",
        "style.panelBackgroundColor",
      ],
    },
    {
      mode: "advanced",
      id: "tabs.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

type NormalizedTabsItem = {
  id: string;
  label: string;
  panelIntro?: string;
  triggerDescription?: string;
  icon?: string;
  disabled: boolean;
};

type NormalizedTabsItemsState = {
  items: NormalizedTabsItem[];
  hadAllDisabled: boolean;
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const horizontalAlignmentClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

const verticalAlignmentClassMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

const containerPaddingClassMap = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

const triggerGapClassMap = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-3",
} as const;

const panelGapClassMap = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
} as const;

const triggerTextSizeClassMap = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
} as const;

const triggerFontWeightClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
} as const;

const panelMotionClassMap = {
  none: undefined,
  fade: "data-[state=active]:motion-safe:animate-in data-[state=active]:motion-safe:fade-in-0 data-[state=active]:motion-safe:duration-200 data-[state=active]:motion-reduce:animate-none",
  slide:
    "data-[state=active]:motion-safe:animate-in data-[state=active]:motion-safe:fade-in-0 data-[state=active]:motion-safe:slide-in-from-bottom-2 data-[state=active]:motion-safe:duration-200 data-[state=active]:motion-reduce:animate-none",
} as const;

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isEnumValue = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === "string" && options.includes(value as T);

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

const resolveTriggerOverflow = (_value: string | undefined): TabsTriggerOverflow => "wrap";

const resolveSpacing = (value: string | undefined): TabsSpacing =>
  isEnumValue(value, spacingOptions) ? value : "md";

const resolveTriggerTextSize = (value: string | undefined): TabsTriggerTextSize =>
  isEnumValue(value, triggerTextSizeOptions) ? value : "sm";

const resolveTriggerFontWeight = (value: string | undefined): TabsTriggerFontWeight =>
  isEnumValue(value, triggerFontWeightOptions) ? value : "medium";

const resolveMotion = (value: string | undefined): TabsMotion =>
  isEnumValue(value, motionOptions) ? value : "none";

const normalizeIcon = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed ? trimmed.slice(0, tabsIconMaxLength) : undefined;
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

const ensureAtLeastOneEnabled = (items: NormalizedTabsItem[]) =>
  items.map((item, index) =>
    index === 0
      ? {
          ...item,
          disabled: false,
        }
      : item
  );

const resolveActiveTabId = (items: NormalizedTabsItem[], requestedId: string | undefined) => {
  const enabledItems = items.filter((item) => item.disabled !== true);
  if (requestedId && enabledItems.some((item) => item.id === requestedId)) {
    return requestedId;
  }
  return enabledItems[0]?.id ?? items[0]?.id ?? "1";
};

const normalizeTabsItemsState = (
  items: TabsItem[] | undefined,
  desiredCount?: number
): NormalizedTabsItemsState => {
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
    const fallback = tabsDefaults.items?.[index] ?? {};
    const raw = source[index] ?? fallback;
    const id = normalizeItemId(raw.id, index, used);
    normalized.push({
      id,
      label: toTrimmedString(raw.label) ?? `Tab ${index + 1}`,
      panelIntro:
        toTrimmedString(raw.panelIntro) ??
        toTrimmedString(raw.description) ??
        toTrimmedString((fallback as TabsItem).panelIntro) ??
        undefined,
      triggerDescription: toTrimmedString(raw.triggerDescription) ?? undefined,
      icon: normalizeIcon(raw.icon),
      disabled: raw.disabled === true,
    });
  }

  const hadAllDisabled =
    normalized.length > 0 && normalized.every((item) => item.disabled === true);
  return {
    items: hadAllDisabled ? ensureAtLeastOneEnabled(normalized) : normalized,
    hadAllDisabled,
  };
};

export function normalizeTabsItems(
  items: TabsItem[] | undefined,
  desiredCount?: number
): NormalizedTabsItem[] {
  return normalizeTabsItemsState(items, desiredCount).items;
}

export function normalizeTabsData(data: TabsData, desiredCount?: number): TabsData {
  const normalizedItemsState = normalizeTabsItemsState(data.items, desiredCount);
  const items = normalizedItemsState.items;
  const requestedDefaultId = toTrimmedString(data.options?.defaultItemId);
  const requestedActiveId = toTrimmedString(data.options?.activeId ?? data.options?.defaultItemId);
  const resolvedActiveId = resolveActiveTabId(items, requestedActiveId ?? undefined);
  const resolvedDefaultId = normalizedItemsState.hadAllDisabled
    ? resolvedActiveId
    : requestedDefaultId && items.some((item) => item.id === requestedDefaultId)
      ? requestedDefaultId
      : resolvedActiveId;
  const hasStyleObject = data.style !== undefined;

  return {
    items,
    options: {
      defaultItemId: resolvedDefaultId,
      activeId: resolvedActiveId,
      alignment: resolveAlignment(data.options?.alignment),
      orientation: resolveOrientation(data.options?.orientation),
      triggerOverflow: resolveTriggerOverflow(data.options?.triggerOverflow),
      containerPadding: resolveSpacing(data.options?.containerPadding),
      triggerGap: resolveSpacing(data.options?.triggerGap),
      panelGap: resolveSpacing(data.options?.panelGap),
      triggerTextSize: resolveTriggerTextSize(data.options?.triggerTextSize),
      triggerFontWeight: resolveTriggerFontWeight(data.options?.triggerFontWeight),
      motion: resolveMotion(data.options?.motion),
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
  selectionId: string;
  label: string;
  panelIntro: string | null;
  triggerDescription: string | null;
  icon: string | null;
  disabled: boolean;
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

  return slotTargets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const instanceId = parsed?.instanceId ?? String(index + 1);
    const source = items[index];
    return {
      slotId: target.slotId,
      instanceId,
      selectionId: source?.id ?? instanceId,
      label: source?.label ?? `Tab ${index + 1}`,
      panelIntro: source?.panelIntro ?? null,
      triggerDescription: source?.triggerDescription ?? null,
      icon: source?.icon ?? null,
      disabled: source?.disabled === true,
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

  const getEnabledTriggers = (root) =>
    getTriggers(root).filter((trigger) => trigger.getAttribute("aria-disabled") !== "true");

  const syncState = (root, activeId) => {
    root.setAttribute("data-coderso-tabs-active-id", activeId);

    getTriggers(root).forEach((trigger) => {
      const id = trigger.getAttribute("data-coderso-tabs-id");
      const disabled = trigger.getAttribute("aria-disabled") === "true";
      const isActive = id === activeId;
      trigger.setAttribute("aria-selected", isActive ? "true" : "false");
      trigger.setAttribute("data-state", isActive ? "active" : "inactive");
      trigger.setAttribute("tabindex", !disabled && isActive ? "0" : "-1");
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
    if (trigger.getAttribute("aria-disabled") === "true") return;
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
    if (trigger.getAttribute("aria-disabled") === "true") return;

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

    const triggers = getEnabledTriggers(root);
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
      getEnabledTriggers(root)[0]?.getAttribute("data-coderso-tabs-id") ||
      getTriggers(root)[0]?.getAttribute("data-coderso-tabs-id");
    if (activeId) {
      syncState(root, activeId);
    }
  });
})();
`;

const getTabsRuntimeClientScript = () => tabsRuntimeClientScript;

const horizontalTablistClassName = "flex flex-wrap items-center";

const resolveTriggerClasses = (variant: TabsVariantId) => {
  if (variant === "underline") {
    return "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-current";
  }
  if (variant === "minimal") {
    return "rounded-md px-2 py-1.5 data-[state=active]:underline";
  }
  return "rounded-full border px-3 py-1.5 data-[state=active]:border-transparent";
};

const isPreviewMode = (
  previewDevice: DeviceTarget | undefined,
  renderContext: WidgetRenderContext | undefined
) =>
  Boolean(previewDevice) ||
  renderContext?.mode === "editor-preview" ||
  renderContext?.mode === "admin-preview";

const resolvePanelSelectionId = (panels: ResolvedTabPanel[], requestedId: string | undefined) => {
  if (requestedId) {
    const requestedBySelectionId = panels.find(
      (panel) => panel.disabled !== true && panel.selectionId === requestedId
    );
    if (requestedBySelectionId) {
      return requestedBySelectionId.selectionId;
    }

    const requestedByInstanceId = panels.find(
      (panel) => panel.disabled !== true && panel.instanceId === requestedId
    );
    if (requestedByInstanceId) {
      return requestedByInstanceId.selectionId;
    }
  }

  return (
    panels.find((panel) => panel.disabled !== true)?.selectionId ?? panels[0]?.selectionId ?? "1"
  );
};

const resolveInitialActiveId = (panels: ResolvedTabPanel[], data: TabsData) => {
  const requestedId =
    typeof data.options?.activeId === "string"
      ? data.options.activeId
      : data.options?.defaultItemId;
  return resolvePanelSelectionId(panels, requestedId);
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
  const previewMode = isPreviewMode(previewDevice, renderContext);
  const initialActiveId = resolveInitialActiveId(panels, normalized);
  const [previewActiveId, setPreviewActiveId] = useState<string | null>(null);
  const activeId = previewMode
    ? resolvePanelSelectionId(panels, previewActiveId ?? initialActiveId)
    : initialActiveId;
  const runtimeScript = !previewMode
    ? renderSharedWidgetRuntimeScript({
        renderContext,
        id: "tabs",
        source: getTabsRuntimeClientScript(),
      })
    : null;
  const style = normalized.style ?? tabsDefaults.style!;
  const options = normalized.options ?? tabsDefaults.options!;
  const orientation = options.orientation ?? "horizontal";
  const rootInstanceId = createWidgetInstanceId("tabs", blockId, panels[0]?.selectionId ?? "tabs");

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

  const enabledPanels = panels.filter((panel) => panel.disabled !== true);

  const handlePreviewActivate = (panelId: string) => {
    const panel = panels.find((entry) => entry.selectionId === panelId);
    if (!previewMode || !panel || panel.disabled) return;
    setPreviewActiveId(panel.selectionId);
  };

  const handlePreviewKeydown = (event: ReactKeyboardEvent<HTMLButtonElement>, panelId: string) => {
    if (!previewMode) return;
    const currentIndex = enabledPanels.findIndex((panel) => panel.selectionId === panelId);
    if (currentIndex < 0) return;

    const moveNext =
      (orientation === "horizontal" && event.key === "ArrowRight") ||
      (orientation === "vertical" && event.key === "ArrowDown");
    const movePrev =
      (orientation === "horizontal" && event.key === "ArrowLeft") ||
      (orientation === "vertical" && event.key === "ArrowUp");

    if (!moveNext && !movePrev && event.key !== "Home" && event.key !== "End") {
      return;
    }

    event.preventDefault();

    let nextPanel = enabledPanels[currentIndex];
    if (event.key === "Home") {
      nextPanel = enabledPanels[0] ?? nextPanel;
    } else if (event.key === "End") {
      nextPanel = enabledPanels[enabledPanels.length - 1] ?? nextPanel;
    } else {
      const delta = moveNext ? 1 : -1;
      const nextIndex = (currentIndex + delta + enabledPanels.length) % enabledPanels.length;
      nextPanel = enabledPanels[nextIndex] ?? nextPanel;
    }

    if (!nextPanel) return;

    setPreviewActiveId(nextPanel.selectionId);
    if (typeof document !== "undefined") {
      const nextTriggerId = scopedId(rootInstanceId, `trigger-${nextPanel.selectionId}`);
      const element = document.getElementById(nextTriggerId);
      if (element instanceof HTMLElement) {
        element.focus();
      }
    }
  };

  return (
    <div
      className={joinClasses(
        panelGapClassMap[options.panelGap ?? "md"],
        containerPaddingClassMap[options.containerPadding ?? "md"],
        "rounded-xl border"
      )}
      style={containerStyle}
      data-coderso-tabs="1"
      data-coderso-tabs-variant={resolvedVariant}
      data-coderso-tabs-active-id={activeId}
      data-coderso-tabs-panels={String(panels.length)}
      data-coderso-tabs-orientation={orientation}
      data-coderso-tabs-motion={options.motion ?? "none"}
      data-coderso-tabs-overflow={options.triggerOverflow ?? "wrap"}
    >
      <div
        role="tablist"
        aria-label={defaultTabsTablistAriaLabel}
        aria-orientation={orientation}
        className={joinClasses(
          orientation === "vertical" ? "flex flex-col" : horizontalTablistClassName,
          triggerGapClassMap[options.triggerGap ?? "md"],
          orientation === "vertical"
            ? verticalAlignmentClassMap[options.alignment ?? "start"]
            : horizontalAlignmentClassMap[options.alignment ?? "start"]
        )}
      >
        {panels.map((panel) => {
          const isActive = panel.selectionId === activeId;
          const triggerId = scopedId(rootInstanceId, `trigger-${panel.selectionId}`);
          const panelId = scopedId(rootInstanceId, `panel-${panel.selectionId}`);
          return (
            <button
              key={panel.slotId}
              id={triggerId}
              type="button"
              role="tab"
              data-coderso-tabs-trigger
              data-coderso-tabs-id={panel.selectionId}
              data-state={isActive ? "active" : "inactive"}
              aria-selected={isActive ? "true" : "false"}
              aria-controls={panelId}
              aria-disabled={panel.disabled ? "true" : "false"}
              disabled={panel.disabled}
              tabIndex={!panel.disabled && isActive ? 0 : -1}
              className={joinClasses(
                "shrink-0 text-left transition",
                triggerTextSizeClassMap[options.triggerTextSize ?? "sm"],
                triggerFontWeightClassMap[options.triggerFontWeight ?? "medium"],
                panel.disabled && "cursor-not-allowed opacity-50",
                resolveTriggerClasses(resolvedVariant)
              )}
              style={isActive ? activeTriggerStyle : triggerStyle}
              onClick={previewMode ? () => handlePreviewActivate(panel.selectionId) : undefined}
              onKeyDown={
                previewMode ? (event) => handlePreviewKeydown(event, panel.selectionId) : undefined
              }
            >
              <span className="flex items-start gap-2">
                {panel.icon ? (
                  <span aria-hidden="true" className="pt-0.5 leading-none">
                    {panel.icon}
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block leading-tight">{panel.label}</span>
                  {panel.triggerDescription ? (
                    <span className="block text-xs opacity-75">{panel.triggerDescription}</span>
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {panels.map((panel) => {
        const isActive = panel.selectionId === activeId;
        const triggerId = scopedId(rootInstanceId, `trigger-${panel.selectionId}`);
        const panelId = scopedId(rootInstanceId, `panel-${panel.selectionId}`);
        return (
          <div
            key={`${panel.slotId}-panel`}
            id={panelId}
            role="tabpanel"
            tabIndex={0}
            data-coderso-tabs-panel
            data-coderso-tabs-id={panel.selectionId}
            data-state={isActive ? "active" : "inactive"}
            aria-labelledby={triggerId}
            hidden={!isActive}
            className={joinClasses(
              "rounded-lg border",
              panelMotionClassMap[options.motion ?? "none"]
            )}
            style={panelStyle}
          >
            {panel.panelIntro ? (
              <p className="mb-3 text-sm text-[var(--color-text)]/70">{panel.panelIntro}</p>
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

      {runtimeScript}
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
    editorContract: tabsEditorContract,
    render: TabsBlock,
  };
}
