import type { Stats } from "node:fs";

export interface Task554FrozenInstallRunnerResult {
  readonly error?: unknown;
  readonly signal?: string | null;
  readonly status?: number | null;
}

export interface Task554FrozenInstallDependencies {
  readonly closeSync?: (descriptor: number) => void;
  readonly fstatSync?: (descriptor: number) => Stats;
  readonly lstatSync?: (path: string) => Stats;
  readonly mkdirSync?: (path: string, options?: { readonly mode?: number }) => string | undefined;
  readonly mkdtempSync?: (prefix: string) => string;
  readonly openSync?: (path: string, flags: number, mode?: number) => number;
  readonly readFileSync?: (path: number | string) => Buffer;
  readonly readdirSync?: (path: string, options: { readonly encoding: "utf8" }) => string[];
  readonly realpathSync?: (path: string) => string;
  readonly renameSync?: (source: string, destination: string) => void;
  readonly rmdirSync?: (path: string) => void;
  readonly statSync?: (path: string) => Stats;
  readonly runner?: (
    command: string,
    args: string[],
    options: {
      readonly cwd: string;
      readonly env: Readonly<Record<string, string>>;
      readonly inheritedDirectoryDescriptors: readonly number[];
      readonly stdio: "inherit";
    }
  ) => Task554FrozenInstallRunnerResult;
  readonly tmpdir?: () => string;
  readonly unlinkSync?: (path: string) => void;
  readonly writeFileSync?: (path: number, data: Uint8Array) => void;
}

export const TASK_554_FROZEN_INSTALL_INPUTS: readonly string[];

export function runTask554IsolatedFrozenInstall(
  projectRoot: string,
  overrides?: Task554FrozenInstallDependencies
): Readonly<{ pass: true; inputs: typeof TASK_554_FROZEN_INSTALL_INPUTS }>;
