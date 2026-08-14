// Type declarations for _docs/_workflows/lib/task-543-smoke-timeline.mjs
// (single owner: TASK-545-02-L02). Exact success/failure command timeline
// construction and chronology checks.

export function credentialReceiptValidWithoutDigest(
  receipt: unknown,
  context: string,
  exactCommand: string
): boolean;
export function bootstrapPasswordReceiptValid(smoke: unknown): boolean;
export function timelineReceiptIntegrityValid(
  record: unknown,
  exactPasswordCommand: string,
  digest?: (value: string) => string
): boolean;
export function successTimelineReceiptIntegrityValid(
  record: unknown,
  smoke: unknown,
  digest?: (value: string) => string
): boolean;
export function failurePrefixTimelineReceiptIntegrityValid(
  record: unknown,
  smoke: unknown,
  digest?: (value: string) => string
): boolean;
export function prefixedReceipt(value: Record<string, unknown>, prefix: string): unknown;
export function expectedSuccessCommandTimeline(smoke: unknown): unknown[];
export function successCommandTimelineValid(smoke: unknown): boolean;
export function validateSmoke(smoke: unknown): Promise<void>;
