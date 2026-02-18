import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { listingTemplates } from "../../db/schema";

export type ListingLayout = "grid" | "list" | "table" | "calendar" | "map";
export type ListingFieldFormat = "text" | "date" | "badge" | "currency";
export type ListingActionKind = "view" | "edit" | "custom";
export type ListingGapScale = "xs" | "sm" | "md" | "lg" | "xl";
export type ListingCardVariant = "default" | "compact" | "minimal";

export type ListingTemplateFieldBinding = {
  key: string;
  source: string;
  label: string | null;
  fallback: string | null;
  format: ListingFieldFormat;
};

export type ListingTemplateItemAction = {
  id: string;
  label: string;
  kind: ListingActionKind;
  href: string | null;
  opensInNewTab: boolean;
};

export type ListingTemplateEmptyState = {
  title: string;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

export type ListingTemplateStyle = {
  columns: number;
  gap: ListingGapScale;
  cardVariant: ListingCardVariant;
};

export type ListingTemplateConfig = {
  fields: ListingTemplateFieldBinding[];
  itemActions: ListingTemplateItemAction[];
  emptyState: ListingTemplateEmptyState;
  style: ListingTemplateStyle;
};

export type ListingTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  layout: ListingLayout;
  config: ListingTemplateConfig;
  createdAt: Date;
  updatedAt: Date;
};

export type ListingTemplateCreateInput = {
  name: string;
  slug?: string | null;
  description?: string | null;
  layout?: ListingLayout;
  config?: unknown;
};

export type ListingTemplateUpdateInput = {
  name?: string;
  slug?: string | null;
  description?: string | null;
  layout?: ListingLayout;
  config?: unknown;
};

const listingLayouts = new Set<ListingLayout>([
  "grid",
  "list",
  "table",
  "calendar",
  "map",
]);
const fieldFormats = new Set<ListingFieldFormat>([
  "text",
  "date",
  "badge",
  "currency",
]);
const actionKinds = new Set<ListingActionKind>(["view", "edit", "custom"]);
const gapScale = new Set<ListingGapScale>(["xs", "sm", "md", "lg", "xl"]);
const cardVariants = new Set<ListingCardVariant>(["default", "compact", "minimal"]);
const unsafePathSegments = new Set(["__proto__", "prototype", "constructor"]);

const defaultConfig = (): ListingTemplateConfig => ({
  fields: [],
  itemActions: [],
  emptyState: {
    title: "No items found",
    description: null,
    ctaLabel: null,
    ctaHref: null,
  },
  style: {
    columns: 3,
    gap: "md",
    cardVariant: "default",
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNullableText = (value: unknown) => normalizeText(value) ?? null;

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizeFieldPath = (value: unknown) => {
  const text = normalizeText(value);
  if (!text || !/^[a-zA-Z0-9_.-]+$/.test(text)) {
    throw new Error("listing_template_config_invalid");
  }
  const segments = text.split(".");
  if (segments.some((segment) => segment.length === 0 || unsafePathSegments.has(segment))) {
    throw new Error("listing_template_config_invalid");
  }
  return text;
};

const normalizeHref = (value: unknown) => {
  const href = normalizeText(value);
  if (!href) return null;
  if (href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  throw new Error("listing_template_config_invalid");
};

const normalizeFields = (value: unknown) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 40) {
    throw new Error("listing_template_config_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("listing_template_config_invalid");
    const key = normalizeText(item.key) ?? `field_${index + 1}`;
    const source = normalizeFieldPath(item.source);
    const formatRaw = normalizeText(item.format) ?? "text";
    if (!fieldFormats.has(formatRaw as ListingFieldFormat)) {
      throw new Error("listing_template_config_invalid");
    }
    return {
      key,
      source,
      label: normalizeNullableText(item.label),
      fallback: normalizeNullableText(item.fallback),
      format: formatRaw as ListingFieldFormat,
    };
  });

  const keys = new Set<string>();
  normalized.forEach((field) => {
    if (keys.has(field.key)) {
      throw new Error("listing_template_config_invalid");
    }
    keys.add(field.key);
  });

  return normalized;
};

const normalizeItemActions = (value: unknown) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12) {
    throw new Error("listing_template_config_invalid");
  }

  const normalized = value.map((item, index) => {
    if (!isRecord(item)) throw new Error("listing_template_config_invalid");
    const label = normalizeText(item.label);
    if (!label) throw new Error("listing_template_config_invalid");

    const id = slugify(normalizeText(item.id) ?? label) || `action-${index + 1}`;
    const kindRaw = normalizeText(item.kind) ?? "custom";
    if (!actionKinds.has(kindRaw as ListingActionKind)) {
      throw new Error("listing_template_config_invalid");
    }

    const href = normalizeHref(item.href);
    const kind = kindRaw as ListingActionKind;
    if (kind === "custom" && !href) {
      throw new Error("listing_template_config_invalid");
    }

    return {
      id,
      label,
      kind,
      href,
      opensInNewTab: item.opensInNewTab === true,
    };
  });

  const ids = new Set<string>();
  normalized.forEach((action) => {
    if (ids.has(action.id)) {
      throw new Error("listing_template_config_invalid");
    }
    ids.add(action.id);
  });

  return normalized;
};

