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

const parseIntegerOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
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

export const draftFromCommerceProduct = (
  item: CommerceProductRecord
): CommerceProductDraft => ({
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

export const toCommerceProductInput = (
  draft: CommerceProductDraft
): CommerceProductInput => ({
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
  variants: draft.variants,
  metadata: draft.metadata,
  data: draft.data,
});
