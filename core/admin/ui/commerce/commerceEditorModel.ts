import type {
  CommerceProductInput,
  CommerceProductRecord,
  CommerceProductStatus,
  CommerceStockState,
  CommerceVariant,
} from "@/services/commerceClient";

export type CommerceProductDraft = {
  title: string;
  slug: string;
  status: CommerceProductStatus;
  excerpt: string;
  description: string;
  pricingAmount: string;
  pricingCurrency: string;
  pricingCompareAtAmount: string;
  stockState: CommerceStockState;
  stockQuantity: string;
  mediaIdsText: string;
  collectionIds: string[];
  variants: CommerceVariant[];
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
};

// TASK-488-01-L01: exported so the variant editor card (L02) reuses the same
// integer parser instead of reinventing a local one. Keeps the original
// floor + reject-negatives semantics (returns number | null) while widening the
// input to `unknown` so callers can pass raw input/event values.
export const parseIntegerOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === "number" ? value : String(value).trim();
  if (normalized === "") return null;
  const parsed = typeof value === "number" ? value : Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  return rounded >= 0 ? rounded : null;
};

const parseStringList = (value: string) =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

export const createEmptyCommerceDraft = (): CommerceProductDraft => ({
  title: "",
  slug: "",
  status: "draft",
  excerpt: "",
  description: "",
  pricingAmount: "0",
  pricingCurrency: "USD",
  pricingCompareAtAmount: "",
  stockState: "in_stock",
  stockQuantity: "",
  mediaIdsText: "",
  collectionIds: [],
  variants: [],
  metadata: {},
  data: {},
});

export const draftFromCommerceProduct = (item: CommerceProductRecord): CommerceProductDraft => ({
  title: item.title,
  slug: item.slug,
  status: item.status,
  excerpt: item.excerpt ?? "",
  description: item.description ?? "",
  pricingAmount: String(item.pricing.amount),
  pricingCurrency: item.pricing.currency || "USD",
  pricingCompareAtAmount:
    item.pricing.compareAtAmount == null ? "" : String(item.pricing.compareAtAmount),
  stockState: item.stock.state,
  stockQuantity: item.stock.quantity == null ? "" : String(item.stock.quantity),
  mediaIdsText: item.mediaIds.join(", "),
  collectionIds: item.collectionIds,
  variants: item.variants ?? [],
  metadata: item.metadata ?? {},
  data: item.data ?? {},
});

export const toCommerceProductInput = (draft: CommerceProductDraft): CommerceProductInput => ({
  title: draft.title.trim(),
  slug: draft.slug.trim() || null,
  status: draft.status,
  excerpt: draft.excerpt.trim() || null,
  description: draft.description.trim() || null,
  pricing: {
    amount: parseIntegerOrNull(draft.pricingAmount) ?? 0,
    currency: draft.pricingCurrency.trim().toUpperCase() || "USD",
    compareAtAmount: parseIntegerOrNull(draft.pricingCompareAtAmount),
  },
  stock: {
    state: draft.stockState,
    quantity: parseIntegerOrNull(draft.stockQuantity),
  },
  mediaIds: parseStringList(draft.mediaIdsText),
  collectionIds: draft.collectionIds,
  variants: serializeDraftVariants(draft.variants),
  metadata: draft.metadata,
  data: draft.data,
});

// ---- TASK-488-01-L01: variant draft model helpers (pure, immutable) ----
// The variant editor card (TASK-488-01-L02) mutates `draft.variants` only
// through these helpers and reports changes via `onChange({ variants })`.

export const createEmptyVariant = (currency: string): CommerceVariant => ({
  sku: null,
  title: "",
  pricing: { amount: 0, currency: currency || "USD", compareAtAmount: null },
  stock: { state: "in_stock", quantity: null },
  attributes: {},
  isDefault: false,
});

export const addVariant = (variants: CommerceVariant[], currency: string) => [
  ...variants,
  createEmptyVariant(currency),
];

export const updateVariantAt = (
  variants: CommerceVariant[],
  index: number,
  patch: Partial<CommerceVariant>
): CommerceVariant[] =>
  variants.map((variant, currentIndex) =>
    currentIndex === index ? { ...variant, ...patch } : variant
  );

export const removeVariantAt = (variants: CommerceVariant[], index: number) =>
  variants.filter((_, currentIndex) => currentIndex !== index);

// Exactly one default: setting one clears the others.
export const setDefaultVariantAt = (variants: CommerceVariant[], index: number) =>
  variants.map((variant, currentIndex) => ({
    ...variant,
    isDefault: currentIndex === index,
  }));

export const setVariantAttribute = (
  variants: CommerceVariant[],
  index: number,
  key: string,
  value: string
) =>
  updateVariantAt(variants, index, {
    attributes: { ...variants[index].attributes, [key]: value },
  });

export const removeVariantAttribute = (variants: CommerceVariant[], index: number, key: string) => {
  const next = { ...variants[index].attributes };
  delete next[key];
  return updateVariantAt(variants, index, { attributes: next });
};

// TASK-575: pure predicate the editor checks BEFORE emitting a rename. A rename
// that collides with an existing (post-trim) key would otherwise silently
// overwrite that attribute's value in the draft. A trim-only rename of the
// same key (`size` -> ` size `) is a no-op success.
export const validateRenameVariantAttributeKey = (
  attrs: Record<string, string>,
  prevKey: string,
  nextKey: string
): { ok: true } | { ok: false; code: "attribute_key_collision" } => {
  const normalized = nextKey.trim();
  if (normalized !== prevKey && normalized in attrs) {
    return { ok: false, code: "attribute_key_collision" };
  }
  return { ok: true };
};

export const renameVariantAttributeKey = (
  variants: CommerceVariant[],
  index: number,
  prevKey: string,
  nextKey: string
) => {
  const attrs = variants[index].attributes;
  if (prevKey === nextKey || !(prevKey in attrs)) return variants;
  // Defense in depth: even if a caller bypasses the editor predicate, never
  // overwrite an existing attribute value. The editor predicate remains the
  // primary mutation gate.
  if (validateRenameVariantAttributeKey(attrs, prevKey, nextKey).ok === false) return variants;
  const { [prevKey]: moved, ...rest } = attrs;
  return updateVariantAt(variants, index, {
    attributes: { ...rest, [nextKey]: moved },
  });
};

// Shape draft variants into a server-safe array (trim, drop blanks, normalize
// attributes). Defensive client shaping only: the server's
// `commerceVariantSchema` + `commerceService.normalizeVariant` remain the
// source of truth.
export const serializeDraftVariants = (variants: CommerceVariant[]): CommerceVariant[] =>
  variants
    .map((variant) => {
      const attributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(variant.attributes)) {
        const trimmedKey = key.trim();
        const trimmedValue = typeof value === "string" ? value.trim() : "";
        if (trimmedKey && trimmedValue) attributes[trimmedKey] = trimmedValue;
      }
      return {
        ...(variant.id ? { id: variant.id } : {}),
        sku: variant.sku && variant.sku.trim() ? variant.sku.trim() : null,
        title: variant.title.trim(),
        pricing: {
          ...variant.pricing,
          currency: (variant.pricing.currency || "USD").toUpperCase(),
        },
        stock: variant.stock,
        attributes,
        isDefault: Boolean(variant.isDefault),
      } satisfies CommerceVariant;
    })
    .filter((variant) => variant.title.length > 0); // server requires non-empty title
