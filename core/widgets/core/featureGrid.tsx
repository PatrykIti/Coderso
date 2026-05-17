import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type FeatureGridVariantId = "cards-3" | "cards-4" | "highlight-first";
export type FeatureGridColumns = "2" | "3" | "4";
export type FeatureGridGap = "none" | "sm" | "md" | "lg";
export type FeatureGridBorderWidth = "0" | "1" | "2" | "3";
export type FeatureGridRadius = "none" | "md" | "lg" | "xl";

export type FeatureGridItem = {
  id?: string;
  icon?: string;
  image?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type FeatureGridData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  items: FeatureGridItem[];
  style?: {
    columns?: FeatureGridColumns;
    gap?: FeatureGridGap;
    surfaceColor?: string;
    borderColor?: string;
    borderWidth?: FeatureGridBorderWidth;
    radius?: FeatureGridRadius;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const featureGridVariantItemCountMap: Record<FeatureGridVariantId, number> = {
  "cards-3": 3,
  "cards-4": 4,
  "highlight-first": 4,
};

const variantDefaultColumnsMap: Record<FeatureGridVariantId, FeatureGridColumns> = {
  "cards-3": "3",
  "cards-4": "4",
  "highlight-first": "3",
};

const gapClassMap: Record<FeatureGridGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const columnsClassMap: Record<FeatureGridColumns, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 xl:grid-cols-4",
};

const borderWidthValueMap: Record<FeatureGridBorderWidth, string> = {
  "0": "0px",
  "1": "1px",
  "2": "2px",
  "3": "3px",
};

const radiusClassMap: Record<FeatureGridRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const featureGridItemMin = 1;
export const featureGridItemMax = 8;

export const featureGridSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    header: {
      type: "object",
      additionalProperties: false,
      properties: {
        eyebrow: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
    items: {
      type: "array",
      minItems: featureGridItemMin,
      maxItems: featureGridItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          icon: { type: "string" },
          image: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          ctaLabel: { type: "string" },
          ctaHref: { type: "string" },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        columns: { enum: ["2", "3", "4"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        surfaceColor: { type: "string" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
      },
    },
  },
};

export const featureGridDefaults: FeatureGridData = {
  header: {
    eyebrow: "Feature highlights",
    title: "Everything your team needs",
    description: "Use focused cards to explain your strongest product capabilities.",
  },
  items: [
    {
      id: "item-1",
      icon: "⚡",
      title: "Fast setup",
      description: "Launch complete pages using reusable blocks and presets.",
      ctaLabel: "Explore setup",
      ctaHref: "#",
    },
    {
      id: "item-2",
      icon: "🧩",
      title: "Composable widgets",
      description: "Mix content, forms, and layout blocks without custom code.",
      ctaLabel: "View widgets",
      ctaHref: "#",
    },
    {
      id: "item-3",
      icon: "📈",
      title: "Conversion ready",
      description: "Design sections tuned for clarity, trust, and action.",
      ctaLabel: "See examples",
      ctaHref: "#",
    },
  ],
  style: {
    columns: "3",
    gap: "md",
    surfaceColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
    radius: "lg",
  },
};

const createItemId = (index: number) => `item-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

export const resolveFeatureGridVariant = (variant: string): FeatureGridVariantId => {
  if (variant === "cards-4" || variant === "highlight-first") return variant;
  return "cards-3";
};

export const resolveFeatureGridItemCountForVariant = (variant: FeatureGridVariantId): number =>
  featureGridVariantItemCountMap[variant];

export const normalizeFeatureGridItemCount = (value: number) => {
  if (!Number.isFinite(value)) return resolveFeatureGridItemCountForVariant("cards-3");
  return Math.min(featureGridItemMax, Math.max(featureGridItemMin, Math.floor(value)));
};

export function normalizeFeatureGridItems(
  items: FeatureGridItem[] | undefined,
  desiredCount?: number
): FeatureGridItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackTitles = [
    "Fast setup",
    "Composable widgets",
    "Conversion ready",
    "Content workflows",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeFeatureGridItemCount(desiredCount)
      : normalizeFeatureGridItemCount(
          source.length > 0 ? source.length : resolveFeatureGridItemCountForVariant("cards-3")
        );

  const normalized: FeatureGridItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createItemId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`item-${candidate}`)) {
        candidate += 1;
      }
      id = `item-${candidate}`;
    }

    usedIds.add(id);

    const title =
      typeof base.title === "string" && base.title.trim().length > 0
        ? base.title.trim()
        : (fallbackTitles[index] ?? `Feature ${index + 1}`);

    normalized.push({
      id,
      icon: resolveOptionalString(base.icon),
      image: resolveOptionalString(base.image),
      title,
      description: resolveOptionalString(base.description),
      ctaLabel: resolveOptionalString(base.ctaLabel),
      ctaHref: resolveOptionalString(base.ctaHref),
    });
  }

  return normalized;
}

const resolveFeatureGridColumns = (
  value: string | undefined,
  fallback: FeatureGridColumns
): FeatureGridColumns => {
  if (value === "2" || value === "3" || value === "4") return value;
  return fallback;
};

const resolveFeatureGridGap = (value: string | undefined): FeatureGridGap => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveFeatureGridBorderWidth = (value: string | undefined): FeatureGridBorderWidth => {
  if (value === "0" || value === "2" || value === "3") return value;
  return "1";
};

const resolveFeatureGridRadius = (value: string | undefined): FeatureGridRadius => {
  if (value === "none" || value === "md" || value === "xl") return value;
  return "lg";
};

export function normalizeFeatureGridData(data: FeatureGridData): FeatureGridData {
  const headerDefaults = featureGridDefaults.header ?? {
    eyebrow: "",
    title: "",
    description: "",
  };
  const styleDefaults = featureGridDefaults.style ?? {
    columns: "3",
    gap: "md",
    surfaceColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderWidth: "1",
    radius: "lg",
  };
  const hasStyleObject = data.style !== undefined;

  return {
    ...data,
    header: {
      eyebrow: resolveString(data.header?.eyebrow, headerDefaults.eyebrow ?? ""),
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    items: normalizeFeatureGridItems(data.items),
    style: {
      columns: resolveFeatureGridColumns(data.style?.columns, styleDefaults.columns ?? "3"),
      gap: resolveFeatureGridGap(data.style?.gap),
      surfaceColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.surfaceColor)
        : styleDefaults.surfaceColor,
      borderColor: resolveString(
        data.style?.borderColor,
        styleDefaults.borderColor ?? "var(--color-border)"
      ),
      borderWidth: resolveFeatureGridBorderWidth(data.style?.borderWidth),
      radius: resolveFeatureGridRadius(data.style?.radius),
    },
  };
}

export function FeatureGridBlock({ data, variant }: { data: FeatureGridData; variant: string }) {
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const visibleItemCount = resolveFeatureGridItemCountForVariant(resolvedVariant);
  const normalizedData = normalizeFeatureGridData(data);
  const style = normalizedData.style ?? featureGridDefaults.style!;

  const resolvedColumns =
    resolvedVariant === "highlight-first"
      ? "3"
      : resolveFeatureGridColumns(style.columns, variantDefaultColumnsMap[resolvedVariant]);

  const resolvedGap = resolveFeatureGridGap(style.gap);
  const resolvedBorderWidth = resolveFeatureGridBorderWidth(style.borderWidth);
  const resolvedRadius = resolveFeatureGridRadius(style.radius);
  const items = normalizeFeatureGridItems(normalizedData.items, visibleItemCount);

  const showHeader =
    (normalizedData.header?.eyebrow ?? "").trim().length > 0 ||
    (normalizedData.header?.title ?? "").trim().length > 0 ||
    (normalizedData.header?.description ?? "").trim().length > 0;

  const gridClassName =
    resolvedVariant === "highlight-first"
      ? joinClasses("grid grid-cols-1 md:grid-cols-3", gapClassMap[resolvedGap])
      : joinClasses("grid grid-cols-1", columnsClassMap[resolvedColumns], gapClassMap[resolvedGap]);

  const cardStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.surfaceColor),
      borderColor: style.borderColor ?? "var(--color-border)",
      borderStyle: "solid",
      borderWidth: borderWidthValueMap[resolvedBorderWidth] ?? "1px",
    }) ?? {};

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-feature-grid-variant={resolvedVariant}
      data-feature-grid-columns={resolvedColumns}
      data-feature-grid-gap={resolvedGap}
      data-feature-grid-count={String(items.length)}
    >
      {showHeader ? (
        <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
          {(normalizedData.header?.eyebrow ?? "").trim().length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text)]/60">
              {normalizedData.header?.eyebrow}
            </p>
          ) : null}
          {(normalizedData.header?.title ?? "").trim().length > 0 ? (
            <h3 className="text-2xl font-semibold text-[var(--color-text)]">
              {normalizedData.header?.title}
            </h3>
          ) : null}
          {(normalizedData.header?.description ?? "").trim().length > 0 ? (
            <p className="text-sm text-[var(--color-text)]/75">
              {normalizedData.header?.description}
            </p>
          ) : null}
        </header>
      ) : null}

      <div className={gridClassName}>
        {items.map((item, index) => {
          const safeImageHref = normalizeWidgetSafeHref(item.image, {
            allowRelative: true,
            allowHttp: true,
          });
          const hasImage = typeof safeImageHref === "string" && safeImageHref.trim().length > 0;
          const hasIcon = !hasImage && typeof item.icon === "string" && item.icon.trim().length > 0;
          const hasDescription =
            typeof item.description === "string" && item.description.trim().length > 0;
          const ctaLink = resolveWidgetLinkAttrs(item.ctaHref, {
            allowRelative: true,
            allowHash: true,
            allowHttp: true,
          });
          const hasCta =
            typeof item.ctaLabel === "string" &&
            item.ctaLabel.trim().length > 0 &&
            ctaLink !== undefined;
          const highlighted = resolvedVariant === "highlight-first" && index === 0;

          return (
            <article
              key={item.id ?? `item-${index + 1}`}
              className={joinClasses(
                "flex h-full flex-col gap-3 border p-4",
                radiusClassMap[resolvedRadius],
                highlighted ? "md:col-span-2" : undefined
              )}
              style={cardStyle}
              data-feature-grid-item={String(index + 1)}
              data-feature-grid-highlighted={String(highlighted)}
            >
              {hasImage ? (
                <img
                  src={safeImageHref}
                  alt={item.title ?? `Feature ${index + 1}`}
                  loading={highlighted ? "eager" : "lazy"}
                  className={joinClasses(
                    "h-40 w-full object-cover",
                    radiusClassMap[resolvedRadius]
                  )}
                />
              ) : hasIcon ? (
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-lg"
                >
                  {item.icon}
                </span>
              ) : (
                <span className="inline-flex h-2 w-8 rounded-full bg-[var(--color-primary)]/30" />
              )}

              <h4 className="text-lg font-semibold text-[var(--color-text)]">{item.title}</h4>

              {hasDescription ? (
                <p className="text-sm text-[var(--color-text)]/75">{item.description}</p>
              ) : null}

              {hasCta ? (
                <a
                  {...ctaLink}
                  className="mt-auto inline-flex w-fit rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
                >
                  {item.ctaLabel}
                </a>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function createFeatureGridWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<FeatureGridData>>;
  visual: ComponentType<WidgetEditorProps<FeatureGridData>>;
  advanced: ComponentType<WidgetEditorProps<FeatureGridData>>;
}): WidgetDefinition<FeatureGridData> {
  return {
    type: "feature-grid",
    title: "Feature Grid",
    description: "Card grid for value propositions and product highlights.",
    category: "content",
    variants: [
      {
        id: "cards-3",
        label: "Cards 3",
        description: "Three-card layout for concise feature messaging.",
      },
      {
        id: "cards-4",
        label: "Cards 4",
        description: "Four-card layout for broader value coverage.",
      },
      {
        id: "highlight-first",
        label: "Highlight First",
        description: "First card gets visual emphasis in a larger area.",
      },
    ],
    schema: featureGridSchema,
    defaults: featureGridDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: FeatureGridBlock,
  };
}
