import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { sanitizeRichTextHtml } from "./richTextSection";
import { normalizeWidgetSafeHref, resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type FeatureGridVariantId = "cards-3" | "cards-4" | "highlight-first";
export type FeatureGridColumns = "2" | "3" | "4";
export type FeatureGridGap = "none" | "sm" | "md" | "lg";
export type FeatureGridBorderWidth = "0" | "1" | "2" | "3";
export type FeatureGridRadius = "none" | "md" | "lg" | "xl";
export type FeatureGridTextAlign = "left" | "center" | "right";
export type FeatureGridCardPadding = "compact" | "default" | "spacious";
export type FeatureGridMediaSize = "sm" | "md" | "lg";
export type FeatureGridCardLayout = "vertical" | "horizontal";
export type FeatureGridMaxWidth = "5xl" | "6xl" | "7xl" | "full";
export type FeatureGridHeaderSize = "sm" | "md" | "lg";
export type FeatureGridCardTitleSize = "sm" | "md" | "lg";
export type FeatureGridHoverEffect = "none" | "lift" | "border";
export type FeatureGridCtaTarget = "same-tab" | "new-tab";
export type FeatureGridDescriptionMode = "plain" | "rich";

export type FeatureGridItem = {
  id?: string;
  icon?: string;
  image?: string;
  imageAlt?: string;
  title?: string;
  description?: string;
  descriptionMode?: FeatureGridDescriptionMode;
  ctaEnabled?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaTarget?: FeatureGridCtaTarget;
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
    sectionBackground?: string;
    borderColor?: string;
    borderWidth?: FeatureGridBorderWidth;
    radius?: FeatureGridRadius;
    textAlign?: FeatureGridTextAlign;
    cardPadding?: FeatureGridCardPadding;
    mediaSize?: FeatureGridMediaSize;
    cardLayout?: FeatureGridCardLayout;
    maxWidth?: FeatureGridMaxWidth;
    headerSize?: FeatureGridHeaderSize;
    cardTitleSize?: FeatureGridCardTitleSize;
    hoverEffect?: FeatureGridHoverEffect;
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
  "4": "sm:grid-cols-2 lg:grid-cols-4",
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

const textAlignClassMap: Record<FeatureGridTextAlign, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

const cardPaddingClassMap: Record<FeatureGridCardPadding, string> = {
  compact: "p-3",
  default: "p-4",
  spacious: "p-6",
};

const verticalImageClassMap: Record<FeatureGridMediaSize, string> = {
  sm: "h-28",
  md: "h-40",
  lg: "h-52",
};

const horizontalImageClassMap: Record<FeatureGridMediaSize, string> = {
  sm: "w-full sm:h-24 sm:w-24",
  md: "w-full sm:h-32 sm:w-32",
  lg: "w-full sm:h-40 sm:w-40",
};

const iconClassMap: Record<FeatureGridMediaSize, string> = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-xl",
};

const maxWidthClassMap: Record<FeatureGridMaxWidth, string> = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

const headerSizeClassMap: Record<FeatureGridHeaderSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

const cardTitleSizeClassMap: Record<FeatureGridCardTitleSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const hoverEffectClassMap: Record<FeatureGridHoverEffect, string> = {
  none: "",
  lift: "transition-transform transition-shadow motion-reduce:transform-none hover:-translate-y-1 hover:shadow-md",
  border: "transition-colors hover:border-[var(--color-primary)]",
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
          imageAlt: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          descriptionMode: { enum: ["plain", "rich"] },
          ctaEnabled: { type: "boolean" },
          ctaLabel: { type: "string" },
          ctaHref: { type: "string" },
          ctaTarget: { enum: ["same-tab", "new-tab"] },
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
        sectionBackground: { type: "string" },
        borderColor: { type: "string" },
        borderWidth: { enum: ["0", "1", "2", "3"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
        textAlign: { enum: ["left", "center", "right"] },
        cardPadding: { enum: ["compact", "default", "spacious"] },
        mediaSize: { enum: ["sm", "md", "lg"] },
        cardLayout: { enum: ["vertical", "horizontal"] },
        maxWidth: { enum: ["5xl", "6xl", "7xl", "full"] },
        headerSize: { enum: ["sm", "md", "lg"] },
        cardTitleSize: { enum: ["sm", "md", "lg"] },
        hoverEffect: { enum: ["none", "lift", "border"] },
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
    textAlign: "left",
    cardPadding: "default",
    mediaSize: "md",
    cardLayout: "vertical",
    maxWidth: "6xl",
    headerSize: "md",
    cardTitleSize: "md",
    hoverEffect: "none",
  },
};

const featureGridWizardVisualDuplicateAllowances = [
  {
    path: "variant",
    reason:
      "Wizard seeds a starter card arrangement only during first setup or explicit Run setup again.",
    expiresWithTask: "TASK-336-19",
  },
  {
    path: "header.title",
    reason: "Wizard seeds the section heading; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-19",
  },
  {
    path: "header.description",
    reason: "Wizard seeds the section description; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-19",
  },
  {
    path: "items.count",
    reason: "Wizard chooses the starter card count; Visual remains the daily structure owner.",
    expiresWithTask: "TASK-336-19",
  },
  {
    path: "items.title",
    reason: "Wizard seeds card titles; Visual remains the daily card content owner.",
    expiresWithTask: "TASK-336-19",
  },
] satisfies NonNullable<WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]>;

export const featureGridEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "feature-grid.wizard.starter-setup",
      title: "Starter setup",
      role: "setup",
      writablePaths: [
        "variant",
        "header.title",
        "header.description",
        "items.count",
        "items.title",
      ],
      allowedDuplicateWritablePaths: featureGridWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "feature-grid.visual.structure",
      title: "Variant and layout structure",
      role: "layout",
      writablePaths: ["variant", "items.count", "style.columns", "style.gap"],
      allowedDuplicateWritablePaths: featureGridWizardVisualDuplicateAllowances.filter(
        (allowance) => allowance.path === "variant" || allowance.path === "items.count"
      ),
    },
    {
      mode: "visual",
      id: "feature-grid.visual.header-copy",
      title: "Header copy",
      role: "content",
      writablePaths: ["header.eyebrow", "header.title", "header.description"],
      allowedDuplicateWritablePaths: featureGridWizardVisualDuplicateAllowances.filter(
        (allowance) => allowance.path === "header.title" || allowance.path === "header.description"
      ),
    },
    {
      mode: "visual",
      id: "feature-grid.visual.cards",
      title: "Feature cards and actions",
      role: "content",
      writablePaths: [
        "items.title",
        "items.description",
        "items.descriptionMode",
        "items.icon",
        "items.image",
        "items.imageAlt",
        "items.ctaEnabled",
        "items.ctaLabel",
        "items.ctaHref",
        "items.ctaTarget",
      ],
      allowedDuplicateWritablePaths: featureGridWizardVisualDuplicateAllowances.filter(
        (allowance) => allowance.path === "items.title"
      ),
    },
    {
      mode: "visual",
      id: "feature-grid.visual.card-layout",
      title: "Card layout and density",
      role: "visual",
      writablePaths: [
        "style.textAlign",
        "style.cardPadding",
        "style.mediaSize",
        "style.cardLayout",
      ],
    },
    {
      mode: "visual",
      id: "feature-grid.visual.colors",
      title: "Colors and borders",
      role: "visual",
      writablePaths: [
        "style.surfaceColor",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
      ],
    },
    {
      mode: "visual",
      id: "feature-grid.visual.section-style",
      title: "Section typography and container",
      role: "visual",
      writablePaths: [
        "style.sectionBackground",
        "style.maxWidth",
        "style.headerSize",
        "style.cardTitleSize",
        "style.hoverEffect",
      ],
    },
    {
      mode: "advanced",
      id: "feature-grid.advanced.layout-summary",
      title: "Layout summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "items.count", "style.columns", "style.gap"],
    },
    {
      mode: "advanced",
      id: "feature-grid.advanced.content-summary",
      title: "Content summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["header", "items"],
    },
    {
      mode: "advanced",
      id: "feature-grid.advanced.presentation-summary",
      title: "Presentation summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "style.cardLayout",
        "style.cardPadding",
        "style.surfaceColor",
        "style.borderColor",
        "style.borderWidth",
        "style.radius",
        "style.sectionBackground",
      ],
    },
    {
      mode: "advanced",
      id: "feature-grid.advanced.authoring-boundaries",
      title: "Authoring boundaries",
      role: "summary",
      writablePaths: [],
      readOnlyPaths: ["variant", "header", "items", "style"],
    },
  ],
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
      imageAlt: resolveOptionalString(base.imageAlt),
      title,
      description: resolveOptionalString(base.description),
      descriptionMode: base.descriptionMode === "rich" ? "rich" : "plain",
      ctaEnabled: base.ctaEnabled ?? Boolean(base.ctaLabel || base.ctaHref),
      ctaLabel: resolveOptionalString(base.ctaLabel),
      ctaHref: resolveOptionalString(base.ctaHref),
      ctaTarget: base.ctaTarget === "new-tab" ? "new-tab" : "same-tab",
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
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolveFeatureGridBorderWidth = (value: string | undefined): FeatureGridBorderWidth => {
  if (value === "0" || value === "1" || value === "2" || value === "3") return value;
  return "1";
};

