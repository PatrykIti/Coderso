import type { CSSProperties, ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorProps } from "../types";

export type TestimonialsVariantId = "grid" | "spotlight" | "slider-static";
export type TestimonialsSpacing = "none" | "sm" | "md" | "lg";

export type TestimonialItem = {
  id?: string;
  quote?: string;
  author?: string;
  role?: string;
  avatar?: string;
  rating?: number;
  sourceLabel?: string;
};

export type TestimonialsData = {
  header?: {
    eyebrow?: string;
    title?: string;
    description?: string;
  };
  testimonials: TestimonialItem[];
  style?: {
    cardSurface?: string;
    cardBorder?: string;
    textColor?: string;
    accentColor?: string;
    spacing?: TestimonialsSpacing;
  };
};

const joinClasses = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const testimonialsVariantCountMap: Record<TestimonialsVariantId, number> = {
  grid: 3,
  spotlight: 2,
  "slider-static": 3,
};

const spacingClassMap: Record<TestimonialsSpacing, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const testimonialsItemMin = 2;
export const testimonialsItemMax = 8;

export const testimonialsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["testimonials"],
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
    testimonials: {
      type: "array",
      minItems: testimonialsItemMin,
      maxItems: testimonialsItemMax,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          quote: { type: "string" },
          author: { type: "string" },
          role: { type: "string" },
          avatar: { type: "string" },
          rating: { type: "integer", minimum: 0, maximum: 5 },
          sourceLabel: { type: "string" },
        },
      },
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        cardSurface: { type: "string" },
        cardBorder: { type: "string" },
        textColor: { type: "string" },
        accentColor: { type: "string" },
        spacing: { enum: ["none", "sm", "md", "lg"] },
      },
    },
  },
};

export const testimonialsDefaults: TestimonialsData = {
  header: {
    eyebrow: "Customer stories",
    title: "Trusted by teams that ship fast",
    description: "Use real customer voices to build trust and reduce hesitation.",
  },
  testimonials: [
    {
      id: "testimonial-1",
      quote: "We launched our marketing site in two days and kept full control over future edits.",
      author: "Anna Kowalska",
      role: "Product Marketing Lead",
      rating: 5,
      sourceLabel: "Acme Studio",
    },
    {
      id: "testimonial-2",
      quote: "The widget workflow made iteration faster without sacrificing consistency.",
      author: "Marek Nowak",
      role: "Growth Manager",
      rating: 5,
      sourceLabel: "North Labs",
    },
    {
      id: "testimonial-3",
      quote: "Editors can now publish conversion-focused sections without developer support.",
      author: "Ewa Zielinska",
      role: "Content Ops",
      rating: 4,
      sourceLabel: "BlueRiver",
    },
  ],
  style: {
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    textColor: "var(--color-text)",
    accentColor: "var(--color-primary)",
    spacing: "md",
  },
};

const createTestimonialId = (index: number) => `testimonial-${index + 1}`;

const resolveString = (value: string | undefined, fallback: string) =>
  typeof value === "string" ? value : fallback;

const resolveOptionalString = (value: string | undefined) =>
  typeof value === "string" ? value : undefined;

const resolveRating = (value: number | undefined, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const rounded = Math.round(value);
  return Math.min(5, Math.max(0, rounded));
};

const resolveTestimonialsSpacing = (value: string | undefined): TestimonialsSpacing => {
  if (value === "none" || value === "sm" || value === "lg") return value;
  return "md";
};

export const resolveTestimonialsVariant = (variant: string): TestimonialsVariantId => {
  if (variant === "spotlight" || variant === "slider-static") return variant;
  return "grid";
};

export const resolveTestimonialsCountForVariant = (variant: TestimonialsVariantId): number =>
  testimonialsVariantCountMap[variant];

export const normalizeTestimonialsCount = (value: number) => {
  if (!Number.isFinite(value)) return resolveTestimonialsCountForVariant("grid");
  return Math.min(testimonialsItemMax, Math.max(testimonialsItemMin, Math.floor(value)));
};

