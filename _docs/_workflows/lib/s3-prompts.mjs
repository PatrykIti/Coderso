// S3 (TASK-481/539/542) shared prompts and closure helpers (orchestrator-owned).
// Environment-neutral ESM: bounded prompt builders shared by the three S3
// implement workflows, plus the common task-context template. Each task's
// implement script passes its own task constants (root, task id, changelog pin,
// forbidden paths, land order). Errors are machine-readable.

import {
  AUDIT_SCHEMA_EXPORT,
  FIXER_RESULT_SCHEMA_EXPORT,
  RESULT_SCHEMA_EXPORT,
} from "./s3-gate-contracts.mjs";

export const S3_RESULT_SCHEMA = RESULT_SCHEMA_EXPORT;
export const S3_AUDIT_SCHEMA = AUDIT_SCHEMA_EXPORT;
export const S3_FIXER_RESULT_SCHEMA = FIXER_RESULT_SCHEMA_EXPORT;

export function s3CommonContext(task) {
  return `
Repository: ${task.root}; task: ${task.taskId}; changelog: ${task.changelog}.
Read root AGENTS.md, the full ${task.taskId} parent/child/leaf contract, current
source/tests, required architecture/product/testing docs, and git status/diff before
editing. Build on current on-disk state. Preserve unrelated work, including other
streams' uncommitted edits; never revert, checkout, or "clean up" edits you did not
author. Code/comments are English. Never stage, commit, push, reset, suppress a scan,
or touch another task family. Re-run a named failing file alone once before
classifying it as a real failure. Return exact files changed and exact commands run;
never claim unexecuted validation. Every touched human-authored production/test
module must end at most 1,000 physical lines; follow the leaf's split plan when it is
currently over the limit. ${task.extra ?? ""}
`;
}

export function s3StartGatePrompt(task) {
  return `
Read-only ${task.taskId} start gate at ${task.root}. Verify every ${task.taskId} task
file is "⏳ To Do", the board rows/statistics match, changelog ${task.changelog}
remains reserved with no changelog file created, the pre-implementation audit receipt
is clean (0 HIGH / 0 MEDIUM), and the working tree has no unexpected dirty files
outside the orchestrator-owned paths. Verify HEAD descends from the pinned baseline.
Do not edit.`;
}

export function s3LeafImplPrompt(task, leaf) {
  return `
${s3CommonContext(task)}
Implement ${leaf.id} strictly from ${leaf.contract}. Edit ONLY these exact paths:
${JSON.stringify(leaf.allowed)}.
Read every owned file fresh before editing. Add all required changed-behavior tests
before running the source gate. Follow the leaf's land order and single-writer rules;
never edit a foreign leaf's files, task/docs/changelog/workflow files, or the shared
indexes. Do not stage or commit.`;
}

export function s3GatePrompt(task, leaf, attempt) {
  return `
Read-only gate for ${leaf.id} at ${task.root} (attempt ${attempt}); do not edit. Run
exactly this command sequence and return pass=true only if every command exits zero:
${leaf.gate}
Re-run a named failing file alone once before classifying it. Report the exact
commands you ran and their exit codes.`;
}

export function s3GateFixPrompt(task, leaf, attempt, errors) {
  return `
${s3CommonContext(task)}
Fix only verified ${leaf.id} gate failures within ${JSON.stringify(leaf.allowed)}.
Do not weaken assertions; prefer fixing the source when it diverged from the leaf
contract. Failures:
${errors.map((error) => `- ${error}`).join("\n")}
Do not stage or commit.`;
}

export function s3ScopeGatePrompt(task, expectedPaths, label) {
  return `
Read-only ${task.taskId} scope gate at ${task.root} (${label}). Inspect git status and
diff names. Current changed/untracked paths must be a subset of
${JSON.stringify(expectedPaths)}; no staged files are allowed. Return pass=false for
every extra or forbidden path. Do not edit.`;
}

export function s3PostAuditLensPrompt(task, lens) {
  return `
Fresh read-only ${task.taskId} post-audit lens=${lens.key} at ${task.root}. Ground
every finding in current file:line evidence. ${lens.scope}
Check task/board/docs, source boundaries, security invariants, present-only and
byte-identity behavior, test integrity, touched-file limits, and known cross-stream
collision risks. Do not edit.`;
}

export function s3PostAuditFixPrompt(task, findings) {
  return `
${s3CommonContext(task)}
Fix only verified post-audit findings within the ${task.taskId} owned paths. Do not
edit foreign files. Report every fix or evidence-backed rejection. Findings:
${JSON.stringify(findings)}`;
}

export function s3FullGatesPrompt(task) {
  return `
Final read-only ${task.taskId} validation at ${task.root}. Run every command in this
exact order and do not stop after a failure: ${JSON.stringify(task.fullGates)}.
For each command return its exact id/command/exit status. Parse the DB preflight JSON
into database and require configured/reachable/tables exactly when the task gates
require it. Never replace a receipt with a boolean. Do not edit.`;
}

export function s3SmokePrompt(task, session) {
  return `
Real-input ${task.taskId} runtime smoke at ${task.root} using the playwright-cli skill
with a named session -s=${session}, screenshots under
${task.smokeRoot}, after restarting the dev server and verifying admin + front respond.
Cover at least ${task.minScenarios} distinct real flows from the leaf contract with
VISIBLE-EFFECT assertions (computed styles / geometry / DOM state / aria), light+dark
admin where the surface has admin UI, zero console errors, and a report matching the
S3 smoke schema (pass, serverUp, scenarios with variants+assertions, screenshots with
sha256, consoleErrors=[], failures=[]). Assert visible effect, never mere control
presence and never only a CSS-string presence. Do not edit tracked files.`;
}

export function s3SmokeAuditPrompt(task, session) {
  return `
Fresh read-only audit of the ${task.taskId} smoke evidence at ${task.root} (session
${session}). Verify every scenario id from the leaf contract appears, every variant
asserts a visible effect with a real selector, screenshots are real PNGs under the
task smoke directory with unique sha256, consoleErrors is empty, and the evidence
bytes are byte-stable. Do not edit.`;
}

export function s3ClosurePrompt(task, summary) {
  return `
${s3CommonContext(task)}
Perform the ${task.taskId} closure owned by its closure leaf: update ONLY
${task.taskId} task/subtask/leaf statuses to ✅ Done with Started/Completed dates,
create changelog ${task.changelog} with the exact pinned name and update the
changelog index row + board rows/statistics by reading both indexes fresh, and record
the validation + smoke evidence truthfully. Edit no foreign task bytes. Do not stage
or commit. Prior evidence: ${JSON.stringify(summary)}.`;
}

export function s3FinalDriftLensPrompt(task, lens) {
  return `
Fresh read-only ${task.taskId} final working-tree audit lens=${lens.key} at ${task.root}.
${lens.scope}
Read the task graph, source/tests/guides/changelog/index, full git diff/status, and
the structured validation + smoke evidence. Report all HIGH/MEDIUM/LOW with file:line.
Do not edit.`;
}

export function s3FinalMetadataGatePrompt(task, workflowPath) {
  return `
Read-only ${task.taskId} final metadata gate at ${task.root}. Verify the workflow file
${workflowPath} passes node --check, the family line gate shows every touched
production/test file at most 1,000 lines, the board + changelog rows match the final
statuses, changelog ${task.changelog} exists with the pinned name, and no
HIGH/MEDIUM final-drift finding remains. Do not edit.`;
}
