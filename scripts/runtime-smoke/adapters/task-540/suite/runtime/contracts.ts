import type { PlainJsonObject, PlainJsonValue } from "../../../../workers/contracts";
import type { WorkerPool } from "../../../../workers/pool";
import type { Task540NativePlan } from "../composition/contracts";
import type { Task540AdminApiSessions } from "./admin-session";

export interface Task540RuntimeMemoryView {
  readonly captures: ReadonlyMap<string, string>;
  privateProjection(id: string): PlainJsonValue;
}

export interface Task540RuntimeBrowserConfig {
  readonly csrfHeaderName: string;
  readonly authRatePolicy: Readonly<Record<string, PlainJsonValue>>;
}

export interface Task540RuntimeState {
  readonly root: string;
  readonly plan: Task540NativePlan;
  readonly pool: WorkerPool;
  readonly sessions: Task540AdminApiSessions;
  readonly environment: NodeJS.ProcessEnv;
  memory: Task540RuntimeMemoryView;
  baselineCaptured: boolean;
  hostReady: boolean;
  csrfHeaderName: string | null;
  authRatePolicy: Readonly<Record<string, PlainJsonValue>> | null;
  bootstrapUserId: string | null;
  bootstrapBaseline: PlainJsonObject | null;
  bootstrapNewestOwnedPair: PlainJsonObject | null;
  bootstrapLoginAttempted: boolean;
  bootstrapRestored: boolean;
  editableContentType: PlainJsonObject | null;
  editableEntryBody: PlainJsonObject | null;
  mediaRecord: PlainJsonObject | null;
  expectedOverrides: readonly PlainJsonObject[];
  readonly contentTypeBodies: Map<string, PlainJsonObject>;
  readonly entryBodies: Map<string, PlainJsonObject>;
  readonly screenBodies: Map<string, PlainJsonObject>;
}
