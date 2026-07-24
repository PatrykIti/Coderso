import { DiagnosticCollector, readPackageKey } from "./fullSitePackage/schema";
import {
  PACKAGE_LIMITS,
  PACKAGE_RESOURCE_KINDS,
  type JsonObject,
  type PackageResourceKind,
  type ResourceSeed,
} from "./fullSitePackage/types";

export type FullSiteInstallResourceKind = PackageResourceKind;

export type FullSiteResourceIdentity = `${FullSiteInstallResourceKind}:${string}`;

export type FullSiteRollbackActionV1 = {
  schemaVersion: 1;
  dependencies: FullSiteResourceIdentity[];
};

const FULL_SITE_RESOURCE_KINDS = new Set<string>(PACKAGE_RESOURCE_KINDS);

const readCanonicalIdentity = (value: unknown): FullSiteResourceIdentity | null => {
  if (typeof value !== "string") return null;
  const separator = value.indexOf(":");
  if (separator <= 0 || value.indexOf(":", separator + 1) !== -1) return null;
  const kind = value.slice(0, separator);
  const rawKey = value.slice(separator + 1);
  if (!FULL_SITE_RESOURCE_KINDS.has(kind)) return null;

  const diagnostics = new DiagnosticCollector();
  const key = readPackageKey(rawKey, "$.identity.key", diagnostics);
  try {
    diagnostics.throwIfAny();
  } catch {
    return null;
  }
  if (key !== rawKey) return null;
  return `${kind}:${key}` as FullSiteResourceIdentity;
};

const isPlainJsonObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  try {
    if (Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

export function buildFullSiteRollbackActionV1(input: {
  identity: FullSiteResourceIdentity;
  dependencies: readonly FullSiteResourceIdentity[];
}): JsonObject {
  const identity = readCanonicalIdentity(input.identity);
  if (!identity || !Array.isArray(input.dependencies)) {
    throw new Error("site_package_rollback_dependency_invalid");
  }
  if (input.dependencies.length > PACKAGE_LIMITS.referenceEdges) {
    throw new Error("site_package_rollback_dependency_invalid");
  }

  const dependencies = new Set<FullSiteResourceIdentity>();
  for (const value of input.dependencies) {
    const dependency = readCanonicalIdentity(value);
    if (!dependency || dependency === identity) {
      throw new Error("site_package_rollback_dependency_invalid");
    }
    dependencies.add(dependency);
  }

  return {
    schemaVersion: 1,
    dependencies: [...dependencies].sort(),
  };
}

export function readFullSiteRollbackActionV1(value: unknown): FullSiteRollbackActionV1 | null {
  if (!isPlainJsonObject(value)) return null;
  try {
    const keys = Reflect.ownKeys(value);
    const schemaVersion = Reflect.get(value, "schemaVersion");
    const capturedDependencies = Reflect.get(value, "dependencies");
    if (
      keys.length !== 2 ||
      !keys.includes("schemaVersion") ||
      !keys.includes("dependencies") ||
      schemaVersion !== 1 ||
      !Array.isArray(capturedDependencies)
    ) {
      return null;
    }

    const capturedLength = Reflect.get(capturedDependencies, "length");
    if (
      typeof capturedLength !== "number" ||
      !Number.isSafeInteger(capturedLength) ||
      capturedLength < 0 ||
      capturedLength > PACKAGE_LIMITS.referenceEdges
    ) {
      return null;
    }

    const dependencies: FullSiteResourceIdentity[] = [];
    const seen = new Set<FullSiteResourceIdentity>();
    for (let index = 0; index < capturedLength; index += 1) {
      const propertyKey = String(index);
      if (
        !Reflect.has(capturedDependencies, propertyKey) ||
        !Object.prototype.hasOwnProperty.call(capturedDependencies, propertyKey)
      ) {
        return null;
      }
      const dependency = readCanonicalIdentity(Reflect.get(capturedDependencies, propertyKey));
      if (!dependency || seen.has(dependency)) return null;
      seen.add(dependency);
      dependencies.push(dependency);
    }
    if (Reflect.get(capturedDependencies, "length") !== capturedLength) return null;
    return { schemaVersion: 1, dependencies };
  } catch {
    return null;
  }
}

export type ManagedResourceEvidence = {
  runId: string;
  resourceId: string;
  desired: JsonObject;
  successful: boolean;
  rolledBack: boolean;
};

export type CurrentResourceState = {
  id: string;
  desired: JsonObject;
};

export type FullSiteInstallOperation = "create" | "update" | "noop" | "conflict";

export type FullSiteInstallPlanItem = {
  position: number;
  identity: FullSiteResourceIdentity;
  kind: FullSiteInstallResourceKind;
  key: string;
  operation: FullSiteInstallOperation;
  desired: JsonObject;
  currentId: string | null;
  currentDesired: JsonObject | null;
  managedRunId: string | null;
  dependencies: readonly FullSiteResourceIdentity[];
};

export type FullSiteInstallPlan = {
  packageKey: string;
  operations: FullSiteInstallPlanItem[];
};

export type FullSiteInstallRun = {
  id: string;
  packageKey: string;
  mode: "dry_run" | "apply" | "rollback";
  status: "running" | "success" | "failed";
  rollbackOfRunId: string | null;
  options?: JsonObject;
};

export type FullSiteInstallRunMetadataPatch = {
  runId: string;
  status: FullSiteInstallRun["status"];
  summary: JsonObject;
  error?: string | null;
  options: JsonObject;
};

export type FullSiteInstallLedgerItem = {
  position: number;
  kind: FullSiteInstallResourceKind;
  key: string;
  operation: FullSiteInstallOperation;
  status: "planned" | "success" | "failed" | "skipped";
  beforeSnapshot: JsonObject | null;
  afterSnapshot: JsonObject | null;
  rollbackAction?: JsonObject | null;
  error?: string | null;
};

export type PersistedFullSiteInstallLedgerItem = Omit<
  FullSiteInstallLedgerItem,
  "rollbackAction"
> & {
  rollbackAction: JsonObject | null;
};

export type FullSiteRollbackClaim = {
  id: string;
  state: "created" | "resumed" | "busy" | "complete";
};

const SAFE_FULL_SITE_ERROR_CODES = new Set([
  "auth_required",
  "content_entry_invalid",
  "content_entry_not_found",
  "content_entry_write_failed",
  "content_type_duplicate_name_unavailable",
  "content_type_duplicate_slug_unavailable",
  "content_type_invalid",
  "content_type_name_exists",
  "content_type_name_required",
  "content_type_not_found",
  "content_type_slug_exists",
  "content_type_slug_invalid",
  "content_type_slug_required",
  "content_type_status_invalid",
  "content_type_write_failed",
  "detail_page_conflict",
  "detail_page_content_type_mismatch",
  "detail_page_invalid",
  "detail_page_not_found",
  "detail_page_route_conflict",
  "entry_cache_invalidation_failed",
  "entry_create_failed",
  "entry_not_found",
  "entry_publish_authorization_required",
  "entry_slug_conflict",
  "form_action_invalid_condition",
  "form_action_invalid_config",
  "form_action_invalid_label",
  "form_action_invalid_payload",
  "form_action_invalid_type",
  "form_field_id_duplicate",
  "form_field_invalid",
  "form_field_label_required",
  "form_field_name_duplicate",
  "form_fields_invalid",
  "form_invalid",
  "form_name_required",
  "form_not_found",
  "form_slug_exists",
  "form_slug_required",
  "form_write_failed",
  "listing_query_invalid",
  "listing_query_invalid_field",
  "listing_query_invalid_filter_value",
  "listing_query_invalid_name",
  "listing_query_invalid_source_config",
  "listing_query_update_empty",
  "listing_query_write_failed",
  "listing_template_invalid",
  "listing_template_layout_invalid",
  "listing_template_slug_exists",
  "listing_template_slug_required",
  "listing_template_write_failed",
  "media_asset_missing",
  "media_value_invalid",
  "menu_document_invalid",
  "menu_invalid",
  "menu_item_id_duplicate",
  "menu_item_label_required",
  "menu_item_link_invalid",
  "menu_item_page_missing",
  "menu_items_cycle",
  "menu_items_invalid",
  "menu_nav_extras_invalid",
  "menu_not_found",
  "menu_write_failed",
  "page_document_invalid",
  "page_invalid",
  "page_not_found",
  "page_revision_snapshot_too_large",
  "page_template_invalid",
  "page_template_legacy_widget_blocks_invalid",
  "page_template_not_found",
  "page_template_slug_conflict",
  "page_template_status_invalid",
  "page_template_write_failed",
  "page_write_failed",
  "relation_entry_missing",
  "relation_target_not_found",
  "relation_value_invalid",
  "setting_batch_write_failed",
  "setting_forbidden",
  "setting_invalid",
  "settings_key_invalid",
  "settings_payload_invalid",
  "settings_value_invalid",
  "site_package_actor_invalid",
  "site_package_already_rolled_back",
  "site_package_apply_failed",
  "site_package_apply_interrupted",
  "site_package_cli_args_invalid",
  "site_package_cli_failed",
  "site_package_cli_mode_invalid",
  "site_package_compensation_failed",
  "site_package_compensation_not_recoverable",
  "site_package_conflict",
  "site_package_file_invalid",
  "site_package_invalid",
  "site_package_json_invalid",
  "site_package_publish_unsupported",
  "site_package_recovery_conflict",
  "site_package_recovery_invalid_source",
  "site_package_recovery_missing_intended_id",
  "site_package_recovery_requires_rollback",
  "site_package_recovery_unsupported",
  "site_package_ref_ambiguous",
  "site_package_ref_bad_path",
  "site_package_ref_cycle",
  "site_package_ref_duplicate",
  "site_package_ref_missing",
  "site_package_resource_kind_invalid",
  "site_package_rollback_conflict",
  "site_package_rollback_dependency_blocked",
  "site_package_rollback_dependency_invalid",
  "site_package_rollback_claim_failed",
  "site_package_rollback_failed",
  "site_package_rollback_identity_mismatch",
  "site_package_rollback_in_progress",
  "site_package_rollback_invalid_source",
  "site_package_rollback_ledger_failed",
  "site_package_rollback_missing_after",
  "site_package_rollback_missing_before",
  "site_package_run_not_found",
  "site_package_setting_forbidden",
  "site_package_source_run_invalid",
  "site_package_stage_unsupported",
  "site_package_state_changed",
  "site_package_too_complex",
  "site_package_too_large",
  "entry_revision_snapshot_too_large",
  "detail_page_revision_snapshot_too_large",
  "solution_kit_install_failed",
  "solution_kit_operation_failed",
  "solution_kit_rollback_operation_failed",
]);

for (const kind of [
  "content_type",
  "form",
  "page_template",
  "listing_template",
  "content_entry",
  "listing_query",
  "detail_page",
  "page",
  "menu",
  "setting",
]) {
  SAFE_FULL_SITE_ERROR_CODES.add(`${kind}_rollback_delete_failed`);
  SAFE_FULL_SITE_ERROR_CODES.add(`${kind}_rollback_identity_mismatch`);
}

const readErrorCode = (error: unknown): string | null => {
  try {
    if (typeof error === "string") return error;
    if (!error || typeof error !== "object") return null;
    const code = Reflect.get(error, "code");
    if (typeof code === "string") return code;
    if (!(error instanceof Error)) return null;
    const message = Reflect.get(error, "message");
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
};

/** Keeps only reviewed machine codes; arbitrary messages and token-like values redact. */
export const toSafeFullSiteErrorCode = (
  error: unknown,
  fallback = "site_package_apply_failed"
): string => {
  const candidate = readErrorCode(error);
  if (candidate && SAFE_FULL_SITE_ERROR_CODES.has(candidate)) return candidate;
  if (candidate && /^(?:template_)?failed_operations:[1-9][0-9]*$/.test(candidate)) {
    return candidate;
  }
  return SAFE_FULL_SITE_ERROR_CODES.has(fallback) ? fallback : "site_package_apply_failed";
};

export type FullSiteInstallLedgerPort = {
  /**
   * Optional for pure fakes. The DB implementation holds global then package
   * advisory locks for the complete plan -> preflight -> mutation lifecycle.
   */
  withPackageLock?<T>(packageKey: string, execute: () => Promise<T>): Promise<T>;
  createRun(input: {
    packageKey: string;
    actorId: string | null;
    dryRun: boolean;
    options?: JsonObject;
  }): Promise<{ id: string }>;
  recordItem(input: {
    runId: string;
    position: number;
    kind: FullSiteInstallResourceKind;
    key: string;
    operation: FullSiteInstallOperation | "delete" | "restore";
    status: "planned" | "success" | "failed" | "skipped";
    beforeSnapshot: JsonObject | null;
    afterSnapshot: JsonObject | null;
    rollbackAction?: JsonObject | null;
    error?: string | null;
  }): Promise<void>;
  finalizeRun(input: {
    runId: string;
    status: "success" | "failed";
    error?: string | null;
  }): Promise<void>;
  getRun(runId: string): Promise<FullSiteInstallRun | null>;
  /** Optional for narrow planner fakes; the default DB adapter always implements it. */
  patchRunMetadata?(input: FullSiteInstallRunMetadataPatch): Promise<boolean>;
  /** Optional for narrow planner fakes; the default DB adapter always implements it. */
  findLatestSuccessfulApplyRun?(packageKey: string): Promise<FullSiteInstallRun | null>;
  listItems(runId: string): Promise<PersistedFullSiteInstallLedgerItem[]>;
  createRollbackRun(input: {
    sourceRunId: string;
    packageKey: string;
    actorId: string | null;
    options?: JsonObject;
  }): Promise<{ id: string }>;
  /**
   * Optional because pure planner fakes do not need rollback coordination.
   * The DB implementation serializes claims without requiring a migration.
   */
  claimRollbackRun?(input: {
    sourceRunId: string;
    packageKey: string;
    actorId: string;
    options?: JsonObject;
    resumeOnly?: boolean;
    resumeRunning?: boolean;
  }): Promise<FullSiteRollbackClaim>;
  findAutomaticCompensationRun?(sourceRunId: string): Promise<FullSiteInstallRun | null>;
  hasSuccessfulRollback(sourceRunId: string): Promise<boolean>;
  findManagedResourceEvidence(input: {
    packageKey: string;
    kind: FullSiteInstallResourceKind;
    key: string;
  }): Promise<ManagedResourceEvidence | null>;
};

export type FullSiteCurrentResourceResolver = (
  kind: FullSiteInstallResourceKind,
  seed: ResourceSeed,
  expectedId?: string,
  managedEvidence?: ManagedResourceEvidence | null
) => Promise<CurrentResourceState | null>;

export type FullSitePlanningDesiredNormalizer = (input: {
  kind: FullSiteInstallResourceKind;
  key: string;
  currentId: string;
  desired: JsonObject;
}) => JsonObject | Promise<JsonObject>;
