import {
  FULL_SITE_PACKAGE_SCHEMA_VERSION,
  addDiagnostic,
  assertDenseArray,
  assertDesiredJsonDepthAndDensity,
  assertExactKeys,
  assertPackageByteSize,
  assertResourceCounts,
  assertStrictRootKeys,
  classifyForbiddenValue,
  compareFullSitePackageObjectKeys,
  compareFullSitePackageText,
  createDiagnosticCollector,
  isAllowedFullSitePackageSettingKey,
  isExplicitBinaryCarrier,
  isPrototypeSensitiveKey,
  isRecord,
  isSensitiveFieldKey,
  readBoundedString,
  readLocale,
  readPackageKey,
  type DiagnosticCollector,
} from "./schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_COLLECTIONS,
  FullSitePackageError,
  type FullSitePackageCompatibility,
  type FullSitePackageDiagnostic,
  type FullSitePackageResources,
  type FullSitePackageV1,
  type JsonObject,
  type JsonValue,
  type ResourceSeed,
  type VerificationPlan,
  type VisualResidual,
} from "./types";

const METADATA_KEYS = new Set(["name", "locale", "description"]);
const RESOURCE_KEYS = new Set<string>(PACKAGE_RESOURCE_COLLECTIONS);
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
const RESIDUAL_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;

type PackageProseField =
  | "prototypeEvidence"
  | "cmsConstraint"
  | "installedApproximation"
  | "userVisibleDifference"
  | "postInstallRemediation";

const RESIDUAL_PROSE_FIELDS = Object.freeze([
  "prototypeEvidence",
  "cmsConstraint",
  "installedApproximation",
  "userVisibleDifference",
  "postInstallRemediation",
] as const satisfies readonly PackageProseField[]);

const desiredDiagnosticPath = (collection: string, index: number): string =>
  `$.resources.${collection}[${index}].desired.[redacted]`;

const addDesiredDiagnostic = (
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>,
  collection: string,
  index: number,
  reason: string
): void => addDiagnostic(diagnostics, desiredDiagnosticPath(collection, index), reason);

const readSafeProse = (
  value: unknown,
  path: string,
  maxLength: number,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): string => {
  const prose = readBoundedString(value, path, maxLength, diagnostics);
  const reason = classifyForbiddenValue(value, { explicitBinaryCarrier: false });
  if (reason) addDiagnostic(diagnostics, path, reason);
  return prose;
};

const normalizeMetadata = (
  value: unknown,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): FullSitePackageV1["metadata"] => {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "$.metadata", "expected_object");
    return { name: "", locale: "" };
  }
  assertExactKeys(value, METADATA_KEYS, "$.metadata", diagnostics);
  const name = readSafeProse(
    value.name,
    "$.metadata.name",
    PACKAGE_LIMITS.metadataNameLength,
    diagnostics
  );
  const locale = readLocale(value.locale, "$.metadata.locale", diagnostics);
  const description =
    value.description === undefined
      ? undefined
      : readSafeProse(
          value.description,
          "$.metadata.description",
          PACKAGE_LIMITS.metadataDescriptionLength,
          diagnostics
        );
  return {
    name,
    locale,
    ...(description === undefined ? {} : { description }),
  };
};

type DesiredContext = Readonly<{
  collection: string;
  index: number;
  explicitBinaryCarrier: boolean;
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>;
}>;

