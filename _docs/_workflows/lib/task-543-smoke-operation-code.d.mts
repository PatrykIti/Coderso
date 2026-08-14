// Type declarations for _docs/_workflows/lib/task-543-smoke-operation-code.mjs
// (single owner: TASK-545-02-L02). Bounded evidence-operation validation and
// code-source generation.

export function requireExactPlainObject(
  value: unknown,
  keys: readonly string[],
  label: string
): Record<string, unknown>;
export function requireBoundedRunCodeString(
  value: unknown,
  maximumLength: number,
  label: string
): string;
export function evidenceOperationKind(operation: string): "assert" | "reset";
export function validateEvidenceOperationPayload(operation: string, input: unknown): unknown;
export function canonicalEvidenceOperationEncoding(operation: string, input: unknown): string;
export function codeQlSafeJavaScriptStringLiteral(value: string): string;
export function buildEvidenceOperationRunCodeSource(operation: string, input: unknown): string;
export function smokeRunOperation(operation: string, input: unknown): string;
