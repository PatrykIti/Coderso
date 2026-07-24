import {
  FULL_SITE_PACKAGE_ROOT_KEYS,
  FULL_SITE_PACKAGE_SCHEMA_VERSION,
  FULL_SITE_PACKAGE_SETTING_ALLOWLIST,
  DiagnosticCollector,
  assertExactKeys,
  assertPackageByteSize,
  assertResourceCounts,
  isRecord,
  normalizeJsonValue,
  readBoundedString,
  readLocale,
  readPackageKey,
} from "./schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  FullSitePackageError,
  type FullSitePackageCompatibility,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type ResourceSeed,
  type VerificationPlan,
  type VisualResidual,
} from "./types";

const METADATA_KEYS = new Set(["name", "locale", "description"]);
const SEED_KEYS = new Set(["key", "desired"]);
const COMPATIBILITY_KEYS = new Set(["unresolvedVisuals"]);
const RESIDUAL_KEYS = new Set([
  "id",
  "prototypeEvidence",
  "cmsConstraint",
  "installedApproximation",
  "userVisibleDifference",
  "impact",
  "postInstallRemediation",
]);
const IMPACT_KEYS = new Set(["functional", "accessibility", "data", "security", "testIntegrity"]);
const VERIFICATION_KEYS = new Set(["scenarioIds"]);

const normalizeMetadata = (
  value: unknown,
  diagnostics: DiagnosticCollector
): FullSitePackageV1["metadata"] => {
  if (!isRecord(value)) {
    diagnostics.add("$.metadata", "expected_object");
    return { name: "", locale: "" };
  }
  assertExactKeys(value, METADATA_KEYS, "$.metadata", diagnostics);
  const name = readBoundedString(
    value.name,
    "$.metadata.name",
    PACKAGE_LIMITS.metadataNameLength,
    diagnostics
  );
  const locale = readLocale(value.locale, "$.metadata.locale", diagnostics);
  const description =
    value.description === undefined
      ? undefined
      : readBoundedString(
          value.description,
          "$.metadata.description",
          PACKAGE_LIMITS.metadataDescriptionLength,
          diagnostics
        );
  return { name, locale, ...(description !== undefined ? { description } : {}) };
};

const normalizeSeed = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector,
  isSetting: boolean
): { seed: ResourceSeed; referenceEdges: number } => {
  if (!isRecord(value)) {
    diagnostics.add(path, "expected_object");
    return { seed: { key: "", desired: {} }, referenceEdges: 0 };
  }
  assertExactKeys(value, SEED_KEYS, path, diagnostics);
  const key =
    isSetting && typeof value.key === "string"
      ? value.key
      : readPackageKey(value.key, `${path}.key`, diagnostics);
  if (!isRecord(value.desired)) {
    diagnostics.add(`${path}.desired`, "expected_object");
    return { seed: { key, desired: {} }, referenceEdges: 0 };
  }
  const normalized = normalizeJsonValue(value.desired, `${path}.desired`, diagnostics);
  return {
    seed: { key, desired: normalized.value as JsonObject },
    referenceEdges: normalized.metrics.referenceEdges,
  };
};

const normalizeResources = (
  value: unknown,
  diagnostics: DiagnosticCollector
): { resources: FullSitePackageResources; referenceEdges: number } => {
  if (!isRecord(value)) {
    diagnostics.add("$.resources", "expected_object");
    return {
      resources: Object.fromEntries(
        PACKAGE_RESOURCE_COLLECTIONS.map((collection) => [collection, []])
      ) as unknown as FullSitePackageResources,
      referenceEdges: 0,
    };
  }
  assertExactKeys(value, new Set(PACKAGE_RESOURCE_COLLECTIONS), "$.resources", diagnostics);
  assertResourceCounts(value, diagnostics);
  let referenceEdges = 0;
  const resources = Object.fromEntries(
    PACKAGE_RESOURCE_COLLECTIONS.map((collection) => {
      const input = value[collection];
      if (!Array.isArray(input)) return [collection, []];
      const seeds = input.map((seed, index) => {
        const result = normalizeSeed(
          seed,
          `$.resources.${collection}[${index}]`,
          diagnostics,
          collection === "settings"
        );
        referenceEdges += result.referenceEdges;
        return result.seed;
      });
      seeds.sort((left, right) => left.key.localeCompare(right.key));
      return [collection, seeds];
    })
  ) as FullSitePackageResources;
  if (referenceEdges > PACKAGE_LIMITS.referenceEdges) {
    throw new FullSitePackageError("site_package_too_complex", [
      { path: "$.resources", reason: "reference_edges_exceeded" },
    ]);
  }
  return { resources, referenceEdges };
};

const readResidualText = (value: unknown, path: string, diagnostics: DiagnosticCollector): string =>
  readBoundedString(value, path, PACKAGE_LIMITS.residualTextLength, diagnostics);

