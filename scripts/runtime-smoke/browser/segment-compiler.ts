import { SmokeError } from "../contracts";
import {
  MAX_BROWSER_SEGMENT_ACTIONS,
  MAX_BROWSER_SEGMENT_SOURCE_BYTES,
  type BrowserDispatch,
  type BrowserDispatchPlan,
  type BrowserPlanAction,
  type BrowserRunCodeDispatch,
  type BrowserSegmentLimits,
} from "./contracts";

const TOKEN = /^[a-z0-9][a-z0-9._/-]{0,159}$/u;
const CAPTURE = /^[a-z0-9][a-z0-9._-]{0,127}$/u;

export const DEFAULT_BROWSER_SEGMENT_LIMITS: BrowserSegmentLimits = Object.freeze({
  maximumActions: MAX_BROWSER_SEGMENT_ACTIONS,
  maximumSourceBytes: MAX_BROWSER_SEGMENT_SOURCE_BYTES,
});

function invalid(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function validateLimits(limits: BrowserSegmentLimits): void {
  if (
    !Number.isSafeInteger(limits.maximumActions) ||
    limits.maximumActions <= 0 ||
    limits.maximumActions > MAX_BROWSER_SEGMENT_ACTIONS ||
    !Number.isSafeInteger(limits.maximumSourceBytes) ||
    limits.maximumSourceBytes <= 0 ||
    limits.maximumSourceBytes > MAX_BROWSER_SEGMENT_SOURCE_BYTES
  ) {
    invalid("browser segment limits are invalid");
  }
}

function validateAction(action: BrowserPlanAction, seen: Set<string>): void {
  if (
    !TOKEN.test(action.id) ||
    !TOKEN.test(action.scenarioId) ||
    !new Set(["run-code", "runtime", "standalone"]).has(action.lane) ||
    !Array.isArray(action.captureOutputs) ||
    action.captureOutputs.some((capture) => !CAPTURE.test(capture)) ||
    new Set(action.captureOutputs).size !== action.captureOutputs.length ||
    typeof action.isolated !== "boolean" ||
    (action.lane !== "run-code" && (action.captureOutputs.length > 0 || action.isolated)) ||
    seen.has(action.id)
  ) {
    invalid("browser plan action is invalid");
  }
  seen.add(action.id);
}

function freezeRunCode(
  ordinal: number,
  scenarioId: string,
  actionIds: readonly string[],
  estimatedSourceBytes = 0,
  suffix = ""
): BrowserRunCodeDispatch {
  return Object.freeze({
    schemaVersion: 1,
    kind: "run-code",
    segmentId: `segment-${String(ordinal).padStart(4, "0")}${suffix}`,
    scenarioId,
    actionIds: Object.freeze([...actionIds]),
    estimatedSourceBytes,
  });
}

export function compileBrowserDispatchPlan(
  actions: readonly BrowserPlanAction[],
  limits: BrowserSegmentLimits = DEFAULT_BROWSER_SEGMENT_LIMITS
): BrowserDispatchPlan {
  validateLimits(limits);
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > 10_000) {
    invalid("browser plan action cardinality is invalid");
  }
  const seen = new Set<string>();
  const dispatches: BrowserDispatch[] = [];
  let pending: BrowserPlanAction[] = [];
  let segmentOrdinal = 0;
  let runCodeActions = 0;
  let standaloneActions = 0;
  const flush = (): void => {
    if (pending.length === 0) return;
    segmentOrdinal += 1;
    dispatches.push(
      freezeRunCode(
        segmentOrdinal,
        pending[0]?.scenarioId ?? invalid("browser segment scenario is absent"),
        pending.map(({ id }) => id)
      )
    );
    pending = [];
  };

  for (const action of actions) {
    validateAction(action, seen);
    if (action.lane === "runtime") {
      flush();
      continue;
    }
    if (action.lane === "standalone") {
      flush();
      standaloneActions += 1;
      dispatches.push(
        Object.freeze({
          schemaVersion: 1,
          kind: "standalone",
          actionId: action.id,
          scenarioId: action.scenarioId,
        })
      );
      continue;
    }
    runCodeActions += 1;
    if (pending.length > 0 && pending[0]?.scenarioId !== action.scenarioId) flush();
    if (action.isolated) flush();
    pending.push(action);
    if (
      action.isolated ||
      action.captureOutputs.length > 0 ||
      pending.length === limits.maximumActions
    ) {
      flush();
    }
  }
  flush();
  const runCodeBatches = dispatches.filter(({ kind }) => kind === "run-code").length;
  return Object.freeze({
    schemaVersion: 1,
    dispatches: Object.freeze(dispatches),
    logicalBrowserActions: runCodeActions + standaloneActions,
    runCodeActions,
    runCodeBatches,
    standaloneActions,
    physicalDispatches: runCodeBatches + standaloneActions,
  });
}

export function splitMaterializedSegment(
  segment: BrowserRunCodeDispatch,
  sourceBytesByAction: ReadonlyMap<string, number>,
  limits: BrowserSegmentLimits = DEFAULT_BROWSER_SEGMENT_LIMITS
): readonly BrowserRunCodeDispatch[] {
  validateLimits(limits);
  if (
    segment.schemaVersion !== 1 ||
    segment.kind !== "run-code" ||
    !TOKEN.test(segment.segmentId) ||
    !TOKEN.test(segment.scenarioId) ||
    segment.actionIds.length === 0 ||
    new Set(segment.actionIds).size !== segment.actionIds.length ||
    sourceBytesByAction.size !== segment.actionIds.length
  ) {
    invalid("materialized browser segment is invalid");
  }
  const partitions: { ids: string[]; bytes: number }[] = [];
  let ids: string[] = [];
  let bytes = 0;
  const flush = (): void => {
    if (ids.length === 0) return;
    partitions.push({ ids, bytes });
    ids = [];
    bytes = 0;
  };
  for (const actionId of segment.actionIds) {
    const sourceBytes = sourceBytesByAction.get(actionId);
    if (sourceBytes === undefined || !Number.isSafeInteger(sourceBytes)) {
      invalid("browser action source byte count is absent");
    }
    if (sourceBytes <= 0 || sourceBytes > limits.maximumSourceBytes) {
      invalid("browser action source exceeds its byte bound");
    }
    if (
      ids.length > 0 &&
      (ids.length === limits.maximumActions || bytes + sourceBytes > limits.maximumSourceBytes)
    ) {
      flush();
    }
    ids.push(actionId);
    bytes += sourceBytes;
  }
  flush();
  return Object.freeze(
    partitions.map((partition, index) =>
      Object.freeze({
        schemaVersion: 1 as const,
        kind: "run-code" as const,
        segmentId:
          partitions.length === 1
            ? segment.segmentId
            : `${segment.segmentId}-part-${String(index + 1).padStart(2, "0")}`,
        scenarioId: segment.scenarioId,
        actionIds: Object.freeze(partition.ids),
        estimatedSourceBytes: partition.bytes,
      })
    )
  );
}
