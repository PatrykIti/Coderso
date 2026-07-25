// Cleanup execution stages for the TASK-540 smoke executor.
//
// Owns the legacy fixture subject projection for persistent resources, the cleanup and
// authoritative runtime receipt builders, the content-routes baseline delete proof, the ordered
// ten-phase cleanup scheduler, the never-skip independent cleanup step runner and the persistent
// resource cleanup operation and cleanup plan stage executors.
import {
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
} from "./config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  hashBytes,
  invariant,
} from "./foundation.mjs";
import {
  CLEANUP_OPERATION_KINDS,
  TERMINAL_RESOURCE_KINDS,
  deepEqualJson,
} from "./resource-contracts.mjs";
import { lengthPrefixedTuple } from "./resource-ledger.mjs";
import { resourceBunParticipationSlot } from "./resource-bun-authority.mjs";
import { cleanupDiagnostics } from "../cleanup/diagnostics.mjs";

const { retainPrivateCleanupFailureDiagnosticNeverThrow } = cleanupDiagnostics;

function legacySubjectForResource(state, record) {
  const id = record.identifier[0];
  const matched = [...state.fixtureIds.entries()].find(([, candidate]) => candidate === id);
  invariant(matched !== undefined, "persistent resource has no exact fixture identity mapping");
  return {
    kind: matched[0],
    id,
    storageKey: record.kind === "media-row-key" ? record.identifier[1] : null,
  };
}

export function cleanupRuntimeReceipt(
  state,
  operation,
  operationDescriptor,
  record,
  output,
  observedBytesSha256 = null
) {
  invariant(
    observedBytesSha256 === null ||
      (typeof observedBytesSha256 === "string" && /^[a-f0-9]{64}$/u.test(observedBytesSha256)),
    "cleanup authoritative observation hash drift"
  );
  const subjectKind = record?.kind ?? null;
  const subjectIdentifier =
    record === null || record === undefined
      ? null
      : record.identifier.length === 1
        ? record.identifier[0]
        : lengthPrefixedTuple(record.identifier);
  const authoritativeBytes = Buffer.from(
    canonicalJson({
      operation,
      operationDescriptor,
      subjectKind,
      subjectIdentifier,
      observedBytesSha256,
      output,
    }) + "\n"
  );
  const receipt = deepFreezeExact({
    runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
    sequence: ++state.runtimeReceiptSequence,
    operation,
    operationDescriptor,
    status: 0,
    evidenceSha256: hashBytes(authoritativeBytes),
    subjectKind,
    subjectIdentifier,
    sanitizedOutput: canonicalJson(output),
  });
  state.assertSafeEvidence(receipt, "TASK-540 cleanup runtime receipt");
  return receipt;
}

export function authoritativeProofRuntimeReceipt(
  state,
  { operation, operationDescriptor, evidenceSha256, subjectKind, subjectIdentifier, output }
) {
  invariant(
    typeof evidenceSha256 === "string" && /^[a-f0-9]{64}$/u.test(evidenceSha256),
    "authoritative runtime proof hash drift"
  );
  const receipt = deepFreezeExact({
    runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
    sequence: ++state.runtimeReceiptSequence,
    operation,
    operationDescriptor,
    status: 0,
    evidenceSha256,
    subjectKind,
    subjectIdentifier,
    sanitizedOutput: canonicalJson(output),
  });
  state.assertSafeEvidence(receipt, "TASK-540 authoritative runtime proof receipt");
  return receipt;
}

