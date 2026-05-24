import { useId, type ComponentType, type CSSProperties } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { compactObject, compactStyle, resolveClearableStyleValue } from "./clearableStyle";
import { resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type LogoCloudVariantId = "grid" | "strip" | "dense";
export type LogoCloudHeight = "none" | "sm" | "md" | "lg" | "xl";
export type LogoCloudGap = "none" | "sm" | "md" | "lg";
export type LogoCloudAlignment = "start" | "center" | "end";
export type LogoCloudHeaderAlign = "start" | "center" | "end";
export type LogoCloudHeaderSize = "sm" | "md" | "lg";
export type LogoCloudRowMode = "wrap" | "single-row";
export type LogoCloudMotionMode = "static" | "marquee";
export type LogoCloudTileRadius = "none" | "sm" | "md" | "lg" | "xl" | "full";
export type LogoCloudTileBorderWidth = "none" | "sm" | "md";
export type LogoCloudLinkTarget = "same-tab" | "new-tab";

export type LogoCloudLogo = {
  id?: string;
  name?: string;
  alt?: string;
  image?: string;
  href?: string;
};

export type LogoCloudCta = {
  enabled?: boolean;
  label?: string;
  href?: string;
  target?: LogoCloudLinkTarget;
};

export type LogoCloudData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  cta?: LogoCloudCta;
  logos: LogoCloudLogo[];
  style?: {
    logoHeight?: LogoCloudHeight;
    grayscale?: boolean;
    hoverColor?: boolean;
    gap?: LogoCloudGap;
    alignment?: LogoCloudAlignment;
    sectionBackground?: string;
    tileBackground?: string;
    tileBorderColor?: string;
    headerAlign?: LogoCloudHeaderAlign;
    headerSize?: LogoCloudHeaderSize;
    rowMode?: LogoCloudRowMode;
    motionMode?: LogoCloudMotionMode;
    tileRadius?: LogoCloudTileRadius;
    tileBorderWidth?: LogoCloudTileBorderWidth;
    openLinksInNewTab?: boolean;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const logoHeightClassMap: Record<LogoCloudHeight, string> = {
  none: "h-auto max-h-16",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-14",
};

const gapClassMap: Record<LogoCloudGap, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const alignmentClassMap: Record<LogoCloudAlignment, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const headerAlignClassMap: Record<LogoCloudHeaderAlign, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
  end: "items-end text-right",
};

const headerSizeClassMap: Record<LogoCloudHeaderSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

const tileRadiusClassMap: Record<LogoCloudTileRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const tileBorderWidthClassMap: Record<LogoCloudTileBorderWidth, string> = {
  none: "border-0",
  sm: "border",
  md: "border-2",
};

const logoCloudLogoMin = 1;
export const logoCloudLogoMax = 24;

export const logoCloudSchema = {
  type: "object",
  additionalProperties: false,
  required: ["logos"],
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
    cta: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        label: { type: "string" },
        href: { type: "string" },
        target: { enum: ["same-tab", "new-tab"] },
      },
    },
    logos: {
      type: "array",
      minItems: logoCloudLogoMin,
      maxItems: logoCloudLogoMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alt: { type: "string" },
          image: { type: "string" },
          href: { type: "string" },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        logoHeight: { enum: ["none", "sm", "md", "lg", "xl"] },
        grayscale: { type: "boolean" },
        hoverColor: { type: "boolean" },
        gap: { enum: ["none", "sm", "md", "lg"] },
        alignment: { enum: ["start", "center", "end"] },
        sectionBackground: { type: "string" },
        tileBackground: { type: "string" },
        tileBorderColor: { type: "string" },
        headerAlign: { enum: ["start", "center", "end"] },
        headerSize: { enum: ["sm", "md", "lg"] },
        rowMode: { enum: ["wrap", "single-row"] },
        motionMode: { enum: ["static", "marquee"] },
        tileRadius: { enum: ["none", "sm", "md", "lg", "xl", "full"] },
        tileBorderWidth: { enum: ["none", "sm", "md"] },
        openLinksInNewTab: { type: "boolean" },
      },
    },
  },
};

