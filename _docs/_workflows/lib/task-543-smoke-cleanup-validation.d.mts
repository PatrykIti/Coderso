// Type declarations for _docs/_workflows/lib/task-543-smoke-cleanup-validation.mjs
// (single owner: TASK-545-02-L02). Cleanup suffix, process/port, fixture,
// route, state, and remaining-resource validation.

export function failureNeedsProvenanceCleanupLogs(smoke: unknown): boolean;
export function failureCleanupCommandValid(record: unknown, smoke: unknown): boolean;
export function expectedLogReadPlan(scope: string): unknown[];
export function expectedFailureScenarioPlan(scenario: unknown, fixture: unknown): unknown[];
export function expectedFailureLaterPlan(smoke: unknown): unknown[];
export function failureLaterPrefixValid(smoke: unknown): boolean;
export function validateFailureCleanup(smoke: unknown): boolean;
