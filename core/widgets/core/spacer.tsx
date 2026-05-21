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
export type SpacerHeightValues = {
  desktop: string;
  tablet: string;
  mobile: string;
};

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

export const spacerPresetHeightMap = {
  "card-gap": { desktop: "8", tablet: "6", mobile: "4" },
  "section-gap": { desktop: "16", tablet: "12", mobile: "8" },
  "hero-gap": { desktop: "24", tablet: "20", mobile: "16" },
} as const satisfies Record<string, SpacerHeightValues>;

export type SpacerPresetId = keyof typeof spacerPresetHeightMap;

export const spacerPresetDefinitions = [
  {
    id: "card-gap",
    label: "Card gap",
    description: "Compact rhythm for cards and stacked content.",
    height: spacerPresetHeightMap["card-gap"],
  },
  {
    id: "section-gap",
    label: "Section gap",
    description: "Balanced section rhythm for default content blocks.",
    height: spacerPresetHeightMap["section-gap"],
  },
  {
    id: "hero-gap",
    label: "Hero gap",
    description: "Larger breathing room for hero and cover transitions.",
    height: spacerPresetHeightMap["hero-gap"],
  },
] as const satisfies ReadonlyArray<{
  id: SpacerPresetId;
  label: string;
  description: string;
  height: SpacerHeightValues;
}>;

const defaultSpacerHeightValues: SpacerHeightValues = {
  desktop: spacerDefaults.height?.desktop ?? "16",
  tablet: spacerDefaults.height?.tablet ?? "12",
  mobile: spacerDefaults.height?.mobile ?? "8",
};

const joinClasses = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

const pxPattern = /^\d+(?:\.\d+)?px$/i;
const numberPattern = /^\d+(?:\.\d+)?$/;
const viewportLengthPattern = /^\d+(?:\.\d+)?(?:vh|dvh|svh|vw)$/i;
const clampLengthPattern = /^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i;
const clampBoundaryLengthPattern = /^\d+(?:\.\d+)?(?:px|rem)$/i;
const clampPreferredLengthPattern = /^\d+(?:\.\d+)?(?:vh|dvh|svh|vw)$/i;

const isSpacerToken = (value: string): value is SpacerHeightToken =>
  spacerHeightTokens.includes(value as SpacerHeightToken);

const normalizeClampLengthSegment = (value: string, pattern: RegExp): string | undefined => {
  const trimmed = value.trim();
  if (!pattern.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
};

const normalizeSpacerClampLength = (value: string): string | undefined => {
  const match = clampLengthPattern.exec(value.trim());
  if (!match) return undefined;

  const minimum = normalizeClampLengthSegment(match[1], clampBoundaryLengthPattern);
  const preferred = normalizeClampLengthSegment(match[2], clampPreferredLengthPattern);
  const maximum = normalizeClampLengthSegment(match[3], clampBoundaryLengthPattern);

  if (!minimum || !preferred || !maximum) return undefined;
  return `clamp(${minimum}, ${preferred}, ${maximum})`;
};

export function normalizeSpacerCustomHeightInput(rawValue: string): string | undefined {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return undefined;
  if (pxPattern.test(trimmed)) return trimmed.toLowerCase();
  if (numberPattern.test(trimmed)) return `${trimmed}px`;
  if (viewportLengthPattern.test(trimmed)) return trimmed.toLowerCase();
  return normalizeSpacerClampLength(trimmed);
}

const resolveHeightTokenOrLength = (value: string | undefined, fallback: string): string => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0) return fallback;
  if (isSpacerToken(trimmed)) return trimmed;
  return normalizeSpacerCustomHeightInput(trimmed) ?? fallback;
};

function resolveSpacerHeightValues(height: SpacerData["height"] | undefined): SpacerHeightValues {
  return {
    desktop: resolveHeightTokenOrLength(height?.desktop, defaultSpacerHeightValues.desktop),
    tablet: resolveHeightTokenOrLength(height?.tablet, defaultSpacerHeightValues.tablet),
    mobile: resolveHeightTokenOrLength(height?.mobile, defaultSpacerHeightValues.mobile),
  };
}

export function applySpacerPreset(data: SpacerData, presetId: SpacerPresetId): SpacerData {
  return {
    ...data,
    height: {
      ...spacerPresetHeightMap[presetId],
    },
  };
}

export function deriveSpacerPresetId(
  height: SpacerData["height"] | undefined
): SpacerPresetId | null {
  const normalizedHeight = resolveSpacerHeightValues(height);

  for (const preset of spacerPresetDefinitions) {
    if (
      preset.height.desktop === normalizedHeight.desktop &&
      preset.height.tablet === normalizedHeight.tablet &&
      preset.height.mobile === normalizedHeight.mobile
    ) {
      return preset.id;
    }
  }

  return null;
}

export const resolveSpacerCssHeight = (value: string): string =>
  isSpacerToken(value) ? spacerHeightCssValueMap[value] : value;

export function resolveSpacerVariant(variant: string): SpacerVariantId {
  if (variant === "fixed") return variant;
  return "responsive";
}

export function normalizeSpacerData(data: SpacerData, variant: string = "responsive"): SpacerData {
  const height = resolveSpacerHeightValues(data.height);

  return {
    height,
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
