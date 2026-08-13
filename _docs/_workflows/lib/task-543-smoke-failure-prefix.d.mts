// Type declarations for _docs/_workflows/lib/task-543-smoke-failure-prefix.mjs
// (single owner: TASK-545-02-L02). Acquired-resource and canonical failure
// prefix validation.

export function failurePhaseMatchesScope(phase: string, scope: string): boolean;
export function failureEarlyPrefixValid(smoke: unknown): boolean;
export function failureIdentityReceiptValid(record: unknown, helper: unknown): boolean;
export function failurePrefixReceiptsValid(
  smoke: unknown,
  digest?: (value: string) => string
): boolean;
export function failedReceiptShowsFailure(receipt: unknown): boolean;
export function failureStateReceiptValid(record: unknown, smoke: unknown): boolean;
export function failureHelperReceiptValid(record: unknown, smoke: unknown): boolean;
export function canonicalFixtureCreateCommandValid(command: string): boolean;
export function failureScenarioCommandValid(record: unknown, smoke: unknown): boolean;
export function failureFixtureReceiptValid(record: unknown, smoke: unknown): boolean;
export function failureResponsiveEvidence(smoke: unknown, scenario: unknown, fixture: unknown): boolean;
export function failureScenarioReceiptValid(record: unknown, smoke: unknown): boolean;
export function failureHelperOwnershipMatchesTimeline(
  prefix: string,
  helper: unknown,
  helperAttempts: unknown
): boolean;
export function failureInventoryMatchesTimeline(smoke: unknown): boolean;
