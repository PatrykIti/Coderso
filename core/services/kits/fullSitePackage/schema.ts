import {
  FULL_SITE_PACKAGE_SETTING_KEYS,
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  FullSitePackageError,
  type FullSitePackageDiagnostic,
  type JsonValue,
  type PackageResourceCollection,
} from "./types";
import {
  classifyForbiddenValue,
  inspectBase64FamilyLexeme,
  isActualBinaryValue,
  isExplicitBinaryCarrier,
  isSensitiveFieldKey,
  type Base64FamilyInspection,
  type PackageValueSecretReason,
} from "./valueSecurity";

export {
  classifyForbiddenValue,
  inspectBase64FamilyLexeme,
  isActualBinaryValue,
  isExplicitBinaryCarrier,
  isSensitiveFieldKey,
};
export type { Base64FamilyInspection, PackageValueSecretReason };

export const FULL_SITE_PACKAGE_SCHEMA_VERSION = 1 as const;

const PACKAGE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;
const LOCALE_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;
const ROOT_KEYS = new Set([
  "schemaVersion",
  "key",
  "metadata",
  "resources",
  "compatibility",
  "verification",
]);
const SETTING_KEYS = new Set<string>(FULL_SITE_PACKAGE_SETTING_KEYS);
const PROTOTYPE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export const compareFullSitePackageText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const toEcmaArrayIndex = (value: string): number | null => {
  if (!/^(?:0|[1-9][0-9]{0,9})$/.test(value)) return null;
  const index = Number(value);
  return index <= 4_294_967_294 && String(index) === value ? index : null;
};

export const compareFullSitePackageObjectKeys = (left: string, right: string): number => {
  const leftIndex = toEcmaArrayIndex(left);
  const rightIndex = toEcmaArrayIndex(right);
  if (leftIndex !== null && rightIndex !== null) return leftIndex - rightIndex;
  if (leftIndex !== null) return -1;
  if (rightIndex !== null) return 1;
  return compareFullSitePackageText(left, right);
};

export type DiagnosticLimitSingleton = Readonly<{
  path: "$.resources";
  reason: "diagnostic_limit_exceeded";
}>;

export type DiagnosticBatch<T> =
  | Readonly<{ overflowed: false; diagnostics: readonly T[] }>
  | Readonly<{
      overflowed: true;
      diagnostics: readonly [DiagnosticLimitSingleton];
    }>;

export type DiagnosticCollector<T = FullSitePackageDiagnostic> = Readonly<{
  add(diagnostic: T): void;
  read(): DiagnosticBatch<T>;
}>;

const DIAGNOSTIC_LIMIT_SINGLETON = Object.freeze({
  path: "$.resources",
  reason: "diagnostic_limit_exceeded",
} as const);

export const createDiagnosticCollector = <
  T = FullSitePackageDiagnostic,