const resolveFeatureGridRadius = (value: string | undefined): FeatureGridRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl") return value;
  return "lg";
};

const resolveFeatureGridTextAlign = (value: string | undefined): FeatureGridTextAlign => {
  if (value === "center" || value === "right") return value;
  return "left";
};

const resolveFeatureGridCardPadding = (value: string | undefined): FeatureGridCardPadding => {
  if (value === "compact" || value === "spacious") return value;
  return "default";
};

const resolveFeatureGridMediaSize = (value: string | undefined): FeatureGridMediaSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveFeatureGridCardLayout = (value: string | undefined): FeatureGridCardLayout => {
  if (value === "horizontal") return value;
  return "vertical";
};

const resolveFeatureGridMaxWidth = (value: string | undefined): FeatureGridMaxWidth => {
  if (value === "5xl" || value === "7xl" || value === "full") return value;
  return "6xl";
};

const resolveFeatureGridHeaderSize = (value: string | undefined): FeatureGridHeaderSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveFeatureGridCardTitleSize = (value: string | undefined): FeatureGridCardTitleSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveFeatureGridHoverEffect = (value: string | undefined): FeatureGridHoverEffect => {
  if (value === "lift" || value === "border") return value;
  return "none";
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
    textAlign: "left",
    cardPadding: "default",
    mediaSize: "md",
    cardLayout: "vertical",
    maxWidth: "6xl",
    headerSize: "md",
    cardTitleSize: "md",
    hoverEffect: "none",
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
      sectionBackground: hasStyleObject
        ? resolveClearableStyleValue(data.style?.sectionBackground)
        : styleDefaults.sectionBackground,
      borderColor: hasStyleObject
        ? resolveClearableStyleValue(data.style?.borderColor)
        : styleDefaults.borderColor,
      borderWidth: resolveFeatureGridBorderWidth(data.style?.borderWidth),
      radius: resolveFeatureGridRadius(data.style?.radius),
      textAlign: resolveFeatureGridTextAlign(data.style?.textAlign),
      cardPadding: resolveFeatureGridCardPadding(data.style?.cardPadding),
      mediaSize: resolveFeatureGridMediaSize(data.style?.mediaSize),
      cardLayout: resolveFeatureGridCardLayout(data.style?.cardLayout),
      maxWidth: resolveFeatureGridMaxWidth(data.style?.maxWidth),
      headerSize: resolveFeatureGridHeaderSize(data.style?.headerSize),
      cardTitleSize: resolveFeatureGridCardTitleSize(data.style?.cardTitleSize),
      hoverEffect: resolveFeatureGridHoverEffect(data.style?.hoverEffect),
    },
  };
}

