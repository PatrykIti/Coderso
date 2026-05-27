import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import { resolveClearableStyleValue } from "./clearableStyle";
import { createWidgetInstanceId, scopedId } from "./widgetInstanceIds";
import { resolveWidgetLinkAttrs } from "./widgetSafeHref";

export type GalleryMosaicVariantId = "mosaic" | "uniform-grid" | "feature-left";
export type GalleryMosaicRatio = "1:1" | "4:3" | "16:9" | "3:4";
export type GalleryMosaicGap = "none" | "sm" | "md" | "lg";
export type GalleryMosaicRadius = "none" | "md" | "lg" | "xl";
export type GalleryMosaicCaptionPosition = "inside" | "below" | "hover";
export type GalleryMosaicObjectPosition = "center" | "top" | "bottom" | "left" | "right";
export type GalleryMosaicItemRatio = "inherit" | GalleryMosaicRatio;
export type GalleryMosaicInteractionMode = "none" | "lightbox";
export type GalleryMosaicLightboxZoom = "fit" | "fill";
export type GalleryMosaicLayoutDensity = "auto" | "compact" | "balanced" | "dense";
export type GalleryMosaicMotionPreset = "none" | "fade" | "slide-up";
export type GalleryMosaicImportErrorCode =
  | "gallery_mosaic_import_invalid_json"
  | "gallery_mosaic_import_invalid_payload"
  | "gallery_mosaic_import_unknown_field"
  | "gallery_mosaic_import_invalid_value";
export type GalleryMosaicImportResult =
  | {
      ok: true;
      data: GalleryMosaicData;
    }
  | {
      ok: false;
      code: GalleryMosaicImportErrorCode;
      path?: string;
    };

export type GalleryMosaicItem = {
  id?: string;
  image?: string;
  video?: string;
  alt?: string;
  poster?: string;
  caption?: string;
  href?: string;
  objectPosition?: GalleryMosaicObjectPosition;
  ratio?: GalleryMosaicItemRatio;
};

export type GalleryMosaicData = {
  header?: {
    title?: string;
    description?: string;
  };
  items: GalleryMosaicItem[];
  interaction?: {
    mode?: GalleryMosaicInteractionMode;
    zoom?: GalleryMosaicLightboxZoom;
  };
  style?: {
    ratio?: GalleryMosaicRatio;
    gap?: GalleryMosaicGap;
    radius?: GalleryMosaicRadius;
    overlay?: string;
    captionPosition?: GalleryMosaicCaptionPosition;
    layoutDensity?: GalleryMosaicLayoutDensity;
    motionPreset?: GalleryMosaicMotionPreset;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const ratioClassMap: Record<GalleryMosaicRatio, string> = {
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-video",
  "3:4": "aspect-[3/4]",
};

const gapClassMap: Record<GalleryMosaicGap, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

const radiusClassMap: Record<GalleryMosaicRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const objectPositionStyleMap: Record<GalleryMosaicObjectPosition, CSSProperties["objectPosition"]> =
  {
    center: "center",
    top: "center top",
    bottom: "center bottom",
    left: "left center",
    right: "right center",
  };

const layoutDensityGridClassMap: Record<
  Exclude<GalleryMosaicVariantId, "feature-left">,
  Record<GalleryMosaicLayoutDensity, string>
> = {
  mosaic: {
    auto: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    compact: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    balanced: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    dense: "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5",
  },
  "uniform-grid": {
    auto: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    compact: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
    balanced: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    dense: "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4",
  },
};

const featureLeftLayoutDensityMap: Record<
  GalleryMosaicLayoutDensity,
  {
    container: string;
    lead: string;
    support: string;
  }
> = {
  auto: {
    container: "grid grid-cols-1 lg:grid-cols-3",
    lead: "lg:col-span-2",
    support: "flex flex-col",
  },
  compact: {
    container: "grid grid-cols-1 lg:grid-cols-2",
    lead: "",
    support: "flex flex-col",
  },
  balanced: {
    container: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    lead: "sm:col-span-2 lg:col-span-2",
    support: "flex flex-col",
  },
  dense: {
    container: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    lead: "sm:col-span-2 lg:col-span-2",
    support: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2",
  },
};

const motionPresetClassMap: Record<GalleryMosaicMotionPreset, string> = {
  none: "",
  fade: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-reduce:transform-none motion-reduce:transition-none",
  "slide-up":
    "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:transform-none motion-reduce:transition-none",
};

const galleryMosaicTopLevelKeys = new Set(["header", "items", "interaction", "style"]);
const galleryMosaicHeaderKeys = new Set(["title", "description"]);
const galleryMosaicItemKeys = new Set([
  "id",
  "image",
  "video",
  "alt",
  "poster",
  "caption",
  "href",
  "objectPosition",
  "ratio",
]);
const galleryMosaicInteractionKeys = new Set(["mode", "zoom"]);
const galleryMosaicStyleKeys = new Set([
  "ratio",
  "gap",
  "radius",
  "overlay",
  "captionPosition",
  "layoutDensity",
  "motionPreset",
]);

const galleryMosaicItemMin = 1;
export const galleryMosaicItemMax = 16;

export const galleryMosaicSchema = {
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
      minItems: galleryMosaicItemMin,
      maxItems: galleryMosaicItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          image: { type: "string" },
          video: { type: "string" },
          alt: { type: "string" },
          poster: { type: "string" },
          caption: { type: "string" },
          href: { type: "string" },
          objectPosition: { enum: ["center", "top", "bottom", "left", "right"] },
          ratio: { enum: ["inherit", "1:1", "4:3", "16:9", "3:4"] },
        },
      },
    },
    interaction: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { enum: ["none", "lightbox"] },
        zoom: { enum: ["fit", "fill"] },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        ratio: { enum: ["1:1", "4:3", "16:9", "3:4"] },
        gap: { enum: ["none", "sm", "md", "lg"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
        overlay: { type: "string" },
        captionPosition: { enum: ["inside", "below", "hover"] },
        layoutDensity: { enum: ["auto", "compact", "balanced", "dense"] },
        motionPreset: { enum: ["none", "fade", "slide-up"] },
      },
    },
  },
};

