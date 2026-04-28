import {
  commerceProductStatuses,
  commerceStockStates,
  type CommerceMoney,
  type CommerceProductStatus,
  type CommerceStock,
  type CommerceStockState,
} from "./commerceTypes";

const statusSet = new Set<CommerceProductStatus>(commerceProductStatuses);
const stockStateSet = new Set<CommerceStockState>(commerceStockStates);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const currencyPattern = /^[A-Z]{3}$/;

export const commerceDefaults = {
  status: "draft" as CommerceProductStatus,
  stockState: "in_stock" as CommerceStockState,
  currency: "USD",
};

export function normalizeCommerceProductStatus(
  value: unknown,
  fallback: CommerceProductStatus = commerceDefaults.status
): CommerceProductStatus {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && statusSet.has(value as CommerceProductStatus)) {
    return value as CommerceProductStatus;
  }
  throw new Error("commerce_status_invalid");
}

export function normalizeCommerceStockState(
  value: unknown,
  fallback: CommerceStockState = commerceDefaults.stockState
): CommerceStockState {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && stockStateSet.has(value as CommerceStockState)) {
    return value as CommerceStockState;
  }
  throw new Error("commerce_stock_state_invalid");
}

export function normalizeCommerceCurrency(
  value: unknown,
  fallback = commerceDefaults.currency
): string {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value !== "string") {
    throw new Error("commerce_currency_invalid");
  }
  const normalized = value.trim().toUpperCase();
  if (!currencyPattern.test(normalized)) {
    throw new Error("commerce_currency_invalid");
  }
  return normalized;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function normalizeCommerceMoney(
  value: unknown,
  fallbackCurrency = commerceDefaults.currency
): CommerceMoney {
  if (!isRecord(value)) {
    throw new Error("commerce_money_invalid");
  }
  const amount = Number(value.amount);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("commerce_amount_invalid");
  }

  const compareAtRaw = value.compareAtAmount;
  const compareAtAmount =
    compareAtRaw === undefined || compareAtRaw === null || compareAtRaw === ""
      ? null
      : Number(compareAtRaw);

  if (
    compareAtAmount !== null &&
    (!Number.isInteger(compareAtAmount) || compareAtAmount < 0)
  ) {
    throw new Error("commerce_compare_at_invalid");
  }

  return {
    amount,
    currency: normalizeCommerceCurrency(value.currency, fallbackCurrency),
    compareAtAmount,
  };
}

export function normalizeCommerceStock(value: unknown): CommerceStock {
  if (!isRecord(value)) {
    throw new Error("commerce_stock_invalid");
  }

  const quantityRaw = value.quantity;
  const quantity =
    quantityRaw === undefined || quantityRaw === null || quantityRaw === ""
      ? null
      : Number(quantityRaw);

  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) {
    throw new Error("commerce_stock_quantity_invalid");
  }

  return {
    state: normalizeCommerceStockState(value.state, commerceDefaults.stockState),
    quantity,
  };
}

export function normalizeCommerceSlug(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("commerce_slug_invalid");
  }
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalized || !slugPattern.test(normalized)) {
    throw new Error("commerce_slug_invalid");
  }

  return normalized;
}
