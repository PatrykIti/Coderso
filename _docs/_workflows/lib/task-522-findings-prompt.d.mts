export interface Task522DriftFinding {
  severity: string;
  lens: string;
  file: string;
  problem: string;
  fix: string;
}

export interface Task522FixPromptOptions {
  common: string;
  round: number;
  task: string;
  findings: readonly Task522DriftFinding[];
}

export const TASK_522_FINDING_PAYLOAD_LIMITS: Readonly<{
  maxFindings: number;
  maxFieldCodeUnits: number;
}>;

export function formatTask522FindingPayload(findings: readonly Task522DriftFinding[]): string;

export function buildTask522FixPrompt(options: Task522FixPromptOptions): string;
