import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type GalleryMosaicVariantId = "mosaic" | "uniform-grid" | "feature-left";
export type GalleryMosaicRatio = "1:1" | "4:3" | "16:9" | "3:4";
export type GalleryMosaicGap = "sm" | "md" | "lg";
export type GalleryMosaicRadius = "none" | "md" | "lg" | "xl";
export type GalleryMosaicCaptionPosition = "inside" | "below" | "hover";

export type GalleryMosaicItem = {
  id?: string;
  image?: string;
  video?: string;
  caption?: string;
  href?: string;
};

export type GalleryMosaicData = {
  header?: {
    title?: string;
    description?: string;
  };
  items: GalleryMosaicItem[];
  style?: {
    ratio?: GalleryMosaicRatio;
    gap?: GalleryMosaicGap;
    radius?: GalleryMosaicRadius;
    overlay?: string;
    captionPosition?: GalleryMosaicCaptionPosition;
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
          caption: { type: "string" },
          href: { type: "string" },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        ratio: { enum: ["1:1", "4:3", "16:9", "3:4"] },
        gap: { enum: ["sm", "md", "lg"] },
        radius: { enum: ["none", "md", "lg", "xl"] },
        overlay: { type: "string" },
        captionPosition: { enum: ["inside", "below", "hover"] },
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
      href: "#",
    },
    {
      id: "gallery-2",
      image: "https://images.unsplash.com/photo-1553877522-43269d4ea984",
      caption: "Team collaboration",
      href: "#",
    },
    {
      id: "gallery-3",
      image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
      caption: "Workflow details",
      href: "#",
    },
    {
      id: "gallery-4",
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692",
      caption: "Delivery process",
      href: "#",
    },
    {
      id: "gallery-5",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      caption: "Platform snapshot",
      href: "#",
    },
  ],
  style: {
    ratio: "4:3",
    gap: "md",
    radius: "lg",
    overlay: "rgba(15, 23, 42, 0.35)",
    captionPosition: "inside",
  },
};