export const logoCloudDefaults: LogoCloudData = {
  header: {
    eyebrow: "",
    title: "Trusted by teams worldwide",
    description: "Showcase partner and client logos to build instant credibility.",
  },
  cta: {
    enabled: false,
    label: "Get started",
    href: "#",
    target: "same-tab",
  },
  logos: [
    { id: "logo-1", name: "Acme", href: "#" },
    { id: "logo-2", name: "North Labs", href: "#" },
    { id: "logo-3", name: "BlueRiver", href: "#" },
    { id: "logo-4", name: "Orbit", href: "#" },
    { id: "logo-5", name: "Pixel Forge", href: "#" },
    { id: "logo-6", name: "Stonegrid", href: "#" },
  ],
  style: {
    logoHeight: "md",
    grayscale: true,
    hoverColor: true,
    gap: "md",
    alignment: "center",
    headerAlign: "center",
    headerSize: "md",
    rowMode: "wrap",
    motionMode: "static",
    tileRadius: "lg",
    tileBorderWidth: "sm",
    openLinksInNewTab: false,
    tileBackground: "var(--color-bg)",
    tileBorderColor: "color-mix(in srgb, var(--color-border) 60%, transparent)",
  },
};

const logoCloudWizardVisualDuplicateAllowances = [
  {
    path: "variant",
    reason: "Wizard seeds the trust section layout until one-time setup hides replayed fields.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "header.title",
    reason: "Wizard seeds section copy; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "header.description",
    reason: "Wizard seeds section copy; Visual remains the daily content owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "logos.count",
    reason: "Wizard chooses starter logo count; Visual remains the daily list owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "logos.name",
    reason: "Wizard seeds logo names; Visual remains the daily logo owner.",
    expiresWithTask: "TASK-336-16",
  },
  {
    path: "logos.image",
    reason: "Wizard seeds logo media; Visual remains the daily logo owner.",
    expiresWithTask: "TASK-336-16",
  },
] satisfies NonNullable<WidgetEditorContract["sections"][number]["allowedDuplicateWritablePaths"]>;

export const logoCloudEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "logo-cloud.wizard.starter-logos",
      title: "Starter logos",
      role: "setup",
      writablePaths: [
        "variant",
        "header.title",
        "header.description",
        "logos.count",
        "logos.name",
        "logos.image",
      ],
      allowedDuplicateWritablePaths: logoCloudWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "logo-cloud.visual.logos",
      title: "Logos and header",
      role: "content",
      writablePaths: [
        "variant",
        "header.eyebrow",
        "header.title",
        "header.description",
        "logos.count",
        "logos.name",
        "logos.alt",
        "logos.image",
        "logos.href",
        "cta.enabled",
        "cta.label",
        "cta.href",
        "cta.target",
      ],
      allowedDuplicateWritablePaths: logoCloudWizardVisualDuplicateAllowances,
    },
    {
      mode: "visual",
      id: "logo-cloud.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "style.logoHeight",
        "style.grayscale",
        "style.hoverColor",
        "style.gap",
        "style.alignment",
        "style.sectionBackground",
        "style.tileBackground",
        "style.tileBorderColor",
        "style.headerAlign",
        "style.headerSize",
        "style.rowMode",
        "style.motionMode",
        "style.tileRadius",
        "style.tileBorderWidth",
        "style.openLinksInNewTab",
      ],
    },
    {
      mode: "advanced",
      id: "logo-cloud.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "logos", "cta", "style"],
    },
  ],
};

