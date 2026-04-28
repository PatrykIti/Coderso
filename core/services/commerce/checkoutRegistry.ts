import { COMMERCE_CHECKOUT_ADAPTERS_FILTER } from "../../plugins/hooks/commerce";
import { getHookRegistry } from "../../plugins/pluginManager";
import type { HookContext } from "../../plugins/sdkRuntime";
import type {
  CommerceAddToCartInput,
  CommerceAddToCartResult,
  CommerceCheckoutAdapter,
  CommerceCheckoutAdapterContext,
  CommerceCheckoutAdapterSummary,
  CommerceCheckoutUrlInput,
  CommerceCheckoutUrlResult,
} from "./checkoutAdapter";
import {
  assertCheckoutAdapterContract,
  createNoopAddToCartResult,
  createNoopCheckoutUrlResult,
  INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY,
  internalNoopCheckoutAdapter,
  normalizeCheckoutAdapterKey,
} from "./checkoutAdapter";

type CheckoutHookFilterEntry = {
  pluginName: string;
  handler: (payload: unknown, ctx: HookContext) => unknown;
};

type CheckoutHookRegistry = {
  filters: Map<string, CheckoutHookFilterEntry[]>;
};

export type CommerceCheckoutAdapterFilterPayload = {
  adapters: Record<string, CommerceCheckoutAdapter>;
  defaultKey: string;
};

export type ResolveCheckoutAdapterOptions = {
  providerKey?: string | null;
  context?: CommerceCheckoutAdapterContext;
};

export type ResolveCheckoutOperationResult<T> = {
  adapterKey: string;
  result: T;
};

const localAdapters = new Map<string, CommerceCheckoutAdapter>();

let hookRegistryResolver: (() => CheckoutHookRegistry) | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toCatalogRecord = (
  source: Map<string, CommerceCheckoutAdapter>
): Record<string, CommerceCheckoutAdapter> => {
  const record: Record<string, CommerceCheckoutAdapter> = {};
  for (const [key, adapter] of source.entries()) {
    record[key] = adapter;
  }
  return record;
};

const resolveHookRegistry = (): CheckoutHookRegistry =>
  hookRegistryResolver?.() ?? (getHookRegistry() as CheckoutHookRegistry);

const sanitizeFilterPayload = (
  value: unknown,
  fallback: CommerceCheckoutAdapterFilterPayload
): CommerceCheckoutAdapterFilterPayload => {
  if (!isRecord(value)) return fallback;
  if (!isRecord(value.adapters)) return fallback;

  const adapters: Record<string, CommerceCheckoutAdapter> = {};
  for (const candidate of Object.values(value.adapters)) {
    try {
      const adapter = assertCheckoutAdapterContract(candidate);
      adapters[adapter.key] = adapter;
    } catch {
      // Ignore invalid adapter contracts from filters.
    }
  }

  if (Object.keys(adapters).length === 0) return fallback;

  const candidateDefault = normalizeCheckoutAdapterKey(value.defaultKey);
  const defaultKey =
    candidateDefault && adapters[candidateDefault]
      ? candidateDefault
      : adapters[fallback.defaultKey]
        ? fallback.defaultKey
        : Object.keys(adapters)[0];

  if (!defaultKey) return fallback;

  return {
    adapters,
    defaultKey,
  };
};

const withInternalFallback = (
  payload: CommerceCheckoutAdapterFilterPayload
): CommerceCheckoutAdapterFilterPayload => {
  const adapters = { ...payload.adapters };
  adapters[INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY] =
    adapters[INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY] ?? internalNoopCheckoutAdapter;

  const defaultKey = adapters[payload.defaultKey]
    ? payload.defaultKey
    : INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY;

  return { adapters, defaultKey };
};

const applyCheckoutAdapterFilters = (
  payload: CommerceCheckoutAdapterFilterPayload
): CommerceCheckoutAdapterFilterPayload => {
  const filters =
    resolveHookRegistry().filters.get(COMMERCE_CHECKOUT_ADAPTERS_FILTER) ?? [];

  let current = payload;
  for (const entry of filters) {
    try {
      const next = entry.handler(current, {
        requestId: "commerce_checkout_registry",
        method: "INTERNAL",
        path: "/internal/commerce/checkout/registry",
      });
      current = sanitizeFilterPayload(next, current);
    } catch (error) {
      console.warn(
        `[commerce] checkout adapter filter failed (${entry.pluginName})`,
        error
      );
    }
  }

  return withInternalFallback(current);
};