const normalizeEmptyState = (value: unknown): ListingTemplateEmptyState => {
  const fallback = defaultConfig().emptyState;
  if (value === undefined || value === null) return fallback;
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  const title = normalizeText(value.title) ?? fallback.title;
  const ctaLabel = normalizeNullableText(value.ctaLabel);
  const ctaHref = normalizeHref(value.ctaHref);
  if ((ctaLabel && !ctaHref) || (!ctaLabel && ctaHref)) {
    throw new Error("listing_template_config_invalid");
  }

  return {
    title,
    description: normalizeNullableText(value.description),
    ctaLabel,
    ctaHref,
  };
};

const normalizeStyle = (value: unknown): ListingTemplateStyle => {
  const fallback = defaultConfig().style;
  if (value === undefined || value === null) return fallback;
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  const columnsRaw = value.columns;
  const columns =
    typeof columnsRaw === "number" && Number.isFinite(columnsRaw)
      ? Math.trunc(columnsRaw)
      : fallback.columns;
  if (columns < 1 || columns > 6) {
    throw new Error("listing_template_config_invalid");
  }

  const gapRaw = normalizeText(value.gap) ?? fallback.gap;
  if (!gapScale.has(gapRaw as ListingGapScale)) {
    throw new Error("listing_template_config_invalid");
  }

  const variantRaw = normalizeText(value.cardVariant) ?? fallback.cardVariant;
  if (!cardVariants.has(variantRaw as ListingCardVariant)) {
    throw new Error("listing_template_config_invalid");
  }

  return {
    columns,
    gap: gapRaw as ListingGapScale,
    cardVariant: variantRaw as ListingCardVariant,
  };
};

export function normalizeListingTemplateConfig(value: unknown): ListingTemplateConfig {
  if (value === undefined || value === null) return defaultConfig();
  if (!isRecord(value)) throw new Error("listing_template_config_invalid");

  return {
    fields: normalizeFields(value.fields),
    itemActions: normalizeItemActions(value.itemActions),
    emptyState: normalizeEmptyState(value.emptyState),
    style: normalizeStyle(value.style),
  };
}

const normalizeLayout = (value: unknown) => {
  const layout = normalizeText(value) ?? "grid";
  if (!listingLayouts.has(layout as ListingLayout)) {
    throw new Error("listing_template_layout_invalid");
  }
  return layout as ListingLayout;
};

const normalizeName = (value: unknown) => {
  const name = normalizeText(value);
  if (!name) throw new Error("listing_template_invalid");
  return name;
};

const resolveSlug = (name: string, slug?: string | null) => {
  const candidate = slugify(normalizeText(slug) ?? name);
  if (!candidate) throw new Error("listing_template_slug_required");
  return candidate;
};

const mapRow = (
  row: typeof listingTemplates.$inferSelect
): ListingTemplateRecord => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  layout: normalizeLayout(row.layout),
  config: normalizeListingTemplateConfig(row.config),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const [existing] = await db
    .select({ id: listingTemplates.id })
    .from(listingTemplates)
    .where(
      excludeId
        ? and(eq(listingTemplates.slug, slug), ne(listingTemplates.id, excludeId))
        : eq(listingTemplates.slug, slug)
    );

  if (existing) {
    throw new Error("listing_template_slug_exists");
  }
}

export async function listListingTemplates(): Promise<ListingTemplateRecord[]> {
  const rows = await db
    .select()
    .from(listingTemplates)
    .orderBy(desc(listingTemplates.updatedAt));
  return rows.map(mapRow);
}

export async function getListingTemplate(id: string) {
  const [row] = await db
    .select()
    .from(listingTemplates)
    .where(eq(listingTemplates.id, id));
  if (!row) return null;
  return mapRow(row);
}

export async function createListingTemplate(input: ListingTemplateCreateInput) {
  const name = normalizeName(input.name);
  const slug = resolveSlug(name, input.slug);
  await assertUniqueSlug(slug);

  const [row] = await db
    .insert(listingTemplates)
    .values({
      name,
      slug,
      description: normalizeNullableText(input.description),
      layout: normalizeLayout(input.layout),
      config: normalizeListingTemplateConfig(input.config),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!row) throw new Error("listing_template_invalid");
  return mapRow(row);
}

export async function updateListingTemplate(
  id: string,
  input: ListingTemplateUpdateInput
) {
  const [existing] = await db
    .select()
    .from(listingTemplates)
    .where(eq(listingTemplates.id, id));
  if (!existing) return null;

  const nextName = input.name !== undefined ? normalizeName(input.name) : existing.name;
  const nextSlug =
    input.slug !== undefined
      ? resolveSlug(nextName, input.slug)
      : input.name !== undefined
        ? resolveSlug(nextName, existing.slug)
        : existing.slug;

  if (nextSlug !== existing.slug) {
    await assertUniqueSlug(nextSlug, id);
  }

  const [row] = await db
    .update(listingTemplates)
    .set({
      name: nextName,
      slug: nextSlug,
      description:
        input.description !== undefined
          ? normalizeNullableText(input.description)
          : existing.description,
      layout: input.layout !== undefined ? normalizeLayout(input.layout) : normalizeLayout(existing.layout),
      config:
        input.config !== undefined
          ? normalizeListingTemplateConfig(input.config)
          : normalizeListingTemplateConfig(existing.config),
      updatedAt: new Date(),
    })
    .where(eq(listingTemplates.id, id))
    .returning();

  if (!row) return null;
  return mapRow(row);
}

export async function deleteListingTemplate(id: string) {
  const [row] = await db
    .delete(listingTemplates)
    .where(eq(listingTemplates.id, id))
    .returning();
  if (!row) return null;
  return mapRow(row);
}
