# TASK-407-01: Task Contract Drift Audit and Scope Freeze
# FileName: TASK-407-01-Task-Contract-Drift-Audit-and-Scope-Freeze.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Process + Assistant + UX + Security
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done (2026-06-05)

---

## Overview

Audit the TASK-407 task breakdown before implementation starts. The guided
site-builder flow is broad enough that task drift is a real risk: Basic vs
Advanced UX, prompt-poisoning boundaries, reference-file handling, content-engine
decisions, route validation, and Playwright scope must be internally consistent
before code changes land.

This task is complete only when Claude and sub-agents review the physical
TASK-407 files and report no blocking task-plan drift.

## Sub-Tasks

- Review TASK-407 parent and leaves against root `AGENTS.md`, `_docs/ASSISTANT_SITE_BUILDER.md`,
  `docs/develop/assistant.md`, the existing assistant action route contract, and
  the existing `siteKit`/solution-kit implementation:
  `AssistantSiteKitPlanInput`, `siteBuilderPlanStepIds`,
  `previewGuidedSiteBuilderPlan`, `executeGuidedSiteBuilder`,
  `validateGuidedSiteBuilderRun`, `AiSiteWizard*`, and solution-kit routes.
- Ask Claude and at least one agent for read-only task-plan drift review.
- Fix every blocking drift in physical task files.
- Verify `_docs/_TASKS/README.md` statistics and rows match the added tasks.
- Repeat review -> patch -> verify until no blocking task-plan drift remains.

## Security Contract

- Endpoint visibility: no endpoint changes in this task.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: unchanged, but task files must require strict
  schemas for all future guided-intake payloads.
- Anti-abuse: no public assistant write endpoint.
- Secret handling: Claude/agent prompts, task files, board notes, and closure
  evidence must not include provider keys, cookies, CSRF tokens, session ids,
  auth state, raw uploaded bytes, signed URLs, or secret-like user content.

## Files To Change

| Area | Files |
|---|---|
| Task contracts | `_docs/_TASKS/TASK-407*.md` |
| Board | `_docs/_TASKS/README.md` |
| Changelog | `_docs/_CHANGELOG/README.md` only if closing a docs-only planning task |

## Implementation Pseudocode

```ts
type Task407DriftFinding = {
  source: "claude" | "agent" | "local-check";
  severity: "blocking" | "non-blocking";
  file: string;
  section: string;
  issue: string;
  requiredFix: string;
};

async function runTask407TaskDriftLoop() {
  while (true) {
    const findings = await reviewTaskFilesWithClaudeAndAgents(TASK_407_FILES);
    const blocking = findings.filter((finding) => finding.severity === "blocking");
    if (blocking.length === 0) return "passed";

    for (const finding of blocking) {
      patchTaskFile(finding.file, finding.requiredFix);
    }
    syncTaskBoard();
    assertTaskFilesHaveRequiredSections(TASK_407_FILES);
  }
}
```

## Testing Requirements

- `git diff --check`
- Mechanical check that every TASK-407 file has:
  - required header lines,
  - Priority, Category, Estimated Effort, Dependencies, Status,
  - Overview, Sub-Tasks, Implementation Pseudocode, Security Contract, Testing
    Requirements, Documentation Updates Required, Acceptance Criteria where
    appropriate.
- Claude read-only task-plan audit final pass.
- Agent read-only task-plan audit final pass.

## Closure Evidence

- 2026-06-05 Claude and agent drift loops found and resolved blocking drifts
  around the existing `siteKit`/solution-kit contract, Basic-before-Advanced
  ordering, and TASK-407 compiler signatures.
- Final focused Claude and agent passes reported no blocking findings for
  TASK-407 docs and the admin client `context.siteKit` projection.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-407*.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- No implementation leaf begins with known task-plan drift.
- Claude and agent final passes have no blocking findings.
- Board statistics and task rows are synchronized with the physical task files.