const normalizeDesiredJsonValue = (value: unknown, context: DesiredContext): JsonValue => {
  const reason = classifyForbiddenValue(value, context);
  if (reason) {
    addDesiredDiagnostic(context.diagnostics, context.collection, context.index, reason);
    return null;
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addDesiredDiagnostic(
        context.diagnostics,
        context.collection,
        context.index,
        "non_finite_number"
      );
      return 0;
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "string") {
    if (value.length > PACKAGE_LIMITS.stringLength) {
      addDesiredDiagnostic(
        context.diagnostics,
        context.collection,
        context.index,
        "string_too_long"
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    const output: JsonValue[] = [];
    for (let itemIndex = 0; itemIndex < value.length; itemIndex += 1) {
      output.push(
        Object.prototype.hasOwnProperty.call(value, itemIndex)
          ? normalizeDesiredJsonValue(value[itemIndex], context)
          : null
      );
    }
    return output;
  }
  if (!isRecord(value)) {
    addDesiredDiagnostic(context.diagnostics, context.collection, context.index, "non_json_value");
    return null;
  }
  const output: JsonObject = {};
  for (const key of Object.keys(value).sort(compareFullSitePackageObjectKeys)) {
    if (isPrototypeSensitiveKey(key)) {
      addDesiredDiagnostic(
        context.diagnostics,
        context.collection,
        context.index,
        "prototype_key_forbidden"
      );
      continue;
    }
    if (isSensitiveFieldKey(key)) {
      addDesiredDiagnostic(
        context.diagnostics,
        context.collection,
        context.index,
        "secret_key_forbidden"
      );
      continue;
    }
    output[key] = normalizeDesiredJsonValue(value[key], {
      ...context,
      explicitBinaryCarrier: context.explicitBinaryCarrier || isExplicitBinaryCarrier(key),
    });
  }
  return output;
};

const normalizeSeed = (
  value: unknown,
  collection: string,
  index: number,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): ResourceSeed => {
  const path = `$.resources.${collection}[${index}]`;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, path, "expected_object");
    return { key: "", desired: {} };
  }
  assertExactKeys(value, SEED_KEYS, path, diagnostics);
  const isSetting = collection === "settings";
  const key = isSetting
    ? readBoundedString(value.key, `${path}.key`, PACKAGE_LIMITS.keyLength, diagnostics, {
        trim: false,
      })
    : readPackageKey(value.key, `${path}.key`, diagnostics);
  if (isSetting && !isAllowedFullSitePackageSettingKey(key)) {
    addDiagnostic(diagnostics, `${path}.key`, "setting_forbidden");
  }
  assertDesiredJsonDepthAndDensity(value.desired, diagnostics, `${path}.desired`);
  const directDesiredReason = classifyForbiddenValue(value.desired, {
    explicitBinaryCarrier: false,
  });
  if (directDesiredReason) {
    addDesiredDiagnostic(diagnostics, collection, index, directDesiredReason);
    return { key, desired: {} };
  }
  if (!isRecord(value.desired)) {
    addDiagnostic(diagnostics, `${path}.desired`, "expected_object");
    return { key, desired: {} };
  }
  return {
    key,
    desired: normalizeDesiredJsonValue(value.desired, {
      collection,
      index,
      explicitBinaryCarrier: false,
      diagnostics,
    }) as JsonObject,
  };
};

const emptyResources = (): FullSitePackageResources => ({
  contentTypes: [],
  forms: [],
  pageTemplates: [],
  listingTemplates: [],
  entries: [],
  listingQueries: [],
  detailPages: [],
  pages: [],
  menus: [],
  settings: [],
});

const normalizeResources = (
  value: unknown,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): FullSitePackageResources => {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "$.resources", "expected_object");
    return emptyResources();
  }
  assertExactKeys(value, RESOURCE_KEYS, "$.resources", diagnostics);
  assertResourceCounts(value, diagnostics);
  const output = emptyResources();
  for (const collection of PACKAGE_RESOURCE_COLLECTIONS) {
    const input = value[collection];
    if (!Array.isArray(input)) continue;
    assertDenseArray(input, `$.resources.${collection}`, diagnostics);
    const seeds: ResourceSeed[] = [];
    for (let index = 0; index < input.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(input, index)) continue;
      seeds.push(normalizeSeed(input[index], collection, index, diagnostics));
    }
    seeds.sort((left, right) => compareFullSitePackageText(left.key, right.key));
    output[collection] = seeds;
  }
  return output;
};

const normalizeImpact = (
  value: unknown,
  path: string,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): VisualResidual["impact"] => {
  const impact = isRecord(value) ? value : {};
  if (!isRecord(value)) addDiagnostic(diagnostics, path, "expected_object");
  assertExactKeys(impact, IMPACT_KEYS, path, diagnostics);
  for (const key of IMPACT_KEYS) {
    if (impact[key] !== false) addDiagnostic(diagnostics, `${path}.${key}`, "expected_false");
  }
  return {
    functional: false,
    accessibility: false,
    data: false,
    security: false,
    testIntegrity: false,
  };
};

const normalizeResidual = (
  value: unknown,
  inputIndex: number,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): VisualResidual => {
  const path = `$.compatibility.unresolvedVisuals[${inputIndex}]`;
  const residual = isRecord(value) ? value : {};
  if (!isRecord(value)) addDiagnostic(diagnostics, path, "expected_object");
  assertExactKeys(residual, RESIDUAL_KEYS, path, diagnostics);
  const prose = Object.fromEntries(
    RESIDUAL_PROSE_FIELDS.map((field) => [
      field,
      readSafeProse(
        residual[field],
        `${path}.${field}`,
        PACKAGE_LIMITS.residualTextLength,
        diagnostics
      ),
    ])
  ) as Record<PackageProseField, string>;
  return {
    id: readBoundedString(residual.id, `${path}.id`, PACKAGE_LIMITS.residualIdLength, diagnostics, {
      pattern: RESIDUAL_ID_PATTERN,
      trim: false,
    }),
    prototypeEvidence: prose.prototypeEvidence,
    cmsConstraint: prose.cmsConstraint,
    installedApproximation: prose.installedApproximation,
    userVisibleDifference: prose.userVisibleDifference,
    impact: normalizeImpact(residual.impact, `${path}.impact`, diagnostics),
    postInstallRemediation: prose.postInstallRemediation,
  };
};

