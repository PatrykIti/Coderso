# TASK-404-08: TASK-404 Task Drift Audit and Repair Loop
# FileName: TASK-404-08_TASK_404_Task_Drift_Audit_and_Repair_Loop.md

**Priority:** High
**Category:** Process + Task Quality + Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-404
**Status:** In Progress (2026-06-04)

---

## Overview

Audit the TASK-404 task breakdown itself for drift, missing dependencies,
missing security contracts, weak acceptance criteria, invalid sequencing, and
test gaps. Use Claude and sub-agents in a loop until the task set is internally
consistent and execution-ready.

This leaf exists because TASK-404 is broad enough that the task plan can drift
from repo rules or from the actual Assistant architecture. The task files must
be treated as a contract, not as loose notes.

Claude max/xhigh reviews must be given enough time to complete. Use a long
timeout window, normally 15-25 minutes, for broad task/source reviews instead of
classifying an empty early poll as a completed review.

## Sub-Tasks

- Ask Claude for a read-only review of all TASK-404 files and the relevant
  Assistant source-of-truth docs.
- Ask sub-agents for independent review:
  - product/UX acceptance criteria drift,
  - architecture/security/action-contract drift,
  - QA/E2E/test-lane drift.
- Patch the TASK-404 task files and board for every blocking task-plan drift.
- Repeat review -> patch -> verify until Claude and agents report no blocking
  drift in the task breakdown.
- Keep `_docs/_TASKS/README.md` statistics and rows synchronized after every
  task-file change.

## Files To Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-404_LLM_Guide_Full_Service_Site_Generation.md` | Parent contract, dependencies, execution order, and acceptance criteria drift fixes. |
| `_docs/_TASKS/TASK-404-*.md` | Leaf task drift fixes: scope, pseudocode, security, tests, docs, dependencies. |
| `_docs/_TASKS/README.md` | Board rows and statistics. |
| `_docs/ASSISTANT_SITE_BUILDER.md` | Read-only source context; update only if task audit reveals docs drift that must be fixed immediately. |
| `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` | Read-only source context; update only if task audit reveals current matrix drift that must be fixed immediately. |

## Implementation Pseudocode

```ts
type TaskDriftFinding = {
  id: string;
  source: "claude" | "agent-ux" | "agent-architecture" | "agent-qa" | "local-check";
  severity: "blocking" | "non-blocking";
  file: string;
  section: string;
  issue: string;
  fix: string;
};

async function runTask404DriftLoop() {
  let pass = 0;
  while (true) {
    pass += 1;
    const findings = await collectTaskDrifts({
      taskFiles: TASK_404_FILES,
      sourceDocs: ASSISTANT_SOURCE_DOCS,
      claudeTimeoutMs: 25 * 60 * 1000,
      agents: ["ux", "architecture-security", "qa-e2e"],
    });

    const blocking = dedupe(findings).filter((finding) => finding.severity === "blocking");
    if (blocking.length === 0) return { status: "passed", pass };

    for (const finding of blocking) {
      patchTaskFile(finding.file, finding.fix);
    }

    syncTaskBoard();
    runTaskFileChecks();
  }

  // The loop exits only on no blocking task drift or on a documented repeated
  // blocker that satisfies the repo blocked-task rules.
}
```

Data flow:

- Claude and sub-agents review the task files against repo rules and real
  Assistant architecture.
- Findings are mapped to a specific file and section.
- Task files are patched physically, not only summarized in chat.
- README statistics and rows are synchronized with any added/removed tasks.
- The loop stops only when the latest review pass has no blocking drift.

Error handling:

- If Claude or a sub-agent times out, rerun with a smaller focused prompt before
  accepting missing review evidence.
- If the same task-plan drift remains after three loop passes, record the
  blocker explicitly instead of treating TASK-404 as execution-ready.
- If added tasks change numbering or counts, update the board in the same patch.

## Security Contract

- Endpoint visibility: no endpoint changes in this task-plan audit leaf.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: unchanged unless this leaf intentionally patches
  source docs/contracts; any such patch must preserve schema-first rules.
- Anti-abuse: no public write endpoint; no nonce/signature/HMAC; no reCAPTCHA.
- Secret handling:
  - Claude prompts, agent prompts, task files, README rows, and validation notes
    must not include provider keys, cookies, CSRF tokens, auth headers, session
    IDs, raw prompts containing secrets, upload bytes, signed URLs, or live
    secret-bearing payloads.

## Testing Requirements

- `git diff --check`
- `rg -n "TASK-404|TASK-404-0[1-8]|To Do:" _docs/_TASKS/README.md _docs/_TASKS/TASK-404*.md`
- Mechanical check that each TASK-404 file has:
  - required header lines,
  - Priority, Category, Estimated Effort, Dependencies, Status,
  - Overview, Sub-Tasks, Implementation Pseudocode, Security Contract, Testing
    Requirements, Documentation Updates Required, Acceptance Criteria.
- Claude read-only task audit final pass.
- Sub-agent task audit final pass.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-404*.md`
- Source docs only if the task audit finds immediate docs drift that must be
  fixed before implementation begins.

## Acceptance Criteria

- Claude and sub-agents have reviewed the TASK-404 breakdown after the latest
  edits.
- Every blocking drift in task scope, sequencing, pseudocode, security,
  validation lanes, Playwright requirements, Claude/agent loop requirements, and
  board statistics is fixed in physical task files.
- `_docs/_TASKS/README.md` rows and statistics match the physical TASK-404 file
  set.
- No implementation leaf starts from a known-drift task contract.
