import { afterEach, expect, test } from "bun:test";

import { COMMERCE_CHECKOUT_ADAPTERS_FILTER } from "../../../core/plugins/hooks/commerce";
import type { HookContext } from "../../../core/plugins/sdkRuntime";
import type {
  CommerceCheckoutAdapterFilterPayload,
} from "../../../core/services/commerce/checkoutRegistry";
import {
  __resetCheckoutRegistryForTests,
  __setCheckoutHookRegistryResolverForTests,
  listCheckoutAdapters,
  registerCheckoutAdapter,
  resolveCheckoutAdapter,
  resolveCommerceAddToCart,
  resolveCommerceCheckoutUrl,
  unregisterCheckoutAdapter,
} from "../../../core/services/commerce/checkoutRegistry";
import type {
  CommerceAddToCartInput,
  CommerceCheckoutAdapter,
  CommerceCheckoutUrlInput,
} from "../../../core/services/commerce/checkoutAdapter";
import { INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY } from "../../../core/services/commerce/checkoutAdapter";

type CheckoutHookFilterEntry = {
  pluginName: string;
  handler: (payload: unknown, ctx: HookContext) => unknown;
};

const sampleAddToCartInput: CommerceAddToCartInput = {
  item: {
    productId: "product-1",
    variantId: null,
    quantity: 1,
    unitAmount: 120000,
    currency: "USD",
    title: "Starter Home",
    sku: "STARTER-001",
    metadata: {},
  },
};

const sampleCheckoutInput: CommerceCheckoutUrlInput = {
  items: [sampleAddToCartInput.item],
};

afterEach(() => {
  __resetCheckoutRegistryForTests();
});

test("resolveCheckoutAdapter falls back to internal noop for unknown provider", async () => {
  const adapter = resolveCheckoutAdapter("missing-provider");
  expect(adapter.key).toBe(INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY);

  const checkout = await resolveCommerceCheckoutUrl(sampleCheckoutInput, {
    providerKey: "missing-provider",
  });
  expect(checkout.adapterKey).toBe(INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY);
  expect(checkout.result.mode).toBe("none");
  expect(checkout.result.url).toBeNull();
});

test("registerCheckoutAdapter resolves add-to-cart and checkout operations", async () => {
  const adapter: CommerceCheckoutAdapter = {
    key: "provider_custom",
    label: "Custom Provider",
    capabilities: { addToCart: true, checkout: true },
    addToCart: async () => ({
      mode: "cart_redirect",
      cartUrl: "/cart/custom",
      checkoutUrl: null,
      cartReference: "cart-123",
      metadata: {},
    }),
    createCheckoutUrl: async () => ({
      mode: "redirect",
      url: "https://checkout.example.com/session/abc",
      providerReference: "abc",
      metadata: {},
    }),
  };

  registerCheckoutAdapter(adapter);
  const listed = listCheckoutAdapters();
  expect(listed.find((item) => item.key === adapter.key)?.source).toBe("local");

  const addToCart = await resolveCommerceAddToCart(sampleAddToCartInput, {
    providerKey: "provider_custom",
  });
  expect(addToCart.adapterKey).toBe("provider_custom");
  expect(addToCart.result.mode).toBe("cart_redirect");

  const checkout = await resolveCommerceCheckoutUrl(sampleCheckoutInput, {
    providerKey: "provider_custom",
  });
  expect(checkout.adapterKey).toBe("provider_custom");
  expect(checkout.result.mode).toBe("redirect");
  expect(checkout.result.url).toBe("https://checkout.example.com/session/abc");
});

test("checkout resolver returns noop result when adapter misses checkout method", async () => {
  registerCheckoutAdapter({
    key: "cart_only",
    label: "Cart Only",
    capabilities: { addToCart: true, checkout: false },
    addToCart: async () => ({
      mode: "cart_redirect",
      cartUrl: "/cart",
      checkoutUrl: null,
      cartReference: "cart-only",
      metadata: {},
    }),
  });

  const checkout = await resolveCommerceCheckoutUrl(sampleCheckoutInput, {
    providerKey: "cart_only",
  });

  expect(checkout.adapterKey).toBe("cart_only");
  expect(checkout.result.mode).toBe("none");
  expect(checkout.result.url).toBeNull();
});

test("checkout registry supports plugin hook adapter injection", async () => {
  const filters = new Map<string, CheckoutHookFilterEntry[]>();
  filters.set(COMMERCE_CHECKOUT_ADAPTERS_FILTER, [
    {
      pluginName: "plugin-checkout",
      handler: (payload: unknown) => {
        const current = payload as CommerceCheckoutAdapterFilterPayload;
        return {
          adapters: {
            ...current.adapters,
            plugin_checkout: {
              key: "plugin_checkout",
              label: "Plugin Checkout",
              capabilities: { addToCart: false, checkout: true },
              createCheckoutUrl: async () => ({
                mode: "redirect",
                url: "https://plugin-checkout.test/session",
                providerReference: "plugin-1",
                metadata: {},
              }),
            },
          },
          defaultKey: "plugin_checkout",
        } satisfies CommerceCheckoutAdapterFilterPayload;
      },
    },
  ]);

  __setCheckoutHookRegistryResolverForTests(() => ({ filters }));

  const adapter = resolveCheckoutAdapter();
  expect(adapter.key).toBe("plugin_checkout");

  const checkout = await resolveCommerceCheckoutUrl(sampleCheckoutInput);
  expect(checkout.adapterKey).toBe("plugin_checkout");
  expect(checkout.result.url).toBe("https://plugin-checkout.test/session");

  const listed = listCheckoutAdapters();
  expect(listed.find((item) => item.key === "plugin_checkout")?.source).toBe("plugin");
});

test("invalid plugin filter payload falls back to internal noop adapter", () => {
  const filters = new Map<string, CheckoutHookFilterEntry[]>();
  filters.set(COMMERCE_CHECKOUT_ADAPTERS_FILTER, [
    {
      pluginName: "plugin-invalid",
      handler: () => ({ adapters: { bad: { label: "missing key" } }, defaultKey: "bad" }),
    },
  ]);

  __setCheckoutHookRegistryResolverForTests(() => ({ filters }));

  const adapter = resolveCheckoutAdapter("plugin_checkout");
  expect(adapter.key).toBe(INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY);
});

test("registerCheckoutAdapter rejects duplicate keys and reserved internal key", () => {
  registerCheckoutAdapter({
    key: "provider_once",
    label: "Provider Once",
    capabilities: { addToCart: true, checkout: true },
    addToCart: async () => ({
      mode: "none",
      cartUrl: null,
      checkoutUrl: null,
      cartReference: null,
      metadata: {},
    }),
  });

  expect(() =>
    registerCheckoutAdapter({
      key: "provider_once",
      label: "Provider Duplicate",
      capabilities: { addToCart: true, checkout: true },
      addToCart: async () => ({
        mode: "none",
        cartUrl: null,
        checkoutUrl: null,
        cartReference: null,
        metadata: {},
      }),
    })
  ).toThrow("commerce_checkout_adapter_exists");

  expect(() =>
    registerCheckoutAdapter({
      key: INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY,
      label: "Invalid override",
      capabilities: { addToCart: true, checkout: true },
      addToCart: async () => ({
        mode: "none",
        cartUrl: null,
        checkoutUrl: null,
        cartReference: null,
        metadata: {},
      }),
    })
  ).toThrow("commerce_checkout_adapter_reserved_key");

  expect(unregisterCheckoutAdapter(INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY)).toBe(false);
  expect(unregisterCheckoutAdapter("provider_once")).toBe(true);
});
