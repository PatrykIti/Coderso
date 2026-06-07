import type {
  AssistantActionPlan,
  AssistantActionPlanInspection,
  AssistantActionPlanResponseKind,
  AssistantActionPlanStatus,
  AssistantExecutableActionType,
  AssistantIntentFamily,
  AssistantActionPlanMetadata,
  AssistantPlanQuestion,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "./actionPlanTypes";
import { assertTrustedAssistantMediaReferences } from "./assistantMediaTrust";
import { getCuratedMediaAssetByUrl } from "../media/curatedMediaProfiles";
import { assistantActionTypes } from "./actionRegistry";
import {
  normalizeFormActionInput,
  type FormActionInput,
  type FormActionType,
} from "../forms/formActionsContract";
import { normalizeDetailPageDocument } from "../content/detailPageSchema";
import { customScreenCollectionRoleValues } from "../customScreens/customScreenSchemas";
import { normalizeOptionalDetailPageId } from "../settings/detailPageIdContract";
import {
  assistantSiteBuilderAdvancedHeroVariantIds,
  assistantSiteBuilderAdvancedMenuBehaviorIds,
  assistantSiteBuilderAdvancedSectionVariantIds,
  assistantSiteBuilderIntakeAnswerFieldControls,
  assistantSiteBuilderIntakeModes,
  assistantSiteBuilderIntakeOptionRegistryIds,
  assistantSiteBuilderIntakeStepIds,
  assistantSiteBuilderDesignPresetIds,
  assistantSiteBuilderPageRoleIds,
} from "./assistantSiteBuilderIntakeTypes";
import {
  resolveSiteBuilderIntakeAdvancedHeroVariant,
  resolveSiteBuilderIntakeAdvancedSectionVariant,
} from "./assistantSiteBuilderIntakeAdvancedOptions";
import {
  navigationMobileModeIds,
  navigationVariantIds,
} from "../../widgets/core/navigationContract";

type JsonRecord = Record<string, unknown>;

const planKeys = new Set([
  "id",
  "status",
  "intentId",
  "responseKind",
  "promptKind",
  "intentFamily",
  "metadata",
  "inspection",
  "title",
  "answer",
  "summary",
  "confidence",
  "assumptions",
  "questions",
  "actions",
]);

const promptKinds = new Set<AssistantPromptKind>([
  "docs_question",
  "setup_request",
  "refinement_request",
  "unknown",
]);

const intentFamilies = new Set<AssistantIntentFamily>([
  "catalog_showcase",
  "product_catalog",
  "portfolio_projects",
  "services_directory",
  "service_business_full_site",
  "lead_capture_site",
  "booking_service",
  "editorial_content_hub",
  "site_kit",
  "unknown",
]);

const responseKinds = new Set<AssistantActionPlanResponseKind>([
  "action_plan",
  "inspection",
  "needs_input",
  "docs",
  "gated",
]);

const safeFormAutomationActionTypes = new Set<FormActionType>([
  "email",
  "entry_sync",
  "redirect",
  "success_message",
]);

const actionTypes = new Set<AssistantExecutableActionType>(assistantActionTypes);
const blueprintCompositionResourceKinds = new Set([
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
  "widget-template",
  "site-kit",
] as const);
const blueprintCompositionRoles = new Set(["primary", "adjunct", "gated"] as const);
const blueprintCompositionMatchStatuses = new Set(["matched", "unresolved"] as const);
const blueprintCompositionConflictSeverities = new Set(["warning", "error"] as const);
const advancedMenuBehaviorIds = new Set(assistantSiteBuilderAdvancedMenuBehaviorIds);
const advancedHeroVariantIds = new Set(assistantSiteBuilderAdvancedHeroVariantIds);
const advancedSectionVariantIds = new Set(assistantSiteBuilderAdvancedSectionVariantIds);
const advancedNavigationVariantIds = new Set(navigationVariantIds);
const advancedNavigationMobileModes = new Set(navigationMobileModeIds);
const siteBuilderDesignPresetIds = new Set(assistantSiteBuilderDesignPresetIds);
const siteBuilderPageRoleIds = new Set(assistantSiteBuilderPageRoleIds);
const secretLikeMetadataPattern =
  /\b[\w.-]*(token|secret|password|api[-_]?key|credential|cookie|session|csrf|authorization|bearer)[\w.-]*\b/gi;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (): never => {
  throw new Error("assistant_action_plan_invalid");
};

const assertRecord = (value: unknown): JsonRecord => (isRecord(value) ? value : fail());

const assertTrustedMediaReferences = (
  value: unknown,
  options?: Parameters<typeof assertTrustedAssistantMediaReferences>[2]
) => {
  try {
    assertTrustedAssistantMediaReferences(value, [], options);
  } catch (error) {
    if (error instanceof Error && error.message === "assistant_media_reference_untrusted") fail();
    throw error;
  }
};

const readOptionalCuratedMetadata = (values: JsonRecord, key: string) => {
  const value = values[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return fail();
  const trimmed = value.trim();
  if (!trimmed) fail();
  return trimmed;
};

const assertTrustedCuratedMediaMetadata = (values: JsonRecord) => {
  const coverImageUrl = readOptionalCuratedMetadata(values, "coverImageUrl");
  const sourceUrl = readOptionalCuratedMetadata(values, "coverImageSourceUrl");
  const licenseUrl = readOptionalCuratedMetadata(values, "coverImageLicenseUrl");
  const sourceName = readOptionalCuratedMetadata(values, "coverImageSourceName");
  const licenseName = readOptionalCuratedMetadata(values, "coverImageLicenseName");
  const asset = coverImageUrl ? getCuratedMediaAssetByUrl(coverImageUrl) : null;
  if (!asset) {
    if (sourceUrl || licenseUrl || sourceName || licenseName) return fail();
    return;
  }
  if (!sourceUrl || !licenseUrl || !sourceName || !licenseName) return fail();
  if (sourceUrl && sourceUrl !== asset.sourceUrl) fail();
  if (licenseUrl && licenseUrl !== asset.licenseUrl) fail();
  if (sourceName && sourceName !== asset.sourceName) fail();
  if (licenseName && licenseName !== asset.licenseName) fail();
};

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readText = (value: unknown) => {
  if (typeof value !== "string") {
    fail();
  }
  const text = value as string;
  const trimmed = text.trim();
  if (!trimmed) fail();
  return trimmed;
};

const readOptionalText = (value: unknown) => {
  if (value === undefined || value === null) return null;
  return readText(value);
};

const readOptionalContentRouteDetailPageId = (value: unknown) => {
  try {
    return normalizeOptionalDetailPageId(value);
  } catch {
    fail();
  }
};

const redactMetadataText = (value: string) =>
  value.replace(secretLikeMetadataPattern, "[redacted]");

const readMetadataText = (value: unknown) => redactMetadataText(readText(value));

const readOptionalMetadataText = (value: unknown) => {
  const text = readOptionalText(value);
  return text === null ? null : redactMetadataText(text);
};

const readBoolean = (value: unknown) => (typeof value === "boolean" ? value : fail());

const readOptionalBoolean = (value: unknown) => {
  if (value === undefined) return undefined;
  return readBoolean(value);
};

const readFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : fail();

const readOptionalFiniteNumber = (value: unknown) => {
  if (value === undefined) return undefined;
  return readFiniteNumber(value);
};

const readOptionalRecord = (value: unknown) => {
  if (value === undefined) return undefined;
  return assertRecord(value);
};

const readStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => readText(item)) : fail();

const readMetadataStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => readMetadataText(item)) : fail();

const readOptionalStringArray = (value: unknown) => {
  if (value === undefined) return undefined;
  return readStringArray(value);
};

const readRecordArray = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(assertRecord) : fail();

const readEnum = <T extends string>(value: unknown, allowed: Set<T>): T => {
  if (typeof value !== "string" || !allowed.has(value as T)) fail();
  return value as T;
};

const readOptionalEnum = <T extends string>(value: unknown, allowed: Set<T>) => {
  if (value === undefined) return undefined;
  return readEnum(value, allowed);
};

