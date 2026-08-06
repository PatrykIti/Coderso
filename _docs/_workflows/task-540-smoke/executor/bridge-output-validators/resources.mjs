import path from "node:path";

import { MAX_COMPLETE_SESSION_ROWS } from "../config.mjs";
import { deepFreezeExact, exactOwnKeys, invariant } from "../foundation.mjs";
import {
  BOOTSTRAP_RAW_USER_ROW_KEYS,
  isNullableIsoTimestamp,
  validateBootstrapPrivateBaseline,
} from "../bootstrap-contracts.mjs";
import { assertPlainJsonValue } from "../json-schema.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";
import {
  requireBridgeUuid,
  validateExactBridgeKeys,
} from "../bun-bridge-validation-primitives.mjs";
import {
  CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
  CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
  CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
  MEDIA_EXACT_BRIDGE_SOURCES,
  PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES,
  SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES,
  TASK_TRAFFIC_EXACT_BRIDGE_SOURCES,
  USER_EXACT_BRIDGE_SOURCES,
  USER_SETTING_EXACT_BRIDGE_SOURCES,
} from "../bun-bridge-resource-sources.mjs";
import {
  BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE,
  BOOTSTRAP_CAS_ROLLBACK_REASONS,
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE,
} from "../bridge-sources/bootstrap.mjs";
import {
  CONTENT_ROUTES_EXACT_BRIDGE_SOURCE,
  MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE,
  STORAGE_PREFLIGHT_BRIDGE_SOURCE,
} from "../bridge-sources/platform.mjs";

