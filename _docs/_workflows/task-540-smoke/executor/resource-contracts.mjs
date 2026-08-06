import { deepFreezeExact, invariant } from "./foundation.mjs";

export const RESOURCE_RECORD_INPUT_KEYS = Object.freeze([
  "schemaVersion",
  "resourceKey",
  "class",
  "kind",
  "identifierType",
  "identifier",
  "ownerSubjectIdentifier",
  "acquisitionSourceId",
  "sourceActionOrdinal",
  "acquisitionChannel",
  "provenanceAdapterId",
  "cleanupAdapterId",
  "absenceAdapterId",
  "cleanupPhase",
  "cleanupPolicy",
  "deleteAuthority",
  "restoreAuthority",
  "provenanceOpId",
  "cleanupOpId",
  "absenceOpId",
  "provenanceSchemaId",
  "cleanupSchemaId",
  "absenceSchemaId",
]);
export const RESOURCE_RECORD_KEYS = Object.freeze([
  ...RESOURCE_RECORD_INPUT_KEYS.slice(0, 9),
  "acquisitionOrdinal",
  ...RESOURCE_RECORD_INPUT_KEYS.slice(9, 10),
  "dependsOn",
  ...RESOURCE_RECORD_INPUT_KEYS.slice(10),
]);
export const RESOURCE_DELTA_KEYS = Object.freeze(["cores", "dependencyEdges"]);
export const RESOURCE_EDGE_KEYS = Object.freeze(["parentKey", "childKey", "relation"]);
export const CLEANUP_OPERATION_KINDS = deepFreezeExact(["provenance", "delete", "absence"]);
export const BROWSER_RECEIPT_KEYS = Object.freeze([
  "runnerVersion",
  "sequence",
  "kind",
  "scenario",
  "operation",
  "routeKey",
  "method",
  "pattern",
  "assertionName",
  "command",
  "status",
  "stdoutBytes",
  "stderrBytes",
  "stdoutSha256",
  "stderrSha256",
  "stdoutTruncated",
  "stderrTruncated",
  "sanitizedOutput",
  "stdoutDiscarded",
  "pageId",
  "tabIndex",
]);
export const RUNTIME_RECEIPT_KEYS = Object.freeze([
  "runnerVersion",
  "sequence",
  "operation",
  "operationDescriptor",
  "status",
  "evidenceSha256",
  "subjectKind",
  "subjectIdentifier",
  "sanitizedOutput",
]);
export const TERMINAL_RESOURCE_KINDS = new Set([
  "audit-log-task-ua",
  "access-log-task-ua",
  "session-task",
]);
export const INTENTIONAL_PRESENTATION_OVERRIDE_ABSENCE_ACTIONS = deepFreezeExact({
  acquisition: "set-040-override-proof",
  proof: "ss-006-overrides-proof",
  reset: "ss-005-overrides-reset",
});

export function resourceKindContract({
  className,
  identifierType,
  identifierArity,
  acquisitions,
  cleanupAdapterId,
  absenceAdapterId,
  phase,
  policy,
  deleteAuthority = false,
  restoreAuthority = false,
  operationSlots = "PCA",
}) {
  return deepFreezeExact({
    class: className,
    identifierType,
    identifierArity,
    acquisitions,
    cleanupAdapterId,
    absenceAdapterId,
    cleanupPhase: { success: phase.success, failure: phase.failure },
    cleanupPolicy: policy,
    deleteAuthority,
    restoreAuthority,
    operationSlots,
  });
}