export const galleryMosaicDefaults: GalleryMosaicData = {
  header: {
    title: "Gallery highlights",
    description: "Visual storytelling block for products, portfolio, and campaigns.",
  },
  items: [
    {
      id: "gallery-1",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
      caption: "Product overview",
    },
    {
      id: "gallery-2",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984",
      caption: "Team collaboration",
    },
    {
      id: "gallery-3",
      image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
      caption: "Workflow details",
    },
    {
      id: "gallery-4",
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692",
      caption: "Delivery process",
    },
    {
      id: "gallery-5",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      caption: "Platform snapshot",
    },
  ],
  interaction: {
    mode: "none",
    zoom: "fit",
  },
  style: {
    ratio: "4:3",
    gap: "md",
    radius: "lg",
    overlay: "rgba(15, 23, 42, 0.35)",
    captionPosition: "inside",
    layoutDensity: "auto",
    motionPreset: "none",
  },
};

export const galleryMosaicEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "gallery-mosaic.wizard.starter-media",
      title: "Starter media",
      role: "setup",
      writablePaths: [],
      readOnlyPaths: ["variant", "items.count"],
    },
    {
      mode: "visual",
      id: "gallery-mosaic.visual.media",
      title: "Media and captions",
      role: "content",
      writablePaths: [
        "variant",
        "header.title",
        "header.description",
        "items.count",
        "items.image",
        "items.video",
        "items.alt",
        "items.poster",
        "items.caption",
        "items.href",
        "items.objectPosition",
        "items.ratio",
      ],
    },
    {
      mode: "visual",
      id: "gallery-mosaic.visual.presentation",
      title: "Presentation",
      role: "visual",
      writablePaths: [
        "interaction.mode",
        "interaction.zoom",
        "style.ratio",
        "style.gap",
        "style.radius",
        "style.overlay",
        "style.captionPosition",
        "style.layoutDensity",
        "style.motionPreset",
      ],
    },
    {
      mode: "advanced",
      id: "gallery-mosaic.advanced.runtime-summary",
      title: "Runtime summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["variant", "header", "items", "interaction", "style"],
    },
  ],
};

