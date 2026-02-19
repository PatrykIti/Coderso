export type CommerceCheckoutLineItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitAmount: number | null;
  currency: string | null;
  title: string | null;
  sku: string | null;
  metadata: Record<string, unknown>;
};

export type CommerceCheckoutAdapterContext = {
  requestId?: string;
  locale?: string;
  session?: { id: string; userId: string } | null;
  user?: { id: string; email?: string | null; roles?: string[] } | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type CommerceAddToCartInput = {
  item: CommerceCheckoutLineItem;
  returnUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type CommerceAddToCartResult = {
  mode: "none" | "cart_redirect" | "checkout_redirect";
  cartUrl: string | null;
  checkoutUrl: string | null;
  cartReference: string | null;
  metadata: Record<string, unknown>;
};

export type CommerceCheckoutUrlInput = {
  items: CommerceCheckoutLineItem[];
  returnUrl?: string | null;
  cancelUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type CommerceCheckoutUrlResult = {
  mode: "none" | "redirect";
  url: string | null;
  providerReference: string | null;
  metadata: Record<string, unknown>;
};

export type CommerceCheckoutAdapterCapabilities = {
  addToCart: boolean;
  checkout: boolean;
};

export type CommerceCheckoutAdapter = {
  key: string;
  label: string;
  description?: string | null;
  capabilities: CommerceCheckoutAdapterCapabilities;
  addToCart?: (
    input: CommerceAddToCartInput,
    ctx: CommerceCheckoutAdapterContext
  ) => Promise<CommerceAddToCartResult>;
  createCheckoutUrl?: (
    input: CommerceCheckoutUrlInput,
    ctx: CommerceCheckoutAdapterContext
  ) => Promise<CommerceCheckoutUrlResult>;
};

export type CommerceCheckoutAdapterSummary = {
  key: string;
  label: string;
  description: string | null;
  capabilities: CommerceCheckoutAdapterCapabilities;
  isDefault: boolean;
  source: "core" | "local" | "plugin";
};

export const INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY = "internal_noop";

const CHECKOUT_ADAPTER_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeCheckoutAdapterKey = (
  value: unknown
): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!CHECKOUT_ADAPTER_KEY_PATTERN.test(normalized)) return null;
  return normalized;
};

export const createNoopAddToCartResult = (): CommerceAddToCartResult => ({
  mode: "none",
  cartUrl: null,
  checkoutUrl: null,
  cartReference: null,
  metadata: {},
});

export const createNoopCheckoutUrlResult = (): CommerceCheckoutUrlResult => ({
  mode: "none",
  url: null,
  providerReference: null,
  metadata: {},
});

export const internalNoopCheckoutAdapter: CommerceCheckoutAdapter = {
  key: INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY,
  label: "Internal (no provider)",
  description:
    "Default checkout adapter when no external checkout or cart provider is configured.",
  capabilities: {
    addToCart: true,
    checkout: true,
  },
  addToCart: async () => createNoopAddToCartResult(),
  createCheckoutUrl: async () => createNoopCheckoutUrlResult(),
};

export const assertCheckoutAdapterContract = (
  value: unknown
): CommerceCheckoutAdapter => {
  if (!isRecord(value)) throw new Error("commerce_checkout_adapter_invalid");

  const key = normalizeCheckoutAdapterKey(value.key);
  if (!key) throw new Error("commerce_checkout_adapter_key_invalid");

  const label = normalizeOptionalText(value.label);
  if (!label) throw new Error("commerce_checkout_adapter_label_invalid");

  if (!isRecord(value.capabilities)) {
    throw new Error("commerce_checkout_adapter_capabilities_invalid");
  }

  const addToCartCapability = value.capabilities.addToCart;
  const checkoutCapability = value.capabilities.checkout;

  if (typeof addToCartCapability !== "boolean" || typeof checkoutCapability !== "boolean") {
    throw new Error("commerce_checkout_adapter_capabilities_invalid");
  }

  const addToCartRaw = value.addToCart;
  const createCheckoutUrlRaw = value.createCheckoutUrl;
  const addToCart =
    typeof addToCartRaw === "function"
      ? (addToCartRaw as CommerceCheckoutAdapter["addToCart"])
      : undefined;
  const createCheckoutUrl =
    typeof createCheckoutUrlRaw === "function"
      ? (createCheckoutUrlRaw as CommerceCheckoutAdapter["createCheckoutUrl"])
      : undefined;

  if (!addToCart && !createCheckoutUrl) {
    throw new Error("commerce_checkout_adapter_methods_invalid");
  }

  return {
    key,
    label,
    description: normalizeOptionalText(value.description),
    capabilities: {
      addToCart: addToCartCapability,
      checkout: checkoutCapability,
    },
    ...(addToCart ? { addToCart } : {}),
    ...(createCheckoutUrl ? { createCheckoutUrl } : {}),
  };
};