export const ADMIN_OR_FAILURE_DB = deepFreezeExact({
  "admin-api": "admin-api-exact",
  "failure-discovery": "db-exact",
});
export const SERVICE_SETTING_OR_FAILURE_DB = deepFreezeExact({
  service: "user-setting-service",
  "failure-discovery": "db-exact",
});
export const SERVICE_USER_OR_FAILURE_DB = deepFreezeExact({
  service: "user-provisioning-service",
  "failure-discovery": "db-exact",
});
export const RESOURCE_KIND_CONTRACTS = deepFreezeExact({
  "presentation-override": resourceKindContract({
    className: "delete",
    identifierType: "db-composite",
    identifierArity: 4,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "seo-document-entry": resourceKindContract({
    className: "delete",
    identifierType: "seo-document-target",
    identifierArity: 3,
    acquisitions: { "cleanup-discovery": "db-exact" },
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "setting-user-a": resourceKindContract({
    className: "delete",
    identifierType: "setting-row",
    identifierArity: 2,
    acquisitions: SERVICE_SETTING_OR_FAILURE_DB,
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "setting-user-b": resourceKindContract({
    className: "delete",
    identifierType: "setting-row",
    identifierArity: 2,
    acquisitions: SERVICE_SETTING_OR_FAILURE_DB,
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "screen-main": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "admin-api-exact",
    absenceAdapterId: "admin-api-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "screen-retry": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "admin-api-exact",
    absenceAdapterId: "admin-api-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "entry-editable": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "admin-api-exact",
    absenceAdapterId: "admin-api-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "entry-related": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "admin-api-exact",
    absenceAdapterId: "admin-api-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "media-row-key": resourceKindContract({
    className: "delete",
    identifierType: "media-id-and-storage-key",
    identifierArity: 2,
    acquisitions: {
      "admin-api": "media-api-composite",
      "failure-discovery": "media-api-composite",
    },
    cleanupAdapterId: "media-api-composite",
    absenceAdapterId: "media-api-composite",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "content-type": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: ADMIN_OR_FAILURE_DB,
    cleanupAdapterId: "admin-api-exact",
    absenceAdapterId: "admin-api-exact",
    phase: { success: 3, failure: 3 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "audit-log-task-ua": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: { "terminal-db-delta": "db-terminal-delta" },
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 6, failure: 6 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "access-log-task-ua": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: { "terminal-db-delta": "db-terminal-delta" },
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 6, failure: 6 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "session-task": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: { "terminal-db-delta": "db-terminal-delta" },
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 6, failure: 6 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "user-a": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: SERVICE_USER_OR_FAILURE_DB,
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 7, failure: 7 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "user-b": resourceKindContract({
    className: "delete",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: SERVICE_USER_OR_FAILURE_DB,
    cleanupAdapterId: "db-exact",
    absenceAdapterId: "db-exact",
    phase: { success: 7, failure: 7 },
    policy: "delete-and-prove-absent",
    deleteAuthority: true,
  }),
  "bootstrap-user-login-state": resourceKindContract({
    className: "restore",
    identifierType: "db-id",
    identifierArity: 1,
    acquisitions: { preflight: "db-exact" },
    cleanupAdapterId: "postgres-bootstrap-cas",
    absenceAdapterId: "db-exact",
    phase: { success: 8, failure: 8 },
    policy: "restore-and-prove-byte-identical",
    restoreAuthority: true,
  }),
  "site-content-routes-baseline": resourceKindContract({
    className: "retained",
    identifierType: "proof-key",
    identifierArity: 1,
    acquisitions: { preflight: "db-exact" },
    cleanupAdapterId: null,
    absenceAdapterId: "db-exact",
    phase: { success: 9, failure: 9 },
    policy: "observe-only",
    operationSlots: "PA",
  }),
  "storage-baseline": resourceKindContract({
    className: "retained",
    identifierType: "proof-key",
    identifierArity: 1,
    acquisitions: { preflight: "filesystem-identity" },
    cleanupAdapterId: null,
    absenceAdapterId: "filesystem-identity",
    phase: { success: 9, failure: 9 },
    policy: "observe-only",
    operationSlots: "PA",
  }),
  "missing-media-baseline": resourceKindContract({
    className: "retained",
    identifierType: "proof-key",
    identifierArity: 1,
    acquisitions: { preflight: "filesystem-identity" },
    cleanupAdapterId: null,
    absenceAdapterId: "filesystem-identity",
    phase: { success: 9, failure: 9 },
    policy: "observe-only",
    operationSlots: "PA",
  }),
  screenshot: resourceKindContract({
    className: "retained",
    identifierType: "filesystem-path",
    identifierArity: 1,
    acquisitions: { filesystem: "filesystem-identity", "failure-discovery": "filesystem-identity" },
    cleanupAdapterId: "filesystem-identity",
    absenceAdapterId: "filesystem-identity",
    phase: { success: 9, failure: 2 },
    policy: "retain-on-success-remove-on-failure",
    deleteAuthority: true,
  }),
  "browser-session": resourceKindContract({
    className: "runtime",
    identifierType: "browser-session-name",
    identifierArity: 1,
    acquisitions: { browser: "playwright-session" },
    cleanupAdapterId: "playwright-session",
    absenceAdapterId: "playwright-session",
    phase: { success: 1, failure: 1 },
    policy: "dispose-and-prove-closed",
  }),
  "route-registry": resourceKindContract({
    className: "runtime",
    identifierType: "proof-key",
    identifierArity: 1,
    acquisitions: { browser: "playwright-route-registry" },
    cleanupAdapterId: "playwright-route-registry",
    absenceAdapterId: "playwright-route-registry",
    phase: { success: 1, failure: 1 },
    policy: "release-and-prove-empty",
  }),
  "api-context-bootstrap": resourceKindContract({
    className: "runtime",
    identifierType: "api-context-name",
    identifierArity: 1,
    acquisitions: { service: "api-request-context" },
    cleanupAdapterId: "api-request-context",
    absenceAdapterId: "api-request-context",
    phase: { success: 4, failure: 4 },
    policy: "dispose-and-prove-closed",
  }),
  "api-context-user-a": resourceKindContract({
    className: "runtime",
    identifierType: "api-context-name",
    identifierArity: 1,
    acquisitions: { service: "api-request-context" },
    cleanupAdapterId: "api-request-context",
    absenceAdapterId: "api-request-context",
    phase: { success: 4, failure: 4 },
    policy: "dispose-and-prove-closed",
  }),
  "browser-private-root": resourceKindContract({
    className: "runtime",
    identifierType: "filesystem-path",
    identifierArity: 1,
    acquisitions: { filesystem: "filesystem-identity" },
    cleanupAdapterId: "filesystem-identity",
    absenceAdapterId: "filesystem-identity",
    phase: { success: 1, failure: 1 },
    policy: "dispose-and-prove-closed",
  }),
  "host-process-group": resourceKindContract({
    className: "runtime",
    identifierType: "process-group-id",
    identifierArity: 1,
    acquisitions: { process: "owned-process-group" },
    cleanupAdapterId: "owned-process-group",
    absenceAdapterId: "owned-process-group",
    phase: { success: 10, failure: 10 },
    policy: "dispose-and-prove-closed",
  }),
});

export function bunParticipation(mode, envProfileId = null, operationId = null) {
  invariant(
    [
      "node-local",
      "bound-runtime-bridge",
      "node+bound-runtime-bridge",
      "bun-one-shot",
      "node+bun-one-shot",
    ].includes(mode),
    "Bun bridge participation mode is invalid"
  );
  return deepFreezeExact({ mode, envProfileId, operationId });
}

export const NODE_LOCAL_BUN_PARTICIPATION = bunParticipation("node-local");
export const DATABASE_BUN_ONE_SHOT = bunParticipation("bun-one-shot", "database");
export const DATABASE_NODE_AND_BUN_ONE_SHOT = bunParticipation("node+bun-one-shot", "database");
export const USER_IDENTITY_BUN_ONE_SHOT = bunParticipation("bun-one-shot", "user-identity-proof");
export const RESOURCE_BUN_BRIDGE_PARTICIPATION = deepFreezeExact({
  "presentation-override": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "seo-document-entry": {
    provenance: { "cleanup-discovery": DATABASE_BUN_ONE_SHOT },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "setting-user-a": {
    provenance: {
      service: bunParticipation("bound-runtime-bridge", null, "runtime/set-041-preference-a"),
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "setting-user-b": {
    provenance: {
      service: bunParticipation("bound-runtime-bridge", null, "runtime/set-043-preference-b"),
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "screen-main": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "screen-retry": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "entry-editable": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "entry-related": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "media-row-key": {
    provenance: {
      "admin-api": DATABASE_NODE_AND_BUN_ONE_SHOT,
      "failure-discovery": DATABASE_NODE_AND_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_NODE_AND_BUN_ONE_SHOT,
    absence: DATABASE_NODE_AND_BUN_ONE_SHOT,
  },
  "content-type": {
    provenance: {
      "admin-api": NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": DATABASE_BUN_ONE_SHOT,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "audit-log-task-ua": {
    provenance: { "terminal-db-delta": DATABASE_BUN_ONE_SHOT },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "access-log-task-ua": {
    provenance: { "terminal-db-delta": DATABASE_BUN_ONE_SHOT },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "session-task": {
    provenance: { "terminal-db-delta": DATABASE_BUN_ONE_SHOT },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "user-a": {
    provenance: {
      service: bunParticipation("bound-runtime-bridge", null, "runtime/set-012-user-a-create"),
      "failure-discovery": USER_IDENTITY_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "user-b": {
    provenance: {
      service: bunParticipation("bound-runtime-bridge", null, "runtime/set-014-user-b-create"),
      "failure-discovery": USER_IDENTITY_BUN_ONE_SHOT,
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "bootstrap-user-login-state": {
    provenance: {
      preflight: bunParticipation(
        "bound-runtime-bridge",
        null,
        "runtime/set-001-storage-preflight"
      ),
    },
    cleanup: DATABASE_BUN_ONE_SHOT,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "site-content-routes-baseline": {
    provenance: {
      preflight: bunParticipation(
        "bound-runtime-bridge",
        null,
        "runtime/set-001-storage-preflight"
      ),
    },
    cleanup: null,
    absence: DATABASE_BUN_ONE_SHOT,
  },
  "storage-baseline": {
    provenance: {
      preflight: bunParticipation(
        "node+bound-runtime-bridge",
        null,
        "runtime/set-001-storage-preflight"
      ),
    },
    cleanup: null,
    absence: bunParticipation("node+bun-one-shot", "bootstrap-preflight"),
  },
  "missing-media-baseline": {
    provenance: {
      preflight: bunParticipation(
        "node+bound-runtime-bridge",
        null,
        "runtime/set-001-storage-preflight"
      ),
    },
    cleanup: null,
    absence: DATABASE_NODE_AND_BUN_ONE_SHOT,
  },
  screenshot: {
    provenance: {
      filesystem: NODE_LOCAL_BUN_PARTICIPATION,
      "failure-discovery": NODE_LOCAL_BUN_PARTICIPATION,
    },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "browser-session": {
    provenance: { browser: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "route-registry": {
    provenance: { browser: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "api-context-bootstrap": {
    provenance: { service: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "api-context-user-a": {
    provenance: { service: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "browser-private-root": {
    provenance: { filesystem: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
  "host-process-group": {
    provenance: { process: NODE_LOCAL_BUN_PARTICIPATION },
    cleanup: NODE_LOCAL_BUN_PARTICIPATION,
    absence: NODE_LOCAL_BUN_PARTICIPATION,
  },
});

export function assertResourceBunParticipationExhaustive() {
  invariant(
    deepEqualJson(
      Object.keys(RESOURCE_BUN_BRIDGE_PARTICIPATION).sort(),
      Object.keys(RESOURCE_KIND_CONTRACTS).sort()
    ),
    "resource Bun participation kind-set drift"
  );
  for (const [kind, contract] of Object.entries(RESOURCE_KIND_CONTRACTS)) {
    const participation = RESOURCE_BUN_BRIDGE_PARTICIPATION[kind];
    invariant(
      deepEqualJson(
        Object.keys(participation.provenance).sort(),
        Object.keys(contract.acquisitions).sort()
      ),
      kind + " resource Bun provenance channel-set drift"
    );
    invariant(
      (participation.cleanup === null) === (contract.cleanupAdapterId === null),
      kind + " resource Bun cleanup-slot drift"
    );
    invariant(participation.absence !== null, kind + " resource Bun absence-slot drift");
  }
}

export function deepEqualJson(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => deepEqualJson(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && deepEqualJson(left[key], right[key]))
  );
}