const createGalleryItemId = (index: number) => `gallery-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveGalleryMosaicRatio = (value: string | undefined): GalleryMosaicRatio => {
  if (value === "1:1" || value === "16:9" || value === "3:4") return value;
  return "4:3";
};

const resolveGalleryMosaicGap = (value: string | undefined): GalleryMosaicGap => {
  if (value === "sm" || value === "lg") return value;
  return "md";
};

const resolveGalleryMosaicRadius = (
  value: string | undefined
): GalleryMosaicRadius => {
  if (value === "none" || value === "md" || value === "xl") return value;
  return "lg";
};

const resolveGalleryMosaicCaptionPosition = (
  value: string | undefined
): GalleryMosaicCaptionPosition => {
  if (value === "below" || value === "hover") return value;
  return "inside";
};

export const resolveGalleryMosaicVariant = (
  variant: string
): GalleryMosaicVariantId => {
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
      caption:
        typeof base.caption === "string" && base.caption.trim().length > 0
          ? base.caption.trim()
          : fallbackCaptions[index] ?? `Media ${index + 1}`,
      href: resolveOptionalString(base.href),
    });
  }

  return normalized;
}

export function normalizeGalleryMosaicData(data: GalleryMosaicData): GalleryMosaicData {
  const headerDefaults = galleryMosaicDefaults.header ?? {
    title: "",
    description: "",
  };
  const styleDefaults = galleryMosaicDefaults.style ?? {
    ratio: "4:3",
    gap: "md",
    radius: "lg",
    overlay: "rgba(15, 23, 42, 0.35)",
    captionPosition: "inside",
  };

  return {
    ...data,
    header: {
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(
        data.header?.description,
        headerDefaults.description ?? ""
      ),
    },
    items: normalizeGalleryMosaicItems(data.items),
    style: {
      ratio: resolveGalleryMosaicRatio(data.style?.ratio),
      gap: resolveGalleryMosaicGap(data.style?.gap),
      radius: resolveGalleryMosaicRadius(data.style?.radius),
      overlay: resolveString(
        data.style?.overlay,
        styleDefaults.overlay ?? "rgba(15, 23, 42, 0.35)"
      ),
      captionPosition: resolveGalleryMosaicCaptionPosition(data.style?.captionPosition),
    },
  };
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
  overlay: string;
}) {
  const captionText = (item.caption ?? "").trim();
  if (!captionText) return null;

  if (captionPosition === "below") {
    return (
      <p className="mt-2 text-xs font-medium text-[var(--color-text)]/80">
        {captionText}
      </p>
    );
  }

  return (
    <div
      className={joinClasses(
        "pointer-events-none absolute inset-x-0 bottom-0 px-3 py-2 text-xs font-medium text-white",
        captionPosition === "hover" ? "opacity-0 transition-opacity duration-200 group-hover:opacity-100" : undefined
      )}
      style={{
        background: overlay,
      }}
      data-gallery-caption-inside={String(index + 1)}
    >
      {captionText}
    </div>
  );
}

function GalleryCard({
  item,
  index,
  ratio,
  radius,
  captionPosition,
  overlay,
  featured,
}: {
  item: GalleryMosaicItem;
  index: number;
  ratio: GalleryMosaicRatio;
  radius: GalleryMosaicRadius;
  captionPosition: GalleryMosaicCaptionPosition;
  overlay: string;
  featured?: boolean;
}) {
  const hasVideo = typeof item.video === "string" && item.video.trim().length > 0;
  const hasImage = !hasVideo && typeof item.image === "string" && item.image.trim().length > 0;
  const hasLink = typeof item.href === "string" && item.href.trim().length > 0;

  const media = hasVideo ? (
    <video
      src={item.video}
      className="h-full w-full object-cover"
      playsInline
      muted
      loop
      autoPlay
    />
  ) : hasImage ? (
    <img
      src={item.image}
      alt={item.caption ?? `Gallery item ${index + 1}`}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-text)]/65">
      {item.caption ?? `Media ${index + 1}`}
    </div>
  );

  const frame = (
    <div
      className={joinClasses(
        "group relative w-full overflow-hidden border border-[var(--color-border)]/70 bg-[var(--color-bg)]",
        ratioClassMap[ratio],
        radiusClassMap[radius],
        featured ? "lg:row-span-2" : undefined
      )}
      data-gallery-item={String(index + 1)}
      data-gallery-media-type={hasVideo ? "video" : hasImage ? "image" : "placeholder"}
    >
      {media}
      {renderCaption({ item, index, captionPosition, overlay })}
    </div>
  );

  if (hasLink) {
    return (
      <a href={item.href} className="block">
        {frame}
      </a>
    );
  }

  return frame;
}

export function GalleryMosaicBlock({
  data,
  variant,
}: {
  data: GalleryMosaicData;
  variant: string;
}) {
  const resolvedVariant = resolveGalleryMosaicVariant(variant);
  const normalized = normalizeGalleryMosaicData(data);
  const style = normalized.style ?? galleryMosaicDefaults.style!;

  const ratio = resolveGalleryMosaicRatio(style.ratio);
  const gap = resolveGalleryMosaicGap(style.gap);
  const radius = resolveGalleryMosaicRadius(style.radius);
  const captionPosition = resolveGalleryMosaicCaptionPosition(style.captionPosition);
  const overlay = style.overlay ?? "rgba(15, 23, 42, 0.35)";
  const items = normalizeGalleryMosaicItems(normalized.items);

  const showHeader =
    (normalized.header?.title ?? "").trim().length > 0 ||
    (normalized.header?.description ?? "").trim().length > 0;

  if (resolvedVariant === "feature-left") {
    const [lead, ...rest] = items;
    return (
      <section
        className="mx-auto w-full max-w-6xl px-4 py-8"
        data-gallery-mosaic-variant={resolvedVariant}
        data-gallery-mosaic-gap={gap}
        data-gallery-mosaic-ratio={ratio}
        data-gallery-mosaic-count={String(items.length)}
        data-gallery-mosaic-caption-position={captionPosition}
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

        <div className={joinClasses("grid grid-cols-1 lg:grid-cols-3", gapClassMap[gap])}>
          <div className="lg:col-span-2">
            <GalleryCard
              item={lead ?? {}}
              index={0}
              ratio={ratio}
              radius={radius}
              captionPosition={captionPosition}
              overlay={overlay}
              featured
            />
          </div>
          <div className={joinClasses("flex flex-col", gapClassMap[gap])}>
            {rest.map((item, index) => (
              <GalleryCard
                key={item.id ?? `gallery-side-${index + 2}`}
                item={item}
                index={index + 1}
                ratio={ratio}
                radius={radius}
                captionPosition={captionPosition}
                overlay={overlay}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const gridClassName =
    resolvedVariant === "uniform-grid"
      ? joinClasses("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", gapClassMap[gap])
      : joinClasses("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", gapClassMap[gap]);

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      data-gallery-mosaic-variant={resolvedVariant}
      data-gallery-mosaic-gap={gap}
      data-gallery-mosaic-ratio={ratio}
      data-gallery-mosaic-count={String(items.length)}
      data-gallery-mosaic-caption-position={captionPosition}
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

      <div className={gridClassName}>
        {items.map((item, index) => (
          <div
            key={item.id ?? `gallery-item-${index + 1}`}
            className={joinClasses(
              resolvedVariant === "mosaic" && index === 0 ? "lg:col-span-2 lg:row-span-2" : undefined
            )}
          >
            <GalleryCard
              item={item}
              index={index}
              ratio={ratio}
              radius={radius}
              captionPosition={captionPosition}
              overlay={overlay}
              featured={resolvedVariant === "mosaic" && index === 0}
            />
          </div>
        ))}
      </div>
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
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: GalleryMosaicBlock,
  };
}