>(): DiagnosticCollector<T> => {
  let diagnostics: T[] = [];
  let overflowed = false;
  return Object.freeze({
    add(diagnostic: T): void {
      if (overflowed) return;
      if (diagnostics.length === PACKAGE_LIMITS.diagnostics) {
        diagnostics = [];
        overflowed = true;
        return;
      }
      diagnostics.push(diagnostic);
    },
    read(): DiagnosticBatch<T> {
      if (overflowed) {
        return Object.freeze({
          overflowed: true,
          diagnostics: Object.freeze([DIAGNOSTIC_LIMIT_SINGLETON] as const),
        });
      }
      return Object.freeze({
        overflowed: false,
        diagnostics: Object.freeze([...diagnostics]),
      });
    },
  });
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  if (isActualBinaryValue(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

export const isPrototypeSensitiveKey = (key: string): boolean => PROTOTYPE_KEYS.has(key);

export const isCanonicalPackageKey = (value: string): boolean =>
  value.length <= PACKAGE_LIMITS.keyLength && PACKAGE_KEY_PATTERN.test(value);

export const isAllowedFullSitePackageSettingKey = (value: string): boolean =>
  SETTING_KEYS.has(value);

export const hasAllowedFullSitePackageRootKey = (value: string): boolean => ROOT_KEYS.has(value);

export const addDiagnostic = (
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>,
  path: string,
  reason: string
): void => diagnostics.add(Object.freeze({ path: path.slice(0, 240), reason }));

export const assertExactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => {
  for (const key of Object.keys(value)) {
    if (isPrototypeSensitiveKey(key)) {
      addDiagnostic(diagnostics, `${path}.[redacted]`, "prototype_key_forbidden");
    } else if (!allowed.has(key)) {
      addDiagnostic(diagnostics, `${path}.[redacted]`, "unknown_key");
    }
  }
};

export const assertStrictRootKeys = (
  value: Record<string, unknown>,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => assertExactKeys(value, ROOT_KEYS, "$", diagnostics);

export const readBoundedString = (
  value: unknown,
  path: string,
  maxLength: number,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>,
  options: Readonly<{ pattern?: RegExp; trim?: boolean }> = {}
): string => {
  if (typeof value !== "string") {
    addDiagnostic(diagnostics, path, "expected_string");
    return "";
  }
  const normalized = options.trim === false ? value : value.trim();
  if (normalized.length === 0) addDiagnostic(diagnostics, path, "empty_string");
  if (normalized.length > maxLength) addDiagnostic(diagnostics, path, "string_too_long");
  if (options.pattern && !options.pattern.test(normalized)) {
    addDiagnostic(diagnostics, path, "invalid_format");
  }
  return normalized;
};

export const readPackageKey = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): string =>
  readBoundedString(value, path, PACKAGE_LIMITS.keyLength, diagnostics, {
    pattern: PACKAGE_KEY_PATTERN,
    trim: false,
  });

export const readLocale = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): string =>
  readBoundedString(value, path, PACKAGE_LIMITS.metadataLocaleLength, diagnostics, {
    pattern: LOCALE_PATTERN,
  });

export const assertPackageByteSize = (value: unknown): void => {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = undefined;
  }
  if (serialized === undefined) {
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

export const isDenseArray = (value: readonly unknown[]): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
};

export const assertDenseArray = (
  value: readonly unknown[],
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => {
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      addDiagnostic(diagnostics, `${path}[${index}]`, "non_json_value");
    }
  }
};

export const assertResourceCounts = (
  resources: Record<string, unknown>,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => {
  let total = 0;
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    const value = resources[collection];
    if (!Array.isArray(value)) {
      addDiagnostic(diagnostics, `$.resources.${collection}`, "expected_array");
      continue;
    }
    total += value.length;
    if (value.length > PACKAGE_LIMITS.resourcesPerCollection) {
      throw new FullSitePackageError("site_package_too_large", [
        {
          path: `$.resources.${collection}`,
          reason: "collection_count_exceeded",
        },
      ]);
    }
  }
  if (total > PACKAGE_LIMITS.resourcesTotal) {
    throw new FullSitePackageError("site_package_too_large", [
      { path: "$.resources", reason: "resource_count_exceeded" },
    ]);
  }
};

const throwJsonDepthExceeded = (): never => {
  throw new FullSitePackageError("site_package_too_complex", [
    { path: "$.resources", reason: "json_depth_exceeded" },
  ]);
};

const preflightDesiredValue = (
  value: unknown,
  depth: number,
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => {
  if (depth > PACKAGE_LIMITS.depth) throwJsonDepthExceeded();
  if (isActualBinaryValue(value)) return;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const childDepth = depth + 1;
      if (childDepth > PACKAGE_LIMITS.depth) throwJsonDepthExceeded();
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        addDiagnostic(diagnostics, `${path}.[redacted]`, "non_json_value");
        continue;
      }
      preflightDesiredValue(value[index], childDepth, path, diagnostics);
    }
    return;
  }
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    const childDepth = depth + 1;
    if (childDepth > PACKAGE_LIMITS.depth) throwJsonDepthExceeded();
    preflightDesiredValue(value[key], childDepth, path, diagnostics);
  }
};

export const assertDesiredJsonDepthAndDensity = (
  value: unknown,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>,
  path: string
): void => preflightDesiredValue(value, 1, path, diagnostics);

export const canonicalizeJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(canonicalizeJsonValue);
  if (value === null || typeof value !== "object") {
    return typeof value === "number" && Object.is(value, -0) ? 0 : value;
  }
  const output: Record<string, JsonValue> = {};
  for (const key of Object.keys(value).sort(compareFullSitePackageObjectKeys)) {
    output[key] = canonicalizeJsonValue(value[key]);
  }
  return output;
};

export const isPackageResourceCollection = (value: string): value is PackageResourceCollection =>
  (PACKAGE_RESOURCE_COLLECTIONS as readonly string[]).includes(value);
