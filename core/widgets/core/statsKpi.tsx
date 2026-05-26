import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type StatsKpiVariantId = "cards" | "inline" | "split-highlight";
export type StatsKpiAlignment = "start" | "center" | "end";
export type StatsKpiSpacing = "none" | "sm" | "md" | "lg";
export type StatsKpiValueSize = "sm" | "md" | "lg" | "xl";
export type StatsKpiMaxWidth = "sm" | "md" | "lg" | "xl" | "full";
export type StatsKpiPadding = "none" | "sm" | "md" | "lg";
export type StatsKpiMinHeight = "none" | "compact" | "default";
export type StatsKpiIconSize = "sm" | "md" | "lg";
export type StatsKpiDividerIntensity = "soft" | "default" | "strong";
export type StatsKpiTrendDirection = "up" | "down" | "neutral";

export type StatsKpiTrend = {
  label?: string;
  direction?: StatsKpiTrendDirection;
};

export type StatsKpiItemLink = {
  href?: string;
  label?: string;
  openInNewTab?: boolean;
};

export type StatsKpiItem = {
  id?: string;
  value?: string;
  prefix?: string;
  suffix?: string;
  label?: string;
  description?: string;
  icon?: string;
  accentColor?: string;
  trend?: StatsKpiTrend;
  link?: StatsKpiItemLink;
};

export type StatsKpiStyle = {
  alignment?: StatsKpiAlignment;
  spacing?: StatsKpiSpacing;
  valueColor?: string;
  labelColor?: string;
  descriptionColor?: string;
  valueSize?: StatsKpiValueSize;
  divider?: boolean;
  dividerIntensity?: StatsKpiDividerIntensity;
  sectionBackground?: string;
  maxWidth?: StatsKpiMaxWidth;
  padding?: StatsKpiPadding;
  minHeight?: StatsKpiMinHeight;
  cardBackground?: string;
  cardBorderColor?: string;
  iconSize?: StatsKpiIconSize;
  iconSurface?: string;
  iconBorderColor?: string;
};

export type StatsKpiData = {
  header?: {
    title?: string;
    description?: string;
  };
  items: StatsKpiItem[];
  style?: StatsKpiStyle;
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const spacingClassMap: Record<StatsKpiSpacing, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const cardsGridClassMap: Record<StatsKpiSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

const alignmentClassMap: Record<StatsKpiAlignment, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const justifyClassMap: Record<StatsKpiAlignment, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const sectionWidthClassMap: Record<StatsKpiMaxWidth, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

const sectionPaddingClassMap: Record<StatsKpiPadding, string> = {
  none: "px-0 py-0",
  sm: "px-3 py-6",
  md: "px-4 py-8",
  lg: "px-6 py-10",
};

const minHeightClassMap: Record<StatsKpiMinHeight, string> = {
  none: undefined as unknown as string,
  compact: "min-h-[12rem]",
  default: "min-h-[16rem]",
};

const getStatsKpiSplitSecondaryGridClass = (count: number) => {
  if (count <= 1) return "grid grid-cols-1";
  if (count % 2 === 1) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid grid-cols-1 sm:grid-cols-2";
};

const iconSizeClassMap: Record<StatsKpiIconSize, string> = {
  sm: "h-7 w-7 text-sm",
  md: "h-8 w-8 text-base",
  lg: "h-10 w-10 text-lg",
};

const dividerIntensityClassMap: Record<StatsKpiDividerIntensity, string> = {
  soft: "border-[var(--color-border)]/40",
  default: "border-[var(--color-border)]/70",
  strong: "border-[var(--color-border)]",
};

const valueSizeClassMap: Record<StatsKpiValueSize, string> = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

const highlightedValueSizeClassMap: Record<StatsKpiValueSize, string> = {
  sm: "text-3xl",
  md: "text-4xl",
  lg: "text-5xl",
  xl: "text-6xl",
};

const getStatsKpiCardsGridClass = (count: number) => {
  if (count <= 2) return "lg:grid-cols-2";
  if (count === 3) return "lg:grid-cols-3";
  if (count <= 6) return "lg:grid-cols-3";
  return "lg:grid-cols-4";
};

const statsKpiItemMin = 1;
export const statsKpiItemMax = 12;

const trendDirectionValues = ["up", "down", "neutral"] as const;
const valueSizeValues = ["sm", "md", "lg", "xl"] as const;
const maxWidthValues = ["sm", "md", "lg", "xl", "full"] as const;
const paddingValues = ["none", "sm", "md", "lg"] as const;
const minHeightValues = ["none", "compact", "default"] as const;
const iconSizeValues = ["sm", "md", "lg"] as const;
const dividerIntensityValues = ["soft", "default", "strong"] as const;

export const statsKpiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    items: {
      type: "array",
      minItems: statsKpiItemMin,
      maxItems: statsKpiItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          value: { type: "string" },
          prefix: { type: "string" },
          suffix: { type: "string" },
          label: { type: "string" },
          description: { type: "string" },
          icon: { type: "string" },
          accentColor: { type: "string" },
          trend: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              direction: { enum: [...trendDirectionValues] },
            },
          },
          link: {
            type: "object",
            additionalProperties: false,
            properties: {
              href: { type: "string" },
              label: { type: "string" },
              openInNewTab: { type: "boolean" },
            },
          },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        alignment: { enum: ["start", "center", "end"] },
        spacing: { enum: ["none", "sm", "md", "lg"] },
        valueColor: { type: "string" },
        labelColor: { type: "string" },
        descriptionColor: { type: "string" },
        valueSize: { enum: [...valueSizeValues] },
        divider: { type: "boolean" },
        dividerIntensity: { enum: [...dividerIntensityValues] },
        sectionBackground: { type: "string" },
        maxWidth: { enum: [...maxWidthValues] },
        padding: { enum: [...paddingValues] },
        minHeight: { enum: [...minHeightValues] },
        cardBackground: { type: "string" },
        cardBorderColor: { type: "string" },
        iconSize: { enum: [...iconSizeValues] },
        iconSurface: { type: "string" },
        iconBorderColor: { type: "string" },
      },
    },
  },
};