const readOptionalNullableEnum = <T extends string>(value: unknown, allowed: Set<T>) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return readEnum(value, allowed);
};

const normalizeConfidence = (value: unknown) => Math.max(0, Math.min(1, readFiniteNumber(value)));

const normalizeQuestions = (value: unknown) =>
  readRecordArray(value).map((question) => {
    assertKeys(question, new Set(["id", "label", "description", "required"]));
    return {
      id: readText(question.id),
      label: readText(question.label),
      description: readText(question.description),
      required: readBoolean(question.required),
    };
  });

const normalizeBlueprintCompositionConflictMetadata = (value: unknown) => {
  const conflict = assertRecord(value);
  assertKeys(
    conflict,
    new Set(["code", "severity", "message", "capabilityId", "resourceKey", "actionType"])
  );
  return {
    code: readMetadataText(conflict.code),
    severity: readEnum(conflict.severity, blueprintCompositionConflictSeverities),
    message: readMetadataText(conflict.message),
    ...(conflict.capabilityId !== undefined
      ? { capabilityId: readOptionalMetadataText(conflict.capabilityId) }
      : {}),
    ...(conflict.resourceKey !== undefined
      ? { resourceKey: readOptionalMetadataText(conflict.resourceKey) }
      : {}),
    ...(conflict.actionType !== undefined
      ? { actionType: readOptionalNullableEnum(conflict.actionType, actionTypes) }
      : {}),
  };
};

const normalizeBlueprintCompositionMetadata = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "schemaVersion",
      "kind",
      "primaryCapabilityId",
      "adjunctCapabilityIds",
      "gatedCapabilityIds",
      "mergedResources",
      "existingResourceMatches",
      "resolvedConflicts",
      "unresolvedConflicts",
      "diagnostics",
    ])
  );
  if (readFiniteNumber(input.schemaVersion) !== 1) fail();
  const mergedResources = readRecordArray(input.mergedResources).map((resource) => {
    assertKeys(resource, new Set(["key", "kind", "sourceCapabilityIds"]));
    return {
      key: readMetadataText(resource.key),
      kind: readEnum(resource.kind, blueprintCompositionResourceKinds),
      sourceCapabilityIds: readMetadataStringArray(resource.sourceCapabilityIds),
    };
  });
  const existingResourceMatches = readRecordArray(input.existingResourceMatches).map((match) => {
    assertKeys(
      match,
      new Set([
        "actionId",
        "actionType",
        "resourceKey",
        "existingId",
        "status",
        "reason",
        "candidateIds",
      ])
    );
    return {
      actionId: readOptionalMetadataText(match.actionId),
      actionType: readOptionalNullableEnum(match.actionType, actionTypes) ?? null,
      resourceKey: readMetadataText(match.resourceKey),
      existingId: readOptionalMetadataText(match.existingId),
      status: readEnum(match.status, blueprintCompositionMatchStatuses),
      reason: readOptionalMetadataText(match.reason),
      candidateIds: readMetadataStringArray(match.candidateIds),
    };
  });
  const diagnostics =
    input.diagnostics === undefined
      ? undefined
      : (() => {
          const diagnosticsInput = assertRecord(input.diagnostics);
          assertKeys(diagnosticsInput, new Set(["candidateScores"]));
          return {
            ...(diagnosticsInput.candidateScores !== undefined
              ? {
                  candidateScores: readRecordArray(diagnosticsInput.candidateScores).map(
                    (candidate) => {
                      assertKeys(candidate, new Set(["id", "role", "score", "reasons"]));
                      return {
                        id: readMetadataText(candidate.id),
                        role: readEnum(candidate.role, blueprintCompositionRoles),
                        score: readFiniteNumber(candidate.score),
                        reasons: readMetadataStringArray(candidate.reasons),
                      };
                    }
                  ),
                }
              : {}),
          };
        })();

  return {
    schemaVersion: 1 as const,
    kind: readEnum(input.kind, new Set(["blueprint-composition"] as const)),
    primaryCapabilityId: readMetadataText(input.primaryCapabilityId),
    adjunctCapabilityIds: readMetadataStringArray(input.adjunctCapabilityIds),
    gatedCapabilityIds: readMetadataStringArray(input.gatedCapabilityIds),
    mergedResources,
    existingResourceMatches,
    resolvedConflicts: readRecordArray(input.resolvedConflicts).map(
      normalizeBlueprintCompositionConflictMetadata
    ),
    unresolvedConflicts: readRecordArray(input.unresolvedConflicts).map(
      normalizeBlueprintCompositionConflictMetadata
    ),
    ...(diagnostics !== undefined ? { diagnostics } : {}),
  };
};

const launchReadinessStatuses = new Set(["satisfied", "pending_execute", "gated"] as const);
const siteBuilderIntakeModes = new Set(assistantSiteBuilderIntakeModes);
const siteBuilderIntakeStepIds = new Set(assistantSiteBuilderIntakeStepIds);
const siteBuilderIntakeOptionRegistryIds = new Set(assistantSiteBuilderIntakeOptionRegistryIds);
const siteBuilderIntakeAnswerFieldControls = new Set(assistantSiteBuilderIntakeAnswerFieldControls);
const siteBuilderIntakeStatuses = new Set(["needs_input", "ready_for_execution"] as const);

const readNullableSiteBuilderIntakeStepId = (value: unknown) => {
  if (value === null) return null;
  return readEnum(value, siteBuilderIntakeStepIds);
};

const readNullableSiteBuilderIntakeOptionRegistryId = (value: unknown) => {
  if (value === null) return null;
  return readEnum(value, siteBuilderIntakeOptionRegistryIds);
};

const readNullableMetadataText = (value: unknown) => {
  if (value === null) return null;
  return readMetadataText(value);
};

const readNullableFiniteNumber = (value: unknown) => {
  if (value === null) return null;
  return readFiniteNumber(value);
};

const normalizeSiteBuilderIntakeAnswerOptionMetadata = (value: unknown) => {
  const option = assertRecord(value);
  assertKeys(option, new Set(["id", "label", "description"]));
  return {
    id: readMetadataText(option.id),
    label: readMetadataText(option.label),
    description: readMetadataText(option.description),
  };
};

const normalizeSiteBuilderIntakeAnswerFieldMetadata = (value: unknown) => {
  const field = assertRecord(value);
  assertKeys(
    field,
    new Set([
      "key",
      "label",
      "description",
      "control",
      "required",
      "requiredGroupId",
      "maxLength",
      "maxItems",
      "optionRegistryId",
      "options",
    ])
  );
  return {
    key: readMetadataText(field.key),
    label: readMetadataText(field.label),
    description: readMetadataText(field.description),
    control: readEnum(field.control, siteBuilderIntakeAnswerFieldControls),
    required: readBoolean(field.required),
    requiredGroupId: readNullableMetadataText(field.requiredGroupId),
    maxLength: readNullableFiniteNumber(field.maxLength),
    maxItems: readNullableFiniteNumber(field.maxItems),
    optionRegistryId: readNullableSiteBuilderIntakeOptionRegistryId(field.optionRegistryId),
    options: readRecordArray(field.options).map(normalizeSiteBuilderIntakeAnswerOptionMetadata),
  };
};

const normalizeSiteBuilderIntakeStepMetadata = (value: unknown) => {
  const step = assertRecord(value);
  assertKeys(
    step,
    new Set([
      "id",
      "label",
      "description",
      "required",
      "optionRegistryId",
      "position",
      "total",
      "answerFields",
    ])
  );
  return {
    id: readEnum(step.id, siteBuilderIntakeStepIds),
    label: readMetadataText(step.label),
    description: readMetadataText(step.description),
    required: readBoolean(step.required),
    optionRegistryId: readNullableSiteBuilderIntakeOptionRegistryId(step.optionRegistryId),
    position: readFiniteNumber(step.position),
    total: readFiniteNumber(step.total),
    answerFields: readRecordArray(step.answerFields).map(
      normalizeSiteBuilderIntakeAnswerFieldMetadata
    ),
  };
};