const buildCatalog = (): CommerceCheckoutAdapterFilterPayload => {
  const base = new Map<string, CommerceCheckoutAdapter>();
  base.set(INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY, internalNoopCheckoutAdapter);

  for (const [key, adapter] of localAdapters.entries()) {
    base.set(key, adapter);
  }

  return applyCheckoutAdapterFilters({
    adapters: toCatalogRecord(base),
    defaultKey: INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY,
  });
};

const resolveAdapterEntry = (providerKey?: string | null) => {
  const catalog = buildCatalog();
  const normalizedProviderKey = normalizeCheckoutAdapterKey(providerKey);
  const adapterKey =
    (normalizedProviderKey && catalog.adapters[normalizedProviderKey]
      ? normalizedProviderKey
      : catalog.defaultKey) ?? INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY;

  const adapter =
    catalog.adapters[adapterKey] ??
    catalog.adapters[INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY] ??
    internalNoopCheckoutAdapter;

  return { adapter, adapterKey, catalog };
};

export const registerCheckoutAdapter = (adapter: CommerceCheckoutAdapter) => {
  const normalized = assertCheckoutAdapterContract(adapter);

  if (normalized.key === INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY) {
    throw new Error("commerce_checkout_adapter_reserved_key");
  }

  if (localAdapters.has(normalized.key)) {
    throw new Error("commerce_checkout_adapter_exists");
  }

  localAdapters.set(normalized.key, normalized);
  return normalized;
};

export const unregisterCheckoutAdapter = (key: string) => {
  const normalized = normalizeCheckoutAdapterKey(key);
  if (!normalized || normalized === INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY) return false;
  return localAdapters.delete(normalized);
};

export const resolveCheckoutAdapter = (providerKey?: string | null) =>
  resolveAdapterEntry(providerKey).adapter;

export const listCheckoutAdapters = (): CommerceCheckoutAdapterSummary[] => {
  const { catalog } = resolveAdapterEntry();
  const items = Object.values(catalog.adapters)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((adapter) => ({
      key: adapter.key,
      label: adapter.label,
      description: adapter.description ?? null,
      capabilities: adapter.capabilities,
      isDefault: adapter.key === catalog.defaultKey,
      source:
        adapter.key === INTERNAL_NOOP_CHECKOUT_ADAPTER_KEY
          ? ("core" as const)
          : localAdapters.has(adapter.key)
            ? ("local" as const)
            : ("plugin" as const),
    }));

  return items;
};

export const resolveCommerceAddToCart = async (
  input: CommerceAddToCartInput,
  options: ResolveCheckoutAdapterOptions = {}
): Promise<ResolveCheckoutOperationResult<CommerceAddToCartResult>> => {
  const { adapter, adapterKey } = resolveAdapterEntry(options.providerKey);
  if (typeof adapter.addToCart !== "function") {
    return {
      adapterKey,
      result: createNoopAddToCartResult(),
    };
  }

  return {
    adapterKey,
    result: await adapter.addToCart(input, options.context ?? {}),
  };
};

export const resolveCommerceCheckoutUrl = async (
  input: CommerceCheckoutUrlInput,
  options: ResolveCheckoutAdapterOptions = {}
): Promise<ResolveCheckoutOperationResult<CommerceCheckoutUrlResult>> => {
  const { adapter, adapterKey } = resolveAdapterEntry(options.providerKey);
  if (typeof adapter.createCheckoutUrl !== "function") {
    return {
      adapterKey,
      result: createNoopCheckoutUrlResult(),
    };
  }

  return {
    adapterKey,
    result: await adapter.createCheckoutUrl(input, options.context ?? {}),
  };
};

export const __setCheckoutHookRegistryResolverForTests = (
  resolver: (() => CheckoutHookRegistry) | null
) => {
  hookRegistryResolver = resolver;
};

export const __resetCheckoutRegistryForTests = () => {
  localAdapters.clear();
  hookRegistryResolver = null;
};
