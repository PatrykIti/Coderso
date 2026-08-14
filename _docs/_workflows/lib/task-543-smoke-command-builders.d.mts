// Type declarations for _docs/_workflows/lib/task-543-smoke-command-builders.mjs
// (single owner: TASK-545-02-L02). Canonical CLI/process/browser command
// construction and raw receipt parsing.

export function rawPlaywrightReceiptValid(receipt: unknown): boolean;
export function expectedProcessCheckCommand(pid: number): string;
export function expectedPortCheckCommand(port: number): string;
export function expectedHelperLaunchCommand(nonce: string): string;
export function expectedHelperIdentityCommands(identity: {
  launchNonce: string;
  rootPid: number;
  ppid: number;
  startTicks: string;
  cmdlineSha256: string;
  cwd: string;
}): Record<string, string>;
export function expectedHelperStopCommand(identity: unknown): string;
export function expectedPidTreeDiscoveryCommand(pid: number): string;
export function expectedPortOwnershipDiscoveryCommand(pids: readonly number[]): string;
export function expectedScreenshotStatCommand(filePath: string): string;
export function expectedScreenshotHashCommand(filePath: string): string;
export function expectedScreenshotSignatureCommand(filePath: string): string;
export function expectedScreenshotCaptureCommand(filePath: string): string;
export function repoRelativePath(filePath: string): string;
export function expectedScreenshotStdout(filePath: string): string;
export function smokeRunCode(source: string): string;
export function expectedResponsiveProbeCommand(fixture: unknown): string;
export function expectedThemeStateReadCommand(): string;
export function expectedThemeStateRestoreCommand(state: unknown): string;
export function expectedThemeApplyCommand(theme: string): string;
export function expectedSetupStateReadCommand(): string;
export function expectedSetupStateRestoreCommand(value: unknown): string;
export function expectedFixtureCreatePayload(fixture: unknown): unknown;
export function expectedFixtureCleanPayload(fixture: unknown): unknown;
export function expectedFixtureCreateCommand(fixture: unknown): string;
export function expectedFixtureProvenanceCommand(fixture: unknown): string;
export function expectedFixtureDeleteCommand(fixture: unknown): string;
export function expectedFixtureAbsenceCommand(fixture: unknown): string;
export function expectedScenarioSpec(scenario: unknown, fixture: unknown): unknown;
export function expectedAutosavePayload(fixture: unknown, title: string): unknown;
export function expectedManualPayload(fixture: unknown, title: string): unknown;
export function expectedMetadataPayload(fixture: unknown): unknown;
export function scenarioTargetUrl(scenario: unknown, fixture: unknown): string;
export function expectedScenarioSetupCommand(scenario: unknown, fixture: unknown): string;
export function expectedRouteInstallCommand(pattern: string, mode: string | null): string;
export function expectedRouteRemovalCommand(pattern: string): string;
export function titleFillCommand(value: string): string;
export function closeClickCommand(): string;
export function expectedScenarioActionCommands(scenario: unknown, fixture: unknown): string[];
export function sessionListContains(output: string, sessionName: string): boolean;
export function parseSessionListOutput(output: string): unknown;
export function parsedSessionNames(output: string): string[];
export function sessionListOutputValid(output: string): boolean;
export function parsePstreePids(output: string): number[];
export function parseLsofOwnerPids(output: string): number[];
export function parseLsofPorts(output: string): number[];
export function parseLsofMappings(output: string): Map<number, number[]>;