const normalizeResidual = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector
): VisualResidual => {
  const residual = isRecord(value) ? value : {};
  if (!isRecord(value)) {
    diagnostics.add(path, "expected_object");
  }
  assertExactKeys(residual, RESIDUAL_KEYS, path, diagnostics);
  const impactValue = residual.impact;
  const impact = isRecord(impactValue) ? impactValue : {};
  if (!isRecord(impactValue)) diagnostics.add(`${path}.impact`, "expected_object");
  assertExactKeys(impact, IMPACT_KEYS, `${path}.impact`, diagnostics);
  for (const key of IMPACT_KEYS) {
    if (impact[key] !== false) diagnostics.add(`${path}.impact.${key}`, "expected_false");
  }
  return {
    id: readBoundedString(residual.id, `${path}.id`, PACKAGE_LIMITS.residualIdLength, diagnostics, {
      pattern: /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/,
    }),
    prototypeEvidence: readResidualText(
      residual.prototypeEvidence,
      `${path}.prototypeEvidence`,
      diagnostics
    ),
    cmsConstraint: readResidualText(residual.cmsConstraint, `${path}.cmsConstraint`, diagnostics),
    installedApproximation: readResidualText(
      residual.installedApproximation,
      `${path}.installedApproximation`,
      diagnostics
    ),
    userVisibleDifference: readResidualText(
      residual.userVisibleDifference,
      `${path}.userVisibleDifference`,
      diagnostics
    ),
    impact: {
      functional: false,
      accessibility: false,
      data: false,
      security: false,
      testIntegrity: false,
    },
    postInstallRemediation: readResidualText(
      residual.postInstallRemediation,
      `${path}.postInstallRemediation`,
      diagnostics
    ),
  };
};

const normalizeCompatibility = (
  value: unknown,
  diagnostics: DiagnosticCollector
): FullSitePackageCompatibility | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    diagnostics.add("$.compatibility", "expected_object");
    return { unresolvedVisuals: [] };
  }
  assertExactKeys(value, COMPATIBILITY_KEYS, "$.compatibility", diagnostics);
  if (!Array.isArray(value.unresolvedVisuals)) {
    diagnostics.add("$.compatibility.unresolvedVisuals", "expected_array");
    return { unresolvedVisuals: [] };
  }
  if (value.unresolvedVisuals.length > PACKAGE_LIMITS.diagnostics) {
    throw new FullSitePackageError("site_package_too_complex", [
      { path: "$.compatibility.unresolvedVisuals", reason: "residual_count_exceeded" },
    ]);
  }
  const unresolvedVisuals = value.unresolvedVisuals.map((residual, index) =>
    normalizeResidual(residual, `$.compatibility.unresolvedVisuals[${index}]`, diagnostics)
  );
  unresolvedVisuals.sort((left, right) => left.id.localeCompare(right.id));
  return { unresolvedVisuals };
};

const normalizeVerification = (
  value: unknown,
  diagnostics: DiagnosticCollector
): VerificationPlan | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    diagnostics.add("$.verification", "expected_object");
    return { scenarioIds: [] };
  }
  assertExactKeys(value, VERIFICATION_KEYS, "$.verification", diagnostics);
  if (!Array.isArray(value.scenarioIds)) {
    diagnostics.add("$.verification.scenarioIds", "expected_array");
    return { scenarioIds: [] };
  }
  if (value.scenarioIds.length > PACKAGE_LIMITS.verificationScenarios) {
    throw new FullSitePackageError("site_package_too_complex", [
      { path: "$.verification.scenarioIds", reason: "scenario_count_exceeded" },
    ]);
  }
  const scenarioIds = value.scenarioIds.map((scenarioId, index) =>
    readPackageKey(scenarioId, `$.verification.scenarioIds[${index}]`, diagnostics)
  );
  return { scenarioIds: [...new Set(scenarioIds)] };
};

const assertAllowedSettings = (
  resources: FullSitePackageResources,
  diagnostics: DiagnosticCollector
): void => {
  for (let index = 0; index < resources.settings.length; index += 1) {
    const setting = resources.settings[index];
    if (!FULL_SITE_PACKAGE_SETTING_ALLOWLIST.has(setting.key)) {
      diagnostics.add(`$.resources.settings[${index}].key`, "setting_forbidden");
    }
  }
};

export const normalizeFullSitePackageForWrite = (value: unknown): FullSitePackageV1 => {
  assertPackageByteSize(value);
  const diagnostics = new DiagnosticCollector();
  if (!isRecord(value)) {
    throw new FullSitePackageError("site_package_invalid", [
      { path: "$", reason: "expected_object" },
    ]);
  }
  assertExactKeys(value, FULL_SITE_PACKAGE_ROOT_KEYS, "$", diagnostics);
  if (value.schemaVersion !== FULL_SITE_PACKAGE_SCHEMA_VERSION) {
    diagnostics.add("$.schemaVersion", "unsupported_schema_version");
  }
  const key = readPackageKey(value.key, "$.key", diagnostics);
  const metadata = normalizeMetadata(value.metadata, diagnostics);
  const { resources } = normalizeResources(value.resources, diagnostics);
  assertAllowedSettings(resources, diagnostics);
  const compatibility = normalizeCompatibility(value.compatibility, diagnostics);
  const verification = normalizeVerification(value.verification, diagnostics);
  const forbiddenSetting = diagnostics.diagnostics.some(
    (diagnostic) => diagnostic.reason === "setting_forbidden"
  );
  diagnostics.throwIfAny(
    forbiddenSetting ? "site_package_setting_forbidden" : "site_package_invalid"
  );
  return {
    schemaVersion: 1,
    key,
    metadata,
    resources,
    ...(compatibility ? { compatibility } : {}),
    ...(verification ? { verification } : {}),
  };
};
