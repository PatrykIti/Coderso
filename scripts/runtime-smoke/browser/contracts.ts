import type { PlainJsonValue } from "../workers/contracts";

export const BROWSER_PROTOCOL_VERSION = 1 as const;
export const DEFAULT_BROWSER_FRAME_BYTES = 256 * 1024;
export const MAX_BROWSER_FRAME_BYTES = 4 * 1024 * 1024;
export const MAX_BROWSER_SEGMENT_ACTIONS = 64;
// Linux rejects one argv entry at 128 KiB even when ARG_MAX still has room. Keep the complete
// playwright-cli run-code argument below 96 KiB: materialized action sources receive 4 KiB less
// because the framing/canonicalization wrapper is part of the same argv entry.
export const MAX_BROWSER_RUN_CODE_ARG_BYTES = 96 * 1024;
export const MAX_BROWSER_BATCH_WRAPPER_BYTES = 4 * 1024;
export const MAX_BROWSER_SEGMENT_SOURCE_BYTES =
  MAX_BROWSER_RUN_CODE_ARG_BYTES - MAX_BROWSER_BATCH_WRAPPER_BYTES;

export type BrowserActionLane = "run-code" | "runtime" | "standalone";

export interface BrowserPlanAction {
  readonly id: string;
  readonly scenarioId: string;
  readonly lane: BrowserActionLane;
  readonly captureOutputs: readonly string[];
  readonly isolated: boolean;
}

export interface BrowserSegmentLimits {
  readonly maximumActions: number;
  readonly maximumSourceBytes: number;
}

export interface BrowserRunCodeDispatch {
  readonly schemaVersion: 1;
  readonly kind: "run-code";
  readonly segmentId: string;
  readonly scenarioId: string;
  readonly actionIds: readonly string[];
  readonly estimatedSourceBytes: number;
}

export interface BrowserStandaloneDispatch {
  readonly schemaVersion: 1;
  readonly kind: "standalone";
  readonly actionId: string;
  readonly scenarioId: string;
}

export type BrowserDispatch = BrowserRunCodeDispatch | BrowserStandaloneDispatch;

export interface BrowserDispatchPlan {
  readonly schemaVersion: 1;
  readonly dispatches: readonly BrowserDispatch[];
  readonly logicalBrowserActions: number;
  readonly runCodeActions: number;
  readonly runCodeBatches: number;
  readonly standaloneActions: number;
  readonly physicalDispatches: number;
}

export interface MaterializedBrowserAction {
  readonly actionId: string;
  readonly source: string;
}

export interface MaterializedBrowserSegment {
  readonly segment: BrowserRunCodeDispatch;
  readonly actions: readonly MaterializedBrowserAction[];
}

interface BrowserActionFrameBase {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly manifestSha256: string;
  readonly scenarioId: string;
  readonly segmentId: string;
  readonly sequence: number;
  readonly actionId: string;
  readonly terminal: boolean;
}

export interface BrowserSuccessFrame extends BrowserActionFrameBase {
  readonly status: "success";
  readonly output: PlainJsonValue;
  readonly outputSha256: string;
}

export interface BrowserFailureFrame extends BrowserActionFrameBase {
  readonly status: "failure";
  readonly failureCode: string;
}

export type BrowserActionFrame = BrowserSuccessFrame | BrowserFailureFrame;

export interface BrowserFrameExpectation {
  readonly runId: string;
  readonly manifestSha256: string;
  readonly scenarioId: string;
  readonly segmentId: string;
  readonly actionIds: readonly string[];
}

export interface BrowserTransportDispatch {
  readonly session: string;
  readonly segmentId: string;
  readonly source: string;
  readonly maximumOutputBytes: number;
}

export interface BrowserTransportDispatcher {
  dispatch(request: BrowserTransportDispatch): Promise<Uint8Array>;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}

export interface BrowserTransportCounters {
  readonly clientProcesses: number;
  readonly segments: number;
  readonly frames: number;
  readonly fallbacks: number;
  readonly retries: number;
}
