// Type declarations for _docs/_workflows/lib/task-543-codeql-self-test.mjs
// (single owner: TASK-545-02-L02). CodeQL source/execution self-test.

export function extractSmokeRunCodeSource(command: string): string;

export interface Task543CodeQlSelfTestResult {
  pass: boolean;
  evidenceOperations: number;
  transientOperations: number;
  zeroTransientKinds: number;
  resetOperations: number;
  compiledOperations: number;
  credentialDigestCalls: number;
  ordinaryDigestCalls: number;
  negativeCases: number;
  maximumCommandBytes: number;
}

export function runTask543CodeQlSelfTest(): Promise<Task543CodeQlSelfTestResult>;