const normalizeSiteBuilderIntakeMetadata = (
  value: unknown
): AssistantActionPlanMetadata["siteBuilderIntake"] => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "schemaVersion",
      "mode",
      "status",
      "currentStepId",
      "nextStepId",
      "visibleStepIds",
      "answeredStepIds",
      "missingRequiredStepIds",
      "canReview",
      "canExecute",
      "steps",
    ])
  );
  if (readFiniteNumber(input.schemaVersion) !== 1) fail();
  return {
    schemaVersion: 1,
    mode: readEnum(input.mode, siteBuilderIntakeModes),
    status: readEnum(input.status, siteBuilderIntakeStatuses),
    currentStepId: readEnum(input.currentStepId, siteBuilderIntakeStepIds),
    nextStepId: readNullableSiteBuilderIntakeStepId(input.nextStepId),
    visibleStepIds: readStringArray(input.visibleStepIds).map((stepId) =>
      readEnum(stepId, siteBuilderIntakeStepIds)
    ),
    answeredStepIds: readStringArray(input.answeredStepIds).map((stepId) =>
      readEnum(stepId, siteBuilderIntakeStepIds)
    ),
    missingRequiredStepIds: readStringArray(input.missingRequiredStepIds).map((stepId) =>
      readEnum(stepId, siteBuilderIntakeStepIds)
    ),
    canReview: readBoolean(input.canReview),
    canExecute: readBoolean(input.canExecute),
    steps: readRecordArray(input.steps).map(normalizeSiteBuilderIntakeStepMetadata),
  };
};

const normalizeLaunchReadinessMetadata = (
  value: unknown
): AssistantActionPlanMetadata["launchReadiness"] => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "schemaVersion",
      "kind",
      "requiredPages",
      "requiredCatalogs",
      "requiredMediaPages",
      "minimumPublishedEntries",
      "checks",
    ])
  );
  if (readFiniteNumber(input.schemaVersion) !== 1) fail();
  const minimumsInput = assertRecord(input.minimumPublishedEntries);
  const minimumPublishedEntries = Object.fromEntries(
    Object.entries(minimumsInput).map(([key, minimum]) => [
      redactMetadataText(readText(key)),
      readFiniteNumber(minimum),
    ])
  );
  const checks = readRecordArray(input.checks).map((check) => {
    assertKeys(check, new Set(["id", "label", "status", "evidence", "gates"]));
    return {
      id: readMetadataText(check.id),
      label: readMetadataText(check.label),
      status: readEnum(check.status, launchReadinessStatuses),
      evidence: readMetadataStringArray(check.evidence),
      gates: readMetadataStringArray(check.gates),
    };
  });

  return {
    schemaVersion: 1 as const,
    kind: readEnum(input.kind, new Set(["full-service-site"] as const)),
    requiredPages: readMetadataStringArray(input.requiredPages),
    requiredCatalogs: readMetadataStringArray(input.requiredCatalogs),
    ...(input.requiredMediaPages !== undefined
      ? { requiredMediaPages: readMetadataStringArray(input.requiredMediaPages) }
      : {}),
    minimumPublishedEntries,
    checks,
  };
};

const normalizePlanMetadata = (value: unknown): AssistantActionPlanMetadata | undefined => {
  if (value === undefined) return undefined;
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "planner",
      "providerDraftUsed",
      "providerId",
      "blueprintComposition",
      "launchReadiness",
      "siteBuilderIntake",
      "blueprintShadow",
    ])
  );
  const blueprintShadow =
    input.blueprintShadow === undefined
      ? undefined
      : (() => {
          const shadow = assertRecord(input.blueprintShadow);
          assertKeys(
            shadow,
            new Set([
              "schemaVersion",
              "currentIntentId",
              "currentIntentFamily",
              "primaryCapabilityId",
              "adjunctCapabilityIds",
              "gatedCapabilityIds",
              "candidates",
              "mismatchReason",
            ])
          );
          const shadowSchemaVersion = readFiniteNumber(shadow.schemaVersion);
          if (shadowSchemaVersion !== 1) fail();
          const candidates = readRecordArray(shadow.candidates).map((candidate) => {
            assertKeys(
              candidate,
              new Set(["capabilityId", "role", "score", "matchedSignals", "reasons"])
            );
            return {
              capabilityId: readText(candidate.capabilityId),
              role: readEnum(
                candidate.role,
                new Set<"primary" | "adjunct" | "gated">(["primary", "adjunct", "gated"])
              ),
              score: readFiniteNumber(candidate.score),
              matchedSignals: readStringArray(candidate.matchedSignals),
              reasons: readStringArray(candidate.reasons),
            };
          });
          return {
            schemaVersion: 1 as const,
            currentIntentId: readText(shadow.currentIntentId),
            currentIntentFamily:
              readOptionalEnum(shadow.currentIntentFamily, intentFamilies) ?? null,
            primaryCapabilityId: readOptionalText(shadow.primaryCapabilityId),
            adjunctCapabilityIds: readStringArray(shadow.adjunctCapabilityIds),
            gatedCapabilityIds: readStringArray(shadow.gatedCapabilityIds),
            candidates,
            mismatchReason: readOptionalText(shadow.mismatchReason),
          };
        })();
  return {
    planner: readEnum(input.planner, new Set(["local", "provider", "fallback"])),
    providerDraftUsed: readBoolean(input.providerDraftUsed),
    ...(input.providerId !== undefined ? { providerId: readOptionalText(input.providerId) } : {}),
    ...(input.blueprintComposition !== undefined
      ? { blueprintComposition: normalizeBlueprintCompositionMetadata(input.blueprintComposition) }
      : {}),
    ...(input.launchReadiness !== undefined
      ? { launchReadiness: normalizeLaunchReadinessMetadata(input.launchReadiness) }
      : {}),
    ...(input.siteBuilderIntake !== undefined
      ? { siteBuilderIntake: normalizeSiteBuilderIntakeMetadata(input.siteBuilderIntake) }
      : {}),
    ...(blueprintShadow !== undefined ? { blueprintShadow } : {}),
  };
};

const normalizePlanInspection = (value: unknown): AssistantActionPlanInspection | undefined => {
  if (value === undefined) return undefined;
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "kind",
      "operation",
      "resourceKind",
      "matchStatus",
      "query",
      "candidates",
      "truncated",
    ])
  );
  const candidates = readRecordArray(input.candidates).map((candidate) => {
    assertKeys(candidate, new Set(["kind", "id", "label", "slug", "status", "adminHref"]));
    return {
      kind: readText(candidate.kind),
      id: readText(candidate.id),
      label: readText(candidate.label),
      ...(candidate.slug !== undefined ? { slug: readOptionalText(candidate.slug) } : {}),
      ...(candidate.status !== undefined ? { status: readOptionalText(candidate.status) } : {}),
      ...(candidate.adminHref !== undefined
        ? { adminHref: readOptionalText(candidate.adminHref) }
        : {}),
    };
  });
  return {
    kind: readEnum(input.kind, new Set(["resource-candidates"])),
    operation: readEnum(input.operation, new Set(["inspect", "find"])),
    resourceKind: readText(input.resourceKind),
    matchStatus: readEnum(
      input.matchStatus,
      new Set(["matched", "no_match", "ambiguous", "unsupported"])
    ),
    query: readOptionalText(input.query),
    candidates,
    truncated: readBoolean(input.truncated),
  };
};

const normalizeSort = (value: unknown) =>
  readRecordArray(value).map((item) => {
    assertKeys(item, new Set(["field", "dir"]));
    return {
      field: readText(item.field),
      dir: readEnum(item.dir, new Set(["asc", "desc"])),
    };
  });

const normalizeContentRouteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["typeSlug", "listPath", "detailPath", "enabled", "detailPageId"]));
  return {
    typeSlug: readText(input.typeSlug),
    listPath: readText(input.listPath),
    detailPath: readText(input.detailPath),
    enabled: readBoolean(input.enabled),
    ...(Object.prototype.hasOwnProperty.call(input, "detailPageId")
      ? { detailPageId: readOptionalContentRouteDetailPageId(input.detailPageId) }
      : {}),
  };
};

const normalizeContentTypeInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["slug", "name", "schema"]));
  return {
    slug: readText(input.slug),
    name: readText(input.name),
    schema: assertRecord(input.schema),
  };
};

const normalizeContentTypeDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedEntryCount"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedEntryCount !== undefined
      ? { expectedEntryCount: readOptionalFiniteNumber(input.expectedEntryCount) }
      : {}),
  };
};

const normalizeCustomScreenInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "name",
      "contentTypeSlug",
      "status",
      "collectionRole",
      "compositionKey",
      "showInSidebar",
      "sidebarLabel",
      "blocks",
      "bindings",
    ])
  );
  return {
    name: readText(input.name),
    contentTypeSlug: readText(input.contentTypeSlug),
    status: readEnum(input.status, new Set(["draft", "active"])),
    ...(Object.prototype.hasOwnProperty.call(input, "collectionRole")
      ? {
          collectionRole: readOptionalNullableEnum(
            input.collectionRole,
            new Set(customScreenCollectionRoleValues)
          ),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "compositionKey")
      ? { compositionKey: readOptionalText(input.compositionKey) }
      : {}),
    showInSidebar: readBoolean(input.showInSidebar),
    sidebarLabel: readOptionalText(input.sidebarLabel),
    blocks: readRecordArray(input.blocks),
    bindings: readRecordArray(input.bindings),
  };
};

const normalizeCustomScreenDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedNamePrefix"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedNamePrefix !== undefined
      ? { expectedNamePrefix: readOptionalText(input.expectedNamePrefix) }
      : {}),
  };
};

const normalizeCustomScreenBindingPatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["widgetId", "propPath", "field", "mode"]));
  return {
    widgetId: readText(input.widgetId),
    propPath: readText(input.propPath),
    field: readText(input.field),
    mode: readEnum(input.mode, new Set(["read", "write", "readwrite"])),
  };
};

const normalizeCustomScreenUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "name",
      "status",
      "collectionRole",
      "compositionKey",
      "showInSidebar",
      "sidebarLabel",
      "binding",
    ])
  );
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "active"])) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "collectionRole")
      ? {
          collectionRole: readOptionalNullableEnum(
            input.collectionRole,
            new Set(customScreenCollectionRoleValues)
          ),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "compositionKey")
      ? { compositionKey: readOptionalText(input.compositionKey) }
      : {}),
    ...(input.showInSidebar !== undefined
      ? { showInSidebar: readBoolean(input.showInSidebar) }
      : {}),
    ...(input.sidebarLabel !== undefined
      ? { sidebarLabel: readOptionalText(input.sidebarLabel) }
      : {}),
    ...(input.binding !== undefined
      ? { binding: normalizeCustomScreenBindingPatch(input.binding) }
      : {}),
  };
};

const normalizeCustomScreenUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedStatus", "expectedContentTypeId", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    ...(input.expectedContentTypeId !== undefined
      ? { expectedContentTypeId: readOptionalText(input.expectedContentTypeId) }
      : {}),
    patch: normalizeCustomScreenUpdatePatch(input.patch),
  };
};

const normalizeCustomScreenWidgetPatchInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "name", "expectedStatus", "blockId", "expectedBlockType", "dataPath", "value"])
  );
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    blockId: readText(input.blockId),
    ...(input.expectedBlockType !== undefined
      ? { expectedBlockType: readOptionalText(input.expectedBlockType) }
      : {}),
    dataPath: normalizeDataPath(input.dataPath),
    value: normalizePatchValue(input.value),
  };
};

const normalizeListingQueryInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["name", "description", "contentTypeSlug", "fields", "includeDrafts", "limit", "sort"])
  );
  return {
    name: readText(input.name),
    description: readOptionalText(input.description),
    contentTypeSlug: readText(input.contentTypeSlug),
    fields: readStringArray(input.fields),
    includeDrafts: readBoolean(input.includeDrafts),
    limit: readFiniteNumber(input.limit),
    sort: normalizeSort(input.sort),
  };
};

const normalizeListingQueryDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
  };
};

const normalizeListingQueryUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["name", "description", "limit", "includeDrafts"]));
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.limit !== undefined ? { limit: readFiniteNumber(input.limit) } : {}),
    ...(input.includeDrafts !== undefined
      ? { includeDrafts: readBoolean(input.includeDrafts) }
      : {}),
  };
};

const normalizeListingQueryUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    patch: normalizeListingQueryUpdatePatch(input.patch),
  };
};

const normalizeListingTemplateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["name", "slug", "description", "layout", "config"]));
  return {
    name: readText(input.name),
    slug: readText(input.slug),
    description: readOptionalText(input.description),
    layout: readEnum(input.layout, new Set(["grid", "list", "table", "calendar", "map"])),
    config: assertRecord(input.config),
  };
};

const normalizeListingTemplateDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedLayout"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedLayout !== undefined
      ? { expectedLayout: readOptionalText(input.expectedLayout) }
      : {}),
  };
};

const normalizeListingTemplateUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["name", "slug", "description", "layout", "card"]));
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.slug !== undefined ? { slug: readText(input.slug) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.layout !== undefined
      ? { layout: readEnum(input.layout, new Set(["grid", "list", "table", "calendar", "map"])) }
      : {}),
    ...(input.card !== undefined ? { card: assertRecord(input.card) } : {}),
  };
};

const normalizeListingTemplateUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedLayout", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedLayout !== undefined
      ? { expectedLayout: readOptionalText(input.expectedLayout) }
      : {}),
    patch: normalizeListingTemplateUpdatePatch(input.patch),
  };
};

const normalizeFormInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "name",
      "slug",
      "status",
      "description",
      "successMessage",
      "submissionAccess",
      "fields",
    ])
  );
  return {
    name: readText(input.name),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["draft", "published", "archived"])),
    description: readOptionalText(input.description),
    successMessage: readOptionalText(input.successMessage),
    submissionAccess: readEnum(input.submissionAccess, new Set(["public", "internal"])),
    fields: readRecordArray(input.fields),
  };
};

const normalizeFormDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedStatus"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const normalizeFormUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "name",
      "slug",
      "status",
      "description",
      "successMessage",
      "successRedirectUrl",
      "submissionAccess",
    ])
  );
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.slug !== undefined ? { slug: readText(input.slug) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published", "archived"])) }
      : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.successMessage !== undefined
      ? { successMessage: readOptionalText(input.successMessage) }
      : {}),
    ...(input.successRedirectUrl !== undefined
      ? { successRedirectUrl: readOptionalText(input.successRedirectUrl) }
      : {}),
    ...(input.submissionAccess !== undefined
      ? { submissionAccess: readEnum(input.submissionAccess, new Set(["public", "internal"])) }
      : {}),
  };
};

const normalizeFormUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "slug", "expectedStatus", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    slug: readText(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    patch: normalizeFormUpdatePatch(input.patch),
  };
};

const normalizeEntryUpsertDraftInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["contentTypeSlug", "title", "slug", "values"]));
  const values = assertRecord(input.values);
  assertTrustedMediaReferences(values, { allowCuratedTextUrlFields: true });
  assertTrustedCuratedMediaMetadata(values);
  return {
    contentTypeSlug: readText(input.contentTypeSlug),
    title: readText(input.title),
    slug: readText(input.slug),
    values,
  };
};

const normalizeEntrySampleCreateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["contentTypeSlug", "title", "slug", "status", "values", "seo"]));
  const values = assertRecord(input.values);
  assertTrustedMediaReferences(values, { allowCuratedTextUrlFields: true });
  assertTrustedCuratedMediaMetadata(values);
  return {
    contentTypeSlug: readText(input.contentTypeSlug),
    title: readText(input.title),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["published"])),
    values,
    ...(input.seo !== undefined ? { seo: normalizeSeoPayload(input.seo) } : {}),
  };
};

const normalizeEntryDeleteInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "contentTypeSlug", "expectedTitle", "expectedSlug", "expectedStatus"])
  );
  return {
    id: readText(input.id),
    ...(input.contentTypeSlug !== undefined
      ? { contentTypeSlug: readOptionalText(input.contentTypeSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const normalizeEntryUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["title", "slug", "status", "values", "seo"]));
  const values = input.values !== undefined ? assertRecord(input.values) : undefined;
  if (values !== undefined) {
    assertTrustedMediaReferences(values, { allowCuratedTextUrlFields: true });
    assertTrustedCuratedMediaMetadata(values);
  }
  return {
    ...(input.title !== undefined ? { title: readText(input.title) } : {}),
    ...(input.slug !== undefined ? { slug: readText(input.slug) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published", "archived"])) }
      : {}),
    ...(values !== undefined ? { values } : {}),
    ...(input.seo !== undefined ? { seo: normalizeSeoPayload(input.seo) } : {}),
  };
};

const normalizeEntryUpdateInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "contentTypeSlug", "expectedTitle", "expectedSlug", "expectedStatus", "patch"])
  );
  return {
    id: readText(input.id),
    ...(input.contentTypeSlug !== undefined
      ? { contentTypeSlug: readOptionalText(input.contentTypeSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    patch: normalizeEntryUpdatePatch(input.patch),
  };
};

const readSafeRelativeHref = (value: unknown) => {
  const href = readText(value);
  const hasControlChar = Array.from(href).some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("://") ||
    href.includes("\\") ||
    hasControlChar
  ) {
    fail();
  }
  return href;
};

const readOptionalSafeRelativeHref = (value: unknown) => {
  if (value === undefined || value === null) return null;
  return readSafeRelativeHref(value);
};

const normalizeMenuItemUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["menuId", "label", "href", "parentId", "orderIndex", "settings"]));
  return {
    menuId: normalizeResourceIdInput(input.menuId),
    label: readText(input.label),
    href: readSafeRelativeHref(input.href),
    ...(input.parentId !== undefined ? { parentId: readOptionalText(input.parentId) } : {}),
    ...(input.orderIndex !== undefined
      ? { orderIndex: readOptionalFiniteNumber(input.orderIndex) }
      : {}),
    ...(input.settings !== undefined ? { settings: assertRecord(input.settings) } : {}),
  };
};

const normalizeMenuUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["name", "location", "status"]));
  return {
    name: readText(input.name),
    location: readText(input.location),
    status: readEnum(input.status, new Set(["draft", "published"])),
  };
};

const normalizeMenuItemDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["menuId", "itemId", "label", "expectedHref", "expectedParentId"]));
  return {
    menuId: readText(input.menuId),
    itemId: readText(input.itemId),
    label: readText(input.label),
    ...(input.expectedHref !== undefined
      ? { expectedHref: readOptionalText(input.expectedHref) }
      : {}),
    ...(input.expectedParentId !== undefined
      ? { expectedParentId: readOptionalText(input.expectedParentId) }
      : {}),
  };
};

const normalizeMenuItemUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["label", "href", "parentId", "orderIndex"]));
  return {
    ...(input.label !== undefined ? { label: readText(input.label) } : {}),
    ...(input.href !== undefined ? { href: readOptionalSafeRelativeHref(input.href) } : {}),
    ...(input.parentId !== undefined ? { parentId: readOptionalText(input.parentId) } : {}),
    ...(input.orderIndex !== undefined
      ? { orderIndex: readOptionalFiniteNumber(input.orderIndex) }
      : {}),
  };
};

const normalizeMenuItemUpdateInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["menuId", "itemId", "label", "expectedHref", "expectedParentId", "patch"])
  );
  return {
    menuId: readText(input.menuId),
    itemId: readText(input.itemId),
    label: readText(input.label),
    ...(input.expectedHref !== undefined
      ? { expectedHref: readOptionalText(input.expectedHref) }
      : {}),
    ...(input.expectedParentId !== undefined
      ? { expectedParentId: readOptionalText(input.expectedParentId) }
      : {}),
    patch: normalizeMenuItemUpdatePatch(input.patch),
  };
};

const normalizeSeoPayload = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["slug", "title", "description", "canonicalUrl", "robots"]));
  return {
    ...(input.slug !== undefined ? { slug: readOptionalText(input.slug) } : {}),
    ...(input.title !== undefined ? { title: readOptionalText(input.title) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.canonicalUrl !== undefined
      ? { canonicalUrl: readOptionalText(input.canonicalUrl) }
      : {}),
    ...(input.robots !== undefined ? { robots: readOptionalText(input.robots) } : {}),
  };
};

const normalizeSamePlanLocator = (value: unknown) => {
  const input = assertRecord(value);
  const kind = readEnum(input.kind, new Set(["action-result", "stable-slug", "stable-location"]));
  const resourceType = readEnum(
    input.resourceType,
    new Set(["content-type", "page", "entry", "menu", "detail-page"])
  );
  if (kind === "action-result") {
    assertKeys(input, new Set(["kind", "actionId", "resourceType", "field"]));
    return {
      kind,
      actionId: readText(input.actionId),
      resourceType,
      field: readEnum(input.field, new Set(["id"])),
    };
  }
  if (kind === "stable-location") {
    if (resourceType !== "menu") fail();
    assertKeys(input, new Set(["kind", "resourceType", "location"]));
    return {
      kind,
      resourceType,
      location: readText(input.location),
    };
  }
  if (resourceType === "content-type") {
    assertKeys(input, new Set(["kind", "resourceType", "slug"]));
    return {
      kind,
      resourceType,
      slug: readText(input.slug),
    };
  }
  if (resourceType === "page") {
    assertKeys(input, new Set(["kind", "resourceType", "slug"]));
    return {
      kind,
      resourceType,
      slug: readSafeRelativeHref(input.slug),
    };
  }
  if (resourceType !== "entry") fail();
  assertKeys(input, new Set(["kind", "resourceType", "contentTypeSlug", "slug"]));
  return {
    kind,
    resourceType,
    contentTypeSlug: readText(input.contentTypeSlug),
    slug: readText(input.slug),
  };
};

const normalizeResourceIdInput = (value: unknown) =>
  typeof value === "string" ? readText(value) : normalizeSamePlanLocator(value);

const normalizeSeoDocumentUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["targetType", "targetId", "seo"]));
  return {
    targetType: readEnum(input.targetType, new Set(["page", "entry"])),
    targetId: normalizeResourceIdInput(input.targetId),
    seo: normalizeSeoPayload(input.seo),
  };
};

const normalizeSeoDocumentDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "targetType", "targetId", "expectedSlug", "expectedTitle"]));
  return {
    id: readText(input.id),
    targetType: readEnum(input.targetType, new Set(["page", "entry"])),
    targetId: readText(input.targetId),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
  };
};

const normalizeSeoDocumentUpdateInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "targetType", "targetId", "expectedSlug", "expectedTitle", "patch"])
  );
  return {
    id: readText(input.id),
    targetType: readEnum(input.targetType, new Set(["page", "entry"])),
    targetId: readText(input.targetId),
    ...(input.expectedSlug !== undefined
      ? { expectedSlug: readOptionalText(input.expectedSlug) }
      : {}),
    ...(input.expectedTitle !== undefined
      ? { expectedTitle: readOptionalText(input.expectedTitle) }
      : {}),
    patch: normalizeSeoPayload(input.patch),
  };
};

const normalizeMediaReferenceAttachInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["mediaId", "targetType", "targetId", "field"]));
  return {
    mediaId: readText(input.mediaId),
    targetType: readEnum(input.targetType, new Set(["entry"])),
    targetId: readText(input.targetId),
    field: readText(input.field),
  };
};

const normalizeListingQueryFiltersPatchInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["listingQueryName", "filters"]));
  return {
    listingQueryName: readText(input.listingQueryName),
    filters: readRecordArray(input.filters),
  };
};

const normalizeListingTemplateCardPatchInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["listingTemplateSlug", "card"]));
  return {
    listingTemplateSlug: readText(input.listingTemplateSlug),
    card: assertRecord(input.card),
  };
};

