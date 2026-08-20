import { assistantActionTypes } from "../actionRegistry";
import type {
  BlueprintAdminContribution,
  BlueprintCapability,
  BlueprintGatedContribution,
  BlueprintMediaResourceMetadata,
  BlueprintPageSectionContribution,
  BlueprintProvide,
  BlueprintRequirement,
  BlueprintResourceContribution,
} from "./blueprintCapabilityTypes";

type JsonRecord = Record<string, unknown>;

const capabilityKeys = new Set([
  "id",
  "version",
  "label",
  "family",
  "description",
  "aliases",
  "provides",
  "requires",
  "resources",
  "pageSections",
  "adminSurfaces",
  "gated",
  "merge",
  "defaults",
]);

const provideKinds = new Set([
  "catalog",
  "full-service-site",
  "lead-capture",
  "product-inquiry",
  "editorial-content-hub",
  "booking",
  "checkout-payment",
  "public-detail-page",
] as const);

const requirementKinds = new Set(["capability", "resource", "permission"] as const);

const resourceKinds = new Set([
  "content-type",
  "content-route",
  "entry",
  "custom-screen",
  "listing-query",
  "listing-template",
  "page",
  "detail-page",
  "media",
  "form",
  "menu",
  "seo",
  "site-kit",
] as const);

const pageSectionKinds = new Set([
  "catalog-landing",
  "form-embed",
  "lead-capture-landing",
  "editorial-hub",
  "content-list",
] as const);

const adminSurfaceKinds = new Set([
  "custom-screen",
  "entries",
  "pages",
  "forms",
  "listings",
] as const);

const gatedKinds = new Set(["booking", "checkout-payment", "detail-page", "media-import"] as const);

const capabilityRoles = new Set(["primary", "adjunct", "gated"] as const);

const resourceStrategies = new Set(["dedupe-by-key", "primary-over-adjunct"] as const);
const pageStrategies = new Set(["merge-page-upsert", "keep-separate"] as const);
const gatedStrategies = new Set(["metadata-only", "needs-input"] as const);

const actionTypeSet = new Set<string>(assistantActionTypes);
const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const secretLikePattern = /(token|secret|password|api[-_]?key|credential|cookie|session|csrf)/i;
const unsafeMediaMetadataKeys = new Set([
  "upload",
  "uploadBytes",
  "bytes",
  "file",
  "files",
  "blob",
  "base64",
  "signedUrl",
  "assetUrl",
  "rawUrl",
]);

const fail = (): never => {
  throw new Error("assistant_blueprint_capability_invalid");
};

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const assertRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : fail());

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown) => {
  const text = typeof value === "string" ? value : fail();
  const trimmed = text.trim();
  if (!trimmed) fail();
  return trimmed;
};

const readOptionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  return readText(value);
};

const readBoolean = (value: unknown) => (typeof value === "boolean" ? value : fail());

const readFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : fail();

const readStringArray = (value: unknown) => {
  const entries = Array.isArray(value) ? value : fail();
  return entries.map((item) => readText(item));
};

const readRecordArray = (value: unknown) => {
  const entries = Array.isArray(value) ? value : fail();
  return entries.map((item) => assertRecord(item));
};

const readEnum = <T extends string>(value: unknown, allowed: Set<T>): T => {
  if (typeof value !== "string" || !allowed.has(value as T)) fail();
  return value as T;
};

const readStableId = (value: unknown) => {
  const id = readText(value);
  if (!stableIdPattern.test(id)) fail();
  return id;
};

const scanForSecretLikeKeys = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => scanForSecretLikeKeys(item));
  }
  return Object.entries(value).some(([key, nestedValue]) => {
    if (secretLikePattern.test(key)) return true;
    return scanForSecretLikeKeys(nestedValue);
  });
};

const assertNoDuplicateKeys = (keys: string[]) => {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) fail();
    seen.add(key);
  }
};

const normalizeProvide = (value: JsonRecord): BlueprintProvide => {
  assertKeys(value, new Set(["kind", "key", "label", "aliases"]));
  return {
    kind: readEnum(value.kind, provideKinds),
    key: readStableId(value.key),
    label: readText(value.label),
    ...(value.aliases !== undefined ? { aliases: readStringArray(value.aliases) } : {}),
  };
};

const normalizeRequirement = (value: JsonRecord): BlueprintRequirement => {
  assertKeys(value, new Set(["kind", "key", "label", "optional"]));
  return {
    kind: readEnum(value.kind, requirementKinds),
    key: readText(value.key),
    label: readText(value.label),
    ...(value.optional !== undefined ? { optional: readBoolean(value.optional) } : {}),
  };
};

const normalizeMediaMetadata = (value: JsonRecord): BlueprintMediaResourceMetadata => {
  assertKeys(
    value,
    new Set(["mode", "targetKinds", "field", "operation", "assetId", "candidateIds", "required"])
  );
  return {
    mode: readEnum(value.mode, new Set(["existing-asset-reference"] as const)),
    targetKinds: readStringArray(value.targetKinds).map((entry) =>
      readEnum(entry, new Set(["entry", "page", "widget"] as const))
    ),
    ...(value.field !== undefined ? { field: readOptionalText(value.field) } : {}),
    ...(value.operation !== undefined
      ? {
          operation: readEnum(
            value.operation,
            new Set(["attach", "replace", "remove-reference", "delete-asset"] as const)
          ),
        }
      : {}),
    ...(value.assetId !== undefined ? { assetId: readOptionalText(value.assetId) } : {}),
    ...(value.candidateIds !== undefined
      ? { candidateIds: readStringArray(value.candidateIds) }
      : {}),
    ...(value.required !== undefined ? { required: readBoolean(value.required) } : {}),
  };
};

