export const MIN_ADMIN_QUERY_LIMIT = 1;
export const DEFAULT_ADMIN_QUERY_LIMIT = 50;
export const MAX_ADMIN_QUERY_LIMIT = 200;

export type AdminQueryConventionErrorCode =
  | "admin_query_limit_invalid"
  | "admin_query_text_invalid"
  | "admin_query_cursor_invalid"
  | "admin_query_date_invalid"
  | "admin_query_date_range_invalid"
  | "admin_filter_label_mismatch";

export class AdminQueryConventionError extends Error {
  public readonly code: AdminQueryConventionErrorCode;
  public readonly field?: string;

  constructor(code: AdminQueryConventionErrorCode, message: string, field?: string) {
    super(message);
    this.name = "AdminQueryConventionError";
    this.code = code;
    this.field = field;
  }
}

export type AdminQueryField =
  | { kind: "query"; label: "Query"; value: string }
  | { kind: "user"; label: "User"; userId: string }
  | { kind: "role"; label: "Role"; roleId: string }
  | { kind: "dateRange"; label: "Date range"; from: string; to: string };

export type AdminDateRangeInput = {
  from?: string | Date | null;
  to?: string | Date | null;
};

export type AdminDateRange = {
  from?: Date;
  to?: Date;
};

export type AdminCursorPayload = {
  createdAt: string;
  id: string;
};

export type AdminCursorResponse<TItem> = {
  items: readonly TItem[];
  nextCursor?: string | null;
  totalCount?: number | null;
  totalApprox?: number | null;
};

export type AdminCursorPageState<TQuery, TItem> = {
  query: TQuery;
  rows: readonly TItem[];
  loadedCount: number;
  nextCursor: string | null;
  hasMore: boolean;
  countCopy: string;
  totalCount?: number;
  totalApprox?: number;
};

type AdminQueryLimitOptions = {
  defaultLimit?: number;
  maxLimit?: number;
  minLimit?: number;
};

type CountCopyOptions = {
  resourceLabel?: string;
};

const expectedLabels: Record<AdminQueryField["kind"], AdminQueryField["label"]> = {
  query: "Query",
  user: "User",
  role: "Role",
  dateRange: "Date range",
};

const normalizeOptionalString = (value: string | number | Date | null | undefined) => {
  if (value === null || typeof value === "undefined") return undefined;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

const assertFiniteNonNegativeCount = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
};

export function assertFilterLabelMatchesSource(field: AdminQueryField) {
  const expectedLabel = expectedLabels[field.kind];
  if (field.label !== expectedLabel) {
    throw new AdminQueryConventionError(
      "admin_filter_label_mismatch",
      `Expected ${field.kind} filter label to be "${expectedLabel}".`,
      "label"
    );
  }
}

export function normalizeAdminQueryLimit(
  value: string | number | null | undefined,
  options: AdminQueryLimitOptions = {}
) {
  const minLimit = options.minLimit ?? MIN_ADMIN_QUERY_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_ADMIN_QUERY_LIMIT;
  const defaultLimit = Math.min(
    Math.max(Math.floor(options.defaultLimit ?? DEFAULT_ADMIN_QUERY_LIMIT), minLimit),
    maxLimit
  );
  const rawValue = normalizeOptionalString(value);
  if (!rawValue) return defaultLimit;
  if (!/^[0-9]+$/.test(rawValue)) {
    throw new AdminQueryConventionError(
      "admin_query_limit_invalid",
      "Query limit must be a positive integer.",
      "limit"
    );
  }
  const numericValue = Number(rawValue);
  if (!Number.isSafeInteger(numericValue) || numericValue < minLimit) {
    throw new AdminQueryConventionError(
      "admin_query_limit_invalid",
      "Query limit must be a positive integer.",
      "limit"
    );
  }
  return Math.min(numericValue, maxLimit);
}

export function normalizeAdminSearchQuery(
  value: string | null | undefined,
  options: { maxLength?: number } = {}
) {
  const rawValue = normalizeOptionalString(value);
  if (!rawValue) return undefined;
  const maxLength = options.maxLength ?? 200;
  if (rawValue.length > maxLength) {
    throw new AdminQueryConventionError(
      "admin_query_text_invalid",
      "Query text exceeds the allowed length.",
      "query"
    );
  }
  return rawValue;
}

export function normalizeAdminCursor(
  value: string | null | undefined,
  options: { maxLength?: number } = {}
) {
  const rawValue = normalizeOptionalString(value);
  if (!rawValue) return undefined;
  const maxLength = options.maxLength ?? 500;
  if (rawValue.length > maxLength) {
    throw new AdminQueryConventionError(
      "admin_query_cursor_invalid",
      "Query cursor exceeds the allowed length.",
      "cursor"
    );
  }
  return rawValue;
}

