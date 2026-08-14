// Type declarations for _docs/_workflows/lib/task-543-prompts-and-closure.mjs
// (single owner: TASK-545-02-L02). Bounded prompts, declared lenses, closure
// plan, and final metadata-gate helpers.

export const CHANGELOG: string;
export const POST_LENSES: Readonly<[string, string][]>;
export const FINAL_LENSES: Readonly<[string, string][]>;
export const CLOSURE_ALLOWED: readonly string[];

export function startGatePrompt(): string;
export function crossLaneGatePrompt(): string;
export function postAuditFixPrompt(
  common: string,
  leaf: string,
  findings: readonly unknown[],
  lensKeys: readonly string[]
): string;
export function fullGatesPrompt(fullGateCommands: unknown): string;
export function fingerprintPrompt(): string;
export function smokePrompt(nonceGenerationCommand: string, smokeScreenshotRoot: string): string;
export function smokeAuditPrompt(smoke: unknown): string;
export function closurePrompt(common: string, fullGates: unknown, smoke: unknown): string;
export function finalDriftFixPrompt(common: string, findings: readonly unknown[]): string;
export function finalMetadataGatePrompt(workflow: string): string;