const createGalleryItemId = (index: number) => `gallery-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveGalleryMosaicRatio = (value: string | undefined): GalleryMosaicRatio => {
  if (value === "1:1" || value === "4:3" || value === "16:9" || value === "3:4") return value;
  return "4:3";
};

const resolveGalleryMosaicGap = (value: string | undefined): GalleryMosaicGap => {
  if (value === "none" || value === "sm" || value === "md" || value === "lg") return value;
  return "md";
};

const resolveGalleryMosaicRadius = (value: string | undefined): GalleryMosaicRadius => {
  if (value === "none" || value === "md" || value === "lg" || value === "xl") return value;
  return "lg";
};

const resolveGalleryMosaicCaptionPosition = (
  value: string | undefined
): GalleryMosaicCaptionPosition => {
  if (value === "below" || value === "hover") return value;
  return "inside";
};

const resolveGalleryMosaicObjectPosition = (
  value: string | undefined
): GalleryMosaicObjectPosition => {
  if (value === "top" || value === "bottom" || value === "left" || value === "right") return value;
  return "center";
};

const resolveGalleryMosaicItemRatio = (value: string | undefined): GalleryMosaicItemRatio => {
  if (value === "1:1" || value === "4:3" || value === "16:9" || value === "3:4") return value;
  return "inherit";
};

const resolveGalleryMosaicInteractionMode = (
  value: string | undefined
): GalleryMosaicInteractionMode => {
  if (value === "lightbox") return "lightbox";
  return "none";
};

const resolveGalleryMosaicLightboxZoom = (value: string | undefined): GalleryMosaicLightboxZoom => {
  if (value === "fill") return "fill";
  return "fit";
};

const resolveGalleryMosaicLayoutDensity = (
  value: string | undefined
): GalleryMosaicLayoutDensity => {
  if (value === "compact" || value === "balanced" || value === "dense") return value;
  return "auto";
};

const resolveGalleryMosaicMotionPreset = (value: string | undefined): GalleryMosaicMotionPreset => {
  if (value === "fade" || value === "slide-up") return value;
  return "none";
};

export const resolveGalleryMosaicVariant = (variant: string): GalleryMosaicVariantId => {
  if (variant === "uniform-grid" || variant === "feature-left") return variant;
  return "mosaic";
};

export const normalizeGalleryMosaicItemCount = (value: number) => {
  if (!Number.isFinite(value)) return galleryMosaicDefaults.items.length;
  return Math.min(galleryMosaicItemMax, Math.max(galleryMosaicItemMin, Math.floor(value)));
};

export function normalizeGalleryMosaicItems(
  items: GalleryMosaicItem[] | undefined,
  desiredCount?: number
): GalleryMosaicItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackCaptions = [
    "Media highlight",
    "Visual detail",
    "Story frame",
    "Portfolio item",
    "Campaign shot",
    "Behind the scenes",
  ];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeGalleryMosaicItemCount(desiredCount)
      : normalizeGalleryMosaicItemCount(
          source.length > 0 ? source.length : galleryMosaicDefaults.items.length
        );

  const normalized: GalleryMosaicItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};

    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createGalleryItemId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`gallery-${candidate}`)) {
        candidate += 1;
      }
      id = `gallery-${candidate}`;
    }
    usedIds.add(id);

    normalized.push({
      id,
      image: resolveOptionalString(base.image),
      video: resolveOptionalString(base.video),
      alt: resolveOptionalString(base.alt),
      poster: resolveOptionalString(base.poster),
      caption:
        typeof base.caption === "string" && base.caption.trim().length > 0
          ? base.caption.trim()
          : (fallbackCaptions[index] ?? `Media ${index + 1}`),
      href: resolveOptionalString(base.href),
      objectPosition: resolveGalleryMosaicObjectPosition(base.objectPosition),
      ratio: resolveGalleryMosaicItemRatio(base.ratio),
    });
  }

  return normalized;
}

export function normalizeGalleryMosaicData(data: GalleryMosaicData): GalleryMosaicData {
  const headerDefaults = galleryMosaicDefaults.header ?? {
    title: "",
    description: "",
  };
  const interactionDefaults = galleryMosaicDefaults.interaction ?? {
    mode: "none",
    zoom: "fit",
  };
  const styleDefaults = galleryMosaicDefaults.style ?? {
    ratio: "4:3",
    gap: "md",
    radius: "lg",
    overlay: "rgba(15, 23, 42, 0.35)",
    captionPosition: "inside",
    layoutDensity: "auto",
    motionPreset: "none",
  };
  const hasStyleObject = data.style !== undefined;

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    items: normalizeGalleryMosaicItems(data.items),
    interaction: {
      mode: resolveGalleryMosaicInteractionMode(data.interaction?.mode ?? interactionDefaults.mode),
      zoom: resolveGalleryMosaicLightboxZoom(data.interaction?.zoom ?? interactionDefaults.zoom),
    },
    style: {
      ratio: resolveGalleryMosaicRatio(data.style?.ratio),
      gap: resolveGalleryMosaicGap(data.style?.gap),
      radius: resolveGalleryMosaicRadius(data.style?.radius),
      overlay: hasStyleObject
        ? resolveClearableStyleValue(data.style?.overlay)
        : styleDefaults.overlay,
      captionPosition: resolveGalleryMosaicCaptionPosition(data.style?.captionPosition),
      layoutDensity: resolveGalleryMosaicLayoutDensity(data.style?.layoutDensity),
      motionPreset: resolveGalleryMosaicMotionPreset(data.style?.motionPreset),
    },
  };
}

function isGalleryMosaicPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildGalleryMosaicImportPath(parent: string, key: string | number) {
  if (typeof key === "number") {
    return `${parent}[${key}]`;
  }
  return parent ? `${parent}.${key}` : key;
}

function createGalleryMosaicImportError(
  code: GalleryMosaicImportErrorCode,
  path?: string
): GalleryMosaicImportResult {
  return { ok: false, code, path };
}

function validateGalleryMosaicKnownKeys(
  value: Record<string, unknown>,
  allowedKeys: Set<string>,
  parentPath = ""
): GalleryMosaicImportResult | null {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      return createGalleryMosaicImportError(
        "gallery_mosaic_import_unknown_field",
        buildGalleryMosaicImportPath(parentPath, key)
      );
    }
  }
  return null;
}

function validateGalleryMosaicOptionalString(
  value: unknown,
  path: string
): GalleryMosaicImportResult | null {
  if (value === undefined || typeof value === "string") return null;
  return createGalleryMosaicImportError("gallery_mosaic_import_invalid_value", path);
}

function validateGalleryMosaicEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  path: string
): GalleryMosaicImportResult | null {
  if (value === undefined) return null;
  if (typeof value === "string" && allowedValues.includes(value as T)) return null;
  return createGalleryMosaicImportError("gallery_mosaic_import_invalid_value", path);
}

function validateGalleryMosaicImportPayload(value: unknown): GalleryMosaicImportResult | null {
  if (!isGalleryMosaicPlainObject(value)) {
    return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload");
  }

  const rootKeyError = validateGalleryMosaicKnownKeys(value, galleryMosaicTopLevelKeys);
  if (rootKeyError) return rootKeyError;

  if (!Array.isArray(value.items)) {
    return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload", "items");
  }
  if (value.items.length < galleryMosaicItemMin || value.items.length > galleryMosaicItemMax) {
    return createGalleryMosaicImportError("gallery_mosaic_import_invalid_value", "items");
  }

  if (value.header !== undefined) {
    if (!isGalleryMosaicPlainObject(value.header)) {
      return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload", "header");
    }
    const headerKeyError = validateGalleryMosaicKnownKeys(
      value.header,
      galleryMosaicHeaderKeys,
      "header"
    );
    if (headerKeyError) return headerKeyError;
    const titleError = validateGalleryMosaicOptionalString(value.header.title, "header.title");
    if (titleError) return titleError;
    const descriptionError = validateGalleryMosaicOptionalString(
      value.header.description,
      "header.description"
    );
    if (descriptionError) return descriptionError;
  }

  for (let index = 0; index < value.items.length; index += 1) {
    const item = value.items[index];
    const itemPath = buildGalleryMosaicImportPath("items", index);
    if (!isGalleryMosaicPlainObject(item)) {
      return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload", itemPath);
    }
    const itemKeyError = validateGalleryMosaicKnownKeys(item, galleryMosaicItemKeys, itemPath);
    if (itemKeyError) return itemKeyError;
    const stringKeys = ["id", "image", "video", "alt", "poster", "caption", "href"] as const;
    for (const key of stringKeys) {
      const fieldError = validateGalleryMosaicOptionalString(
        item[key],
        buildGalleryMosaicImportPath(itemPath, key)
      );
      if (fieldError) return fieldError;
    }
    const objectPositionError = validateGalleryMosaicEnum(
      item.objectPosition,
      ["center", "top", "bottom", "left", "right"] as const,
      buildGalleryMosaicImportPath(itemPath, "objectPosition")
    );
    if (objectPositionError) return objectPositionError;
    const ratioError = validateGalleryMosaicEnum(
      item.ratio,
      ["inherit", "1:1", "4:3", "16:9", "3:4"] as const,
      buildGalleryMosaicImportPath(itemPath, "ratio")
    );
    if (ratioError) return ratioError;
  }

  if (value.interaction !== undefined) {
    if (!isGalleryMosaicPlainObject(value.interaction)) {
      return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload", "interaction");
    }
    const interactionKeyError = validateGalleryMosaicKnownKeys(
      value.interaction,
      galleryMosaicInteractionKeys,
      "interaction"
    );
    if (interactionKeyError) return interactionKeyError;
    const modeError = validateGalleryMosaicEnum(
      value.interaction.mode,
      ["none", "lightbox"] as const,
      "interaction.mode"
    );
    if (modeError) return modeError;
    const zoomError = validateGalleryMosaicEnum(
      value.interaction.zoom,
      ["fit", "fill"] as const,
      "interaction.zoom"
    );
    if (zoomError) return zoomError;
  }

  if (value.style !== undefined) {
    if (!isGalleryMosaicPlainObject(value.style)) {
      return createGalleryMosaicImportError("gallery_mosaic_import_invalid_payload", "style");
    }
    const styleKeyError = validateGalleryMosaicKnownKeys(
      value.style,
      galleryMosaicStyleKeys,
      "style"
    );
    if (styleKeyError) return styleKeyError;
    const ratioError = validateGalleryMosaicEnum(
      value.style.ratio,
      ["1:1", "4:3", "16:9", "3:4"] as const,
      "style.ratio"
    );
    if (ratioError) return ratioError;
    const gapError = validateGalleryMosaicEnum(
      value.style.gap,
      ["none", "sm", "md", "lg"] as const,
      "style.gap"
    );
    if (gapError) return gapError;
    const radiusError = validateGalleryMosaicEnum(
      value.style.radius,
      ["none", "md", "lg", "xl"] as const,
      "style.radius"
    );
    if (radiusError) return radiusError;
    const overlayError = validateGalleryMosaicOptionalString(value.style.overlay, "style.overlay");
    if (overlayError) return overlayError;
    const captionError = validateGalleryMosaicEnum(
      value.style.captionPosition,
      ["inside", "below", "hover"] as const,
      "style.captionPosition"
    );
    if (captionError) return captionError;
    const densityError = validateGalleryMosaicEnum(
      value.style.layoutDensity,
      ["auto", "compact", "balanced", "dense"] as const,
      "style.layoutDensity"
    );
    if (densityError) return densityError;
    const motionError = validateGalleryMosaicEnum(
      value.style.motionPreset,
      ["none", "fade", "slide-up"] as const,
      "style.motionPreset"
    );
    if (motionError) return motionError;
  }

  return null;
}

export function exportGalleryMosaicConfig(data: GalleryMosaicData): string {
  return JSON.stringify(normalizeGalleryMosaicData(data), null, 2);
}

export function importGalleryMosaicConfig(source: string): GalleryMosaicImportResult {
  try {
    const parsed = JSON.parse(source) as unknown;
    const validationError = validateGalleryMosaicImportPayload(parsed);
    if (validationError) {
      return validationError;
    }
    return {
      ok: true,
      data: normalizeGalleryMosaicData(parsed as GalleryMosaicData),
    };
  } catch {
    return createGalleryMosaicImportError("gallery_mosaic_import_invalid_json");
  }
}

function renderCaption({
  item,
  index,
  captionPosition,
  overlay,
}: {
  item: GalleryMosaicItem;
  index: number;
  captionPosition: GalleryMosaicCaptionPosition;
  overlay: string | undefined;
}) {
  const captionText = (item.caption ?? "").trim();
  if (!captionText) return null;

  if (captionPosition === "below") {
    return (
      <figcaption className="mt-2 text-xs font-medium text-[var(--color-text)]/80">
        {captionText}
      </figcaption>
    );
  }

  return (
    <figcaption
      className={joinClasses(
        "pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-xs font-medium text-white",
        captionPosition === "hover"
          ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
          : undefined
      )}
      style={overlay ? { background: overlay } : undefined}
      data-gallery-caption-inside={String(index + 1)}
    >
      {captionText}
    </figcaption>
  );
}

function resolveGalleryMosaicAltText(item: GalleryMosaicItem, index: number) {
  const explicitAlt = item.alt?.trim();
  if (explicitAlt) return explicitAlt;
  const caption = item.caption?.trim();
  return caption || `Gallery item ${index + 1}`;
}

function hasGalleryMosaicMedia(item: GalleryMosaicItem) {
  return Boolean(item.video?.trim() || item.image?.trim());
}

function resolveGalleryMosaicInteractionType(
  item: GalleryMosaicItem,
  interactionMode: GalleryMosaicInteractionMode
) {
  if (item.href?.trim()) return "link" as const;
  if (interactionMode === "lightbox" && hasGalleryMosaicMedia(item)) return "lightbox" as const;
  return "none" as const;
}

function resolveGalleryMosaicLightboxTitle(item: GalleryMosaicItem, index: number) {
  const caption = item.caption?.trim();
  if (caption) return caption;
  return resolveGalleryMosaicAltText(item, index);
}

const galleryMosaicLightboxRuntimeScript = `
(() => {
  if (typeof document === "undefined") return;

  const lastTriggerByRoot = new WeakMap();

  const setDialogState = (root, dialog, isOpen) => {
    if (!(dialog instanceof HTMLElement)) return;
    if (isOpen) {
      dialog.removeAttribute("hidden");
      dialog.setAttribute("data-state", "active");
      dialog.setAttribute("aria-hidden", "false");
      root.setAttribute("data-gallery-lightbox-open", "true");
    } else {
      dialog.setAttribute("hidden", "");
      dialog.setAttribute("data-state", "inactive");
      dialog.setAttribute("aria-hidden", "true");
      const stillOpen = root.querySelector("[data-gallery-lightbox-dialog]:not([hidden])");
      root.setAttribute("data-gallery-lightbox-open", stillOpen ? "true" : "false");
    }
  };

  const closeDialog = (root, dialog, options = {}) => {
    if (!(root instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return;
    setDialogState(root, dialog, false);
    if (options.focusReturn === false) return;
    const lastTrigger = lastTriggerByRoot.get(root);
    if (lastTrigger instanceof HTMLElement) {
      lastTrigger.focus();
    }
  };

  const openDialog = (root, trigger, dialog) => {
    if (!(root instanceof HTMLElement) || !(trigger instanceof HTMLElement) || !(dialog instanceof HTMLElement)) {
      return;
    }
    root.querySelectorAll("[data-gallery-lightbox-dialog]").forEach((candidate) => {
      if (candidate instanceof HTMLElement && candidate !== dialog) {
        closeDialog(root, candidate, { focusReturn: false });
      }
    });
    lastTriggerByRoot.set(root, trigger);
    setDialogState(root, dialog, true);
    const closeButton = dialog.querySelector("[data-gallery-lightbox-close]");
    if (closeButton instanceof HTMLElement) {
      closeButton.focus();
      return;
    }
    dialog.focus();
  };

  const handleClick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const root = target.closest("[data-gallery-lightbox-root='1']");
    if (!(root instanceof HTMLElement)) return;

    const trigger = target.closest("[data-gallery-lightbox-trigger]");
    if (trigger instanceof HTMLElement) {
      const dialogId = trigger.getAttribute("aria-controls");
      const dialog = dialogId ? document.getElementById(dialogId) : null;
      if (dialog instanceof HTMLElement) {
        openDialog(root, trigger, dialog);
      }
      return;
    }

    const closeButton = target.closest("[data-gallery-lightbox-close]");
    if (closeButton instanceof HTMLElement) {
      const dialog = closeButton.closest("[data-gallery-lightbox-dialog]");
      if (dialog instanceof HTMLElement) {
        closeDialog(root, dialog);
      }
      return;
    }

    const backdrop = target.closest("[data-gallery-lightbox-backdrop]");
    if (backdrop instanceof HTMLElement) {
      const dialog = backdrop.closest("[data-gallery-lightbox-dialog]");
      if (dialog instanceof HTMLElement) {
        closeDialog(root, dialog);
      }
    }
  };

  const handleKeydown = (event) => {
    if (event.key !== "Escape") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const root = target.closest("[data-gallery-lightbox-root='1']");
    if (!(root instanceof HTMLElement)) return;
    const dialog = root.querySelector("[data-gallery-lightbox-dialog]:not([hidden])");
    if (!(dialog instanceof HTMLElement)) return;
    event.preventDefault();
    closeDialog(root, dialog);
  };

  document.querySelectorAll("[data-gallery-lightbox-root='1']").forEach((root) => {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.galleryLightboxBound === "true") return;
    root.dataset.galleryLightboxBound = "true";
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    root.setAttribute("data-gallery-lightbox-open", "false");
    root.querySelectorAll("[data-gallery-lightbox-dialog]").forEach((dialog) => {
      if (dialog instanceof HTMLElement) {
        setDialogState(root, dialog, false);
      }
    });
  });
})();
`;

export function getGalleryMosaicLightboxRuntimeScript() {
  return galleryMosaicLightboxRuntimeScript;
}

function GalleryCard({
  item,
  index,
  ratio,
  radius,
  captionPosition,
  overlay,
  interactionMode,
  lightboxZoom,
  motionPreset,
  rootInstanceId,
}: {
  item: GalleryMosaicItem;
  index: number;
  ratio: GalleryMosaicRatio;
  radius: GalleryMosaicRadius;
  captionPosition: GalleryMosaicCaptionPosition;
  overlay: string | undefined;
  interactionMode: GalleryMosaicInteractionMode;
  lightboxZoom: GalleryMosaicLightboxZoom;
  motionPreset: GalleryMosaicMotionPreset;
  rootInstanceId: string;
}) {
  const hasVideo = typeof item.video === "string" && item.video.trim().length > 0;
  const hasImage = !hasVideo && typeof item.image === "string" && item.image.trim().length > 0;
  const linkAttrs = resolveWidgetLinkAttrs(item.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  const accessibleCaption = resolveGalleryMosaicAltText(item, index);
  const interactionType = resolveGalleryMosaicInteractionType(item, interactionMode);
  const resolvedRatio =
    item.ratio && item.ratio !== "inherit" ? resolveGalleryMosaicRatio(item.ratio) : ratio;
  const objectPosition =
    objectPositionStyleMap[resolveGalleryMosaicObjectPosition(item.objectPosition)];
  const lightboxTitle = resolveGalleryMosaicLightboxTitle(item, index);
  const lightboxDialogId = scopedId(rootInstanceId, `lightbox-${item.id ?? index + 1}`);
  const lightboxTitleId = scopedId(rootInstanceId, `lightbox-title-${item.id ?? index + 1}`);
  const lightboxDescriptionId = scopedId(
    rootInstanceId,
    `lightbox-description-${item.id ?? index + 1}`
  );
  const lightboxMediaClassName =
    lightboxZoom === "fill"
      ? "h-[min(80vh,42rem)] w-full object-cover"
      : "max-h-[80vh] w-full object-contain";

  const media = hasVideo ? (
    <video
      src={item.video}
      poster={item.poster}
      title={accessibleCaption}
      aria-label={accessibleCaption}
      className="h-full w-full object-cover"
      style={{ objectPosition }}
      controls
      playsInline
      muted
      loop
      autoPlay
    />
  ) : hasImage ? (
    <img
      src={item.image}
      alt={accessibleCaption}
      className="h-full w-full object-cover"
      style={{ objectPosition }}
      loading="lazy"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)]/65">
      {item.caption ?? `Media ${index + 1}`}
    </div>
  );

  const frame = (
    <figure
      className={joinClasses(
        "group relative w-full overflow-hidden border border-[var(--color-border)]/70 bg-[var(--color-bg)]",
        ratioClassMap[resolvedRatio],
        radiusClassMap[radius],
        motionPresetClassMap[motionPreset]
      )}
      tabIndex={captionPosition === "hover" && interactionType === "none" ? 0 : undefined}
      aria-label={
        captionPosition === "hover" && interactionType === "none" ? accessibleCaption : undefined
      }
      data-gallery-item={String(index + 1)}
      data-gallery-media-type={hasVideo ? "video" : hasImage ? "image" : "placeholder"}
      data-gallery-item-interaction={interactionType}
      data-gallery-item-motion={motionPreset}
    >
      {media}
      {renderCaption({ item, index, captionPosition, overlay })}
    </figure>
  );

  if (interactionType === "link" && linkAttrs) {
    return (
      <a {...linkAttrs} aria-label={accessibleCaption} className="group block">
        {frame}
      </a>
    );
  }

  if (interactionType === "lightbox") {
    const lightboxMedia = hasVideo ? (
      <video
        src={item.video}
        poster={item.poster}
        title={accessibleCaption}
        aria-label={accessibleCaption}
        className={lightboxMediaClassName}
        style={{ objectPosition }}
        controls
        playsInline
        muted
        loop
        autoPlay
      />
    ) : hasImage ? (
      <img
        src={item.image}
        alt={accessibleCaption}
        className={lightboxMediaClassName}
        style={{ objectPosition }}
        loading="lazy"
      />
    ) : null;

    return (
      <>
        <button
          type="button"
          className="group block w-full cursor-zoom-in bg-transparent p-0 text-left"
          data-gallery-lightbox-trigger={lightboxDialogId}
          aria-haspopup="dialog"
          aria-controls={lightboxDialogId}
          aria-label={`Open ${lightboxTitle}`}
        >
          {frame}
        </button>
        <div
          id={lightboxDialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          aria-describedby={lightboxDescriptionId}
          tabIndex={-1}
          hidden
          data-gallery-lightbox-dialog
          data-gallery-lightbox-dialog-id={lightboxDialogId}
          data-gallery-lightbox-zoom={lightboxZoom}
          data-gallery-media-type={hasVideo ? "video" : hasImage ? "image" : "placeholder"}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/80" data-gallery-lightbox-backdrop />
          <div className="relative z-10 flex w-full max-w-5xl flex-col gap-4 rounded-2xl bg-[var(--color-bg)] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p
                  id={lightboxTitleId}
                  className="truncate text-sm font-semibold text-[var(--color-text)]"
                >
                  {lightboxTitle}
                </p>
                <p id={lightboxDescriptionId} className="text-xs text-[var(--color-text)]/70">
                  {lightboxZoom === "fill"
                    ? "Fill zoom crops the media inside the dialog frame."
                    : "Fit zoom keeps the full media visible inside the dialog."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--color-text)]"
                data-gallery-lightbox-close
                aria-label={`Close ${lightboxTitle}`}
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black/90 p-2">{lightboxMedia}</div>
          </div>
        </div>
      </>
    );
  }

  return frame;
}

export function GalleryMosaicBlock({
  data,
  variant,
  blockId,
}: {
  data: GalleryMosaicData;
  variant: string;
  blockId?: string;
}) {
  const resolvedVariant = resolveGalleryMosaicVariant(variant);
  const normalized = normalizeGalleryMosaicData(data);
  const interaction = normalized.interaction ?? galleryMosaicDefaults.interaction!;
  const style = normalized.style ?? galleryMosaicDefaults.style!;

  const ratio = resolveGalleryMosaicRatio(style.ratio);
  const gap = resolveGalleryMosaicGap(style.gap);
  const radius = resolveGalleryMosaicRadius(style.radius);
  const captionPosition = resolveGalleryMosaicCaptionPosition(style.captionPosition);
  const overlay = resolveClearableStyleValue(style.overlay);
  const items = normalizeGalleryMosaicItems(normalized.items);
  const interactionMode = resolveGalleryMosaicInteractionMode(interaction.mode);
  const lightboxZoom = resolveGalleryMosaicLightboxZoom(interaction.zoom);
  const layoutDensity = resolveGalleryMosaicLayoutDensity(style.layoutDensity);
  const motionPreset = resolveGalleryMosaicMotionPreset(style.motionPreset);
  const rootInstanceId = createWidgetInstanceId(
    "gallery-mosaic",
    blockId,
    items[0]?.id ?? resolvedVariant
  );
  const lightboxItemCount = items.filter(
    (item) => resolveGalleryMosaicInteractionType(item, interactionMode) === "lightbox"
  ).length;
  const hasLightboxDialogs = lightboxItemCount > 0;

  const showHeader =
    (normalized.header?.title ?? "").trim().length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  if (resolvedVariant === "feature-left") {
    const [lead, ...rest] = items;
    const hasSupportingItems = rest.length > 0;
    return (
      <section
        className="mx-auto w-full max-w-6xl px-4 py-8"
        data-gallery-mosaic-variant={resolvedVariant}
        data-gallery-mosaic-gap={gap}
        data-gallery-mosaic-ratio={ratio}
        data-gallery-mosaic-count={String(items.length)}
        data-gallery-mosaic-caption-position={captionPosition}
        data-gallery-mosaic-interaction={interactionMode}
        data-gallery-mosaic-zoom={lightboxZoom}
        data-gallery-mosaic-layout-density={layoutDensity}
        data-gallery-mosaic-motion={motionPreset}
        data-gallery-lightbox-root={hasLightboxDialogs ? "1" : undefined}
        data-gallery-lightbox-count={hasLightboxDialogs ? String(lightboxItemCount) : undefined}
      >
        {showHeader ? (
          <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
            {(normalized.header?.title ?? "").trim().length > 0 ? (
              <h3 className="text-2xl font-semibold text-[var(--color-text)]">
                {normalized.header?.title}
              </h3>
            ) : null}
            {(normalized.header?.description ?? "").trim().length > 0 ? (
              <p className="text-sm text-[var(--color-text)]/75">
                {normalized.header?.description}
              </p>
            ) : null}
          </header>
        ) : null}

        <div
          className={joinClasses(
            "grid grid-cols-1",
            hasSupportingItems ? featureLeftLayoutDensityMap[layoutDensity].container : undefined,
            gapClassMap[gap]
          )}
        >
          <div
            className={
              hasSupportingItems ? featureLeftLayoutDensityMap[layoutDensity].lead : undefined
            }
          >
            <GalleryCard
              item={lead ?? {}}
              index={0}
              ratio={ratio}
              radius={radius}
              captionPosition={captionPosition}
              overlay={overlay}
              interactionMode={interactionMode}
              lightboxZoom={lightboxZoom}
              motionPreset={motionPreset}
              rootInstanceId={rootInstanceId}
            />
          </div>
          {hasSupportingItems ? (
            <div
              className={joinClasses(
                featureLeftLayoutDensityMap[layoutDensity].support,
                gapClassMap[gap]
              )}
            >
              {rest.map((item, index) => (
                <GalleryCard
                  key={item.id ?? `gallery-side-${index + 2}`}
                  item={item}
                  index={index + 1}
                  ratio={ratio}
                  radius={radius}
                  captionPosition={captionPosition}
                  overlay={overlay}
                  interactionMode={interactionMode}
                  lightboxZoom={lightboxZoom}
                  motionPreset={motionPreset}
                  rootInstanceId={rootInstanceId}
                />
              ))}
            </div>
          ) : null}
        </div>
        {hasLightboxDialogs ? (
          <script dangerouslySetInnerHTML={{ __html: getGalleryMosaicLightboxRuntimeScript() }} />
        ) : null}
      </section>
    );
  }

  const gridClassName = joinClasses(
    layoutDensityGridClassMap[resolvedVariant === "uniform-grid" ? "uniform-grid" : "mosaic"][
      layoutDensity
    ],
    gapClassMap[gap]
  );

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-gallery-mosaic-variant={resolvedVariant}
      data-gallery-mosaic-gap={gap}
      data-gallery-mosaic-ratio={ratio}
      data-gallery-mosaic-count={String(items.length)}
      data-gallery-mosaic-caption-position={captionPosition}
      data-gallery-mosaic-interaction={interactionMode}
      data-gallery-mosaic-zoom={lightboxZoom}
      data-gallery-mosaic-layout-density={layoutDensity}
      data-gallery-mosaic-motion={motionPreset}
      data-gallery-lightbox-root={hasLightboxDialogs ? "1" : undefined}
      data-gallery-lightbox-count={hasLightboxDialogs ? String(lightboxItemCount) : undefined}
    >
      {showHeader ? (
        <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center">
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

      <div className={gridClassName}>
        {items.map((item, index) => (
          <div
            key={item.id ?? `gallery-item-${index + 1}`}
            className={joinClasses(
              resolvedVariant === "mosaic" && index === 0
                ? "lg:col-span-2 lg:row-span-2"
                : undefined
            )}
          >
            <GalleryCard
              item={item}
              index={index}
              ratio={ratio}
              radius={radius}
              captionPosition={captionPosition}
              overlay={overlay}
              interactionMode={interactionMode}
              lightboxZoom={lightboxZoom}
              motionPreset={motionPreset}
              rootInstanceId={rootInstanceId}
            />
          </div>
        ))}
      </div>
      {hasLightboxDialogs ? (
        <script dangerouslySetInnerHTML={{ __html: getGalleryMosaicLightboxRuntimeScript() }} />
      ) : null}
    </section>
  );
}

export function createGalleryMosaicWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<GalleryMosaicData>>;
  visual: ComponentType<WidgetEditorProps<GalleryMosaicData>>;
  advanced: ComponentType<WidgetEditorProps<GalleryMosaicData>>;
}): WidgetDefinition<GalleryMosaicData> {
  return {
    type: "gallery-mosaic",
    title: "Gallery Mosaic",
    description: "Media gallery layouts for visual storytelling sections.",
    category: "content",
    variants: [
      {
        id: "mosaic",
        label: "Mosaic",
        description: "Asymmetric layout with emphasized lead tile.",
      },
      {
        id: "uniform-grid",
        label: "Uniform Grid",
        description: "Consistent grid tiles across all items.",
      },
      {
        id: "feature-left",
        label: "Feature Left",
        description: "Lead media tile left with supporting column.",
      },
    ],
    schema: galleryMosaicSchema,
    defaults: galleryMosaicDefaults,
    editor: editors,
    editorContract: galleryMosaicEditorContract,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: GalleryMosaicBlock,
  };
}