export function FeatureGridBlock({ data, variant }: { data: FeatureGridData; variant: string }) {
  const resolvedVariant = resolveFeatureGridVariant(variant);
  const normalizedData = normalizeFeatureGridData(data);
  const style = normalizedData.style ?? featureGridDefaults.style!;

  const resolvedColumns =
    resolvedVariant === "highlight-first"
      ? "3"
      : resolveFeatureGridColumns(style.columns, variantDefaultColumnsMap[resolvedVariant]);

  const resolvedGap = resolveFeatureGridGap(style.gap);
  const resolvedBorderWidth = resolveFeatureGridBorderWidth(style.borderWidth);
  const resolvedRadius = resolveFeatureGridRadius(style.radius);
  const resolvedTextAlign = resolveFeatureGridTextAlign(style.textAlign);
  const resolvedCardPadding = resolveFeatureGridCardPadding(style.cardPadding);
  const resolvedMediaSize = resolveFeatureGridMediaSize(style.mediaSize);
  const resolvedCardLayout = resolveFeatureGridCardLayout(style.cardLayout);
  const resolvedMaxWidth = resolveFeatureGridMaxWidth(style.maxWidth);
  const resolvedHeaderSize = resolveFeatureGridHeaderSize(style.headerSize);
  const resolvedCardTitleSize = resolveFeatureGridCardTitleSize(style.cardTitleSize);
  const resolvedHoverEffect = resolveFeatureGridHoverEffect(style.hoverEffect);
  const items = normalizeFeatureGridItems(normalizedData.items);

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

  const sectionStyle: CSSProperties =
    compactStyle({
      backgroundColor: resolveClearableStyleValue(style.sectionBackground),
    }) ?? {};

  return (
    <section
      className={joinClasses("mx-auto w-full px-4 py-8", maxWidthClassMap[resolvedMaxWidth])}
      style={sectionStyle}
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
            <h3
              className={joinClasses(
                headerSizeClassMap[resolvedHeaderSize],
                "font-semibold text-[var(--color-text)]"
              )}
            >
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
            openInNewTab: item.ctaTarget === "new-tab",
          });
          const hasCta =
            item.ctaEnabled !== false &&
            typeof item.ctaLabel === "string" &&
            item.ctaLabel.trim().length > 0 &&
            ctaLink !== undefined;
          const highlighted = resolvedVariant === "highlight-first" && index === 0;

          return (
            <article
              key={item.id ?? `item-${index + 1}`}
              className={joinClasses(
                "flex h-full gap-3 border",
                resolvedCardLayout === "horizontal"
                  ? "flex-col sm:flex-row sm:items-start"
                  : "flex-col",
                cardPaddingClassMap[resolvedCardPadding],
                hoverEffectClassMap[resolvedHoverEffect],
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
                  alt={item.imageAlt ?? item.title ?? `Feature ${index + 1}`}
                  loading={highlighted ? "eager" : "lazy"}
                  className={joinClasses(
                    "shrink-0 object-cover",
                    resolvedCardLayout === "horizontal"
                      ? horizontalImageClassMap[resolvedMediaSize]
                      : verticalImageClassMap[resolvedMediaSize],
                    radiusClassMap[resolvedRadius]
                  )}
                />
              ) : hasIcon ? (
                <span
                  aria-hidden="true"
                  className={joinClasses(
                    "inline-flex shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]",
                    iconClassMap[resolvedMediaSize]
                  )}
                >
                  {item.icon}
                </span>
              ) : (
                <span className="inline-flex shrink-0 h-2 w-8 rounded-full bg-[var(--color-primary)]/30" />
              )}

              <div
                className={joinClasses(
                  "min-w-0 flex flex-1 flex-col gap-3",
                  textAlignClassMap[resolvedTextAlign]
                )}
              >
                <h4
                  className={joinClasses(
                    cardTitleSizeClassMap[resolvedCardTitleSize],
                    "font-semibold text-[var(--color-text)]"
                  )}
                >
                  {item.title}
                </h4>

                {hasDescription ? (
                  item.descriptionMode === "rich" ? (
                    <div
                      className="text-sm text-[var(--color-text)]/75"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichTextHtml(item.description),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-[var(--color-text)]/75">{item.description}</p>
                  )
                ) : null}

                {hasCta ? (
                  <a
                    {...ctaLink}
                    className="mt-auto inline-flex w-fit rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
                  >
                    {item.ctaLabel}
                  </a>
                ) : null}
              </div>
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
    editorContract: featureGridEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: FeatureGridBlock,
  };
}