export const statsKpiDefaults: StatsKpiData = {
  header: {
    title: "Proof in numbers",
    description: "Show key performance metrics and outcomes in a readable format.",
  },
  items: [
    {
      id: "kpi-1",
      value: "120",
      suffix: "+",
      label: "Projects launched",
      description: "Production pages delivered in the last 12 months.",
      icon: "🚀",
      trend: {
        label: "+18% YoY",
        direction: "up",
      },
      link: {
        href: "/work",
        label: "See launch examples",
      },
    },
    {
      id: "kpi-2",
      value: "99.9",
      suffix: "%",
      label: "Platform uptime",
      description: "Stable runtime across peak traffic windows.",
      icon: "⏱",
    },
    {
      id: "kpi-3",
      value: "3",
      suffix: "x",
      label: "Faster iteration",
      description: "Average release cycle speedup for content teams.",
      icon: "⚡",
    },
    {
      id: "kpi-4",
      value: "45",
      suffix: "%",
      label: "Higher engagement",
      description: "Increase in CTA interaction on optimized sections.",
      icon: "📈",
    },
  ],
  style: {
    alignment: "center",
    spacing: "md",
    valueSize: "md",
    divider: true,
    dividerIntensity: "default",
    maxWidth: "lg",
    padding: "md",
    minHeight: "none",
    iconSize: "md",
  },
};

const statsKpiWizardMetricSeedPaths = Array.from({ length: statsKpiItemMax }, (_, index) => [
  `items.${index}.value`,
  `items.${index}.label`,
  `items.${index}.description`,
  `items.${index}.icon`,
]).flat();

const statsKpiItemDailyWritablePaths = Array.from({ length: statsKpiItemMax }, (_, index) => [
  `items.${index}.value`,
  `items.${index}.prefix`,
  `items.${index}.suffix`,
  `items.${index}.label`,
  `items.${index}.description`,
  `items.${index}.icon`,
  `items.${index}.accentColor`,
  `items.${index}.trend.label`,
  `items.${index}.trend.direction`,
  `items.${index}.link.href`,
  `items.${index}.link.label`,
  `items.${index}.link.openInNewTab`,
]).flat();

const statsKpiWizardDuplicateAllowanceReason =
  "Temporary one-time Wizard seed overlap until TASK-336-16 moves Wizard completion out of daily editing.";

const createStatsKpiWizardDuplicateAllowances = (paths: string[]) =>
  paths.map((path) => ({
    path,
    reason: statsKpiWizardDuplicateAllowanceReason,
    expiresWithTask: "TASK-336-16",
  }));

