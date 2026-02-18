import type { ListingTemplateFieldBinding } from "./listingTemplatesService";

export type ListingVisibilityOperator =
  | "eq"
  | "neq"
  | "in"
  | "contains"
  | "exists"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type ListingVisibilityPrimitive = string | number | boolean | null;
export type ListingVisibilityValue =
  | ListingVisibilityPrimitive
  | ListingVisibilityPrimitive[];

export type ListingVisibilityCondition = {
  id: string;
  field: string;
  op: ListingVisibilityOperator;
  value?: ListingVisibilityValue;
};

export type ListingRuntimeBindingState = {
  key: string;
  visible: boolean;
  value: unknown;
};

export const listingVisibilityOperators = [
  "eq",
  "neq",
  "in",
  "contains",
  "exists",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;

type ComparableScalar = number | string | boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasMeaningfulValue = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const toComparableScalar = (value: unknown): ComparableScalar | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "";

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && String(numeric) === trimmed) {
      return numeric;
    }

    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }

    return trimmed.toLowerCase();
  }
  return null;
};

const compareScalars = (left: unknown, right: unknown): number | null => {
  const a = toComparableScalar(left);
  const b = toComparableScalar(right);
  if (a === null || b === null) return null;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b), "en", {
    sensitivity: "base",
    numeric: true,
  });
};

const scalarEquals = (left: unknown, right: unknown) => {
  if (left === right) return true;
  const a = toComparableScalar(left);
  const b = toComparableScalar(right);
  if (a === null || b === null) return false;
  if (typeof a === "number" && typeof b === "number") return a === b;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  return String(a) === String(b);
};

const toPrimitiveArray = (value: unknown): ListingVisibilityPrimitive[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ListingVisibilityPrimitive =>
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
  );
};

const resolveExistsExpected = (value: unknown) =>
  typeof value === "boolean" ? value : true;

export function readListingRowField(row: Record<string, unknown>, path: string): unknown {
  const normalizedPath = path.trim();
  if (normalizedPath.length === 0) return undefined;

  const segments = normalizedPath.split(".");
  let current: unknown = row;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

export function evaluateListingCondition(
  condition: ListingVisibilityCondition,
  row: Record<string, unknown>
) {
  const candidate = readListingRowField(row, condition.field);
  const expected = condition.value;

  switch (condition.op) {
    case "exists": {
      const shouldExist = resolveExistsExpected(expected);
      return shouldExist ? hasMeaningfulValue(candidate) : !hasMeaningfulValue(candidate);
    }
    case "eq":
      if (Array.isArray(candidate)) {
        return candidate.some((item) => scalarEquals(item, expected));
      }
      return scalarEquals(candidate, expected);
    case "neq":
      if (Array.isArray(candidate)) {
        return !candidate.some((item) => scalarEquals(item, expected));
      }
      return !scalarEquals(candidate, expected);
    case "in": {
      const expectedItems = toPrimitiveArray(expected);
      if (expectedItems.length === 0) return false;
      if (Array.isArray(candidate)) {
        return candidate.some((item) =>
          expectedItems.some((expectedItem) => scalarEquals(item, expectedItem))
        );
      }
      return expectedItems.some((expectedItem) => scalarEquals(candidate, expectedItem));
    }
    case "contains": {
      if (Array.isArray(candidate)) {
        if (Array.isArray(expected)) {
          const expectedItems = toPrimitiveArray(expected);
          if (expectedItems.length === 0) return false;
          return expectedItems.every((expectedItem) =>
            candidate.some((item) => scalarEquals(item, expectedItem))
          );
        }
        return candidate.some((item) => scalarEquals(item, expected));
      }

      if (typeof candidate === "string") {
        const expectedText =
          typeof expected === "string" ||
          typeof expected === "number" ||
          typeof expected === "boolean"
            ? String(expected).toLowerCase()
            : "";
        if (!expectedText) return false;
        return candidate.toLowerCase().includes(expectedText);
      }

      return false;
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const comparison = compareScalars(candidate, expected);
      if (comparison === null) return false;
      if (condition.op === "gt") return comparison > 0;
      if (condition.op === "gte") return comparison >= 0;
      if (condition.op === "lt") return comparison < 0;
      return comparison <= 0;
    }
    default:
      return false;
  }
}

export function evaluateListingVisibility(
  conditions: ListingVisibilityCondition[] | undefined,
  row: Record<string, unknown>
) {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((condition) => evaluateListingCondition(condition, row));
}

const resolveBoundValue = (
  row: Record<string, unknown>,
  binding: ListingTemplateFieldBinding
) => {
  const sourceValue = readListingRowField(row, binding.source);
  if (sourceValue === undefined || sourceValue === null || sourceValue === "") {
    return binding.fallback ?? undefined;
  }
  return sourceValue;
};

export function resolveListingBindingIndex(
  row: Record<string, unknown>,
  bindings: ListingTemplateFieldBinding[] | undefined
) {
  const result: Record<string, ListingRuntimeBindingState> = {};
  if (!Array.isArray(bindings)) return result;

  bindings.forEach((binding) => {
    const normalizedKey = binding.key.trim().toLowerCase();
    if (normalizedKey.length === 0) return;
    if (result[normalizedKey]) return;

    const visible = evaluateListingVisibility(binding.conditions, row);
    result[normalizedKey] = {
      key: binding.key,
      visible,
      value: visible ? resolveBoundValue(row, binding) : undefined,
    };
  });

  return result;
}

export function findListingBindingState(
  index: Record<string, ListingRuntimeBindingState>,
  keys: string[]
) {
  for (const key of keys) {
    const hit = index[key.trim().toLowerCase()];
    if (hit) return hit;
  }
  return null;
}

