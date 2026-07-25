import {
  ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
  PHASE_THREE_CLEANUP_FAILURE_CLASSES,
  SESSION_NAME,
  TASK_FIXTURE_ENTRY_SEMANTICS,
} from "./config.mjs";
import { canonicalJson, deepFreezeExact, hashBytes, invariant } from "./foundation.mjs";
import { deepEqualJson } from "./resource-contracts.mjs";
import {
  assertExactCleanupTupleSet,
  createResourceCore,
  destructiveResourceEdge,
  lengthPrefixedTuple,
} from "./resource-ledger.mjs";
import {
  PROVEN_RESOURCE_ACTIONS,
  deriveActionResourceDelta,
  registerSuccessfulActionResourcesAfterLedgerAppend,
} from "./action-resources.mjs";
import { canonicalManifestRuntimeOperation } from "../runtime/operation-router.mjs";
import { parseBuilder } from "../browser/expression-and-capture-sources.mjs";
import { cleanupDiagnostics } from "../cleanup/diagnostics.mjs";

const { retainPrivateCleanupFailureDiagnosticNeverThrow } = cleanupDiagnostics;

export function fixtureCaptureValue(name, plan) {
  const numeric = String(plan.requiredCaptureNames.indexOf(name) + 1).padStart(12, "0");
  if (name === "media.resolved-url")
    return plan.fixtureBlueprint.origins.front + "/media/task-540/" + plan.prefix + ".png";
  if (name === "media.storage-key") return "task-540/" + plan.prefix + ".png";
  return "54000000-0000-4000-8000-" + numeric;
}