export function parseAdminQueryDate(value: string | Date | null | undefined, field: "from" | "to") {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AdminQueryConventionError(
      "admin_query_date_invalid",
      `Invalid ${field} date.`,
      field
    );
  }
  return date;
}

export function normalizeAdminIsoDateBoundary(
  value: string | Date | null | undefined,
  boundary: "start" | "end"
) {
  const rawValue = normalizeOptionalString(value);
  if (!rawValue) return undefined;
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
  if (dateOnlyMatch) {
    return boundary === "start" ? `${rawValue}T00:00:00.000Z` : `${rawValue}T23:59:59.999Z`;
  }
  const parsed = parseAdminQueryDate(rawValue, boundary === "start" ? "from" : "to");
  return parsed?.toISOString();
}

export function normalizeAdminDateRange(input: AdminDateRangeInput): AdminDateRange {
  const from = parseAdminQueryDate(input.from, "from");
  const to = parseAdminQueryDate(input.to, "to");
  if (from && to && from.getTime() > to.getTime()) {
    throw new AdminQueryConventionError(
      "admin_query_date_range_invalid",
      "Query date range must start before it ends.",
      "dateRange"
    );
  }
  return { from, to };
}

export function validateAdminCustomDateRange(input: AdminDateRangeInput) {
  const range = normalizeAdminDateRange(input);
  if (!range.from || !range.to) {
    throw new AdminQueryConventionError(
      "admin_query_date_range_invalid",
      "Custom date range requires both from and to dates.",
      "dateRange"
    );
  }
  return { from: range.from, to: range.to };
}

const encodeBase64Url = (value: string) =>
  btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(`${padded}${padding}`);
};

const assertCursorPayload = (payload: AdminCursorPayload) => {
  if (!normalizeAdminCursor(payload.id)) {
    throw new AdminQueryConventionError(
      "admin_query_cursor_invalid",
      "Query cursor id is invalid.",
      "cursor"
    );
  }
  parseAdminQueryDate(payload.createdAt, "from");
};

export function encodeAdminCursor(payload: AdminCursorPayload) {
  assertCursorPayload(payload);
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeAdminCursor(cursor: string): AdminCursorPayload {
  try {
    const decoded = JSON.parse(decodeBase64Url(normalizeAdminCursor(cursor) ?? ""));
    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded.createdAt !== "string" ||
      typeof decoded.id !== "string"
    ) {
      throw new Error("Invalid cursor payload.");
    }
    const payload = { createdAt: decoded.createdAt, id: decoded.id };
    assertCursorPayload(payload);
    return payload;
  } catch {
    throw new AdminQueryConventionError(
      "admin_query_cursor_invalid",
      "Query cursor is invalid.",
      "cursor"
    );
  }
}

export function resolveTruthfulCountCopy<TItem>(
  response: AdminCursorResponse<TItem>,
  options: CountCopyOptions = {}
) {
  const resourceLabel = options.resourceLabel ?? "records";
  const loadedCount = response.items.length;
  const totalCount = assertFiniteNonNegativeCount(response.totalCount);
  const totalApprox = assertFiniteNonNegativeCount(response.totalApprox);

  if (typeof totalCount === "number") {
    return `Showing ${loadedCount} loaded of ${totalCount} ${resourceLabel}.`;
  }
  if (typeof totalApprox === "number") {
    return `Showing ${loadedCount} loaded ${resourceLabel} of about ${totalApprox}.`;
  }
  if (normalizeAdminCursor(response.nextCursor)) {
    return `Showing ${loadedCount} loaded ${resourceLabel}. More results are available.`;
  }
  return `Showing ${loadedCount} loaded ${resourceLabel}.`;
}

export function buildCursorPageState<TQuery, TItem>(
  query: TQuery,
  response: AdminCursorResponse<TItem>,
  options: CountCopyOptions = {}
): AdminCursorPageState<TQuery, TItem> {
  const nextCursor = normalizeAdminCursor(response.nextCursor) ?? null;
  const totalCount = assertFiniteNonNegativeCount(response.totalCount);
  const totalApprox = assertFiniteNonNegativeCount(response.totalApprox);

  return {
    query,
    rows: response.items,
    loadedCount: response.items.length,
    nextCursor,
    hasMore: Boolean(nextCursor),
    countCopy: resolveTruthfulCountCopy(response, options),
    ...(typeof totalCount === "number" ? { totalCount } : {}),
    ...(typeof totalApprox === "number" ? { totalApprox } : {}),
  };
}
