import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";

export type StatsKpiVariantId = "cards" | "inline" | "split-highlight";
export type StatsKpiAlignment = "start" | "center" | "end";
export type StatsKpiSpacing = "none" | "sm" | "md" | "lg";

export type StatsKpiItem = {
  id?: string;
  value?: string;
  label?: string;
  description?: string;
  icon?: string;
};

export type StatsKpiData = {
  header?: {
    title?: string;
    description?: string;
  };
  items: StatsKpiItem[];
  style?: {
    alignment?: StatsKpiAlignment;
    spacing?: StatsKpiSpacing;
    valueColor?: string;
    labelColor?: string;
    divider?: boolean;
    cardBackground?: string;
    cardBorderColor?: string;
  };
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

const getStatsKpiCardsGridClass = (count: number) => {
  if (count <= 2) return "lg:grid-cols-2";
  if (count === 3) return "lg:grid-cols-3";
  if (count <= 6) return "lg:grid-cols-3";
  return "lg:grid-cols-4";
};

const statsKpiItemMin = 1;
export const statsKpiItemMax = 12;

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
          label: { type: "string" },
          description: { type: "string" },
          icon: { type: "string" },
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
        divider: { type: "boolean" },
        cardBackground: { type: "string" },
        cardBorderColor: { type: "string" },
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
      value: "120+",
      label: "Projects launched",
      description: "Production pages delivered in the last 12 months.",
      icon: "🚀",
    },
    {
      id: "kpi-2",
      value: "99.9%",
      label: "Platform uptime",
      description: "Stable runtime across peak traffic windows.",
      icon: "⏱",
    },
    {
      id: "kpi-3",
      value: "3x",
      label: "Faster iteration",
      description: "Average release cycle speedup for content teams.",
      icon: "⚡",
    },
    {
      id: "kpi-4",
      value: "45%",
      label: "Higher engagement",
      description: "Increase in CTA interaction on optimized sections.",
      icon: "📈",
    },
  ],
  style: {
    alignment: "center",
    spacing: "md",
    valueColor: "var(--color-text)",
    labelColor: "var(--color-text)",
    divider: true,
    cardBackground: "var(--color-bg)",
    cardBorderColor: "var(--color-border)",
  },
};

const createStatsItemId = (index: number) => `kpi-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveStatsKpiAlignment = (value: string | undefined): StatsKpiAlignment => {
  if (value === "start" || value === "end") return value;
  return "center";
};

const resolveStatsKpiSpacing = (value: string | undefined): StatsKpiSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

export const resolveStatsKpiVariant = (variant: string): StatsKpiVariantId => {
  if (variant === "inline" || variant === "split-highlight") return variant;
  return "cards";
};

export const normalizeStatsKpiItemCount = (value: number) => {
  if (!Number.isFinite(value)) return statsKpiDefaults.items.length;
  return Math.min(statsKpiItemMax, Math.max(statsKpiItemMin, Math.floor(value)));
};

export function normalizeStatsKpiItems(
  items: StatsKpiItem[] | undefined,
  desiredCount?: number
): StatsKpiItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackValues = ["120+", "99.9%", "3x", "45%", "24/7", "87%"];
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
      label,
      description: resolveOptionalString(base.description),
      icon: resolveOptionalString(base.icon),
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
    valueColor: "var(--color-text)",
    labelColor: "var(--color-text)",
    divider: true,
  };
  const hasStyleObject = data.style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        cardBackground: resolveClearableStyleValue(data.style?.cardBackground),
        cardBorderColor: resolveClearableStyleValue(data.style?.cardBorderColor),
      })
    : compactObject({
        cardBackground: resolveClearableStyleValue(styleDefaults.cardBackground),
        cardBorderColor: resolveClearableStyleValue(styleDefaults.cardBorderColor),
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
      valueColor: resolveString(
        data.style?.valueColor,
        styleDefaults.valueColor ?? "var(--color-text)"
      ),
      labelColor: resolveString(
        data.style?.labelColor,
        styleDefaults.labelColor ?? "var(--color-text)"
      ),
      divider:
        typeof data.style?.divider === "boolean"
          ? data.style.divider
          : Boolean(styleDefaults.divider),
      ...(clearableStyle ?? {}),
    },
  };
}

function StatsKpiCard({
  item,
  index,
  valueColor,
  labelColor,
  divider,
  variant,
  cardStyle,
}: {
  item: StatsKpiItem;
  index: number;
  valueColor: string;
  labelColor: string;
  divider: boolean;
  variant: StatsKpiVariantId;
  cardStyle?: CSSProperties;
}) {
  const hasDescription = (item.description ?? "").trim().length > 0;
  const hasIcon = (item.icon ?? "").trim().length > 0;

  const wrapperClassName =
    variant === "inline"
      ? joinClasses(
          "min-w-[9rem] px-4 py-2",
          divider && index > 0 ? "border-l border-[var(--color-border)]/70" : undefined
        )
      : variant === "split-highlight" && index === 0
        ? "rounded-xl border p-5"
        : "rounded-xl border p-4";

  const valueClassName = variant === "split-highlight" && index === 0 ? "text-4xl" : "text-3xl";
  const labelClassName = variant === "split-highlight" && index === 0 ? "text-base" : "text-sm";

  return (
    <article
      aria-label={item.label ?? `Metric ${index + 1}`}
      className={wrapperClassName}
      style={variant === "inline" ? undefined : cardStyle}
      data-stats-kpi-item={String(index + 1)}
      data-stats-kpi-highlighted={String(variant === "split-highlight" && index === 0)}
    >
      <div className="space-y-2">
        {hasIcon ? (
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)]/70 text-base"
          >
            {item.icon}
          </span>
        ) : null}
        <p
          className={joinClasses("font-semibold leading-none", valueClassName)}
          style={{ color: valueColor }}
        >
          {item.value}
        </p>
        <p className={joinClasses("font-medium", labelClassName)} style={{ color: labelColor }}>
          {item.label}
        </p>
        {hasDescription ? (
          <p className="text-xs text-[var(--color-text)]/70">{item.description}</p>
        ) : null}
      </div>
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
  const divider = Boolean(style.divider);
  const cardStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.cardBackground),
    borderColor: resolveClearableStyleValue(style.cardBorderColor),
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
      className={joinClasses("mx-auto w-full max-w-6xl px-4 py-8", alignmentClassMap[alignment])}
      data-stats-kpi-variant={resolvedVariant}
      data-stats-kpi-count={String(items.length)}
      data-stats-kpi-alignment={alignment}
      data-stats-kpi-spacing={spacing}
      data-stats-kpi-divider={String(divider)}
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
              divider={divider}
              variant={resolvedVariant}
              cardStyle={cardStyle}
            />
          </div>
          <div
            className={joinClasses(
              "grid grid-cols-1 sm:grid-cols-2 lg:col-span-2",
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
                divider={divider}
                variant={resolvedVariant}
                cardStyle={cardStyle}
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
              divider={divider}
              variant={resolvedVariant}
              cardStyle={cardStyle}
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
    render: StatsKpiBlock,
  };
}