export function createFakeCapabilitiesRuntime({
  RESPONSE_LOST_CREATE_DESCRIPTORS,
  compileActionExecutionSpec,
  discoverExactSeoEntryResources,
  finalRecordByKey,
  initializeBunBridgeOperationAuthority,
  routeReceiptMetadata,
}) {
  function buildFakeCapabilities({
    failOrdinal = null,
    terminalMatrix = false,
    failCleanupLifecycle = false,
    failFailureCleanup = false,
    cleanupFailureClass = "persistent_plan_failed",
  } = {}) {
    invariant(
      PHASE_THREE_CLEANUP_FAILURE_CLASSES.includes(cleanupFailureClass),
      "fake cleanup failure class drift"
    );
    const calls = [];
    let cleaned = false;
    let browserSequence = 0;
    let runtimeSequence = 0;
    let fakeState = null;
    let coreCleanupContext = null;
    let lastFinalPlan = null;
    let lastFinalization = null;
    let lastPersistentPlan = null;
    let lastTerminalPlan = null;
    let cleanupPromise = null;
    let cleanupExecutions = 0;
    const capabilities = {
      calls,
      get cleaned() {
        return cleaned;
      },
      get cleanupExecutions() {
        return cleanupExecutions;
      },
      get lastFinalPlan() {
        return lastFinalPlan;
      },
      get lastFinalization() {
        return lastFinalization;
      },
      get lastPersistentPlan() {
        return lastPersistentPlan;
      },
      get lastTerminalPlan() {
        return lastTerminalPlan;
      },
      bindCoreCleanupAuthority(context) {
        invariant(coreCleanupContext === null, "fake core cleanup authority was assigned twice");
        coreCleanupContext = context;
      },
      registerActionResourcesAfterLedgerAppend(action, delta) {
        invariant(fakeState !== null, "fake post-ledger acquisition state is absent");
        registerSuccessfulActionResourcesAfterLedgerAppend(fakeState, action, delta);
      },
      settleResponseLostCreateAfterLedgerAppend(actionId) {
        invariant(
          RESPONSE_LOST_CREATE_DESCRIPTORS[actionId] !== undefined,
          "fake response-lost settlement origin drift"
        );
      },
      retainPrimaryFailureObservation() {},
      async executeAction({ action, plan, captures }) {
        calls.push(action.id);
        if (action.ordinal === failOrdinal) throw new Error("private fake failure detail");
        if (fakeState === null) {
          fakeState = {
            plan,
            bootstrapBaseline: { id: "54000000-0000-4000-8000-000000009999" },
            host: { identity: { pgid: 54000 } },
            browserWorkspace: { root: "/tmp/wf540-self-test-private" },
            fixtureIds: new Map(),
            resourceKeys: new Map(),
            resourceOwners: new Map(),
            syntheticOwnerEdgeKeys: new Set(),
          };
          initializeBunBridgeOperationAuthority(fakeState);
        }
        const captureBindings = {};
        for (const name of plan.fixtureCaptureBindings[action.id] ?? []) {
          captureBindings[name] = fixtureCaptureValue(name, plan);
        }
        for (const name of plan.runtimeCaptureBindings[action.id] ?? []) {
          captureBindings[name] = plan.prefix + "-" + name.replaceAll(".", "-");
        }
        const isRuntime = action.executable.type === "runtime-operation";
        const executionSpec = isRuntime ? null : compileActionExecutionSpec(action);
        const routeMetadata = isRuntime
          ? null
          : routeReceiptMetadata(action, executionSpec, plan, captures, {
              csrfHeaderName: "x-self-test-csrf",
            });
        const receipt = isRuntime
          ? {
              runnerVersion: 1,
              sequence: ++runtimeSequence,
              operation: canonicalManifestRuntimeOperation(action),
              operationDescriptor:
                action.id === "set-032-storage-post-setup"
                  ? "db+storage:missing-media-absence"
                  : action.id === "set-040-override-proof"
                    ? "admin-api:media-race-projection"
                    : action.executable.operationId,
              status: 0,
              evidenceSha256: hashBytes(Buffer.from("fake:" + action.id)),
              subjectKind:
                action.id === "set-032-storage-post-setup"
                  ? "media-race-missing-media"
                  : action.id === "set-040-override-proof"
                    ? "screen"
                    : null,
              subjectIdentifier:
                action.id === "set-032-storage-post-setup"
                  ? plan.fixtureBlueprint.media.missingBoundMediaId
                  : action.id === "set-040-override-proof"
                    ? fixtureCaptureValue("screen.id", plan)
                    : null,
              sanitizedOutput:
                action.id === "set-032-storage-post-setup"
                  ? canonicalJson({ rowCount: 0, storageMatches: 0 })
                  : action.id === "set-040-override-proof"
                    ? canonicalJson({
                        bindingCount: 1,
                        overrideCount: 1,
                        entryValueMatches: true,
                        safeUrlMatches: true,
                      })
                    : "{}",
            }
          : {
              runnerVersion: 1,
              sequence: ++browserSequence,
              kind: action.kind,
              scenario: action.scenario,
              operation: executionSpec.operation,
              routeKey: routeMetadata.routeKey,
              method: routeMetadata.method,
              pattern: routeMetadata.pattern,
              assertionName: action.kind === "assert" ? parseBuilder(action.builder).args[0] : null,
              command:
                action.executable.type === "browser-global-list"
                  ? "playwright-cli --raw list"
                  : "fake:" + action.id,
              status: 0,
              stdoutBytes: 0,
              stderrBytes: 0,
              stdoutSha256: hashBytes(Buffer.alloc(0)),
              stderrSha256: hashBytes(Buffer.alloc(0)),
              stdoutTruncated: false,
              stderrTruncated: false,
              sanitizedOutput: "{}",
              stdoutDiscarded: false,
              pageId: action.pageId,
              tabIndex: action.tabIndex,
            };
        const acquisitionDelta = deriveActionResourceDelta(
          fakeState,
          action,
          { captureBindings },
          captures
        );
        return deepFreezeExact({
          receipt: deepFreezeExact(receipt),
          captureBindings,
          acquisitionDelta,
          settledCreateOrigin: PROVEN_RESOURCE_ACTIONS[action.id]?.origin ?? null,
        });
      },
      async executeCleanupLifecycle({ plan, resourceLedger, cleanupPlanner }) {
        if (failCleanupLifecycle) {
          throw retainPrivateCleanupFailureDiagnosticNeverThrow(
            new Error("private fake cleanup lifecycle failure"),
            3,
            cleanupFailureClass
          );
        }
        for (const entrySemantic of TASK_FIXTURE_ENTRY_SEMANTICS) {
          const targetId = fixtureCaptureValue(plan.fixtureSubjectCapture[entrySemantic], plan);
          invariant(
            typeof fakeState.resourceKeys.get(entrySemantic) === "string",
            "fake SEO parent entry is absent"
          );
          fakeState.fixtureIds.set(entrySemantic, targetId);
        }
        const fakeSeoCandidates = deepFreezeExact(
          TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic, index) => ({
            id: `54000000-0000-4000-8000-${String(8004 + index).padStart(12, "0")}`,
            targetId: fakeState.fixtureIds.get(entrySemantic),
            targetType: "entry",
          })).sort(
            (left, right) =>
              left.targetId.localeCompare(right.targetId) || left.id.localeCompare(right.id)
          )
        );
        const fakeSeoTargetIds = TASK_FIXTURE_ENTRY_SEMANTICS.map((entrySemantic) =>
          fakeState.fixtureIds.get(entrySemantic)
        );
        const fakeSeoCores = await discoverExactSeoEntryResources(
          fakeState,
          resourceLedger,
          async (targetIds) => {
            invariant(
              deepEqualJson(targetIds, fakeSeoTargetIds),
              "fake SEO exact target inventory drift"
            );
            return deepFreezeExact({ candidates: fakeSeoCandidates });
          },
          async () => {}
        );
        invariant(fakeSeoCores.length === 6, "fake SEO cleanup inventory drift");
        const persistentLedger = resourceLedger.compileResourceRecords("persistent");
        const persistentPlan = cleanupPlanner.freezePersistent(persistentLedger, []);
        lastPersistentPlan = persistentPlan;
        if (terminalMatrix) {
          const userAId = fixtureCaptureValue("user-a.id", plan);
          const userAKey = fakeState.resourceKeys.get("user-a");
          invariant(typeof userAKey === "string", "terminal matrix user parent is absent");
          const audit = createResourceCore({
            kind: "audit-log-task-ua",
            identifier: ["54000000-0000-4000-8000-000000008001"],
            ownerSubjectIdentifier: userAId,
            acquisitionSourceId: "terminal-task-ua-discovery",
            sourceActionOrdinal: null,
            acquisitionChannel: "terminal-db-delta",
          });
          const session = createResourceCore({
            kind: "session-task",
            identifier: ["54000000-0000-4000-8000-000000008002"],
            ownerSubjectIdentifier: userAId,
            acquisitionSourceId: "terminal-task-ua-discovery",
            sourceActionOrdinal: null,
            acquisitionChannel: "terminal-db-delta",
          });
          const access = createResourceCore({
            kind: "access-log-task-ua",
            identifier: ["54000000-0000-4000-8000-000000008003"],
            ownerSubjectIdentifier: session.identifier[0],
            acquisitionSourceId: "terminal-task-ua-discovery",
            sourceActionOrdinal: null,
            acquisitionChannel: "terminal-db-delta",
          });
          resourceLedger.appendValidatedDelta(
            deepFreezeExact({
              cores: deepFreezeExact([audit, access, session]),
              dependencyEdges: deepFreezeExact([
                destructiveResourceEdge(userAKey, audit.resourceKey),
                destructiveResourceEdge(userAKey, session.resourceKey),
                destructiveResourceEdge(session.resourceKey, access.resourceKey),
              ]),
            })
          );
        }
        const terminalLedger = resourceLedger.compileResourceRecords("terminal");
        const terminalPlan = cleanupPlanner.freezeTerminal(terminalLedger);
        lastTerminalPlan = terminalPlan;
        const finalLedger = resourceLedger.compileResourceRecords("final");
        const finalPlan = cleanupPlanner.freezeFinal(finalLedger);
        lastFinalPlan = finalPlan;
        invariant(
          finalPlan.persistentActionPlan === persistentPlan,
          "fake lifecycle persistent plan identity drift"
        );
        const recordByKey = finalRecordByKey(finalLedger);
        const fakeRuntimeReceipt = (
          operation,
          operationDescriptor,
          subjectKind,
          subjectIdentifier,
          output
        ) => {
          const bytes = Buffer.from(canonicalJson(output) + "\n");
          return deepFreezeExact({
            runnerVersion: ORCHESTRATOR_EVIDENCE_RUNNER_VERSION,
            sequence: ++runtimeSequence,
            operation,
            operationDescriptor,
            status: 0,
            evidenceSha256: hashBytes(bytes),
            subjectKind,
            subjectIdentifier,
            sanitizedOutput: canonicalJson(output),
          });
        };
        const userKeys = new Set(
          finalLedger
            .filter(({ kind }) => kind === "user-a" || kind === "user-b")
            .map(({ resourceKey }) => resourceKey)
        );
        const orderedTuples = [
          ...persistentPlan.tuples.filter(([resourceKey]) => !userKeys.has(resourceKey)),
          ...terminalPlan.tuples,
          ...persistentPlan.tuples.filter(([resourceKey]) => userKeys.has(resourceKey)),
        ];
        assertExactCleanupTupleSet(orderedTuples, finalPlan.resourceKeys, "fake execution");
        const cleanupReceipts = orderedTuples.map(([resourceKey, operationKind]) => {
          const record = recordByKey.get(resourceKey);
          return fakeRuntimeReceipt(
            "cleanup-" + operationKind,
            record[
              operationKind === "provenance"
                ? "provenanceOpId"
                : operationKind === "delete"
                  ? "cleanupOpId"
                  : "absenceOpId"
            ],
            record.kind,
            record.identifier.length === 1
              ? record.identifier[0]
              : lengthPrefixedTuple(record.identifier),
            { ok: true }
          );
        });
        const phaseProofReceipts = [
          "api-contexts-close-and-prove",
          "terminal-task-ua-stable-delta",
          "bootstrap-login-state-restore",
          "media-race-missing-absence-cleanup",
          "final-storage-database-screenshot-proof",
          "host-runner-stop",
        ].map((operation) => {
          if (operation === "media-race-missing-absence-cleanup") {
            return fakeRuntimeReceipt(
              operation,
              "db+storage:missing-media-absence",
              "media-race-missing-media",
              plan.fixtureBlueprint.media.missingBoundMediaId,
              { rowCount: 0, storageMatches: 0 }
            );
          }
          if (operation === "host-runner-stop") {
            return fakeRuntimeReceipt(
              operation,
              "owned-process-group-and-ports-absence-v1",
              "host-runner",
              "54000",
              { termSent: true, killSent: false }
            );
          }
          return fakeRuntimeReceipt(operation, operation + "-v1", null, null, { ok: true });
        });
        for (const phase of ["before-delete", "after-delete"]) {
          for (const poll of [1, 2]) {
            for (const kind of ["audit", "access", "session"]) {
              phaseProofReceipts.push(
                fakeRuntimeReceipt(
                  "terminal-" + kind + "-stable-poll",
                  "terminal-task-ua-bounded-stable-poll-v1",
                  "task-ua-" + kind,
                  phase + ":" + poll,
                  { phase, poll, rowCount: phase === "before-delete" && terminalMatrix ? 1 : 0 }
                )
              );
            }
          }
        }
        for (const processSubject of [
          { kind: "runner", pid: 54000 },
          { kind: "backend", pid: 54001 },
          { kind: "admin", pid: 54002 },
          { kind: "site", pid: 54003 },
        ]) {
          const subject =
            processSubject.kind === "runner"
              ? String(processSubject.pid)
              : processSubject.kind + ":" + processSubject.pid;
          phaseProofReceipts.push(
            fakeRuntimeReceipt(
              "pid-lineage",
              "owned-process-group-and-ports-absence-v1",
              "host-process",
              subject,
              { lineageValid: true }
            )
          );
          phaseProofReceipts.push(
            fakeRuntimeReceipt(
              "process-absence",
              "owned-process-group-and-ports-absence-v1",
              "host-process",
              subject,
              { absent: true, stableObservations: 2 }
            )
          );
        }
        for (const port of [3000, 5173, 5174]) {
          phaseProofReceipts.push(
            fakeRuntimeReceipt(
              "port-absence",
              "owned-process-group-and-ports-absence-v1",
              "host-port",
              String(port),
              { absent: true, stableObservations: 2 }
            )
          );
        }
        const phaseTrace = deepFreezeExact(
          Array.from({ length: 10 }, (_, index) => ({ phase: index + 1, completed: true }))
        );
        const fakeScreenshots = deepFreezeExact(
          plan.requiredScreenshotPaths.map((relative, index) => ({
            path: relative,
            size: 1024 + index,
            sha256: hashBytes(Buffer.from("fake-screenshot:" + relative)),
            dev: "540",
            ino: String(1000 + index),
          }))
        );
        const setupMissingSequence =
          plan.actionManifest
            .filter(({ executable }) => executable.type === "runtime-operation")
            .findIndex(({ id }) => id === "set-032-storage-post-setup") + 1;
        const cleanupMissingSequence = phaseProofReceipts.find(
          ({ operation }) => operation === "media-race-missing-absence-cleanup"
        ).sequence;
        calls.push(
          ...orderedTuples.map(([resourceKey, operationKind]) => operationKind + ":" + resourceKey)
        );
        calls.push("finalize");
        const lifecycle = deepFreezeExact({
          cleanupReceipts,
          mediaRace: deepFreezeExact({
            acquiredMedia: deepFreezeExact({
              id: fixtureCaptureValue("media.id", plan),
              canonicalSafeUrl: "/media/2026/07/54000000-0000-4000-8000-000000000777.png",
            }),
            missingBoundMediaId: plan.fixtureBlueprint.media.missingBoundMediaId,
            screenId: fixtureCaptureValue("screen.id", plan),
            entryId: fixtureCaptureValue("entry.id", plan),
            directImageBlockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
            boundField: "raceImageId",
            override: deepFreezeExact({
              screenId: fixtureCaptureValue("screen.id", plan),
              entryId: fixtureCaptureValue("entry.id", plan),
              blockId: plan.fixtureBlueprint.screen.blockIds.raceImage,
              propPath: "mediaAssetId",
              mediaId: fixtureCaptureValue("media.id", plan),
            }),
          }),
          finalization: deepFreezeExact({
            apiContexts: deepFreezeExact({
              names: deepFreezeExact(["bootstrap", "user-a"]),
              closed: true,
              absenceProven: true,
            }),
            browserSession: deepFreezeExact({
              name: SESSION_NAME,
              closeReceiptSequence: 419,
              absenceReceiptSequence: 420,
              terminalListSha256: hashBytes(Buffer.from("  (no browsers)\n")),
              closed: true,
              absent: true,
            }),
            privateRoot: deepFreezeExact({
              outsideRepository: true,
              mode: "0700",
              identityRemoved: true,
              absent: true,
            }),
            host: deepFreezeExact({
              runnerPid: 54000,
              pgid: 54000,
              children: deepFreezeExact([
                { kind: "backend", pid: 54001 },
                { kind: "admin", pid: 54002 },
                { kind: "site", pid: 54003 },
              ]),
              listeners: deepFreezeExact([
                { kind: "backend", port: 3000, pid: 54001 },
                { kind: "admin", port: 5173, pid: 54002 },
                { kind: "site", port: 5174, pid: 54003 },
              ]),
              ports: deepFreezeExact([3000, 5173, 5174]),
              listenerOwnershipStableObservations: 2,
              termSent: true,
              killSent: false,
              processesAbsent: true,
              processAbsenceStableObservations: 2,
              portsAbsent: deepFreezeExact([3000, 5173, 5174]),
              portAbsenceStableObservations: 2,
            }),
            bootstrap: deepFreezeExact({
              id: "54000000-0000-4000-8000-000000009999",
              setupCompletedBeforeStart: true,
              casRestored: true,
              completeRowByteIdentical: true,
              roleTuplesByteIdentical: true,
            }),
            contentRoutes: deepFreezeExact({
              key: "site.contentRoutes",
              taskSlugsAbsentAtBaseline: true,
              byteIdenticalBeforeEachDelete: true,
              byteIdenticalAfterCleanup: true,
            }),
            settings: deepFreezeExact({ userAAbsent: true, userBAbsent: true }),
            storage: deepFreezeExact({
              driver: "local",
              rootIdentityByteIdentical: true,
              baselineManifestByteIdentical: true,
              acquiredMediaRowAbsent: true,
              acquiredStorageKeyAbsent: true,
              missingMedia: deepFreezeExact({
                id: plan.fixtureBlueprint.media.missingBoundMediaId,
                rowCount: 0,
                storageMatches: 0,
                setupReceiptSequence: setupMissingSequence,
                cleanupReceiptSequence: cleanupMissingSequence,
              }),
            }),
            taskTraffic: deepFreezeExact({
              baselineCounts: deepFreezeExact({ audit: 0, access: 0, session: 0 }),
              deltaCounts: deepFreezeExact({
                audit: terminalMatrix ? 1 : 0,
                access: terminalMatrix ? 1 : 0,
                session: terminalMatrix ? 1 : 0,
              }),
              deletedCounts: deepFreezeExact({
                audit: terminalMatrix ? 1 : 0,
                access: terminalMatrix ? 1 : 0,
                session: terminalMatrix ? 1 : 0,
              }),
              stablePollsBeforeDelete: 2,
              stablePollsAfterDelete: 2,
              returnedToBaseline: true,
            }),
            screenshots: fakeScreenshots,
            phaseProofReceipts: deepFreezeExact(phaseProofReceipts),
            phaseTrace,
          }),
          terminalLedger,
          terminalPlan,
          finalLedger,
          finalPlan,
          persistentLedger,
          persistentPlan,
          phaseTrace,
        });
        lastFinalization = lifecycle.finalization;
        return lifecycle;
      },
      cleanup(request) {
        if (cleanupPromise === null) {
          cleanupPromise = (async () => {
            cleanupExecutions += 1;
            cleaned = true;
            if (request?.failure === true) {
              calls.push("failure-cleanup");
              if (failFailureCleanup) {
                throw retainPrivateCleanupFailureDiagnosticNeverThrow(
                  new Error("private fake failure cleanup detail"),
                  3,
                  cleanupFailureClass
                );
              }
              return deepFreezeExact({ absenceProven: true, lifecycle: null });
            }
            const lifecycle = await capabilities.executeCleanupLifecycle(request);
            return deepFreezeExact({ absenceProven: true, lifecycle });
          })();
        }
        return cleanupPromise;
      },
    };
    return capabilities;
  }
  return { buildFakeCapabilities };
}