export function createCleanupPhaseScheduler(failures, phaseTrace) {
  invariant(
    Array.isArray(failures) && Array.isArray(phaseTrace) && phaseTrace.length === 0,
    "cleanup phase scheduler inputs are invalid"
  );
  let nextPhase = 1;
  let sealed = false;
  return Object.freeze({
    async run(phase, operation) {
      invariant(
        !sealed && phase === nextPhase && phase >= 1 && phase <= 10,
        "cleanup phase order drift"
      );
      invariant(typeof operation === "function", "cleanup phase operation is absent");
      let completed = false;
      try {
        await operation();
        completed = true;
      } catch (error) {
        failures.push(
          retainPrivateCleanupFailureDiagnosticNeverThrow(error, phase, "phase_failed")
        );
      }
      phaseTrace.push(deepFreezeExact({ phase, completed }));
      nextPhase += 1;
    },
    seal() {
      invariant(
        !sealed && nextPhase === 11 && phaseTrace.length === 10,
        "cleanup phase scheduler ended early"
      );
      sealed = true;
      return deepFreezeExact([...phaseTrace]);
    },
  });
}

export async function runIndependentCleanupStepsNeverSkip(steps, label) {
  invariant(
    Array.isArray(steps) && steps.length > 0 && steps.every((step) => typeof step === "function"),
    label + " cleanup step registry drift"
  );
  const failures = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, label + " cleanup branches failed");
}

export function finalRecordByKey(finalLedger) {
  return new Map(finalLedger.map((record) => [record.resourceKey, record]));
}