const normalizeResource = (value: JsonRecord): BlueprintResourceContribution => {
  assertKeys(
    value,
    new Set([
      "key",
      "kind",
      "label",
      "executable",
      "actionTypes",
      "stableTarget",
      "owner",
      "metadata",
    ])
  );
  const kind = readEnum(value.kind, resourceKinds);
  const actionTypes = readStringArray(value.actionTypes).map((entry) => {
    if (!actionTypeSet.has(entry)) fail();
    return entry;
  }) as BlueprintResourceContribution["actionTypes"];
  const metadata =
    value.metadata === undefined
      ? undefined
      : (() => {
          const record = assertRecord(value.metadata);
          if (kind === "media") {
            for (const key of Object.keys(record)) {
              if (unsafeMediaMetadataKeys.has(key)) fail();
            }
            return normalizeMediaMetadata(record);
          }
          if (scanForSecretLikeKeys(record)) fail();
          return record;
        })();
  if (kind === "media" && metadata === undefined) fail();
  const executable = readBoolean(value.executable);
  const owner = readText(value.owner);
  if (
    kind === "detail-page" &&
    executable &&
    (actionTypes.length !== 1 ||
      actionTypes[0] !== "detail-page.upsert" ||
      owner !== "detail-page.upsert")
  ) {
    fail();
  }
  return {
    key: readText(value.key),
    kind,
    label: readText(value.label),
    executable,
    actionTypes,
    stableTarget: readText(value.stableTarget),
    owner,
    ...(metadata !== undefined ? { metadata } : {}),
  };
};

const normalizePageSection = (value: JsonRecord): BlueprintPageSectionContribution => {
  assertKeys(value, new Set(["key", "label", "slot", "kind"]));
  return {
    key: readText(value.key),
    label: readText(value.label),
    slot: readText(value.slot),
    kind: readEnum(value.kind, pageSectionKinds),
  };
};

const normalizeAdminSurface = (value: JsonRecord): BlueprintAdminContribution => {
  assertKeys(value, new Set(["key", "label", "surface", "routeHint"]));
  return {
    key: readText(value.key),
    label: readText(value.label),
    surface: readEnum(value.surface, adminSurfaceKinds),
    ...(value.routeHint !== undefined ? { routeHint: readOptionalText(value.routeHint) } : {}),
  };
};

const normalizeGatedContribution = (value: JsonRecord): BlueprintGatedContribution => {
  assertKeys(value, new Set(["key", "kind", "label", "reason", "blocking"]));
  return {
    key: readText(value.key),
    kind: readEnum(value.kind, gatedKinds),
    label: readText(value.label),
    reason: readText(value.reason),
    ...(value.blocking !== undefined ? { blocking: readBoolean(value.blocking) } : {}),
  };
};

const normalizeMergePolicy = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set(["role", "resourceStrategy", "pageStrategy", "gatedStrategy", "priority"])
  );
  return {
    role: readEnum(input.role, capabilityRoles),
    resourceStrategy: readEnum(input.resourceStrategy, resourceStrategies),
    pageStrategy: readEnum(input.pageStrategy, pageStrategies),
    gatedStrategy: readEnum(input.gatedStrategy, gatedStrategies),
    priority: readFiniteNumber(input.priority),
  };
};

export const normalizeBlueprintCapability = (value: unknown): BlueprintCapability => {
  const input = assertRecord(value);
  assertKeys(input, capabilityKeys);

  const provides = readRecordArray(input.provides).map(normalizeProvide);
  if (provides.length === 0) fail();
  const resources = readRecordArray(input.resources).map(normalizeResource);
  const gated = readRecordArray(input.gated ?? []).map(normalizeGatedContribution);
  const merge = normalizeMergePolicy(input.merge);
  const defaults = input.defaults === undefined ? undefined : assertRecord(input.defaults);

  if (defaults && scanForSecretLikeKeys(defaults)) fail();
  assertNoDuplicateKeys(resources.map((item) => item.key));
  assertNoDuplicateKeys(provides.map((item) => item.key));
  return {
    id: readStableId(input.id),
    version: readFiniteNumber(input.version) === 1 ? 1 : fail(),
    label: readText(input.label),
    family: readText(input.family),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.aliases !== undefined ? { aliases: readStringArray(input.aliases) } : {}),
    provides,
    requires: readRecordArray(input.requires ?? []).map(normalizeRequirement),
    resources,
    pageSections: readRecordArray(input.pageSections ?? []).map(normalizePageSection),
    adminSurfaces: readRecordArray(input.adminSurfaces ?? []).map(normalizeAdminSurface),
    gated,
    merge,
    ...(defaults ? { defaults } : {}),
  };
};

export const normalizeBlueprintCapabilities = (value: unknown): BlueprintCapability[] => {
  const entries = Array.isArray(value) ? value : fail();
  const capabilities = entries.map((entry: unknown) => normalizeBlueprintCapability(entry));
  assertNoDuplicateKeys(capabilities.map((item) => item.id));
  return capabilities;
};