export function normalizeTestimonialsItems(
  items: TestimonialItem[] | undefined,
  desiredCount?: number
): TestimonialItem[] {
  const source = Array.isArray(items) ? items : [];
  const fallbackQuotes = [
    "We launched our marketing site in two days and kept full control over future edits.",
    "The widget workflow made iteration faster without sacrificing consistency.",
    "Editors can now publish conversion-focused sections without developer support.",
    "Templates gave us a clean and predictable process for every campaign.",
  ];
  const fallbackAuthors = ["Customer One", "Customer Two", "Customer Three", "Customer Four"];

  const targetCount =
    typeof desiredCount === "number"
      ? normalizeTestimonialsCount(desiredCount)
      : normalizeTestimonialsCount(
          source.length > 0 ? source.length : resolveTestimonialsCountForVariant("grid")
        );

  const normalized: TestimonialItem[] = [];
  const usedIds = new Set<string>();

  for (let index = 0; index < targetCount; index += 1) {
    const base = source[index] ?? {};

    let id =
      typeof base.id === "string" && base.id.trim().length > 0
        ? base.id.trim()
        : createTestimonialId(index);

    if (usedIds.has(id)) {
      let candidate = index + 1;
      while (usedIds.has(`testimonial-${candidate}`)) {
        candidate += 1;
      }
      id = `testimonial-${candidate}`;
    }
    usedIds.add(id);

    const quote =
      typeof base.quote === "string" && base.quote.trim().length > 0
        ? base.quote.trim()
        : (fallbackQuotes[index] ?? `Customer quote ${index + 1}`);

    const author =
      typeof base.author === "string" && base.author.trim().length > 0
        ? base.author.trim()
        : (fallbackAuthors[index] ?? `Customer ${index + 1}`);

    normalized.push({
      id,
      quote,
      author,
      role: resolveOptionalString(base.role),
      avatar: resolveOptionalString(base.avatar),
      rating: resolveRating(base.rating, 5),
      sourceLabel: resolveOptionalString(base.sourceLabel),
    });
  }

  return normalized;
}

export function normalizeTestimonialsData(data: TestimonialsData): TestimonialsData {
  const headerDefaults = testimonialsDefaults.header ?? {
    eyebrow: "",
    title: "",
    description: "",
  };
  const styleDefaults = testimonialsDefaults.style ?? {
    cardSurface: "var(--color-bg)",
    cardBorder: "var(--color-border)",
    textColor: "var(--color-text)",
    accentColor: "var(--color-primary)",
    spacing: "md",
  };

  return {
    ...data,
    header: {
      eyebrow: resolveString(data.header?.eyebrow, headerDefaults.eyebrow ?? ""),
      title: resolveString(data.header?.title, headerDefaults.title ?? ""),
      description: resolveString(data.header?.description, headerDefaults.description ?? ""),
    },
    testimonials: normalizeTestimonialsItems(data.testimonials),
    style: {
      cardSurface: resolveString(
        data.style?.cardSurface,
        styleDefaults.cardSurface ?? "var(--color-bg)"
      ),
      cardBorder: resolveString(
        data.style?.cardBorder,
        styleDefaults.cardBorder ?? "var(--color-border)"
      ),
      textColor: resolveString(
        data.style?.textColor,
        styleDefaults.textColor ?? "var(--color-text)"
      ),
      accentColor: resolveString(
        data.style?.accentColor,
        styleDefaults.accentColor ?? "var(--color-primary)"
      ),
      spacing: resolveTestimonialsSpacing(data.style?.spacing),
    },
  };
}