const statsKpiWizardSetupPaths = ["variant", "items.count"];
const statsKpiWizardHeaderPaths = ["header.title", "header.description"];

export const statsKpiEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "stats-kpi.wizard.layout-seed",
      title: "Layout seed",
      role: "setup",
      writablePaths: statsKpiWizardSetupPaths,
      allowedDuplicateWritablePaths:
        createStatsKpiWizardDuplicateAllowances(statsKpiWizardSetupPaths),
    },
    {
      mode: "wizard",
      id: "stats-kpi.wizard.header-seed",
      title: "Header seed",
      role: "setup",
      writablePaths: statsKpiWizardHeaderPaths,
      allowedDuplicateWritablePaths:
        createStatsKpiWizardDuplicateAllowances(statsKpiWizardHeaderPaths),
    },
    {
      mode: "wizard",
      id: "stats-kpi.wizard.metric-seed",
      title: "Metric seed",
      role: "setup",
      writablePaths: statsKpiWizardMetricSeedPaths,
      allowedDuplicateWritablePaths: createStatsKpiWizardDuplicateAllowances(
        statsKpiWizardMetricSeedPaths
      ),
    },
    {
      mode: "wizard",
      id: "stats-kpi.wizard.spacing-guidance",
      title: "Spacing guidance",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["style.spacing"],
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.variant-structure",
      title: "Variant and structure",
      role: "setup",
      writablePaths: ["variant", "items.count", "items.order"],
      allowedDuplicateWritablePaths:
        createStatsKpiWizardDuplicateAllowances(statsKpiWizardSetupPaths),
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.section-header",
      title: "Section header",
      role: "content",
      writablePaths: statsKpiWizardHeaderPaths,
      allowedDuplicateWritablePaths:
        createStatsKpiWizardDuplicateAllowances(statsKpiWizardHeaderPaths),
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.metrics-content",
      title: "Metrics content and links",
      role: "content",
      writablePaths: statsKpiItemDailyWritablePaths,
      allowedDuplicateWritablePaths: createStatsKpiWizardDuplicateAllowances(
        statsKpiWizardMetricSeedPaths
      ),
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.typography",
      title: "Typography",
      role: "visual",
      writablePaths: [
        "style.valueSize",
        "style.valueColor",
        "style.labelColor",
        "style.descriptionColor",
      ],
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.card-icon-surface",
      title: "Card and icon surfaces",
      role: "visual",
      writablePaths: [
        "style.cardBackground",
        "style.cardBorderColor",
        "style.iconSize",
        "style.iconSurface",
        "style.iconBorderColor",
      ],
    },
    {
      mode: "visual",
      id: "stats-kpi.visual.layout-spacing",
      title: "Section layout and spacing",
      role: "layout",
      writablePaths: [
        "style.sectionBackground",
        "style.maxWidth",
        "style.padding",
        "style.minHeight",
        "style.alignment",
        "style.spacing",
        "style.divider",
        "style.dividerIntensity",
      ],
    },
    {
      mode: "advanced",
      id: "stats-kpi.advanced.runtime-diagnostics",
      title: "Runtime diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "variant",
        "items.count",
        "items.order",
        "style.alignment",
        "style.spacing",
        "style.valueSize",
        "style.divider",
        "style.dividerIntensity",
      ],
    },
    {
      mode: "advanced",
      id: "stats-kpi.advanced.style-diagnostics",
      title: "Style diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "style.valueColor",
        "style.labelColor",
        "style.descriptionColor",
        "style.sectionBackground",
        "style.cardBackground",
        "style.cardBorderColor",
        "style.iconSize",
        "style.iconSurface",
        "style.iconBorderColor",
        "style.maxWidth",
        "style.padding",
        "style.minHeight",
      ],
    },
    {
      mode: "advanced",
      id: "stats-kpi.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["items", "runtime.animationPolicy", "runtime.safeLinks"],
    },
  ],
};

