import type { CSSProperties, ComponentType } from "react";

import type {
  DeviceTarget,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetRenderContext,
} from "../types";

export const spacerHeightTokens = [
  "none",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
  "16",
  "20",
  "24",
  "32",
] as const;

export type SpacerVariantId = "fixed" | "responsive";
export type SpacerHeightToken = (typeof spacerHeightTokens)[number];

export type SpacerData = {
  height?: {
    desktop?: string;
    tablet?: string;
    mobile?: string;
  };
  showGuideInEditor?: boolean;
};

export const spacerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    height: {
      type: "object",
      additionalProperties: false,
      properties: {
        desktop: { type: "string" },
        tablet: { type: "string" },
        mobile: { type: "string" },
      },
    },
    showGuideInEditor: { type: "boolean" },
  },
};

export const spacerDefaults: SpacerData = {
  height: {
    desktop: "16",
    tablet: "12",
    mobile: "8",
  },
  showGuideInEditor: true,
};

export const spacerHeightCssValueMap: Record<SpacerHeightToken, string> = {
  none: "0rem",
  "0": "0rem",
  "1": "0.25rem",
  "2": "0.5rem",
  "3": "0.75rem",
  "4": "1rem",
  "5": "1.25rem",
  "6": "1.5rem",
  "8": "2rem",
  "10": "2.5rem",
  "12": "3rem",
  "16": "4rem",
  "20": "5rem",
  "24": "6rem",
  "32": "8rem",
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const pxPattern = /^\d+(?:\.\d+)?px$/i;
const numberPattern = /^\d+(?:\.\d+)?$/;

const isSpacerToken = (value: string): value is SpacerHeightToken =>
  spacerHeightTokens.includes(value as SpacerHeightToken);

const resolveHeightTokenOrPx = (value: string | undefined, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (isSpacerToken(trimmed)) return trimmed;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  return fallback;
};

export const resolveSpacerCssHeight = (value: string): string =>
  isSpacerToken(value) ? spacerHeightCssValueMap[value] : value;

export function resolveSpacerVariant(variant: string): SpacerVariantId {
  if (variant === "fixed") return variant;
  return "responsive";
}

export function normalizeSpacerData(data: SpacerData, variant: string = "responsive"): SpacerData {
  const fallbackDesktop = spacerDefaults.height?.desktop ?? "16";
  const fallbackTablet = spacerDefaults.height?.tablet ?? "12";
  const fallbackMobile = spacerDefaults.height?.mobile ?? "8";
  const desktop = resolveHeightTokenOrPx(data.height?.desktop, fallbackDesktop);

  return {
    height: {
      desktop,
      tablet: resolveHeightTokenOrPx(data.height?.tablet, fallbackTablet),
      mobile: resolveHeightTokenOrPx(data.height?.mobile, fallbackMobile),
    },
    showGuideInEditor:
      typeof data.showGuideInEditor === "boolean"
        ? data.showGuideInEditor
        : Boolean(spacerDefaults.showGuideInEditor),
  };
}

const resolvePreviewHeight = (
  height: NonNullable<SpacerData["height"]>,
  previewDevice: DeviceTarget | undefined
) => {
  if (previewDevice === "mobile") return height.mobile ?? "8";
  if (previewDevice === "tablet") return height.tablet ?? "12";
  return height.desktop ?? "16";
};

export function SpacerBlock({
  data,
  variant,
  previewDevice,
  renderContext,
}: {
  data: SpacerData;
  variant: string;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
}) {
  const resolvedVariant = resolveSpacerVariant(variant);
  const normalized = normalizeSpacerData(data, resolvedVariant);
  const height = normalized.height ?? {
    desktop: "16",
    tablet: "12",
    mobile: "8",
  };
  const desktop = height.desktop ?? "16";
  const tablet = resolvedVariant === "fixed" ? desktop : (height.tablet ?? "12");
  const mobile = resolvedVariant === "fixed" ? desktop : (height.mobile ?? "8");
  const showGuide =
    Boolean(normalized.showGuideInEditor) &&
    (Boolean(previewDevice) ||
      renderContext?.mode === "editor-preview" ||
      renderContext?.mode === "admin-preview");
  const previewHeight = resolvePreviewHeight(
    {
      desktop,
      tablet,
      mobile,
    },
    previewDevice
  );

  return (
    <div
      aria-hidden="true"
      className={joinClasses(
        "relative w-full shrink-0",
        "h-[var(--spacer-mobile-height)]",
        "md:h-[var(--spacer-tablet-height)]",
        "lg:h-[var(--spacer-desktop-height)]"
      )}
      style={
        {
          "--spacer-mobile-height": resolveSpacerCssHeight(mobile),
          "--spacer-tablet-height": resolveSpacerCssHeight(tablet),
          "--spacer-desktop-height": resolveSpacerCssHeight(desktop),
        } as CSSProperties
      }
      data-spacer="true"
      data-spacer-variant={resolvedVariant}
      data-spacer-desktop={desktop}
      data-spacer-tablet={tablet}
      data-spacer-mobile={mobile}
      data-spacer-show-guide={normalized.showGuideInEditor ? "true" : "false"}
      data-spacer-preview-height={previewHeight}
    >
      {showGuide ? (
        <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded border border-dashed border-[var(--color-border)]/70 bg-[var(--color-bg)]/80 px-2 py-1 text-center text-[10px] font-medium uppercase tracking-wider text-[var(--color-text)]/70">
          Spacer {resolveSpacerCssHeight(previewHeight)}
        </div>
      ) : null}
    </div>
  );
}

export function createSpacerWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<SpacerData>>;
  visual: ComponentType<WidgetEditorProps<SpacerData>>;
  advanced: ComponentType<WidgetEditorProps<SpacerData>>;
}): WidgetDefinition<SpacerData> {
  return {
    type: "spacer",
    title: "Spacer",
    description: "Responsive vertical spacing primitive for clean rhythm control.",
    category: "layout",
    variants: [
      {
        id: "responsive",
        label: "Responsive",
        description: "Independent desktop/tablet/mobile heights.",
      },
      {
        id: "fixed",
        label: "Fixed",
        description: "Single height shared across all breakpoints.",
      },
    ],
    schema: spacerSchema,
    defaults: spacerDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: SpacerBlock,
  };
}