export function createCleanupExecutionStages(dependencies) {
  // The Bun bridge operation runner, the bound resource dispatch, the runtime operation
  // descriptor registry, the admin API request authority, the cleanup subject authority and the
  // intentional presentation-override cleanup all belong to authorities the facade composes, so
  // they arrive as injected dependencies instead of static imports and every declaration below
  // closes over those exact values rather than a rebindable module slot.
  exactOwnKeys(
    dependencies,
    [
      "BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS",
      "adminApiRequest",
      "bootstrapApiSession",
      "completeIntentionalPresentationOverrideAbsenceAuthority",
      "deleteCleanupSubject",
      "executeIntentionalPresentationOverrideAlreadyAbsentCleanup",
      "hashCleanupAuthoritativeBytes",
      "proveCleanupSubjectAbsent",
      "proveCleanupSubjectPresent",
      "runBoundResourceBunOperation",
      "runBunBridgeOperation",
      "runPrivateCleanupAdminApiBoundary",
    ],
    "cleanup execution stage dependencies",
    { plain: true }
  );
  const {
    BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS,
    adminApiRequest,
    bootstrapApiSession,
    completeIntentionalPresentationOverrideAbsenceAuthority,
    deleteCleanupSubject,
    executeIntentionalPresentationOverrideAlreadyAbsentCleanup,
    hashCleanupAuthoritativeBytes,
    proveCleanupSubjectAbsent,
    proveCleanupSubjectPresent,
    runBoundResourceBunOperation,
    runBunBridgeOperation,
    runPrivateCleanupAdminApiBoundary,
  } = dependencies;
  invariant(
    typeof BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS === "object" &&
      BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS !== null &&
      Object.isFrozen(BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS),
    "cleanup execution stage runtime operation descriptors are absent"
  );
  invariant(
    [
      "adminApiRequest",
      "bootstrapApiSession",
      "completeIntentionalPresentationOverrideAbsenceAuthority",
      "deleteCleanupSubject",
      "executeIntentionalPresentationOverrideAlreadyAbsentCleanup",
      "hashCleanupAuthoritativeBytes",
      "proveCleanupSubjectAbsent",
      "proveCleanupSubjectPresent",
      "runBoundResourceBunOperation",
      "runBunBridgeOperation",
      "runPrivateCleanupAdminApiBoundary",
    ].every((key) => typeof dependencies[key] === "function"),
    "cleanup execution stage dependencies are not callable"
  );

  async function proveContentRoutesBaselineIdentity(state, label) {
    const current = await runBunBridgeOperation(state, "resource/content-routes-exact", {});
    invariant(
      deepEqualJson(current, state.contentRoutesBaseline),
      label + " content routes baseline drift"
    );
    invariant(
      !canonicalJson(current).includes(state.plan.prefix),
      label + " content routes contains a task slug"
    );
    state.contentRoutesDeleteProofs += 1;
    return true;
  }

  async function executeResourceCleanupOperation(state, record, operationKind) {
    invariant(
      CLEANUP_OPERATION_KINDS.includes(operationKind),
      "resource cleanup operation is invalid"
    );
    let output;
    let observedBytesSha256 = null;
    const intentionalOverrideAbsenceAuthority =
      record.kind === "presentation-override"
        ? completeIntentionalPresentationOverrideAbsenceAuthority(state, record)
        : null;
    if (intentionalOverrideAbsenceAuthority !== null) {
      return executeIntentionalPresentationOverrideAlreadyAbsentCleanup(state, record, operationKind);
    }
    const slot =
      operationKind === "provenance"
        ? "provenance"
        : operationKind === "delete"
          ? "cleanup"
          : "absence";
    const participation = resourceBunParticipationSlot(record, slot);
    invariant(participation !== null, "cleanup attempted a null resource operation slot");
    if (
      participation.mode === "bound-runtime-bridge" ||
      participation.mode === "node+bound-runtime-bridge"
    ) {
      invariant(
        operationKind === "provenance" &&
          BUN_BRIDGE_RUNTIME_OPERATION_DESCRIPTORS[participation.operationId] !== undefined,
        "bound runtime resource cleanup receipt drift"
      );
      output = { boundRuntimeOperationId: participation.operationId, alreadyExecuted: true };
    } else if (participation.mode === "bun-one-shot") {
      output = await runBoundResourceBunOperation(state, record, operationKind);
      if (record.kind === "presentation-override" && operationKind === "delete")
        state.overridesCleared = true;
    } else {
      invariant(
        participation.mode === "node-local" || participation.mode === "node+bun-one-shot",
        "resource cleanup participation mode drift"
      );
      if (record.kind === "presentation-override") {
        invariant(
          operationKind === "provenance" && participation.mode === "node-local",
          "presentation override Node operation drift"
        );
        const [screenId, entryId, blockId, propPath] = record.identifier;
        const response = await runPrivateCleanupAdminApiBoundary(async () => {
          const result = await adminApiRequest(
            state,
            bootstrapApiSession(state),
            "GET",
            "/custom-screens/" +
              encodeURIComponent(screenId) +
              "/entries/" +
              encodeURIComponent(entryId) +
              "/overrides",
            { csrf: false, retainAuthoritativeBytes: true }
          );
          const responseSha256 = hashCleanupAuthoritativeBytes(
            result.authoritativeBytes,
            "presentation override cleanup provenance"
          );
          const matches = result.value?.overrides?.filter(
            (row) =>
              row.screenId === screenId &&
              row.entryId === entryId &&
              row.blockId === blockId &&
              row.propPath === propPath
          );
          invariant(
            Array.isArray(matches) && matches.length === 1,
            "presentation override Node provenance drift"
          );
          return { observedBytesSha256: responseSha256 };
        });
        output = { present: true };
        observedBytesSha256 = response.observedBytesSha256;
      } else {
        const subject = legacySubjectForResource(state, record);
        if (operationKind === "provenance") {
          invariant(
            state.fixtureIds.get(subject.kind) === subject.id,
            subject.kind + " cleanup provenance drift"
          );
          const proof = await proveCleanupSubjectPresent(state, subject);
          output = proof.output;
          observedBytesSha256 = proof.observedBytesSha256;
        } else if (operationKind === "delete") {
          if (record.kind === "content-type") {
            await proveContentRoutesBaselineIdentity(state, "before content-type delete");
          }
          const deleted = await deleteCleanupSubject(state, subject);
          observedBytesSha256 = deleted.observedBytesSha256;
          output = { deleted: true };
        } else {
          const absent = await proveCleanupSubjectAbsent(state, subject);
          observedBytesSha256 = absent.observedBytesSha256;
          output = { absent: true };
        }
      }
      if (participation.mode === "node+bun-one-shot") {
        const dbProof = await runBoundResourceBunOperation(state, record, operationKind);
        output = { node: output, bun: dbProof };
      }
    }
    if (operationKind === "absence" && TERMINAL_RESOURCE_KINDS.has(record.kind)) {
      state.terminalDeletedCounts[record.kind] += 1;
    }
    return cleanupRuntimeReceipt(
      state,
      "cleanup-" + operationKind,
      record[
        operationKind === "provenance"
          ? "provenanceOpId"
          : operationKind === "delete"
            ? "cleanupOpId"
            : "absenceOpId"
      ],
      record,
      output,
      observedBytesSha256
    );
  }

  async function executeCleanupPlanStage(
    state,
    actionPlan,
    finalPlan,
    allowedKinds,
    cleanupPhase,
    executeOperation = executeResourceCleanupOperation
  ) {
    invariant(
      [3, 6, 7].includes(cleanupPhase) && typeof executeOperation === "function",
      "cleanup stage phase/operation authority is absent"
    );
    const records = finalRecordByKey(finalPlan.ledger);
    const receipts = [];
    const failures = [];
    const retainStageFailure = (error, phaseThreeFailureClass = "persistent_stage_failed") => {
      invariant(
        PHASE_THREE_CLEANUP_FAILURE_CLASSES.includes(phaseThreeFailureClass),
        "phase 3 cleanup failure class drift"
      );
      const failure = retainPrivateCleanupFailureDiagnosticNeverThrow(
        error,
        cleanupPhase,
        cleanupPhase === 3 ? phaseThreeFailureClass : "phase_failed"
      );
      failures.push(failure);
      return failure;
    };
    for (const resourceKey of actionPlan.resourceKeys) {
      const record = records.get(resourceKey);
      if (record === undefined) {
        retainStageFailure(new Error("cleanup stage resource drift"));
        state.cleanupFailedKeys.add(resourceKey);
        continue;
      }
      if (!allowedKinds.has(record.kind)) continue;
      const childKeys = finalPlan.dependencyGraph[resourceKey];
      if (
        finalPlan.failureDiscoveryBlockedParentKeys.includes(resourceKey) ||
        childKeys.some(
          (childKey) =>
            !state.cleanupAbsenceKeys.has(childKey) || state.cleanupFailedKeys.has(childKey)
        )
      ) {
        retainStageFailure(
          new Error("destructive parent was blocked by an unproved child"),
          "persistent_dependency_blocked"
        );
        state.cleanupFailedKeys.add(resourceKey);
        continue;
      }
      let provenancePassed = false;
      try {
        receipts.push(await executeOperation(state, record, "provenance"));
        provenancePassed = true;
      } catch (error) {
        retainStageFailure(error, "persistent_provenance_failed");
        state.cleanupFailedKeys.add(resourceKey);
      }
      if (!provenancePassed) continue;
      let deletePassed = false;
      try {
        receipts.push(await executeOperation(state, record, "delete"));
        deletePassed = true;
      } catch (error) {
        retainStageFailure(error, "persistent_delete_failed");
        state.cleanupFailedKeys.add(resourceKey);
      }
      try {
        receipts.push(await executeOperation(state, record, "absence"));
        state.cleanupAbsenceKeys.add(resourceKey);
      } catch (error) {
        retainStageFailure(error, "persistent_absence_failed");
        state.cleanupFailedKeys.add(resourceKey);
      }
      if (!deletePassed) {
        state.cleanupFailedKeys.add(resourceKey);
      }
    }
    return deepFreezeExact({
      receipts: deepFreezeExact(receipts),
      failures: deepFreezeExact(failures),
    });
  }

  return Object.freeze({
    executeCleanupPlanStage,
    executeResourceCleanupOperation,
  });
}