const normalizeCompatibility = (
  value: unknown,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): FullSitePackageCompatibility | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "$.compatibility", "expected_object");
    return { unresolvedVisuals: [] };
  }
  assertExactKeys(value, COMPATIBILITY_KEYS, "$.compatibility", diagnostics);
  if (!Array.isArray(value.unresolvedVisuals)) {
    addDiagnostic(diagnostics, "$.compatibility.unresolvedVisuals", "expected_array");
    return { unresolvedVisuals: [] };
  }
  assertDenseArray(value.unresolvedVisuals, "$.compatibility.unresolvedVisuals", diagnostics);
  const residuals: VisualResidual[] = [];
  const identities = new Set<string>();
  for (let index = 0; index < value.unresolvedVisuals.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value.unresolvedVisuals, index)) continue;
    const residual = normalizeResidual(value.unresolvedVisuals[index], index, diagnostics);
    if (identities.has(residual.id)) {
      addDiagnostic(
        diagnostics,
        `$.compatibility.unresolvedVisuals[${index}].id`,
        "duplicate_residual_id"
      );
    }
    identities.add(residual.id);
    residuals.push(residual);
  }
  residuals.sort((left, right) => compareFullSitePackageText(left.id, right.id));
  return { unresolvedVisuals: residuals };
};

const normalizeVerification = (
  value: unknown,
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): VerificationPlan | undefined => {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "$.verification", "expected_object");
    return { scenarioIds: [] };
  }
  assertExactKeys(value, VERIFICATION_KEYS, "$.verification", diagnostics);
  if (!Array.isArray(value.scenarioIds)) {
    addDiagnostic(diagnostics, "$.verification.scenarioIds", "expected_array");
    return { scenarioIds: [] };
  }
  if (value.scenarioIds.length > PACKAGE_LIMITS.verificationScenarios) {
    throw new FullSitePackageError("site_package_too_complex", [
      {
        path: "$.verification.scenarioIds",
        reason: "scenario_count_exceeded",
      },
    ]);
  }
  assertDenseArray(value.scenarioIds, "$.verification.scenarioIds", diagnostics);
  const scenarioIds: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < value.scenarioIds.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value.scenarioIds, index)) continue;
    const scenarioId = readPackageKey(
      value.scenarioIds[index],
      `$.verification.scenarioIds[${index}]`,
      diagnostics
    );
    if (!seen.has(scenarioId)) {
      seen.add(scenarioId);
      scenarioIds.push(scenarioId);
    }
  }
  return { scenarioIds };
};

const throwCollectedDiagnostics = (
  diagnostics: DiagnosticCollector<FullSitePackageDiagnostic>
): void => {
  const batch = diagnostics.read();
  if (batch.overflowed) {
    throw new FullSitePackageError("site_package_too_complex", batch.diagnostics);
  }
  if (batch.diagnostics.length === 0) return;
  const code = batch.diagnostics.some((diagnostic) => diagnostic.reason === "setting_forbidden")
    ? "site_package_setting_forbidden"
    : "site_package_invalid";
  throw new FullSitePackageError(code, batch.diagnostics);
};

export const normalizeFullSitePackageForWrite = (value: unknown): FullSitePackageV1 => {
  assertPackageByteSize(value);
  if (!isRecord(value)) {
    throw new FullSitePackageError("site_package_invalid", [
      { path: "$", reason: "expected_object" },
    ]);
  }
  const diagnostics = createDiagnosticCollector<FullSitePackageDiagnostic>();
  assertStrictRootKeys(value, diagnostics);
  if (value.schemaVersion !== FULL_SITE_PACKAGE_SCHEMA_VERSION) {
    addDiagnostic(diagnostics, "$.schemaVersion", "unsupported_schema_version");
  }
  const key = readPackageKey(value.key, "$.key", diagnostics);
  const metadata = normalizeMetadata(value.metadata, diagnostics);
  const resources = normalizeResources(value.resources, diagnostics);
  const compatibility = normalizeCompatibility(value.compatibility, diagnostics);
  const verification = normalizeVerification(value.verification, diagnostics);
  throwCollectedDiagnostics(diagnostics);
  return {
    schemaVersion: 1,
    key,
    metadata,
    resources,
    ...(compatibility === undefined ? {} : { compatibility }),
    ...(verification === undefined ? {} : { verification }),
  };
};
