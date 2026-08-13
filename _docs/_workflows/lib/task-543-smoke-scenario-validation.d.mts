// Type declarations for _docs/_workflows/lib/task-543-smoke-scenario-validation.mjs
// (single owner: TASK-545-02-L02). Success scenario semantics, geometry/DOM
// assertions, screenshot, and reset validation.

export function expectedTransientAssertionCommands(scenario: unknown): string[];
export function transientEvidenceValid(scenario: unknown, fixture: unknown): boolean;
export function expectedEvidenceAssertionCommand(scenario: unknown): string;
export function expectedScenarioResetCommand(scenario: unknown, fixture: unknown): string;
export function resetEvidenceValid(output: unknown, scenario: unknown, fixture: unknown): boolean;
export function isFullSmokeCliCommand(command: string): boolean;
export function isUserActionCommand(command: string): boolean;
export function commandResultsMatch(commands: unknown, results: unknown): boolean;
export function logReadSetValid(set: unknown): boolean;
export function pushLogReadSet(push: (scope: string, record: unknown) => void, scope: string, set: unknown): void;
export function aggregateLogReadSets(sets: readonly unknown[], key: string): unknown[];
export function lifecycleLogCommandValid(record: unknown): boolean;
export function lifecycleLogReceiptValid(record: unknown): boolean;
export function sessionListReceiptValid(receipt: unknown): boolean;
export function browserOpenReceiptValid(receipt: unknown): boolean;
export function browserCloseReceiptValid(receipt: unknown): boolean;
export function emptyRouteListOutput(output: string): boolean;
export function computedNodeValid(node: unknown, expectedVisible: boolean): boolean;
export function responsiveEvidenceValid(responsive: unknown, evidence: unknown, fixture: unknown): boolean;
export function expectedMutationSequence(kind: string, fixture: unknown): unknown[];
export function expectedNavigationSequence(kind: string, fixture: unknown): unknown[];
export function validateScenarioByKind(scenario: unknown, fixture: unknown): boolean;
export function expectedScenarioRouteMode(kind: string): string | null;
export function expectedScenarioRoutePattern(fixture: unknown): string;
export function scenarioCommandEvidenceValid(scenario: unknown, fixture: unknown): boolean;
export function stateRestored(record: unknown, kind: string): boolean;
export function screenshotReceiptValid(
  screenshot: unknown,
  scenario: unknown,
  serverStartedAtEpochMs: number
): boolean;
export function expectedScreenshotPhases(kind: string): string[];
export function urlPathMatches(value: string, expectedPath: string): boolean;
export function fixtureCreateOutputValid(output: unknown, fixture: unknown): boolean;
export function fixtureProvenanceOutputValid(output: unknown, fixture: unknown): boolean;