const normalizePageWidgetPatchBlock = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["id", "type", "variant", "data", "layout", "visibility", "editor"]));
  assertTrustedMediaReferences(input.data, {
    allowCuratedBlockSrc: true,
    allowCuratedTextUrlFields: true,
  });
  if (input.layout !== undefined) {
    assertTrustedMediaReferences(input.layout, {
      allowCuratedBlockSrc: true,
      allowCuratedTextUrlFields: true,
    });
  }
  if (input.visibility !== undefined) assertTrustedMediaReferences(input.visibility);
  if (input.editor !== undefined) assertTrustedMediaReferences(input.editor);
  return {
    id: readText(input.id),
    type: readText(input.type),
    ...(input.variant !== undefined ? { variant: readText(input.variant) } : {}),
    data: assertRecord(input.data),
    ...(input.layout !== undefined ? { layout: assertRecord(input.layout) } : {}),
    ...(input.visibility !== undefined ? { visibility: assertRecord(input.visibility) } : {}),
    ...(input.editor !== undefined ? { editor: assertRecord(input.editor) } : {}),
  };
};

const unsafePatchPathSegments = new Set(["__proto__", "prototype", "constructor"]);

const normalizeDataPath = (value: unknown) => {
  const path = readStringArray(value);
  if (path.length === 0 || path.length > 6) fail();
  for (const segment of path) {
    if (!/^[a-zA-Z0-9_-]+$/.test(segment) || unsafePatchPathSegments.has(segment)) {
      fail();
    }
  }
  return path;
};

const normalizePatchValue = (value: unknown) => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) fail();
    return value;
  }
  fail();
};

const normalizePageWidgetPatchInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["pageSlug", "operation", "block", "blockId", "expectedBlockType", "dataPath", "value"])
  );
  const operation = readEnum(input.operation, new Set(["upsert-block", "patch-data"]));
  if (operation === "upsert-block") {
    return {
      pageSlug: readText(input.pageSlug),
      operation,
      block: normalizePageWidgetPatchBlock(input.block),
    };
  }
  return {
    pageSlug: readText(input.pageSlug),
    operation,
    blockId: readText(input.blockId),
    ...(input.expectedBlockType !== undefined
      ? { expectedBlockType: readOptionalText(input.expectedBlockType) }
      : {}),
    dataPath: normalizeDataPath(input.dataPath),
    value: normalizePatchValue(input.value),
  };
};

const normalizeFormAutomationActionInput = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "id",
      "type",
      "label",
      "enabled",
      "continueOnError",
      "condition",
      "config",
      "orderIndex",
    ])
  );
  const type = readText(input.type);
  if (!safeFormAutomationActionTypes.has(type as FormActionType)) fail();
  if (input.id === undefined) fail();
  return normalizeFormActionInput(input as FormActionInput, 0);
};

const normalizeFormAutomationUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["formId", "action"]));
  return {
    formId: readText(input.formId),
    action: normalizeFormAutomationActionInput(input.action),
  };
};

const normalizeContentListStyle = (value: unknown) => {
  if (value === undefined) return undefined;
  const input = assertRecord(value);
  assertKeys(input, new Set(["columns", "cardStyle"]));
  return {
    ...(input.columns !== undefined
      ? { columns: readEnum(input.columns, new Set(["1", "2", "3"])) }
      : {}),
    ...(input.cardStyle !== undefined
      ? { cardStyle: readEnum(input.cardStyle, new Set(["outlined", "elevated", "minimal"])) }
      : {}),
  };
};

const normalizeListingFilters = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "title",
      "description",
      "autoApply",
      "showSearch",
      "searchPlaceholder",
      "searchLabel",
      "applyLabel",
      "facets",
    ])
  );
  return {
    title: readText(input.title),
    description: readText(input.description),
    autoApply: readBoolean(input.autoApply),
    showSearch: readBoolean(input.showSearch),
    searchPlaceholder: readText(input.searchPlaceholder),
    searchLabel: readText(input.searchLabel),
    applyLabel: readText(input.applyLabel),
    facets: readRecordArray(input.facets),
  };
};

const normalizeFormEmbed = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const input = assertRecord(value);
  assertKeys(input, new Set(["formName", "title", "description", "submitLabel", "successMessage"]));
  return {
    formName: readText(input.formName),
    title: readText(input.title),
    description: readText(input.description),
    submitLabel: readText(input.submitLabel),
    successMessage: readText(input.successMessage),
  };
};

const normalizePageCollectionLinkInput = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "contentTypeId",
      "contentTypeSlug",
      "pageRole",
      "compositionKey",
      "listingQueryId",
      "listingQueryName",
      "listingTemplateId",
      "listingTemplateSlug",
    ])
  );
  const contentTypeId =
    input.contentTypeId === undefined ? undefined : readOptionalText(input.contentTypeId);
  const contentTypeSlug =
    input.contentTypeSlug === undefined ? undefined : readOptionalText(input.contentTypeSlug);
  if (!contentTypeId && !contentTypeSlug) fail();
  return {
    ...(contentTypeId !== undefined ? { contentTypeId } : {}),
    ...(contentTypeSlug !== undefined ? { contentTypeSlug } : {}),
    pageRole: readEnum(input.pageRole, new Set(["canonical-list-page", "supporting-page"])),
    ...(input.compositionKey !== undefined
      ? { compositionKey: readOptionalText(input.compositionKey) }
      : {}),
    ...(input.listingQueryId !== undefined
      ? { listingQueryId: readOptionalText(input.listingQueryId) }
      : {}),
    ...(input.listingQueryName !== undefined
      ? { listingQueryName: readOptionalText(input.listingQueryName) }
      : {}),
    ...(input.listingTemplateId !== undefined
      ? { listingTemplateId: readOptionalText(input.listingTemplateId) }
      : {}),
    ...(input.listingTemplateSlug !== undefined
      ? { listingTemplateSlug: readOptionalText(input.listingTemplateSlug) }
      : {}),
  };
};

const normalizePageInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([
      "title",
      "slug",
      "status",
      "listingQueryName",
      "listingTemplateSlug",
      "introTitle",
      "introBody",
      "ctaLabel",
      "blocks",
      "contentListStyle",
      "listingFilters",
      "formEmbed",
      "collectionLink",
    ])
  );
  return {
    title: readText(input.title),
    slug: readText(input.slug),
    status: readEnum(input.status, new Set(["draft", "published"])),
    ...(input.listingQueryName !== undefined
      ? { listingQueryName: readText(input.listingQueryName) }
      : {}),
    ...(input.listingTemplateSlug !== undefined
      ? { listingTemplateSlug: readText(input.listingTemplateSlug) }
      : {}),
    introTitle: readText(input.introTitle),
    introBody: readText(input.introBody),
    ...(input.ctaLabel !== undefined ? { ctaLabel: readText(input.ctaLabel) } : {}),
    ...(input.blocks !== undefined
      ? { blocks: readRecordArray(input.blocks).map(normalizePageWidgetPatchBlock) }
      : {}),
    ...(input.contentListStyle !== undefined
      ? { contentListStyle: normalizeContentListStyle(input.contentListStyle) }
      : {}),
    ...(input.listingFilters !== undefined
      ? { listingFilters: normalizeListingFilters(input.listingFilters) }
      : {}),
    ...(input.formEmbed !== undefined ? { formEmbed: normalizeFormEmbed(input.formEmbed) } : {}),
    ...(input.collectionLink !== undefined
      ? { collectionLink: normalizePageCollectionLinkInput(input.collectionLink) }
      : {}),
  };
};

const normalizeDetailPageUpsertInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["document", "contentTypeId", "expectedExistingId"]));
  return {
    document: normalizeDetailPageDocument(input.document),
    ...(input.contentTypeId !== undefined
      ? { contentTypeId: normalizeResourceIdInput(input.contentTypeId) }
      : {}),
    ...(input.expectedExistingId !== undefined
      ? { expectedExistingId: readOptionalText(input.expectedExistingId) }
      : {}),
  };
};

const normalizePageUpdateSettingsPatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["template", "showInNav", "revisionRetention", "seo"]));
  const seo = input.seo === undefined ? undefined : assertRecord(input.seo);
  if (seo) assertKeys(seo, new Set(["title", "description"]));
  return {
    ...(input.template !== undefined ? { template: readText(input.template) } : {}),
    ...(input.showInNav !== undefined ? { showInNav: readBoolean(input.showInNav) } : {}),
    ...(input.revisionRetention !== undefined
      ? { revisionRetention: readFiniteNumber(input.revisionRetention) }
      : {}),
    ...(seo
      ? {
          seo: {
            ...(seo.title !== undefined ? { title: readOptionalText(seo.title) } : {}),
            ...(seo.description !== undefined
              ? { description: readOptionalText(seo.description) }
              : {}),
          },
        }
      : {}),
  };
};

const normalizePageUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["title", "slug", "status", "settings"]));
  return {
    ...(input.title !== undefined ? { title: readText(input.title) } : {}),
    ...(input.slug !== undefined ? { slug: readSafeRelativeHref(input.slug) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published"])) }
      : {}),
    ...(input.settings !== undefined
      ? { settings: normalizePageUpdateSettingsPatch(input.settings) }
      : {}),
  };
};

const normalizePageUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "title", "slug", "expectedStatus", "patch"]));
  return {
    id: readText(input.id),
    title: readText(input.title),
    slug: readSafeRelativeHref(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    patch: normalizePageUpdatePatch(input.patch),
  };
};

const normalizePageDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "title", "slug", "expectedStatus"]));
  return {
    id: readText(input.id),
    title: readText(input.title),
    slug: readText(input.slug),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
  };
};

const normalizeWidgetTemplateDeleteInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedStatus", "expectedCategory"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    ...(input.expectedCategory !== undefined
      ? { expectedCategory: readOptionalText(input.expectedCategory) }
      : {}),
  };
};

const normalizeWidgetTemplateUpdatePatch = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["name", "description", "category", "status", "settings"]));
  const settings = input.settings === undefined ? undefined : assertRecord(input.settings);
  if (settings) assertKeys(settings, new Set(["wrapperContainer", "sectionGap"]));
  return {
    ...(input.name !== undefined ? { name: readText(input.name) } : {}),
    ...(input.description !== undefined
      ? { description: readOptionalText(input.description) }
      : {}),
    ...(input.category !== undefined ? { category: readText(input.category) } : {}),
    ...(input.status !== undefined
      ? { status: readEnum(input.status, new Set(["draft", "published"])) }
      : {}),
    ...(settings
      ? {
          settings: {
            ...(settings.wrapperContainer !== undefined
              ? {
                  wrapperContainer: readEnum(
                    settings.wrapperContainer,
                    new Set(["default", "narrow", "full"])
                  ),
                }
              : {}),
            ...(settings.sectionGap !== undefined
              ? {
                  sectionGap: readEnum(
                    settings.sectionGap,
                    new Set(["none", "xs", "sm", "md", "lg", "xl", "2xl"])
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
};

const normalizeWidgetTemplateUpdateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["id", "name", "expectedStatus", "expectedCategory", "patch"]));
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    ...(input.expectedCategory !== undefined
      ? { expectedCategory: readOptionalText(input.expectedCategory) }
      : {}),
    patch: normalizeWidgetTemplateUpdatePatch(input.patch),
  };
};

const normalizeWidgetTemplateBlockPatchInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set(["id", "name", "expectedStatus", "blockId", "expectedBlockType", "dataPath", "value"])
  );
  return {
    id: readText(input.id),
    name: readText(input.name),
    ...(input.expectedStatus !== undefined
      ? { expectedStatus: readOptionalText(input.expectedStatus) }
      : {}),
    blockId: readText(input.blockId),
    ...(input.expectedBlockType !== undefined
      ? { expectedBlockType: readOptionalText(input.expectedBlockType) }
      : {}),
    dataPath: normalizeDataPath(input.dataPath),
    value: normalizePatchValue(input.value),
  };
};

const readAdvancedHeroDefinition = (variantId: unknown) => {
  const resolvedId = readEnum(variantId, advancedHeroVariantIds);
  try {
    return resolveSiteBuilderIntakeAdvancedHeroVariant(resolvedId);
  } catch {
    return fail();
  }
};

const readAdvancedSectionDefinition = (variantId: unknown) => {
  const resolvedId = readEnum(variantId, advancedSectionVariantIds);
  try {
    return resolveSiteBuilderIntakeAdvancedSectionVariant(resolvedId);
  } catch {
    return fail();
  }
};

const normalizeAdvancedRuntimeMenuOverride = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "behaviorIds",
      "variantId",
      "sticky",
      "transparent",
      "mobileMode",
      "ctaTargetPageRole",
    ])
  );
  return {
    behaviorIds: readStringArray(input.behaviorIds).map((item) =>
      readEnum(item, advancedMenuBehaviorIds)
    ),
    variantId: readEnum(input.variantId, advancedNavigationVariantIds),
    sticky: readBoolean(input.sticky),
    transparent: readBoolean(input.transparent),
    mobileMode: readEnum(input.mobileMode, advancedNavigationMobileModes),
    ctaTargetPageRole: readOptionalNullableEnum(input.ctaTargetPageRole, siteBuilderPageRoleIds),
  };
};

const normalizeAdvancedRuntimeHeroOverride = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["variantId", "widgetType", "widgetVariantId", "module", "alias"]));
  const definition = readAdvancedHeroDefinition(input.variantId);
  if (
    readEnum(input.widgetVariantId, advancedHeroVariantIds) !== definition.widgetVariantId ||
    readText(input.widgetType) !== definition.widgetType ||
    readText(input.module) !== definition.module ||
    readText(input.alias) !== definition.alias
  ) {
    fail();
  }
  return {
    variantId: definition.id,
    widgetType: definition.widgetType,
    widgetVariantId: definition.widgetVariantId,
    module: definition.module,
    alias: definition.alias,
  };
};

const normalizeAdvancedRuntimeSectionOverride = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set(["variantId", "sectionRoleId", "alias", "widgetType", "widgetVariantId", "module"])
  );
  const definition = readAdvancedSectionDefinition(input.variantId);
  if (
    readText(input.sectionRoleId) !== definition.sectionRoleId ||
    readText(input.alias) !== definition.alias ||
    readText(input.widgetType) !== definition.widgetType ||
    readText(input.widgetVariantId) !== definition.widgetVariantId ||
    readText(input.module) !== definition.module
  ) {
    fail();
  }
  return {
    variantId: definition.id,
    sectionRoleId: definition.sectionRoleId,
    alias: definition.alias,
    widgetType: definition.widgetType,
    widgetVariantId: definition.widgetVariantId,
    module: definition.module,
  };
};

const normalizeAdvancedRuntimeOverrides = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set(["schemaVersion", "designPresetId", "menu", "hero", "sectionVariants"])
  );
  if (readFiniteNumber(input.schemaVersion) !== 1) fail();
  return {
    schemaVersion: 1 as const,
    ...(input.designPresetId !== undefined
      ? {
          designPresetId: readOptionalNullableEnum(
            input.designPresetId,
            siteBuilderDesignPresetIds
          ),
        }
      : {}),
    ...(input.menu !== undefined ? { menu: normalizeAdvancedRuntimeMenuOverride(input.menu) } : {}),
    ...(input.hero !== undefined ? { hero: normalizeAdvancedRuntimeHeroOverride(input.hero) } : {}),
    ...(input.sectionVariants !== undefined
      ? {
          sectionVariants: readRecordArray(input.sectionVariants).map(
            normalizeAdvancedRuntimeSectionOverride
          ),
        }
      : {}),
  };
};

const normalizeSiteKitPlanBase = (input: JsonRecord) => ({
  businessType: readText(input.businessType),
  goals: readStringArray(input.goals),
  locale: readText(input.locale),
  ...(input.region !== undefined ? { region: readOptionalText(input.region) } : {}),
  ...(input.siteName !== undefined ? { siteName: readOptionalText(input.siteName) } : {}),
  ...(input.preferredKitId !== undefined
    ? { preferredKitId: readOptionalText(input.preferredKitId) }
    : {}),
  ...(input.selectedKitId !== undefined
    ? { selectedKitId: readOptionalText(input.selectedKitId) }
    : {}),
  ...(input.enabledStepIds !== undefined
    ? { enabledStepIds: readOptionalStringArray(input.enabledStepIds) }
    : {}),
  ...(input.advancedRuntimeOverrides !== undefined
    ? {
        advancedRuntimeOverrides: normalizeAdvancedRuntimeOverrides(input.advancedRuntimeOverrides),
      }
    : {}),
});