function RatingStars({ rating, accentColor }: { rating: number; accentColor: string }) {
  const clampedRating = resolveRating(rating, 0);

  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${clampedRating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < clampedRating;
        return (
          <span
            key={`star-${index + 1}`}
            className="text-sm leading-none"
            style={{
              color: active
                ? accentColor
                : "color-mix(in oklab, var(--color-text) 25%, transparent)",
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

function Avatar({
  author,
  src,
  accentColor,
}: {
  author: string;
  src?: string;
  accentColor: string;
}) {
  if (typeof src === "string" && src.trim().length > 0) {
    return (
      <img
        src={src}
        alt={author}
        className="h-10 w-10 rounded-full border border-[var(--color-border)] object-cover"
      />
    );
  }

  return (
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-sm font-semibold"
      style={{ color: accentColor }}
      aria-hidden="true"
    >
      {author.charAt(0).toUpperCase()}
    </span>
  );
}

export function TestimonialsBlock({ data, variant }: { data: TestimonialsData; variant: string }) {
  const resolvedVariant = resolveTestimonialsVariant(variant);
  const visibleCount = resolveTestimonialsCountForVariant(resolvedVariant);
  const normalizedData = normalizeTestimonialsData(data);
  const style = normalizedData.style ?? testimonialsDefaults.style!;

  const resolvedSpacing = resolveTestimonialsSpacing(style.spacing);
  const items = normalizeTestimonialsItems(normalizedData.testimonials, visibleCount);

  const showHeader =
    (normalizedData.header?.eyebrow ?? "").trim().length > 0 ||
    (normalizedData.header?.title ?? "").trim().length > 0 ||
    (normalizedData.header?.description ?? "").trim().length > 0;

  const sectionStyle: CSSProperties = {
    backgroundColor: "transparent",
  };

  const cardStyle: CSSProperties = {
    backgroundColor: style.cardSurface ?? "var(--color-bg)",
    borderColor: style.cardBorder ?? "var(--color-border)",
    borderStyle: "solid",
    borderWidth: "1px",
    color: style.textColor ?? "var(--color-text)",
  };

  const listClassName =
    resolvedVariant === "slider-static"
      ? joinClasses("flex overflow-x-auto pb-2", spacingClassMap[resolvedSpacing])
      : resolvedVariant === "spotlight"
        ? joinClasses("grid grid-cols-1 lg:grid-cols-2", spacingClassMap[resolvedSpacing])
        : joinClasses(
            "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            spacingClassMap[resolvedSpacing]
          );

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8"
      style={sectionStyle}
      data-testimonials-variant={resolvedVariant}
      data-testimonials-spacing={resolvedSpacing}
      data-testimonials-count={String(items.length)}
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

      <div className={listClassName}>
        {items.map((item, index) => {
          const highlight = resolvedVariant === "spotlight" && index === 0;
          const author = item.author ?? `Customer ${index + 1}`;
          const rating = resolveRating(item.rating, 0);
          const roleText = (item.role ?? "").trim();
          const sourceText = (item.sourceLabel ?? "").trim();

          return (
            <article
              key={item.id ?? `testimonial-${index + 1}`}
              className={joinClasses(
                "flex h-full flex-col gap-4 rounded-xl border p-5",
                resolvedVariant === "slider-static"
                  ? "min-w-[18rem] shrink-0 snap-start"
                  : undefined,
                highlight ? "lg:col-span-2" : undefined
              )}
              style={cardStyle}
              data-testimonial-item={String(index + 1)}
              data-testimonial-rating={String(rating)}
              data-testimonial-highlighted={String(highlight)}
            >
              <RatingStars
                rating={rating}
                accentColor={style.accentColor ?? "var(--color-primary)"}
              />

              <p
                className={joinClasses(
                  "text-sm leading-relaxed",
                  highlight ? "text-base" : undefined
                )}
              >
                "{item.quote ?? ""}"
              </p>

              <div className="mt-auto flex items-center gap-3">
                <Avatar
                  author={author}
                  src={item.avatar}
                  accentColor={style.accentColor ?? "var(--color-primary)"}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">{author}</p>
                  {roleText.length > 0 ? (
                    <p className="text-xs text-[var(--color-text)]/70">{roleText}</p>
                  ) : null}
                  {sourceText.length > 0 ? (
                    <p
                      className="text-xs font-medium"
                      style={{ color: style.accentColor ?? "var(--color-primary)" }}
                    >
                      {sourceText}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function createTestimonialsWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<TestimonialsData>>;
  visual: ComponentType<WidgetEditorProps<TestimonialsData>>;
  advanced: ComponentType<WidgetEditorProps<TestimonialsData>>;
}): WidgetDefinition<TestimonialsData> {
  return {
    type: "testimonials",
    title: "Testimonials",
    description: "Social proof quotes with ratings and author identity.",
    category: "content",
    variants: [
      {
        id: "grid",
        label: "Grid",
        description: "Balanced testimonial card grid.",
      },
      {
        id: "spotlight",
        label: "Spotlight",
        description: "Highlights one primary testimonial and supporting quote.",
      },
      {
        id: "slider-static",
        label: "Slider Static",
        description: "Horizontal card strip prepared for slider-like layout.",
      },
    ],
    schema: testimonialsSchema,
    defaults: testimonialsDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    render: TestimonialsBlock,
  };
}
