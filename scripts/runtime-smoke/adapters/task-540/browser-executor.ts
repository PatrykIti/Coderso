import { SmokeError } from "../../contracts";
import type {
  BrowserActionFrame,
  BrowserDispatchPlan,
  BrowserFrameExpectation,
  BrowserRunCodeDispatch,
  MaterializedBrowserSegment,
} from "../../browser/contracts";
import type { RepositorySnapshot } from "../../repository-guard";

export interface Task540LegacyRepositorySnapshot {
  readonly paths: readonly string[];
  readonly hashes: Readonly<Record<string, string>>;
}

export function projectTask540KnownRepositorySnapshot(
  snapshot: RepositorySnapshot
): Task540LegacyRepositorySnapshot {
  return Object.freeze({
    paths: Object.freeze(snapshot.files.map(({ path }) => path)),
    hashes: Object.freeze(
      Object.fromEntries(
        snapshot.files.map(({ path, kind, sha256 }) => [path, `${kind}:${sha256}`])
      )
    ),
  });
}

export function assertTask540RepositorySnapshotBoundary(
  before: Task540LegacyRepositorySnapshot,
  after: Task540LegacyRepositorySnapshot,
  allowedPaths: readonly string[]
): void {
  if (
    !Array.isArray(before?.paths) ||
    !Array.isArray(after?.paths) ||
    before.hashes === null ||
    typeof before.hashes !== "object" ||
    after.hashes === null ||
    typeof after.hashes !== "object"
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 repository snapshot shape drifted");
  }
  const allowed = new Set(allowedPaths);
  if (allowed.size !== allowedPaths.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 repository allowlist is duplicated");
  }
  const paths = new Set([...before.paths, ...after.paths]);
  for (const path of paths) {
    if (allowed.has(path)) continue;
    if ((before.hashes[path] ?? "<clean>") !== (after.hashes[path] ?? "<clean>")) {
      throw new SmokeError("smoke_repository_changed", "TASK-540 repository boundary changed");
    }
  }
}

export interface Task540PreparedBrowserRequest {
  readonly actionId: string;
  readonly executableType:
    "browser-run-code" | "browser-native" | "browser-screenshot" | "browser-global-list";
}

export interface Task540BatchExecution {
  readonly frames: readonly BrowserActionFrame[];
  readonly proof: object;
}

export interface Task540BrowserExecutorDependencies<
  Request extends Task540PreparedBrowserRequest,
  Result,
> {
  readonly dispatchPlan: BrowserDispatchPlan;
  readonly runId: string;
  readonly manifestSha256: string;
  materializeSegment(
    segment: BrowserRunCodeDispatch,
    current: Request
  ): Promise<MaterializedBrowserSegment>;
  splitMaterializedSegment(
    materialized: MaterializedBrowserSegment
  ): readonly MaterializedBrowserSegment[];
  dispatchSegment(
    materialized: MaterializedBrowserSegment,
    expectation: BrowserFrameExpectation
  ): Promise<Task540BatchExecution>;
  projectFrame(request: Request, frame: BrowserActionFrame, proof: object): Promise<Result>;
  executeStandalone(request: Request): Promise<Result>;
}

export interface Task540BrowserExecutor<Request extends Task540PreparedBrowserRequest, Result> {
  executePrepared(request: Request): Promise<Result>;
  assertDrained(): void;
}

