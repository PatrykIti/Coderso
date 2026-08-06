// Static Bun bridge operation descriptor registries for the TASK-540 smoke executor.
//
// Owns the runtime, response-lost and auxiliary Bun bridge operation descriptor registries, their
// canonical static union and the resource Bun source spec registry that the resource Bun
// operation authority promotes into per-resource descriptors.
import { deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import {
  API_SESSION_OBSERVATION_BRIDGE_SOURCE,
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
} from "./bridge-sources/bootstrap.mjs";
import {
  CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
  CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
  MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
  SCREEN_MATERIALIZE_BRIDGE_SOURCE,
  SECURITY_RATE_BRIDGE_SOURCE,
  SECURITY_SESSION_BRIDGE_SOURCE,
  SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
} from "./bridge-sources/platform.mjs";
import {
  PREFERENCE_GET_BRIDGE_SOURCE,
  PREFERENCE_SET_BRIDGE_SOURCE,
  USER_ABSENCE_BRIDGE_SOURCE,
  USER_DELETE_BRIDGE_SOURCE,
  USER_PROOF_BRIDGE_SOURCE,
  USER_PROVISION_BRIDGE_SOURCE,
} from "./bridge-sources/user-preference.mjs";
import {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
} from "./bun-bridge-resource-sources.mjs";

export function buildResourceBunSourceSpecs() {
  const specs = Object.create(null);
  const add = (key, source, envProfileId = "database", inputKeys = ["identifier"]) => {
    invariant(!Object.hasOwn(specs, key), "resource Bun source spec duplicate: " + key);
    specs[key] = {
      source,
      envProfileId,
      inputKeys,
      outputSchemaId: "strict-resource-operation-v1",
    };
  };
  add(
    "presentation-override/provenance/failure-discovery",
    PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.provenance
  );
  add("presentation-override/cleanup", PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.delete);
  add("presentation-override/absence", PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES.absence);
  add(
    "seo-document-entry/provenance/cleanup-discovery",
    SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.provenance
  );
  add("seo-document-entry/cleanup", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.delete);
  add("seo-document-entry/absence", SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES.absence);
  for (const kind of ["setting-user-a", "setting-user-b"]) {
    add(kind + "/provenance/failure-discovery", USER_SETTING_EXACT_BRIDGE_SOURCES.provenance);
    add(kind + "/cleanup", USER_SETTING_EXACT_BRIDGE_SOURCES.delete);
    add(kind + "/absence", USER_SETTING_EXACT_BRIDGE_SOURCES.absence);
  }
  for (const kind of ["screen-main", "screen-retry"]) {
    add(kind + "/provenance/failure-discovery", CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE);
  }
  for (const kind of ["entry-editable", "entry-related"]) {
    add(kind + "/provenance/failure-discovery", CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE);
  }
  add("content-type/provenance/failure-discovery", CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE);
  for (const channel of ["admin-api", "failure-discovery"]) {
    add("media-row-key/provenance/" + channel, MEDIA_EXACT_BRIDGE_SOURCES.provenance);
  }
  add("media-row-key/cleanup", MEDIA_EXACT_BRIDGE_SOURCES.delete);
  add("media-row-key/absence", MEDIA_EXACT_BRIDGE_SOURCES.absence);
  for (const kind of ["audit-log-task-ua", "access-log-task-ua", "session-task"]) {
    add(kind + "/provenance/terminal-db-delta", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].provenance);
    add(kind + "/cleanup", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].delete);
    add(kind + "/absence", TASK_TRAFFIC_EXACT_BRIDGE_SOURCES[kind].absence);
  }
  for (const kind of ["user-a", "user-b"]) {
    add(
      kind + "/provenance/failure-discovery",
      USER_EXACT_BRIDGE_SOURCES.provenance,
      "user-identity-proof"
    );
    add(kind + "/cleanup", USER_EXACT_BRIDGE_SOURCES.delete);
    add(kind + "/absence", USER_EXACT_BRIDGE_SOURCES.absence);
  }
  add("bootstrap-user-login-state/cleanup", BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE, "database", [
    "baseline",
    "newestOwnedPair",
    "userId",
  ]);
  add("bootstrap-user-login-state/absence", BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE, "database", [
    "userAgent",
    "userId",
  ]);
  add("site-content-routes-baseline/absence", CONTENT_ROUTES_EXACT_BRIDGE_SOURCE, "database", []);
  add("storage-baseline/absence", STORAGE_PREFLIGHT_BRIDGE_SOURCE, "bootstrap-preflight", [
    "userAgents",
  ]);
  add("missing-media-baseline/absence", MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE, "database", [
    "mediaId",
  ]);
  return deepFreezeExact(specs);
}
export const RESOURCE_BUN_SOURCE_SPECS = buildResourceBunSourceSpecs();

