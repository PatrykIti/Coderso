import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  PACKAGE_RESOURCE_KINDS,
  FullSitePackageError,
  type FullSitePackageDiagnostic,
  type FullSitePackageErrorCode,
  type JsonObject,
  type JsonValue,
  type PackageResourceCollection,
} from "./types";

export const FULL_SITE_PACKAGE_SCHEMA_VERSION = 1 as const;

export const FULL_SITE_PACKAGE_ROOT_KEYS = new Set([
  "schemaVersion",
  "key",
  "metadata",
  "resources",
  "compatibility",
  "verification",
]);

export const FULL_SITE_PACKAGE_SETTING_ALLOWLIST = new Set([
  "site.name",
  "site.locale",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.contentRoutes",
  "design.tokens",
]);

const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const LOCALE_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const CREDENTIAL_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4}){32,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const FORBIDDEN_VALUE_KEY_PATTERN =
  /(?:authorization|cookie|credential|password|private[_-]?key|provider[_-]?key|secret|token)/i;
const PROTOTYPE_SENSITIVE_JSON_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPrototypeSensitiveJsonKey = (key: string): boolean =>
  PROTOTYPE_SENSITIVE_JSON_KEYS.has(key);

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

export class DiagnosticCollector {
  readonly diagnostics: FullSitePackageDiagnostic[] = [];
  private overflow = false;

  add(path: string, reason: string): void {
    if (this.diagnostics.length < PACKAGE_LIMITS.diagnostics) {
      this.diagnostics.push({ path: sanitizePath(path), reason });
      return;
    }
    this.overflow = true;
  }

  throwIfAny(code: FullSitePackageErrorCode = "site_package_invalid"): void {
    if (this.diagnostics.length === 0 && !this.overflow) return;
    if (this.overflow) {
      throw new FullSitePackageError("site_package_too_complex", this.diagnostics);
    }
    throw new FullSitePackageError(code, this.diagnostics);
  }
}

const sanitizePath = (path: string): string =>
  path.replace(/[^A-Za-z0-9.[\]_-]/g, "_").slice(0, 240);

export const assertExactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: DiagnosticCollector
): void => {
  for (const key of Object.keys(value)) {
    if (isPrototypeSensitiveJsonKey(key)) {
      diagnostics.add(`${path}.${key}`, "prototype_key_forbidden");
    } else if (!allowed.has(key)) {
      diagnostics.add(`${path}.${key}`, "unknown_key");
    }
  }
};

export const readBoundedString = (
  value: unknown,
  path: string,
  maxLength: number,
  diagnostics: DiagnosticCollector,
  options: { pattern?: RegExp; trim?: boolean } = {}
): string => {
  if (typeof value !== "string") {
    diagnostics.add(path, "expected_string");
    return "";
  }
  const normalized = options.trim === false ? value : value.trim();
  if (normalized.length === 0) diagnostics.add(path, "empty_string");
  if (normalized.length > maxLength) diagnostics.add(path, "string_too_long");
  if (options.pattern && !options.pattern.test(normalized)) diagnostics.add(path, "invalid_format");
  return normalized;
};

export const readPackageKey = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector
): string =>
  readBoundedString(value, path, PACKAGE_LIMITS.keyLength, diagnostics, {
    pattern: KEY_PATTERN,
  });

export const readLocale = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector
): string =>
  readBoundedString(value, path, PACKAGE_LIMITS.metadataLocaleLength, diagnostics, {
    pattern: LOCALE_PATTERN,
  });

const isBinaryValue = (value: unknown): boolean =>
  value instanceof ArrayBuffer || ArrayBuffer.isView(value) || value instanceof Blob;

export type JsonScanMetrics = {
  depth: number;
  referenceEdges: number;
};

