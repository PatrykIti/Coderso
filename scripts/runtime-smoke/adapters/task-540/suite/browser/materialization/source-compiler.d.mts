import type { Task540NativeAction, Task540NativePlan } from "../../composition/contracts";

export interface Task540BrowserSourceInput {
  readonly action: Task540NativeAction;
  readonly plan: Task540NativePlan;
  readonly captures: ReadonlyMap<string, string>;
  readonly priorOutputs: ReadonlyMap<string, unknown>;
  readonly variables: ReadonlyMap<string, unknown>;
  readonly root: string;
  readonly browserCwd: string;
  readonly runtimeConfig: Readonly<Record<string, unknown>>;
}

export function materializeTask540RunCodeSource(input: Task540BrowserSourceInput): string;
