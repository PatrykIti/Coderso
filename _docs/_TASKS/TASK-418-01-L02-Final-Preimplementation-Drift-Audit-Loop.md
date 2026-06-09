# TASK-418-01-L02: Final Preimplementation Drift Audit Loop
# FileName: TASK-418-01-L02-Final-Preimplementation-Drift-Audit-Loop.md

**Parent Subtask:** TASK-418-01
**Priority:** High
**Category:** Pages / QA / Drift Audit
**Estimated Effort:** Medium
**Dependencies:** TASK-418-01-L01
**Status:** ⏳ To Do

---

## Overview

Rerun a fresh read-only drift audit after the TASK-418 task family and audit
report exist. The earlier Claude/subagent audit informed this task family, but
AGENTS.md treats that pass as stale once task files change.

---

## Implementation Pseudocode

```ts
async function runTask418PreImplementationAudit() {
  const prompt = buildAuditPrompt({
    repoPath: "/home/coder/project/Coderso",
    head: exec("git rev-parse HEAD"),
    status: exec("git status --short"),
    taskIds: ["TASK-418"],
    mode: "read-only",
    requiredChecks: [
      "task parent/child coverage",
      "source docs vs task contract",
      "current PageEditor implementation",
      "runtime and assistant parity risks",
      "validation lane requirements"
    ]
  });
  const claude = await runClaudePlanAudit(prompt);
  const agentReports = await runSubagentAudits(prompt);
  recordFindingsInTaskAndAuditReport(claude, agentReports);
}
```

Expected data flow:

- Gather HEAD, dirty status, task file list, and relevant docs/source paths.
- Run Claude in read-only plan mode and at least one subagent drift pass.
- Verify every actionable finding locally before changing any task state.
- Update task files first if real drift is found, then rerun the audit.

Error handling:

- If Claude CLI is unavailable, record the exact fallback and use subagents plus
  local audit.
- If an audit reports a false positive, document the local evidence that closes
  it.

Regression-test shape:

- Documentation/process leaf. Validate by checking the task closeout records
  audit command/fallback, HEAD, dirty status, and unresolved findings.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** not applicable.
- **RBAC:** not applicable.
- **CSRF:** not applicable.
- **Rate-limit bucket:** not applicable.
- **Validation:** audit must verify strict Page document validation remains in
  the implementation contract.
- **Anti-abuse controls:** prompts must exclude `.env` values, credentials,
  private provider keys, sensitive logs, and unredacted user data.

---

## Testing Requirements

- Manual task graph check for parent/child status consistency.
- Record Claude/subagent audit evidence in task closeout before code work
  starts.

---

## Documentation Updates Required

- TASK-418 task files if drift is found.
- `_docs/PAGE_EDITOR_V2_GAP_AUDIT.md` if new findings are confirmed.