export const normalizeJsonValue = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector,
  depth = 1
): { value: JsonValue; metrics: JsonScanMetrics } => {
  if (depth > PACKAGE_LIMITS.depth) {
    throw new FullSitePackageError("site_package_too_complex", [
      { path: sanitizePath(path), reason: "depth_exceeded" },
    ]);
  }
  if (isBinaryValue(value)) {
    diagnostics.add(path, "binary_value_forbidden");
    return { value: null, metrics: { depth, referenceEdges: 0 } };
  }
  if (value === null || typeof value === "boolean") {
    return { value, metrics: { depth, referenceEdges: 0 } };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) diagnostics.add(path, "non_finite_number");
    return { value: Number.isFinite(value) ? value : 0, metrics: { depth, referenceEdges: 0 } };
  }
  if (typeof value === "string") {
    if (value.length > PACKAGE_LIMITS.stringLength) diagnostics.add(path, "string_too_long");
    if (CREDENTIAL_URL_PATTERN.test(value)) diagnostics.add(path, "credential_url_forbidden");
    if (BASE64_PATTERN.test(value)) diagnostics.add(path, "base64_value_forbidden");
    return { value, metrics: { depth, referenceEdges: 0 } };
  }
  if (Array.isArray(value)) {
    let maxDepth = depth;
    let referenceEdges = 0;
    const normalized = value.map((item, index) => {
      const result = normalizeJsonValue(item, `${path}[${index}]`, diagnostics, depth + 1);
      maxDepth = Math.max(maxDepth, result.metrics.depth);
      referenceEdges += result.metrics.referenceEdges;
      return result.value;
    });
    return { value: normalized, metrics: { depth: maxDepth, referenceEdges } };
  }
  if (!isRecord(value)) {
    diagnostics.add(path, "non_json_value");
    return { value: null, metrics: { depth, referenceEdges: 0 } };
  }

  let maxDepth = depth;
  const keys = Object.keys(value);
  let referenceEdges =
    keys.length === 2 &&
    keys.includes("ref") &&
    keys.includes("key") &&
    typeof value.ref === "string" &&
    typeof value.key === "string" &&
    (PACKAGE_RESOURCE_KINDS as readonly string[]).includes(value.ref)
      ? 1
      : 0;
  const normalizedEntries: Array<[string, JsonValue]> = [];
  for (const key of keys.sort()) {
    if (isPrototypeSensitiveJsonKey(key)) {
      diagnostics.add(`${path}.${key}`, "prototype_key_forbidden");
      continue;
    }
    if (FORBIDDEN_VALUE_KEY_PATTERN.test(key)) {
      diagnostics.add(`${path}.${key}`, "secret_key_forbidden");
    }
    const result = normalizeJsonValue(value[key], `${path}.${key}`, diagnostics, depth + 1);
    normalizedEntries.push([key, result.value]);
    maxDepth = Math.max(maxDepth, result.metrics.depth);
    referenceEdges += result.metrics.referenceEdges;
  }
  return {
    value: Object.fromEntries(normalizedEntries) as JsonObject,
    metrics: { depth: maxDepth, referenceEdges },
  };
};

export const assertPackageByteSize = (value: unknown): void => {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new FullSitePackageError("site_package_invalid", [
      { path: "$", reason: "not_json_serializable" },
    ]);
  }
  if (typeof serialized !== "string") {
    throw new FullSitePackageError("site_package_invalid", [
      { path: "$", reason: "not_json_serializable" },
    ]);
  }
  if (new TextEncoder().encode(serialized).byteLength > PACKAGE_LIMITS.fileBytes) {
    throw new FullSitePackageError("site_package_too_large", [
      { path: "$", reason: "file_bytes_exceeded" },
    ]);
  }
};

export const assertResourceCounts = (
  resources: Record<string, unknown>,
  diagnostics: DiagnosticCollector
): void => {
  let total = 0;
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    const value = resources[collection];
    if (!Array.isArray(value)) {
      diagnostics.add(`$.resources.${collection}`, "expected_array");
      continue;
    }
    total += value.length;
    if (value.length > PACKAGE_LIMITS.resourcesPerCollection) {
      throw new FullSitePackageError("site_package_too_large", [
        { path: `$.resources.${collection}`, reason: "collection_count_exceeded" },
      ]);
    }
  }
  if (total > PACKAGE_LIMITS.resourcesTotal) {
    throw new FullSitePackageError("site_package_too_large", [
      { path: "$.resources", reason: "resource_count_exceeded" },
    ]);
  }
};

export const isPackageResourceCollection = (value: string): value is PackageResourceCollection =>
  (PACKAGE_RESOURCE_COLLECTIONS as readonly string[]).includes(value);