export function createResourceBridgeOutputValidators(dependencies) {
  // The response-lost projections and the API-session and bootstrap-login observation
  // validators belong to authorities the facade constructs, so they arrive as injected
  // dependencies instead of static imports and this module keeps no mutable state.
  exactOwnKeys(
    dependencies,
    [
      "validateApiSessionObservation",
      "validateBooleanBridgeProjection",
      "validateBootstrapLoginObservation",
      "validateBoundedCandidatesBridgeOutput",
      "validateContentRoutesBridgeProjection",
    ],
    "resource bridge output validator dependencies",
    { plain: true }
  );
  invariant(
    Object.values(dependencies).every((dependency) => typeof dependency === "function"),
    "resource bridge output validator dependencies are not callable"
  );
  const {
    validateApiSessionObservation,
    validateBooleanBridgeProjection,
    validateBootstrapLoginObservation,
    validateBoundedCandidatesBridgeOutput,
    validateContentRoutesBridgeProjection,
  } = dependencies;

  function validateRequiredSmokeSettingsProjection(value, label) {
    validateExactBridgeKeys(value, ["driver", "localDir", "setup"], label);
    const expected = {
      driver: ["storage.driver", "local"],
      localDir: ["storage.local.dir", null],
      setup: ["setup.completed", true],
    };
    for (const [name, row] of Object.entries(value)) {
      validateExactBridgeKeys(row, ["key", "updatedAt", "value"], label + " " + name);
      const [expectedKey, expectedValue] = expected[name];
      invariant(
        row.key === expectedKey &&
          isNullableIsoTimestamp(row.updatedAt) &&
          row.updatedAt !== null &&
          (expectedValue === null
            ? typeof row.value === "string" && row.value.length > 0
            : row.value === expectedValue),
        label + " " + name + " row drift"
      );
    }
    return value;
  }

  function validateStoragePreflightBridgeOutput(state, descriptor, _input, value) {
    validateExactBridgeKeys(
      value,
      [
        "bootstrap",
        "contentRoutes",
        "local",
        "requiredSettings",
        "setupComplete",
        "storageRoot",
        "taskTrafficBaseline",
      ],
      descriptor.operationId + " output"
    );
    validateBootstrapPrivateBaseline(value.bootstrap, descriptor.operationId + " bootstrap");
    validateContentRoutesBridgeProjection(
      value.contentRoutes,
      descriptor.operationId + " content routes"
    );
    validateRequiredSmokeSettingsProjection(
      value.requiredSettings,
      descriptor.operationId + " required settings"
    );
    validateExactBridgeKeys(
      value.taskTrafficBaseline,
      ["accessIds", "auditIds", "sessionIds"],
      descriptor.operationId + " task traffic baseline"
    );
    invariant(
      value.local === true &&
        value.setupComplete === true &&
        typeof value.storageRoot === "string" &&
        value.storageRoot.length > 0 &&
        path.isAbsolute(value.storageRoot) &&
        path.resolve(value.storageRoot) === value.storageRoot &&
        value.storageRoot ===
          path.resolve(state.root, "core", value.requiredSettings.localDir.value) &&
        [
          value.taskTrafficBaseline.accessIds,
          value.taskTrafficBaseline.auditIds,
          value.taskTrafficBaseline.sessionIds,
        ].every(
          (ids) =>
            Array.isArray(ids) &&
            ids.every((id) => typeof id === "string" && /^[0-9a-f-]{36}$/u.test(id))
        ),
      descriptor.operationId + " storage preflight projection drift"
    );
    return value;
  }

  function validateTaskTrafficBridgeOutput(_state, descriptor, input, value) {
    validateExactBridgeKeys(
      value,
      ["access", "audit", "completeSession", "session"],
      descriptor.operationId + " output"
    );
    const rowContracts = [
      ["access", value.access, ["id", "sessionId", "userAgent", "userId"]],
      ["audit", value.audit, ["actorId", "id", "userAgent"]],
      ["completeSession", value.completeSession, ["id", "userAgent", "userId"]],
      ["session", value.session, ["id", "userAgent", "userId"]],
    ];
    const nullableUuid = (candidate, label) => {
      if (candidate !== null) requireBridgeUuid(candidate, label);
    };
    for (const [kind, rows, keys] of rowContracts) {
      invariant(
        Array.isArray(rows) && rows.length <= MAX_COMPLETE_SESSION_ROWS,
        descriptor.operationId + " row bound drift"
      );
      for (const row of rows) {
        validateExactBridgeKeys(row, keys, descriptor.operationId + " " + kind + " row");
        requireBridgeUuid(row.id, descriptor.operationId + " " + kind + " row ID");
        if (kind === "access") {
          nullableUuid(row.sessionId, descriptor.operationId + " access session ID");
          nullableUuid(row.userId, descriptor.operationId + " access user ID");
        } else if (kind === "audit") {
          nullableUuid(row.actorId, descriptor.operationId + " audit actor ID");
        } else {
          requireBridgeUuid(row.userId, descriptor.operationId + " " + kind + " user ID");
        }
        if (kind === "completeSession") {
          invariant(
            row.userAgent === null ||
              (typeof row.userAgent === "string" && Buffer.byteLength(row.userAgent) <= 512),
            descriptor.operationId + " complete-session user-agent drift"
          );
        } else {
          invariant(
            typeof row.userAgent === "string" && input.userAgents.includes(row.userAgent),
            descriptor.operationId + " " + kind + " user-agent drift"
          );
        }
      }
    }
    return value;
  }

  function validateBootstrapRestoreBridgeOutput(_state, descriptor, _input, value) {
    validateExactBridgeKeys(value, ["kind", "proof", "reason"], descriptor.operationId + " output");
    invariant(
      ["committed", "committed-proof-failed", "rolled-back"].includes(value.kind),
      descriptor.operationId + " closed restore outcome kind drift"
    );
    if (value.kind === "rolled-back") {
      invariant(
        value.proof === null && BOOTSTRAP_CAS_ROLLBACK_REASONS.includes(value.reason),
        descriptor.operationId + " rollback reason/proof drift"
      );
      return value;
    }
    invariant(value.reason === null, descriptor.operationId + " committed rollback reason drift");
    const proofKeys = [
      "afterCommitByteIdentical",
      "completeRowByteIdentical",
      "conditionalUpdateAffectedOne",
      "inTransactionByteIdentical",
      "restored",
      "roleTuplesByteIdentical",
      "rolesInTransactionByteIdentical",
      "rolesShareLocked",
      "transactionLocked",
    ];
    validateExactBridgeKeys(value.proof, proofKeys, descriptor.operationId + " proof");
    invariant(
      proofKeys.every((key) => typeof value.proof[key] === "boolean"),
      descriptor.operationId + " restore boolean drift"
    );
    const transactionKeys = [
      "conditionalUpdateAffectedOne",
      "inTransactionByteIdentical",
      "rolesInTransactionByteIdentical",
      "rolesShareLocked",
      "transactionLocked",
    ];
    invariant(
      transactionKeys.every((key) => value.proof[key] === true) &&
        value.proof.completeRowByteIdentical === value.proof.afterCommitByteIdentical,
      descriptor.operationId + " committed transaction proof drift"
    );
    if (value.kind === "committed") {
      invariant(
        proofKeys.every((key) => value.proof[key] === true),
        descriptor.operationId + " committed restore proof failed"
      );
    } else {
      invariant(
        value.proof.restored === false &&
          (value.proof.afterCommitByteIdentical === false ||
            value.proof.roleTuplesByteIdentical === false),
        descriptor.operationId + " committed proof-failure outcome drift"
      );
    }
    return value;
  }

  function validateBootstrapBaselineReadBridgeOutput(state, descriptor, input, value) {
    validateExactBridgeKeys(
      value,
      ["id", "rawUserRow", "roleTuples"],
      descriptor.operationId + " output"
    );
    exactOwnKeys(
      value.rawUserRow,
      BOOTSTRAP_RAW_USER_ROW_KEYS,
      descriptor.operationId + " raw user row",
      { plain: true }
    );
    invariant(
      value.id === input.userId &&
        state.bootstrapBaseline !== null &&
        value.id === state.bootstrapBaseline.id &&
        deepEqualJson(value.rawUserRow, state.bootstrapBaseline.rawUserRow) &&
        deepEqualJson(value.roleTuples, state.bootstrapBaseline.roleTuples),
      descriptor.operationId + " immutable baseline byte identity drift"
    );
    assertPlainJsonValue(value.rawUserRow, descriptor.operationId + " raw user row");
    assertPlainJsonValue(value.roleTuples, descriptor.operationId + " role tuples");
    return value;
  }

  function validateStrictResourceBridgeOutput(state, descriptor, input, value) {
    const source = descriptor.source;
    if (
      [
        ...Object.values(PRESENTATION_OVERRIDE_EXACT_BRIDGE_SOURCES),
        ...Object.values(SEO_ENTRY_DOCUMENT_EXACT_BRIDGE_SOURCES),
        ...Object.values(USER_SETTING_EXACT_BRIDGE_SOURCES),
        ...Object.values(USER_EXACT_BRIDGE_SOURCES),
        ...Object.values(TASK_TRAFFIC_EXACT_BRIDGE_SOURCES).flatMap((sources) =>
          Object.values(sources)
        ),
      ].includes(source)
    ) {
      validateExactBridgeKeys(
        value,
        ["absent", "affected", "present"],
        descriptor.operationId + " output"
      );
      invariant(
        typeof value.absent === "boolean" &&
          Number.isSafeInteger(value.affected) &&
          typeof value.present === "boolean",
        descriptor.operationId + " resource result drift"
      );
      return value;
    }
    if (Object.values(MEDIA_EXACT_BRIDGE_SOURCES).includes(source)) {
      validateExactBridgeKeys(
        value,
        ["absent", "present", "stage"],
        descriptor.operationId + " output"
      );
      invariant(
        typeof value.absent === "boolean" &&
          typeof value.present === "boolean" &&
          typeof value.stage === "string",
        descriptor.operationId + " media result drift"
      );
      return value;
    }
    if (
      [
        CONTENT_TYPE_PROVENANCE_BRIDGE_SOURCE,
        CONTENT_ENTRY_PROVENANCE_BRIDGE_SOURCE,
        CUSTOM_SCREEN_PROVENANCE_BRIDGE_SOURCE,
      ].includes(source)
    ) {
      return validateBooleanBridgeProjection(value, "present", descriptor.operationId + " output");
    }
    if (source === BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE)
      return validateBootstrapRestoreBridgeOutput(state, descriptor, input, value);
    if (source === BOOTSTRAP_BASELINE_READ_BRIDGE_SOURCE)
      return validateBootstrapBaselineReadBridgeOutput(state, descriptor, input, value);
    if (source === BOOTSTRAP_LOGIN_OBSERVATION_BRIDGE_SOURCE)
      return validateBootstrapLoginObservation(state, value, descriptor.operationId + " output");
    if (source === CONTENT_ROUTES_EXACT_BRIDGE_SOURCE)
      return validateContentRoutesBridgeProjection(value, descriptor.operationId + " output");
    if (source === STORAGE_PREFLIGHT_BRIDGE_SOURCE)
      return validateStoragePreflightBridgeOutput(state, descriptor, input, value);
    if (source === MISSING_MEDIA_DB_ABSENCE_BRIDGE_SOURCE) {
      validateExactBridgeKeys(value, ["rowCount"], descriptor.operationId + " output");
      invariant(
        Number.isSafeInteger(value.rowCount) && value.rowCount >= 0 && value.rowCount <= 1,
        descriptor.operationId + " missing media count drift"
      );
      return value;
    }
    invariant(false, "strict resource bridge output source is not registered");
  }

  const BUN_BRIDGE_OUTPUT_VALIDATORS = deepFreezeExact({
    "api-session-observation-private-v1": (state, descriptor, input, value) => {
      validateApiSessionObservation(
        value,
        input.userId,
        input.userAgent,
        descriptor.operationId + " output"
      );
      return value;
    },
    "auth-rate-private-v1": (_state, descriptor, _input, value) => {
      validateExactBridgeKeys(
        value,
        ["enabled", "maxRequests", "windowSeconds"],
        descriptor.operationId + " output"
      );
      invariant(
        typeof value.enabled === "boolean" &&
          Number.isSafeInteger(value.maxRequests) &&
          Number.isSafeInteger(value.windowSeconds),
        descriptor.operationId + " rate projection drift"
      );
      return value;
    },
    "bootstrap-login-observation-private-v1": (state, descriptor, _input, value) =>
      validateBootstrapLoginObservation(state, value, descriptor.operationId + " output"),
    "bootstrap-baseline-read-private-v1": validateBootstrapBaselineReadBridgeOutput,
    "bootstrap-restore-private-v2": validateBootstrapRestoreBridgeOutput,
    "bounded-natural-candidates-v1": validateBoundedCandidatesBridgeOutput,
    "content-routes-private-v1": (_state, descriptor, _input, value) =>
      validateContentRoutesBridgeProjection(value, descriptor.operationId + " output"),
    "legacy-user-absence-private-v1": (_state, descriptor, _input, value) =>
      validateBooleanBridgeProjection(value, "absent", descriptor.operationId + " output"),
    "legacy-user-delete-private-v1": (_state, descriptor, _input, value) =>
      validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output"),
    "missing-media-row-count-v1": (_state, descriptor, _input, value) => {
      validateExactBridgeKeys(value, ["rowCount"], descriptor.operationId + " output");
      invariant(
        Number.isSafeInteger(value.rowCount) && value.rowCount >= 0 && value.rowCount <= 1,
        descriptor.operationId + " missing media count drift"
      );
      return value;
    },
    "preference-read-private-v1": (_state, descriptor, _input, value) =>
      validateBooleanBridgeProjection(value, "showFieldMetadata", descriptor.operationId + " output"),
    "preference-write-private-v1": (_state, descriptor, _input, value) =>
      validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output"),
    "resource-owner-private-v2": (_state, descriptor, input, value) => {
      validateExactBridgeKeys(
        value,
        ["entries", "media", "override", "overrideAbsent"],
        descriptor.operationId + " output"
      );
      invariant(Array.isArray(value.entries), descriptor.operationId + " owner entries drift");
      for (const entry of value.entries)
        validateExactBridgeKeys(
          entry,
          ["id", "ownerSubjectIdentifier"],
          descriptor.operationId + " owner entry"
        );
      validateExactBridgeKeys(
        value.media,
        ["id", "ownerSubjectIdentifier"],
        descriptor.operationId + " media owner"
      );
      invariant(
        typeof value.overrideAbsent === "boolean" &&
          value.overrideAbsent === !input.overrideExpectedPresent,
        descriptor.operationId + " override absence drift"
      );
      if (input.overrideExpectedPresent) {
        validateExactBridgeKeys(
          value.override,
          ["ownerSubjectIdentifier"],
          descriptor.operationId + " override owner"
        );
      } else invariant(value.override === null, descriptor.operationId + " absent override drift");
      return value;
    },
    "seo-entry-discovery-private-v1": (_state, descriptor, input, value) => {
      validateExactBridgeKeys(value, ["candidates"], descriptor.operationId + " output");
      invariant(
        Array.isArray(value.candidates) && value.candidates.length <= 6,
        descriptor.operationId + " SEO candidate bound drift"
      );
      const documentIds = new Set();
      const targetIds = new Set();
      let previousCorrelation = null;
      for (const candidate of value.candidates) {
        validateExactBridgeKeys(
          candidate,
          ["id", "targetId", "targetType"],
          descriptor.operationId + " SEO candidate"
        );
        requireBridgeUuid(candidate.id, descriptor.operationId + " SEO document ID");
        requireBridgeUuid(candidate.targetId, descriptor.operationId + " SEO target ID");
        const correlation = candidate.targetId + "\0" + candidate.id;
        invariant(
          candidate.targetType === "entry" &&
            input.targetIds.includes(candidate.targetId) &&
            !documentIds.has(candidate.id) &&
            !targetIds.has(candidate.targetId) &&
            (previousCorrelation === null || previousCorrelation < correlation),
          descriptor.operationId + " SEO target correlation drift"
        );
        documentIds.add(candidate.id);
        targetIds.add(candidate.targetId);
        previousCorrelation = correlation;
      }
      return value;
    },
    "screen-materialize-private-v1": (_state, descriptor, input, value) => {
      validateExactBridgeKeys(
        value,
        [...Object.keys(input.bodyWithoutDefinition), "definition", "schemaVersion"],
        descriptor.operationId + " output"
      );
      invariant(
        value.schemaVersion === 4 &&
          value.definition &&
          typeof value.definition === "object" &&
          !Array.isArray(value.definition),
        descriptor.operationId + " screen projection drift"
      );
      return value;
    },
    "session-policy-private-v1": (_state, descriptor, _input, value) => {
      validateExactBridgeKeys(
        value,
        ["csrfHeaderName", "effectiveMaxPerUserAtLeast2", "singleSession"],
        descriptor.operationId + " output"
      );
      invariant(
        typeof value.csrfHeaderName === "string" &&
          typeof value.effectiveMaxPerUserAtLeast2 === "boolean" &&
          typeof value.singleSession === "boolean",
        descriptor.operationId + " session policy drift"
      );
      return value;
    },
    "storage-preflight-private-v2": validateStoragePreflightBridgeOutput,
    "strict-resource-operation-v1": validateStrictResourceBridgeOutput,
    "task-traffic-complete-private-v2": validateTaskTrafficBridgeOutput,
    "user-identity-private-v2": (_state, descriptor, _input, value) => {
      validateBooleanBridgeProjection(value, "ok", descriptor.operationId + " output");
      invariant(value.ok === true, descriptor.operationId + " user identity proof drift");
      return value;
    },
    "user-provision-private-v2": (_state, descriptor, _input, value) => {
      validateExactBridgeKeys(
        value,
        [
          "adminRoleTupleCount",
          "exactIdPasswordUpdate",
          "normalizedEmailMatches",
          "userEmail",
          "userId",
        ],
        descriptor.operationId + " output"
      );
      invariant(
        Number.isSafeInteger(value.adminRoleTupleCount) &&
          typeof value.exactIdPasswordUpdate === "boolean" &&
          typeof value.normalizedEmailMatches === "boolean" &&
          typeof value.userEmail === "string" &&
          typeof value.userId === "string",
        descriptor.operationId + " user provision drift"
      );
      return value;
    },
  });

  function validateBunBridgeOutput(state, descriptor, input, value) {
    const validator = BUN_BRIDGE_OUTPUT_VALIDATORS[descriptor.outputSchemaId];
    invariant(
      typeof validator === "function",
      "Bun bridge output schema is not registered: " + descriptor.outputSchemaId
    );
    return validator(state, descriptor, input, value);
  }

  return Object.freeze({
    BUN_BRIDGE_OUTPUT_VALIDATORS,
    validateBootstrapBaselineReadBridgeOutput,
    validateBootstrapRestoreBridgeOutput,
    validateBunBridgeOutput,
    validateRequiredSmokeSettingsProjection,
    validateStoragePreflightBridgeOutput,
    validateStrictResourceBridgeOutput,
    validateTaskTrafficBridgeOutput,
  });
}
