type Task551AuditSeverity = "HIGH" | "MEDIUM" | "LOW";
type Task551AuditFinding = Readonly<{
  severity: Task551AuditSeverity;
  area: string;
  finding: string;
  evidence: string;
}>;
type Task551AuditResult = Readonly<{
  scope?: string;
  status: "completed" | "timeout" | "error" | "malformed";
  findings: readonly Task551AuditFinding[];
}>;
type Task551AuditAgent = (scope: string) => Task551AuditResult | Promise<Task551AuditResult>;
type Task551ReconcileAgent = (
  results: readonly Task551AuditResult[]
) => Task551AuditResult | Promise<Task551AuditResult>;
type Task551TaskSnapshot = Readonly<{
  taskGraphDigest: string;
  taskFileDigests: readonly Readonly<{ path: string; sha256: string }>[];
}>;
type Task551DispatchSubgate = Readonly<{
  kind: string;
  afterCommandIds: readonly string[];
  barrier: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}>;
type Task551DispatchNode = Readonly<{
  id: string;
  occurrenceId: string;
  taskId: string;
  phase: string | null;
  dependsOn: readonly string[];
  workflowPrerequisites: readonly string[];
  subgates: readonly Task551DispatchSubgate[];
  readonly [key: string]: unknown;
}>;
type Task551Dispatch = Readonly<{
  inventory: Readonly<{ occurrenceCount: number }>;
  sourceHead: string;
  taskFiles: readonly Readonly<{
    path: string;
    taskId: string;
    status: string;
    readonly [key: string]: unknown;
  }>[];
  readonly [key: string]: unknown;
}>;
type Task551DriftEvaluation = Readonly<{
  valid: boolean;
  pass: boolean;
  missingScopes: readonly string[];
  invalidScopes: readonly string[];
  blockingFindings: readonly (Task551AuditFinding & Readonly<{ scope: string }>)[];
  lowFindings: readonly (Task551AuditFinding & Readonly<{ scope: string }>)[];
}>;
type Task551AuthorAuditInput = Readonly<{
  discoveredByPhase?: Readonly<Record<string, readonly string[]>>;
  auditAgent?: Task551AuditAgent;
  reconcileAgent?: Task551ReconcileAgent;
  changedScopes?: readonly string[];
  timeoutMs?: number;
  maxRounds?: number;
  testRepoRoot?: string;
  gitCommandTransport?: (
    request: Readonly<{
      argv: readonly string[];
      cwd: string;
      env: Record<string, string>;
      shell: boolean;
    }>
  ) => Promise<unknown>;
  readonly [key: string]: unknown;
}>;
type Task551AuthorAuditOutcome = Readonly<{
  pass: boolean;
  dispatch: Task551Dispatch;
  rounds: number;
  evaluation: Task551DriftEvaluation | null;
  results: readonly Task551AuditResult[];
}>;

export const TASK551_RECONCILE_SCOPE: "reconcile";
export function preflightTask551AuthorAuditDispatch(snapshot: unknown): Readonly<{
  inventory: Readonly<Record<string, number>>;
  dispatchOrder: readonly Task551DispatchNode[];
  dispatch: Task551Dispatch;
}>;
export function requireTask551ProductionDispatchTaskSnapshot(value: unknown): Task551TaskSnapshot;
export function requireTask551TestDispatchTaskSnapshotForTests(value: unknown): Task551TaskSnapshot;
export function deriveTask551AuditScopes(): readonly string[];
export function requireTask551ResearchGrounding(input: unknown): true;
export function requireTask551AuthoredScope(
  phase: string,
  materializedPaths: readonly string[]
): true;
export function normalizeTask551AuditResult(
  raw: unknown,
  expectedScope: string
): Task551AuditResult;
export function evaluateTask551DriftRound(
  expectedScopes: readonly string[],
  results: readonly Task551AuditResult[]
): Task551DriftEvaluation;
export function planTask551Reaudit(
  evaluation: Task551DriftEvaluation,
  changedScopes?: readonly string[]
): Readonly<{ rerunScopes: readonly string[]; requireFreshReconcile: boolean }>;
export function runTask551DriftAuditRound(
  input: Readonly<{
    scopes: readonly string[];
    auditAgent: Task551AuditAgent;
    reconcileAgent: Task551ReconcileAgent;
    timeoutMs?: number;
  }>
): Promise<Task551DriftEvaluation>;
export function runTask551AuthorAuditWorkflow(
  input: Task551AuthorAuditInput
): Promise<Task551AuthorAuditOutcome>;
export function runTask551AuthorAuditWorkflowForTests(
  input: Task551AuthorAuditInput
): Promise<Task551AuthorAuditOutcome>;