const siteKitPlanKeys = [
  "businessType",
  "goals",
  "locale",
  "region",
  "siteName",
  "preferredKitId",
  "selectedKitId",
  "enabledStepIds",
  "advancedRuntimeOverrides",
  "preview",
];

const normalizeSiteKitRecommendInput = (input: JsonRecord) => {
  assertKeys(input, new Set(siteKitPlanKeys));
  return {
    ...normalizeSiteKitPlanBase(input),
    preview: assertRecord(input.preview),
  };
};

const normalizeSiteKitInstallInput = (input: JsonRecord) => {
  assertKeys(
    input,
    new Set([...siteKitPlanKeys, "dryRun", "continueOnError", "settingsPatch", "notes"])
  );
  return {
    ...normalizeSiteKitPlanBase(input),
    ...(input.dryRun !== undefined ? { dryRun: readOptionalBoolean(input.dryRun) } : {}),
    ...(input.continueOnError !== undefined
      ? { continueOnError: readOptionalBoolean(input.continueOnError) }
      : {}),
    ...(input.settingsPatch !== undefined
      ? { settingsPatch: readOptionalRecord(input.settingsPatch) }
      : {}),
    ...(input.notes !== undefined ? { notes: readOptionalStringArray(input.notes) } : {}),
    preview: assertRecord(input.preview),
  };
};

const normalizeSiteKitValidateInput = (input: JsonRecord) => {
  assertKeys(input, new Set(["runId"]));
  return { runId: readText(input.runId) };
};

const normalizeActionInput = (type: AssistantPlannedAction["type"], input: unknown) => {
  const record = assertRecord(input);
  switch (type) {
    case "setting.content-route.upsert":
      return normalizeContentRouteInput(record);
    case "content-type.upsert":
      return normalizeContentTypeInput(record);
    case "content-type.delete":
      return normalizeContentTypeDeleteInput(record);
    case "custom-screen.upsert":
      return normalizeCustomScreenInput(record);
    case "custom-screen.delete":
      return normalizeCustomScreenDeleteInput(record);
    case "custom-screen.update":
      return normalizeCustomScreenUpdateInput(record);
    case "custom-screen.widget.patch":
      return normalizeCustomScreenWidgetPatchInput(record);
    case "listing-query.upsert":
      return normalizeListingQueryInput(record);
    case "listing-query.delete":
      return normalizeListingQueryDeleteInput(record);
    case "listing-query.update":
      return normalizeListingQueryUpdateInput(record);
    case "listing-template.upsert":
      return normalizeListingTemplateInput(record);
    case "listing-template.delete":
      return normalizeListingTemplateDeleteInput(record);
    case "listing-template.update":
      return normalizeListingTemplateUpdateInput(record);
    case "form.upsert":
      return normalizeFormInput(record);
    case "form.delete":
    case "form.archive":
      return normalizeFormDeleteInput(record);
    case "form.update":
      return normalizeFormUpdateInput(record);
    case "entry.upsert-draft":
      return normalizeEntryUpsertDraftInput(record);
    case "entry.sample.create":
      return normalizeEntrySampleCreateInput(record);
    case "entry.delete":
      return normalizeEntryDeleteInput(record);
    case "entry.update":
      return normalizeEntryUpdateInput(record);
    case "menu.upsert":
      return normalizeMenuUpsertInput(record);
    case "menu.item.upsert":
      return normalizeMenuItemUpsertInput(record);
    case "menu.item.delete":
      return normalizeMenuItemDeleteInput(record);
    case "menu.item.update":
      return normalizeMenuItemUpdateInput(record);
    case "seo.document.upsert":
      return normalizeSeoDocumentUpsertInput(record);
    case "seo.document.delete":
      return normalizeSeoDocumentDeleteInput(record);
    case "seo.document.update":
      return normalizeSeoDocumentUpdateInput(record);
    case "media.reference.attach":
      return normalizeMediaReferenceAttachInput(record);
    case "listing-query.filters.patch":
      return normalizeListingQueryFiltersPatchInput(record);
    case "listing-template.card.patch":
      return normalizeListingTemplateCardPatchInput(record);
    case "page.widget.patch":
      return normalizePageWidgetPatchInput(record);
    case "form.automation.upsert":
      return normalizeFormAutomationUpsertInput(record);
    case "page.upsert":
      return normalizePageInput(record);
    case "detail-page.upsert":
      return normalizeDetailPageUpsertInput(record);
    case "page.update":
      return normalizePageUpdateInput(record);
    case "page.delete":
      return normalizePageDeleteInput(record);
    case "widget-template.delete":
      return normalizeWidgetTemplateDeleteInput(record);
    case "widget-template.update":
      return normalizeWidgetTemplateUpdateInput(record);
    case "widget-template.block.patch":
      return normalizeWidgetTemplateBlockPatchInput(record);
    case "site-kit.recommend":
      return normalizeSiteKitRecommendInput(record);
    case "site-kit.install":
      return normalizeSiteKitInstallInput(record);
    case "site-kit.validate":
      return normalizeSiteKitValidateInput(record);
  }
};

const normalizeActions = (value: unknown): AssistantPlannedAction[] =>
  readRecordArray(value).map((action) => {
    assertKeys(action, new Set(["id", "type", "title", "description", "input"]));
    const type = readEnum(action.type, actionTypes);
    return {
      id: readText(action.id),
      type,
      title: readText(action.title),
      description: readText(action.description),
      input: normalizeActionInput(type, action.input),
    } as AssistantPlannedAction;
  });

const resolvePlanResponseKind = (
  input: JsonRecord,
  status: AssistantActionPlanStatus,
  questions: AssistantPlanQuestion[],
  actions: AssistantPlannedAction[]
): AssistantActionPlanResponseKind => {
  if (input.responseKind !== undefined) {
    return readEnum(input.responseKind, responseKinds);
  }
  if (input.inspection !== undefined) return "inspection";
  if (status === "needs_input" || questions.length > 0) return "needs_input";
  if (actions.length > 0) return "action_plan";
  return "docs";
};

export const normalizeAssistantActionPlan = (value: unknown): AssistantActionPlan => {
  const input = assertRecord(value);
  assertKeys(input, planKeys);
  const status = readEnum(
    input.status,
    new Set<AssistantActionPlanStatus>(["ready", "needs_input"])
  );
  const questions = normalizeQuestions(input.questions);
  const actions = normalizeActions(input.actions);
  const responseKind = resolvePlanResponseKind(input, status, questions, actions);

  if (status === "ready" && questions.length > 0) fail();
  if (status === "needs_input" && questions.length === 0) fail();
  if (responseKind === "docs" && actions.length > 0) fail();
  if (responseKind === "inspection" && input.inspection === undefined) fail();
  if (responseKind === "action_plan" && actions.length === 0) fail();
  if ((responseKind === "needs_input" || responseKind === "gated") && status !== "needs_input")
    fail();

  return {
    id: readText(input.id),
    status,
    intentId: readText(input.intentId),
    responseKind,
    ...(input.promptKind !== undefined
      ? { promptKind: readOptionalEnum(input.promptKind, promptKinds) }
      : {}),
    ...(input.intentFamily !== undefined
      ? { intentFamily: readOptionalEnum(input.intentFamily, intentFamilies) }
      : {}),
    ...(input.metadata !== undefined ? { metadata: normalizePlanMetadata(input.metadata) } : {}),
    ...(input.inspection !== undefined
      ? { inspection: normalizePlanInspection(input.inspection) }
      : {}),
    title: readText(input.title),
    answer: readText(input.answer),
    summary: readText(input.summary),
    confidence: normalizeConfidence(input.confidence),
    assumptions: readStringArray(input.assumptions),
    questions,
    actions,
  };
};

export const assertAssistantActionPlanStrict = normalizeAssistantActionPlan;

export const isAssistantActionPlanStrict = (value: unknown): value is AssistantActionPlan => {
  try {
    normalizeAssistantActionPlan(value);
    return true;
  } catch {
    return false;
  }
};