const createStatsItemId = (index: number) => `kpi-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveStatsKpiAlignment = (value: string | undefined): StatsKpiAlignment => {
  if (value === "start" || value === "end") return value;
  return "center";
};

const resolveStatsKpiSpacing = (value: string | undefined): StatsKpiSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveStatsKpiValueSize = (value: string | undefined): StatsKpiValueSize => {
  if (value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveStatsKpiMaxWidth = (value: string | undefined): StatsKpiMaxWidth => {
  if (value === "sm" || value === "md" || value === "xl" || value === "full") return value;
  return "lg";
};

const resolveStatsKpiPadding = (value: string | undefined): StatsKpiPadding => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveStatsKpiMinHeight = (value: string | undefined): StatsKpiMinHeight => {
  if (value === "compact" || value === "default") return value;
  return "none";
};

const resolveStatsKpiIconSize = (value: string | undefined): StatsKpiIconSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveStatsKpiDividerIntensity = (value: string | undefined): StatsKpiDividerIntensity => {
  if (value === "soft" || value === "strong") return value;
  return "default";
};

const resolveStatsKpiTrendDirection = (value: string | undefined): StatsKpiTrendDirection => {
  if (value === "up" || value === "down") return value;
  return "neutral";
};

export const resolveStatsKpiVariant = (variant: string): StatsKpiVariantId => {
  if (variant === "inline" || variant === "split-highlight") return variant;
  return "cards";
};

export const normalizeStatsKpiItemCount = (value: number) => {
  if (!Number.isFinite(value)) return statsKpiDefaults.items.length;
  return Math.min(statsKpiItemMax, Math.max(statsKpiItemMin, Math.floor(value)));
};

function normalizeStatsKpiTrend(input: StatsKpiItem["trend"]): StatsKpiTrend | undefined {
  if (!input || typeof input !== "object") return undefined;
  const label = resolveOptionalString(input.label);
  if (!label) return undefined;

  return {
    label,
    direction: resolveStatsKpiTrendDirection(input.direction),
  };
}

function normalizeStatsKpiItemLink(input: StatsKpiItem["link"]): StatsKpiItemLink | undefined {
  if (!input || typeof input !== "object") return undefined;
  const href = resolveOptionalString(input.href);
  if (!href) return undefined;

  return compactObject({
    href,
    label: resolveOptionalString(input.label),
    openInNewTab: input.openInNewTab === true ? true : undefined,
  });
}

function resolveStatsKpiCardLinkLabel(item: StatsKpiItem) {
  return item.link?.label?.trim() || undefined;
}

function resolveStatsKpiAccessibleLabel(item: StatsKpiItem, index: number) {
  const parts = [item.value, item.label, resolveStatsKpiCardLinkLabel(item)].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0
  );

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return `Metric ${index + 1}`;
}

function resolveStatsKpiTrendSymbol(direction: StatsKpiTrendDirection | undefined) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

export function normalizeStatsKpiItems(
  items: StatsKpiItem[] | undefined,
  desiredCount?: number
): StatsKpiItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackValues = ["120", "99.9", "3", "45", "24", "87"];
  const fallbackSuffixes = ["+", "%", "x", "%", "/7", "%"];
  const fallbackLabels = [
    "Projects launched",
    "Platform uptime",
    "Faster iteration",
    "Higher engagement",
    "Support availability",
    "Retention lift",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeStatsKpiItemCount(desiredCount)
      : normalizeStatsKpiItemCount(
          source.length > 0 ? source.length : statsKpiDefaults.items.length
        );

  const normalized: StatsKpiItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};

    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createStatsItemId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`kpi-${candidate}`)) {
        candidate += 1;
      }
      id = `kpi-${candidate}`;
    }
    usedIds.add(id);

    const value =
      typeof base.value === "string" && base.value.trim().length > 0
        ? base.value.trim()
        : (fallbackValues[index] ?? `${index + 1}`);
    const label =
      typeof base.label === "string" && base.label.trim().length > 0
        ? base.label.trim()
        : (fallbackLabels[index] ?? `Metric ${index + 1}`);

    normalized.push({
      id,
      value,
      prefix: resolveOptionalString(base.prefix),
      suffix: resolveOptionalString(base.suffix) ?? fallbackSuffixes[index],
      label,
      description: resolveOptionalString(base.description),
      icon: resolveOptionalString(base.icon),
      accentColor: resolveOptionalString(base.accentColor),
      trend: normalizeStatsKpiTrend(base.trend),
      link: normalizeStatsKpiItemLink(base.link),
    });
  }

  return normalized;
}

export function normalizeStatsKpiData(data: StatsKpiData): StatsKpiData {
  const headerDefaults = statsKpiDefaults.header ?? {
    title: "",
    description: "",
  };
  const styleDefaults = statsKpiDefaults.style ?? {
    alignment: "center",
    spacing: "md",
    valueSize: "md",
    divider: true,
    dividerIntensity: "default",
    maxWidth: "lg",
    padding: "md",
    minHeight: "none",
    iconSize: "md",
  };
  const hasStyleObject = data.style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        sectionBackground: resolveClearableStyleValue(data.style?.sectionBackground),
        cardBackground: resolveClearableStyleValue(data.style?.cardBackground),
        cardBorderColor: resolveClearableStyleValue(data.style?.cardBorderColor),
        iconSurface: resolveClearableStyleValue(data.style?.iconSurface),
        iconBorderColor: resolveClearableStyleValue(data.style?.iconBorderColor),
      })
    : compactObject({
        sectionBackground: resolveClearableStyleValue(styleDefaults.sectionBackground),
        cardBackground: resolveClearableStyleValue(styleDefaults.cardBackground),
        cardBorderColor: resolveClearableStyleValue(styleDefaults.cardBorderColor),
        iconSurface: resolveClearableStyleValue(styleDefaults.iconSurface),
        iconBorderColor: resolveClearableStyleValue(styleDefaults.iconBorderColor),
      });

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    items: normalizeStatsKpiItems(data.items),
    style: {
      alignment: resolveStatsKpiAlignment(data.style?.alignment),
      spacing: resolveStatsKpiSpacing(data.style?.spacing),
      ...(compactObject({
        valueColor: resolveOptionalString(data.style?.valueColor),
        labelColor: resolveOptionalString(data.style?.labelColor),
        descriptionColor: resolveOptionalString(data.style?.descriptionColor),
      }) ?? {}),
      valueSize: resolveStatsKpiValueSize(data.style?.valueSize),
      divider:
        typeof data.style?.divider === "boolean"
          ? data.style.divider
          : Boolean(styleDefaults.divider),
      dividerIntensity: resolveStatsKpiDividerIntensity(data.style?.dividerIntensity),
      maxWidth: resolveStatsKpiMaxWidth(data.style?.maxWidth),
      padding: resolveStatsKpiPadding(data.style?.padding),
      minHeight: resolveStatsKpiMinHeight(data.style?.minHeight),
      iconSize: resolveStatsKpiIconSize(data.style?.iconSize),
      ...(clearableStyle ?? {}),
    },
  };
}

function StatsKpiCard({
  item,
  index,
  valueColor,
  labelColor,
  descriptionColor,
  valueSize,
  divider,
  dividerIntensity,
  variant,
  cardStyle,
  iconSize,
  iconStyle,
}: {
  item: StatsKpiItem;
  index: number;
  valueColor: string;
  labelColor: string;
  descriptionColor: string;
  valueSize: StatsKpiValueSize;
  divider: boolean;
  dividerIntensity: StatsKpiDividerIntensity;
  variant: StatsKpiVariantId;
  cardStyle?: CSSProperties;
  iconSize: StatsKpiIconSize;
  iconStyle?: CSSProperties;
}) {
  const hasDescription = (item.description ?? "").trim().length > 0;
  const hasIcon = (item.icon ?? "").trim().length > 0;
  const linkLabel = resolveStatsKpiCardLinkLabel(item);
  const linkAttrs = resolveWidgetLinkAttrs(item.link?.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: item.link?.openInNewTab,
  });
  const resolvedValueColor = item.accentColor ?? valueColor;
  const valueClassName =
    variant === "split-highlight" && index === 0
      ? highlightedValueSizeClassMap[valueSize]
      : valueSizeClassMap[valueSize];
  const labelClassName = variant === "split-highlight" && index === 0 ? "text-base" : "text-sm";
  const wrapperClassName =
    variant === "inline"
      ? joinClasses(
          "min-w-[9rem] px-4 py-2",
          divider && index > 0
            ? joinClasses("border-l", dividerIntensityClassMap[dividerIntensity])
            : undefined
        )
      : variant === "split-highlight" && index === 0
        ? "rounded-xl border p-5"
        : "rounded-xl border p-4";
  const accessibleLabel = resolveStatsKpiAccessibleLabel(item, index);
  const trendLabel = item.trend?.label?.trim();

  const content = (
    <div className="space-y-2">
      {hasIcon ? (
        <span
          aria-hidden="true"
          className={joinClasses(
            "inline-flex items-center justify-center rounded-md border",
            iconSizeClassMap[iconSize]
          )}
          style={{
            ...iconStyle,
            color: item.accentColor ?? valueColor,
          }}
        >
          {item.icon}
        </span>
      ) : null}
      <p
        className={joinClasses("font-semibold leading-none", valueClassName)}
        style={{ color: resolvedValueColor }}
        data-stats-kpi-value-size={valueSize}
      >
        <span className="inline-flex flex-wrap items-baseline gap-1">
          {item.prefix ? <span data-stats-kpi-prefix>{item.prefix}</span> : null}
          <span>{item.value}</span>
          {item.suffix ? <span data-stats-kpi-suffix>{item.suffix}</span> : null}
        </span>
      </p>
      <p className={joinClasses("font-medium", labelClassName)} style={{ color: labelColor }}>
        {item.label}
      </p>
      {trendLabel ? (
        <p
          className="text-xs font-medium"
          style={{ color: item.accentColor ?? valueColor }}
          data-stats-kpi-trend-direction={item.trend?.direction ?? "neutral"}
        >
          <span aria-hidden="true">{resolveStatsKpiTrendSymbol(item.trend?.direction)}</span>{" "}
          {trendLabel}
        </p>
      ) : null}
      {hasDescription ? (
        <p className="text-xs opacity-70" style={{ color: descriptionColor }}>
          {item.description}
        </p>
      ) : null}
      {linkAttrs && linkLabel ? (
        <span
          className="text-xs font-medium underline-offset-4"
          style={{ color: resolvedValueColor }}
        >
          {linkLabel}
        </span>
      ) : null}
    </div>
  );

  const sharedProps = {
    className: joinClasses(
      wrapperClassName,
      linkAttrs
        ? "transition hover:border-[var(--color-text)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text)]/30"
        : undefined
    ),
    style: variant === "inline" ? undefined : cardStyle,
    "data-stats-kpi-item": String(index + 1),
    "data-stats-kpi-highlighted": String(variant === "split-highlight" && index === 0),
    "data-stats-kpi-link": String(Boolean(linkAttrs)),
  } as const;

  if (linkAttrs) {
    return (
      <a {...linkAttrs} {...sharedProps} aria-label={linkLabel ?? accessibleLabel}>
        {content}
      </a>
    );
  }

  return (
    <article aria-label={accessibleLabel} {...sharedProps}>
      {content}
    </article>
  );
}

export function StatsKpiBlock({ data, variant }: { data: StatsKpiData; variant: string }) {
  const resolvedVariant = resolveStatsKpiVariant(variant);
  const normalized = normalizeStatsKpiData(data);
  const style = normalized.style ?? statsKpiDefaults.style!;

  const alignment = resolveStatsKpiAlignment(style.alignment);
  const spacing = resolveStatsKpiSpacing(style.spacing);
  const valueColor = style.valueColor ?? "var(--color-text)";
  const labelColor = style.labelColor ?? "var(--color-text)";
  const descriptionColor = style.descriptionColor ?? "var(--color-text)";
  const valueSize = resolveStatsKpiValueSize(style.valueSize);
  const divider = Boolean(style.divider);
  const dividerIntensity = resolveStatsKpiDividerIntensity(style.dividerIntensity);
  const maxWidth = resolveStatsKpiMaxWidth(style.maxWidth);
  const padding = resolveStatsKpiPadding(style.padding);
  const minHeight = resolveStatsKpiMinHeight(style.minHeight);
  const iconSize = resolveStatsKpiIconSize(style.iconSize);
  const cardStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.cardBackground),
    borderColor: resolveClearableStyleValue(style.cardBorderColor),
  });
  const iconStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.iconSurface),
    borderColor: resolveClearableStyleValue(style.iconBorderColor),
  });
  const sectionStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.sectionBackground),
  });

  const items = normalizeStatsKpiItems(normalized.items);

  const showHeader =
    (normalized.header?.title ?? "").trim().length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  const containerClassName =
    resolvedVariant === "cards"
      ? joinClasses(
          "grid grid-cols-1 sm:grid-cols-2",
          getStatsKpiCardsGridClass(items.length),
          cardsGridClassMap[spacing]
        )
      : resolvedVariant === "inline"
        ? joinClasses("flex flex-wrap", spacingClassMap[spacing], justifyClassMap[alignment])
        : joinClasses("grid grid-cols-1 lg:grid-cols-3", spacingClassMap[spacing]);

  const splitRest = resolvedVariant === "split-highlight" ? items.slice(1) : [];

  return (
    <section
      aria-label={(normalized.header?.title ?? "").trim() || "Key performance metrics"}
      className={joinClasses(
        "mx-auto w-full",
        sectionWidthClassMap[maxWidth],
        sectionPaddingClassMap[padding],
        minHeightClassMap[minHeight],
        alignmentClassMap[alignment]
      )}
      style={sectionStyle}
      data-stats-kpi-variant={resolvedVariant}
      data-stats-kpi-count={String(items.length)}
      data-stats-kpi-alignment={alignment}
      data-stats-kpi-spacing={spacing}
      data-stats-kpi-divider={String(divider)}
      data-stats-kpi-divider-intensity={dividerIntensity}
      data-stats-kpi-value-size={valueSize}
      data-stats-kpi-max-width={maxWidth}
      data-stats-kpi-padding={padding}
      data-stats-kpi-min-height={minHeight}
      data-stats-kpi-icon-size={iconSize}
    >
      {showHeader ? (
        <header className="mx-auto mb-6 max-w-3xl space-y-2">
          {(normalized.header?.title ?? "").trim().length > 0 ? (
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">
              {normalized.header?.title}
            </h3>
          ) : null}
          {(normalized.header?.description ?? "").trim().length > 0 ? (
            <p className="text-sm text-[var(--color-text)]/75">{normalized.header?.description}</p>
          ) : null}
        </header>
      ) : null}

      {resolvedVariant === "split-highlight" ? (
        <div className={containerClassName}>
          <div className="lg:col-span-1">
            <StatsKpiCard
              item={items[0] ?? {}}
              index={0}
              valueColor={valueColor}
              labelColor={labelColor}
              descriptionColor={descriptionColor}
              valueSize={valueSize}
              divider={divider}
              dividerIntensity={dividerIntensity}
              variant={resolvedVariant}
              cardStyle={cardStyle}
              iconSize={iconSize}
              iconStyle={iconStyle}
            />
          </div>
          <div
            className={joinClasses(
              getStatsKpiSplitSecondaryGridClass(splitRest.length),
              "lg:col-span-2",
              cardsGridClassMap[spacing]
            )}
          >
            {splitRest.map((item, index) => (
              <StatsKpiCard
                key={item.id ?? `kpi-rest-${index + 1}`}
                item={item}
                index={index + 1}
                valueColor={valueColor}
                labelColor={labelColor}
                descriptionColor={descriptionColor}
                valueSize={valueSize}
                divider={divider}
                dividerIntensity={dividerIntensity}
                variant={resolvedVariant}
                cardStyle={cardStyle}
                iconSize={iconSize}
                iconStyle={iconStyle}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={containerClassName}>
          {items.map((item, index) => (
            <StatsKpiCard
              key={item.id ?? `kpi-item-${index + 1}`}
              item={item}
              index={index}
              valueColor={valueColor}
              labelColor={labelColor}
              descriptionColor={descriptionColor}
              valueSize={valueSize}
              divider={divider}
              dividerIntensity={dividerIntensity}
              variant={resolvedVariant}
              cardStyle={cardStyle}
              iconSize={iconSize}
              iconStyle={iconStyle}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function createStatsKpiWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<StatsKpiData>>;
  visual: ComponentType<WidgetEditorProps<StatsKpiData>>;
  advanced: ComponentType<WidgetEditorProps<StatsKpiData>>;
}): WidgetDefinition<StatsKpiData> {
  return {
    type: "stats-kpi",
    title: "Stats KPI",
    description: "Metrics section with values and supporting labels.",
    category: "content",
    variants: [
      {
        id: "cards",
        label: "Cards",
        description: "Grid of KPI cards with value-focused layout.",
      },
      {
        id: "inline",
        label: "Inline",
        description: "Compact inline metrics row.",
      },
      {
        id: "split-highlight",
        label: "Split Highlight",
        description: "One highlighted KPI with supporting side metrics.",
      },
    ],
    schema: statsKpiSchema,
    defaults: statsKpiDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    editorContract: statsKpiEditorContract,
    render: StatsKpiBlock,
  };
}