export function createTask540BrowserExecutor<Request extends Task540PreparedBrowserRequest, Result>(
  dependencies: Task540BrowserExecutorDependencies<Request, Result>
): Task540BrowserExecutor<Request, Result> {
  const browserDispatches = dependencies.dispatchPlan.dispatches;
  const expectedActionIds = browserDispatches.flatMap((dispatch) =>
    dispatch.kind === "run-code" ? dispatch.actionIds : [dispatch.actionId]
  );
  const dispatchByAction = new Map<string, (typeof browserDispatches)[number]>();
  for (const dispatch of browserDispatches) {
    const actionIds = dispatch.kind === "run-code" ? dispatch.actionIds : [dispatch.actionId];
    for (const actionId of actionIds) dispatchByAction.set(actionId, dispatch);
  }
  const cachedFrames = new Map<
    string,
    { readonly frame: BrowserActionFrame; readonly proof: object }
  >();
  const dispatchedSegments = new Set<string>();
  let cursor = 0;

  const executePrepared = async (request: Request): Promise<Result> => {
    const expectedActionId = expectedActionIds[cursor];
    if (request.actionId !== expectedActionId) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 browser action order drifted");
    }
    const dispatch = dispatchByAction.get(request.actionId);
    if (dispatch === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 browser dispatch is absent");
    }
    if (dispatch.kind === "standalone") {
      if (request.executableType === "browser-run-code") {
        throw new SmokeError("smoke_output_invalid", "TASK-540 standalone type drifted");
      }
      const result = await dependencies.executeStandalone(request);
      cursor += 1;
      return result;
    }
    if (request.executableType !== "browser-run-code") {
      throw new SmokeError("smoke_output_invalid", "TASK-540 run-code type drifted");
    }
    if (!dispatchedSegments.has(dispatch.segmentId)) {
      const materialized = await dependencies.materializeSegment(dispatch, request);
      const partitions = dependencies.splitMaterializedSegment(materialized);
      const partitionActionIds = partitions.flatMap(({ segment }) => segment.actionIds);
      if (
        partitions.length === 0 ||
        partitionActionIds.length !== dispatch.actionIds.length ||
        partitionActionIds.some((actionId, index) => actionId !== dispatch.actionIds[index]) ||
        partitions.some(
          ({ segment, actions }) =>
            segment.scenarioId !== dispatch.scenarioId ||
            segment.actionIds.length === 0 ||
            segment.actionIds.length !== actions.length ||
            actions.some(({ actionId }, index) => actionId !== segment.actionIds[index])
        )
      ) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 browser partition drifted");
      }
      let failureSeen = false;
      for (const partition of partitions) {
        if (failureSeen) break;
        const expectation: BrowserFrameExpectation = Object.freeze({
          runId: dependencies.runId,
          manifestSha256: dependencies.manifestSha256,
          scenarioId: partition.segment.scenarioId,
          segmentId: partition.segment.segmentId,
          actionIds: partition.segment.actionIds,
        });
        const execution = await dependencies.dispatchSegment(partition, expectation);
        if (
          execution.frames.length === 0 ||
          execution.frames.some(
            (frame, index) => frame.actionId !== partition.segment.actionIds[index]
          ) ||
          (execution.frames.at(-1)?.status !== "failure" &&
            execution.frames.length !== partition.segment.actionIds.length)
        ) {
          throw new SmokeError("smoke_output_invalid", "TASK-540 batch result is incomplete");
        }
        for (const frame of execution.frames) {
          if (cachedFrames.has(frame.actionId)) {
            throw new SmokeError("smoke_output_invalid", "TASK-540 batch result is duplicated");
          }
          cachedFrames.set(frame.actionId, { frame, proof: execution.proof });
        }
        failureSeen = execution.frames.at(-1)?.status === "failure";
      }
      dispatchedSegments.add(dispatch.segmentId);
    }
    const cached = cachedFrames.get(request.actionId);
    if (cached === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 deferred batch result is absent");
    }
    cachedFrames.delete(request.actionId);
    const result = await dependencies.projectFrame(request, cached.frame, cached.proof);
    cursor += 1;
    return result;
  };

  return Object.freeze({
    executePrepared,
    assertDrained(): void {
      if (cursor !== expectedActionIds.length || cachedFrames.size !== 0) {
        throw new SmokeError("smoke_output_invalid", "TASK-540 browser executor is not drained");
      }
    },
  });
}