const createLogoId = (index: number) => `logo-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveLogoCloudHeight = (value: string | undefined): LogoCloudHeight => {
  if (value === "none" || value === "sm" || value === "lg" || value === "xl") return value;
  return "md";
};

const resolveLogoCloudGap = (value: string | undefined): LogoCloudGap => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

const resolveLogoCloudAlignment = (value: string | undefined): LogoCloudAlignment => {
  if (value === "start" || value === "end") return value;
  return "center";
};

const resolveLogoCloudHeaderAlign = (value: string | undefined): LogoCloudHeaderAlign => {
  if (value === "start" || value === "end") return value;
  return "center";
};

const resolveLogoCloudHeaderSize = (value: string | undefined): LogoCloudHeaderSize => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveLogoCloudRowMode = (value: string | undefined): LogoCloudRowMode => {
  if (value === "single-row") return value;
  return "wrap";
};

const resolveLogoCloudMotionMode = (value: string | undefined): LogoCloudMotionMode => {
  if (value === "marquee") return value;
  return "static";
};

const resolveLogoCloudTileRadius = (value: string | undefined): LogoCloudTileRadius => {
  if (value === "none" || value === "sm" || value === "md" || value === "xl" || value === "full") {
    return value;
  }
  return "lg";
};

const resolveLogoCloudTileBorderWidth = (value: string | undefined): LogoCloudTileBorderWidth => {
  if (value === "none" || value === "md") return value;
  return "sm";
};

const resolveLogoCloudLinkTarget = (value: string | undefined): LogoCloudLinkTarget =>
  value === "new-tab" ? "new-tab" : "same-tab";

export const resolveLogoCloudVariant = (variant: string): LogoCloudVariantId => {
  if (variant === "strip" || variant === "dense") return variant;
  return "grid";
};

export const normalizeLogoCloudLogoCount = (value: number) => {
  if (!Number.isFinite(value)) return logoCloudDefaults.logos.length;
  return Math.min(logoCloudLogoMax, Math.max(logoCloudLogoMin, Math.floor(value)));
};

export function normalizeLogoCloudLogos(
  logos: LogoCloudLogo[] | undefined,
  desiredCount?: number
): LogoCloudLogo[] {
  const source = Array.isArray(logos) ? logos : [];
  const fallbackNames = [
    "Acme",
    "North Labs",
    "BlueRiver",
    "Orbit",
    "Pixel Forge",
    "Stonegrid",
    "Nova",
    "Horizon",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeLogoCloudLogoCount(desiredCount)
      : normalizeLogoCloudLogoCount(
          source.length > 0 ? source.length : logoCloudDefaults.logos.length
        );

  const normalized: LogoCloudLogo[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};
    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createLogoId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`logo-${candidate}`)) {
        candidate += 1;
      }
      id = `logo-${candidate}`;
    }
    usedIds.add(id);

    const name =
      typeof base.name === "string" && base.name.trim().length > 0
        ? base.name.trim()
        : (fallbackNames[index] ?? `Logo ${index + 1}`);

    normalized.push({
      id,
      name,
      alt: resolveOptionalString(base.alt),
      image: resolveOptionalString(base.image),
      href: resolveOptionalString(base.href),
    });
  }

  return normalized;
}

export function normalizeLogoCloudData(data: LogoCloudData): LogoCloudData {
  const headerDefaults = logoCloudDefaults.header ?? {
    eyebrow: "",
    title: "",
    description: "",
  };
  const ctaDefaults = logoCloudDefaults.cta ?? {
    enabled: false,
    label: "",
    href: "",
    target: "same-tab",
  };
  const styleDefaults = logoCloudDefaults.style ?? {
    logoHeight: "md",
    grayscale: true,
    hoverColor: true,
    gap: "md",
    alignment: "center",
    headerAlign: "center",
    headerSize: "md",
    rowMode: "wrap",
    motionMode: "static",
    tileRadius: "lg",
    tileBorderWidth: "sm",
    openLinksInNewTab: false,
  };
  const hasStyleObject = data.style !== undefined;
  const clearableStyle = hasStyleObject
    ? compactObject({
        sectionBackground: resolveClearableStyleValue(data.style?.sectionBackground),
        tileBackground: resolveClearableStyleValue(data.style?.tileBackground),
        tileBorderColor: resolveClearableStyleValue(data.style?.tileBorderColor),
      })
    : compactObject({
        sectionBackground: resolveClearableStyleValue(styleDefaults.sectionBackground),
        tileBackground: resolveClearableStyleValue(styleDefaults.tileBackground),
        tileBorderColor: resolveClearableStyleValue(styleDefaults.tileBorderColor),
      });

  return {
    ...data,
    header: {
      eyebrow: resolveString(data.header?.eyebrow, headerDefaults.eyebrow ?? ""),
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    cta: {
      enabled:
        typeof data.cta?.enabled === "boolean" ? data.cta.enabled : Boolean(ctaDefaults.enabled),
      label: resolveString(data.cta?.label, ctaDefaults.label ?? ""),
      href: resolveString(data.cta?.href, ctaDefaults.href ?? ""),
      target: resolveLogoCloudLinkTarget(data.cta?.target ?? ctaDefaults.target),
    },
    logos: normalizeLogoCloudLogos(data.logos),
    style: {
      logoHeight: resolveLogoCloudHeight(data.style?.logoHeight),
      grayscale:
        typeof data.style?.grayscale === "boolean"
          ? data.style.grayscale
          : Boolean(styleDefaults.grayscale),
      hoverColor:
        typeof data.style?.hoverColor === "boolean"
          ? data.style.hoverColor
          : Boolean(styleDefaults.hoverColor),
      gap: resolveLogoCloudGap(data.style?.gap),
      alignment: resolveLogoCloudAlignment(data.style?.alignment),
      headerAlign: resolveLogoCloudHeaderAlign(data.style?.headerAlign),
      headerSize: resolveLogoCloudHeaderSize(data.style?.headerSize),
      rowMode: resolveLogoCloudRowMode(data.style?.rowMode),
      motionMode: resolveLogoCloudMotionMode(data.style?.motionMode),
      tileRadius: resolveLogoCloudTileRadius(data.style?.tileRadius),
      tileBorderWidth: resolveLogoCloudTileBorderWidth(data.style?.tileBorderWidth),
      openLinksInNewTab:
        typeof data.style?.openLinksInNewTab === "boolean"
          ? data.style.openLinksInNewTab
          : Boolean(styleDefaults.openLinksInNewTab),
      ...(clearableStyle ?? {}),
    },
  };
}

function LogoCloudItem({
  logo,
  index,
  logoHeight,
  grayscale,
  hoverColor,
  tileStyle,
  tileClassName,
  openLinksInNewTab = false,
  shrink = false,
}: {
  logo: LogoCloudLogo;
  index: number;
  logoHeight: LogoCloudHeight;
  grayscale: boolean;
  hoverColor: boolean;
  tileStyle?: CSSProperties;
  tileClassName?: string;
  openLinksInNewTab?: boolean;
  shrink?: boolean;
}) {
  const hasImage = typeof logo.image === "string" && logo.image.trim().length > 0;
  const hasLink = typeof logo.href === "string" && logo.href.trim().length > 0;
  const linkAttrs = resolveWidgetLinkAttrs(logo.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: openLinksInNewTab,
  });
  const imageClassName = joinClasses(
    "w-auto max-w-full object-contain",
    logoHeightClassMap[logoHeight],
    grayscale ? "grayscale" : undefined,
    hoverColor ? "transition duration-200 group-hover:grayscale-0" : undefined
  );
  const accessibleLabel = logo.alt?.trim() || logo.name || `Logo ${index + 1}`;

  const content = hasImage ? (
    <img src={logo.image} alt={accessibleLabel} className={imageClassName} loading="lazy" />
  ) : (
    <span className="text-sm font-semibold text-[var(--color-text)]/75">{logo.name}</span>
  );

  const wrapperClassName = joinClasses(
    "group inline-flex min-h-[4.5rem] min-w-[8.5rem] items-center justify-center px-3 py-2",
    tileClassName,
    shrink ? "shrink-0" : undefined
  );

  if (hasLink && linkAttrs) {
    return (
      <a
        {...linkAttrs}
        aria-label={accessibleLabel}
        className={wrapperClassName}
        style={tileStyle}
        data-logo-cloud-item={String(index + 1)}
        data-logo-cloud-has-image={String(hasImage)}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={wrapperClassName}
      style={tileStyle}
      data-logo-cloud-item={String(index + 1)}
      data-logo-cloud-has-image={String(hasImage)}
    >
      {content}
    </div>
  );
}

function LogoCloudCta({
  cta,
  align,
}: {
  cta: NonNullable<LogoCloudData["cta"]>;
  align: LogoCloudAlignment;
}) {
  const label = cta.label?.trim() ?? "";
  const linkAttrs = resolveWidgetLinkAttrs(cta.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: cta.target === "new-tab",
  });
  if (!cta.enabled || !label || !linkAttrs) return null;

  return (
    <div className={joinClasses("mt-6 flex", alignmentClassMap[align])}>
      <a
        {...linkAttrs}
        className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
        data-logo-cloud-cta="true"
      >
        {label}
      </a>
    </div>
  );
}

export function LogoCloudBlock({ data, variant }: { data: LogoCloudData; variant: string }) {
  const headingId = useId();
  const resolvedVariant = resolveLogoCloudVariant(variant);
  const normalized = normalizeLogoCloudData(data);
  const style = normalized.style ?? logoCloudDefaults.style!;

  const logoHeight = resolveLogoCloudHeight(style.logoHeight);
  const gap = resolveLogoCloudGap(style.gap);
  const alignment = resolveLogoCloudAlignment(style.alignment);
  const headerAlign = resolveLogoCloudHeaderAlign(style.headerAlign);
  const headerSize = resolveLogoCloudHeaderSize(style.headerSize);
  const rowMode = resolveLogoCloudRowMode(style.rowMode);
  const motionMode = resolveLogoCloudMotionMode(style.motionMode);
  const grayscale = Boolean(style.grayscale);
  const hoverColor = grayscale && Boolean(style.hoverColor);
  const logos = normalizeLogoCloudLogos(normalized.logos);
  const resolvedMotionMode =
    resolvedVariant === "strip" && motionMode === "marquee" && logos.length > 1
      ? "marquee"
      : "static";
  const resolvedRowMode =
    resolvedVariant === "strip"
      ? resolvedMotionMode === "marquee"
        ? "single-row"
        : rowMode
      : "wrap";
  const tileRadius = resolveLogoCloudTileRadius(style.tileRadius);
  const tileBorderWidth = resolveLogoCloudTileBorderWidth(style.tileBorderWidth);
  const openLinksInNewTab = Boolean(style.openLinksInNewTab);
  const cta = normalized.cta ?? logoCloudDefaults.cta!;
  const sectionStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.sectionBackground),
  });
  const tileStyle = compactStyle({
    backgroundColor: resolveClearableStyleValue(style.tileBackground),
    borderColor: resolveClearableStyleValue(style.tileBorderColor),
  });
  const tileClassName = joinClasses(
    tileRadiusClassMap[tileRadius],
    tileBorderWidthClassMap[tileBorderWidth]
  );
  const sectionEyebrow = (normalized.header?.eyebrow ?? "").trim();
  const sectionTitle = (normalized.header?.title ?? "").trim();

  const showHeader =
    sectionEyebrow.length > 0 ||
    sectionTitle.length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  const listClassName =
    resolvedVariant === "strip"
      ? resolvedRowMode === "single-row"
        ? joinClasses(
            "flex w-full flex-nowrap items-center overflow-x-auto pb-2",
            gapClassMap[gap],
            alignmentClassMap[alignment]
          )
        : joinClasses("flex flex-wrap items-center", gapClassMap[gap], alignmentClassMap[alignment])
      : resolvedVariant === "dense"
        ? joinClasses(
            "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
            gapClassMap[gap],
            alignment === "center"
              ? undefined
              : alignment === "start"
                ? "justify-items-start"
                : "justify-items-end"
          )
        : joinClasses(
            "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            gapClassMap[gap],
            alignment === "center"
              ? undefined
              : alignment === "start"
                ? "justify-items-start"
                : "justify-items-end"
          );

  return (
    <section
      aria-label={sectionTitle.length > 0 ? undefined : "Partner logos"}
      aria-labelledby={sectionTitle.length > 0 ? headingId : undefined}
      className="mx-auto w-full max-w-6xl px-4 py-8"
      style={sectionStyle}
      data-logo-cloud-variant={resolvedVariant}
      data-logo-cloud-gap={gap}
      data-logo-cloud-height={logoHeight}
      data-logo-cloud-count={String(logos.length)}
      data-logo-cloud-alignment={alignment}
      data-logo-cloud-grayscale={String(grayscale)}
      data-logo-cloud-hover-color={String(hoverColor)}
      data-logo-cloud-header-align={headerAlign}
      data-logo-cloud-header-size={headerSize}
      data-logo-cloud-row-mode={resolvedRowMode}
      data-logo-cloud-motion={resolvedMotionMode}
      data-logo-cloud-tile-radius={tileRadius}
      data-logo-cloud-tile-border-width={tileBorderWidth}
      data-logo-cloud-open-in-new-tab={String(openLinksInNewTab)}
    >
      {showHeader ? (
        <header
          className={joinClasses(
            "mx-auto mb-6 flex max-w-3xl flex-col space-y-2",
            headerAlignClassMap[headerAlign]
          )}
        >
          {sectionEyebrow.length > 0 ? (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]/60">
              {sectionEyebrow}
            </p>
          ) : null}
          {sectionTitle.length > 0 ? (
            <h2
              id={headingId}
              className={joinClasses(
                "font-semibold text-[var(--color-text)]",
                headerSizeClassMap[headerSize]
              )}
            >
              {sectionTitle}
            </h2>
          ) : null}
          {(normalized.header?.description ?? "").trim().length > 0 ? (
            <p className="text-sm text-[var(--color-text)]/75">{normalized.header?.description}</p>
          ) : null}
        </header>
      ) : null}

      {resolvedMotionMode === "marquee" ? (
        <div className="logo-cloud-marquee">
          <div className={joinClasses("logo-cloud-marquee-track", gapClassMap[gap])}>
            {[...logos, ...logos].map((logo, index) => (
              <LogoCloudItem
                key={`${logo.id ?? `logo-item-${(index % logos.length) + 1}`}-marquee-${index}`}
                logo={logo}
                index={index % logos.length}
                logoHeight={logoHeight}
                grayscale={grayscale}
                hoverColor={hoverColor}
                tileStyle={tileStyle}
                tileClassName={tileClassName}
                openLinksInNewTab={openLinksInNewTab}
                shrink
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={listClassName}>
          {logos.map((logo, index) => (
            <LogoCloudItem
              key={logo.id ?? `logo-item-${index + 1}`}
              logo={logo}
              index={index}
              logoHeight={logoHeight}
              grayscale={grayscale}
              hoverColor={hoverColor}
              tileStyle={tileStyle}
              tileClassName={tileClassName}
              openLinksInNewTab={openLinksInNewTab}
              shrink={resolvedVariant === "strip" && resolvedRowMode === "single-row"}
            />
          ))}
        </div>
      )}

      <LogoCloudCta cta={cta} align={alignment} />
    </section>
  );
}

export function createLogoCloudWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<LogoCloudData>>;
  visual: ComponentType<WidgetEditorProps<LogoCloudData>>;
  advanced: ComponentType<WidgetEditorProps<LogoCloudData>>;
}): WidgetDefinition<LogoCloudData> {
  return {
    type: "logo-cloud",
    title: "Logo Cloud",
    description: "Partner and customer logo section for trust building.",
    category: "content",
    variants: [
      {
        id: "grid",
        label: "Grid",
        description: "Balanced logo grid layout.",
      },
      {
        id: "strip",
        label: "Strip",
        description: "Horizontal strip style with wrapped logos.",
      },
      {
        id: "dense",
        label: "Dense",
        description: "High-density logo matrix for larger lists.",
      },
    ],
    schema: logoCloudSchema,
    defaults: logoCloudDefaults,
    editor: editors,
    editorContract: logoCloudEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: LogoCloudBlock,
  };
}