export function createBunBridgeOperationRegistry(dependencies) {
  // The Bun bridge descriptor constructor and the response-lost query family registries belong to
  // authorities the facade composes from runtime services, so they cannot be imported statically.
  // The facade injects them here and every registry built below closes over those exact values,
  // so this module keeps no mutable state.
  exactOwnKeys(
    dependencies,
    [
      "RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID",
      "RESPONSE_LOST_QUERY_OPERATION_BINDINGS",
      "RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY",
      "bunBridgeOperationDescriptor",
    ],
    "Bun bridge operation registry dependencies",
    { plain: true }
  );
  invariant(
    [
      dependencies.RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID,
      dependencies.RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
      dependencies.RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY,
    ].every(
      (registry) => registry !== null && typeof registry === "object" && Object.isFrozen(registry)
    ) && typeof dependencies.bunBridgeOperationDescriptor === "function",
    "Bun bridge operation registry binding drift"
  );
  const {
    RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID,
    RESPONSE_LOST_QUERY_OPERATION_BINDINGS,
    RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY,
    bunBridgeOperationDescriptor,
  } = dependencies;

  const BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS = deepFreezeExact({
    "runtime/set-001-storage-preflight": bunBridgeOperationDescriptor(
      "runtime/set-001-storage-preflight",
      STORAGE_PREFLIGHT_BRIDGE_SOURCE,
      "bootstrap-preflight",
      ["userAgents"],
      "storage-preflight-private-v2"
    ),
    "runtime/set-004b-session-policy-preflight": bunBridgeOperationDescriptor(
      "runtime/set-004b-session-policy-preflight",
      SECURITY_SESSION_BRIDGE_SOURCE,
      "database",
      [],
      "session-policy-private-v1"
    ),
    "runtime/set-004c-auth-rate-budget-preflight": bunBridgeOperationDescriptor(
      "runtime/set-004c-auth-rate-budget-preflight",
      SECURITY_RATE_BRIDGE_SOURCE,
      "database",
      [],
      "auth-rate-private-v1"
    ),
    "runtime/set-032-storage-post-setup": bunBridgeOperationDescriptor(
      "runtime/set-032-storage-post-setup",
      MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
      "database",
      ["mediaId"],
      "missing-media-row-count-v1"
    ),
    "runtime/set-041-preference-a": bunBridgeOperationDescriptor(
      "runtime/set-041-preference-a",
      PREFERENCE_SET_BRIDGE_SOURCE,
      "database",
      ["showFieldMetadata", "userId"],
      "preference-write-private-v1"
    ),
    "runtime/set-042-preference-a-proof": bunBridgeOperationDescriptor(
      "runtime/set-042-preference-a-proof",
      PREFERENCE_GET_BRIDGE_SOURCE,
      "database",
      ["userId"],
      "preference-read-private-v1"
    ),
    "runtime/set-043-preference-b": bunBridgeOperationDescriptor(
      "runtime/set-043-preference-b",
      PREFERENCE_SET_BRIDGE_SOURCE,
      "database",
      ["showFieldMetadata", "userId"],
      "preference-write-private-v1"
    ),
    "runtime/set-044-preference-b-proof": bunBridgeOperationDescriptor(
      "runtime/set-044-preference-b-proof",
      PREFERENCE_GET_BRIDGE_SOURCE,
      "database",
      ["userId"],
      "preference-read-private-v1"
    ),
    "runtime/set-013-user-a-proof": bunBridgeOperationDescriptor(
      "runtime/set-013-user-a-proof",
      USER_PROOF_BRIDGE_SOURCE,
      "user-identity-proof",
      ["email", "userId"],
      "user-identity-private-v2"
    ),
    "runtime/set-015-user-b-proof": bunBridgeOperationDescriptor(
      "runtime/set-015-user-b-proof",
      USER_PROOF_BRIDGE_SOURCE,
      "user-identity-proof",
      ["email", "userId"],
      "user-identity-private-v2"
    ),
    "runtime/set-012-user-a-create": bunBridgeOperationDescriptor(
      "runtime/set-012-user-a-create",
      USER_PROVISION_BRIDGE_SOURCE,
      "user-provisioning",
      ["email", "name"],
      "user-provision-private-v2"
    ),
    "runtime/set-014-user-b-create": bunBridgeOperationDescriptor(
      "runtime/set-014-user-b-create",
      USER_PROVISION_BRIDGE_SOURCE,
      "user-provisioning",
      ["email", "name"],
      "user-provision-private-v2"
    ),
    "runtime/set-035-screen-create": bunBridgeOperationDescriptor(
      "runtime/set-035-screen-create",
      SCREEN_MATERIALIZE_BRIDGE_SOURCE,
      "schema-only",
      ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
      "screen-materialize-private-v1"
    ),
    "runtime/set-037-retry-screen-create": bunBridgeOperationDescriptor(
      "runtime/set-037-retry-screen-create",
      SCREEN_MATERIALIZE_BRIDGE_SOURCE,
      "schema-only",
      ["bodyWithoutDefinition", "contentType", "definitionWithoutListView"],
      "screen-materialize-private-v1"
    ),
  });

  const BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS = deepFreezeExact(
    Object.fromEntries(
      Object.entries(RESPONSE_LOST_QUERY_OPERATION_BINDINGS).flatMap(([actionId, binding]) => {
        const family =
          RESPONSE_LOST_QUERY_SOURCES_BY_FAMILY[RESPONSE_LOST_QUERY_FAMILY_BY_ACTION_ID[actionId]];
        invariant(family !== undefined, "response-lost descriptor family is absent");
        return [
          [
            binding.baselineOperationId,
            bunBridgeOperationDescriptor(
              binding.baselineOperationId,
              family.preflight,
              family.profile,
              family.preflightKeys,
              "bounded-natural-candidates-v1"
            ),
          ],
          [
            binding.discoveryOperationId,
            bunBridgeOperationDescriptor(
              binding.discoveryOperationId,
              family.discovery,
              family.profile,
              binding.inputKeys,
              "bounded-natural-candidates-v1"
            ),
          ],
        ];
      })
    )
  );

  const BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS = deepFreezeExact({
    "terminal/task-traffic-snapshot": bunBridgeOperationDescriptor(
      "terminal/task-traffic-snapshot",
      TASK_TRAFFIC_SNAPSHOT_BRIDGE_SOURCE,
      "database",
      ["userAgents"],
      "task-traffic-complete-private-v2"
    ),
    "resource/content-routes-exact": bunBridgeOperationDescriptor(
      "resource/content-routes-exact",
      CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
      "database",
      [],
      "content-routes-private-v1"
    ),
    "resource/current-owner-exact": bunBridgeOperationDescriptor(
      "resource/current-owner-exact",
      CURRENT_RESOURCE_OWNER_QUERY_BRIDGE_SOURCE,
      "database",
      ["entryIds", "mediaId", "override", "overrideExpectedPresent"],
      "resource-owner-private-v2"
    ),
    "resource/seo-entry-discovery": bunBridgeOperationDescriptor(
      "resource/seo-entry-discovery",
      SEO_ENTRY_DISCOVERY_BRIDGE_SOURCE,
      "database",
      ["targetIds"],
      "seo-entry-discovery-private-v1"
    ),
    "resource/api-session-observation": bunBridgeOperationDescriptor(
      "resource/api-session-observation",
      API_SESSION_OBSERVATION_BRIDGE_SOURCE,
      "database",
      ["userAgent", "userId"],
      "api-session-observation-private-v1"
    ),
    "resource/bootstrap-login-observation": bunBridgeOperationDescriptor(
      "resource/bootstrap-login-observation",
      BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
      "database",
      ["userAgent", "userId"],
      "bootstrap-login-observation-private-v1"
    ),
    "resource/bootstrap-cas-restore": bunBridgeOperationDescriptor(
      "resource/bootstrap-cas-restore",
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
      "database",
      ["baseline", "newestOwnedPair", "userId"],
      "bootstrap-restore-private-v2"
    ),
    "resource/bootstrap-baseline-read": bunBridgeOperationDescriptor(
      "resource/bootstrap-baseline-read",
      BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
      "database",
      ["userId"],
      "bootstrap-baseline-read-private-v1"
    ),
    "resource/storage-final-preflight": bunBridgeOperationDescriptor(
      "resource/storage-final-preflight",
      STORAGE_PREFLIGHT_BRIDGE_SOURCE,
      "bootstrap-preflight",
      ["userAgents"],
      "storage-preflight-private-v2"
    ),
    "resource/missing-media-db-absence": bunBridgeOperationDescriptor(
      "resource/missing-media-db-absence",
      MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
      "database",
      ["mediaId"],
      "missing-media-row-count-v1"
    ),
    "legacy/user-delete-exact": bunBridgeOperationDescriptor(
      "legacy/user-delete-exact",
      USER_DELETE_BRIDGE_SOURCE,
      "user-identity-proof",
      ["userId"],
      "legacy-user-delete-private-v1"
    ),
    "legacy/user-absence-exact": bunBridgeOperationDescriptor(
      "legacy/user-absence-exact",
      USER_ABSENCE_BRIDGE_SOURCE,
      "user-identity-proof",
      ["userId"],
      "legacy-user-absence-private-v1"
    ),
  });

  const BUN_BRIDGE_OPERATION_DESCRIPTORS = deepFreezeExact({
    ...BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    ...BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
    ...BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
  });

  return Object.freeze({
    BUN_BRIDGE_AUXILIARY_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RESPONSE_LOST_OPERATION_DESCRIPTORS,
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
  });
}
