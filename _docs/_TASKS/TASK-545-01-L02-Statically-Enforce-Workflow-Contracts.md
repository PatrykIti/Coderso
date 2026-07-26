# TASK-545-01-L02: Statically Enforce Workflow Contracts

# FileName: TASK-545-01-L02-Statically-Enforce-Workflow-Contracts.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-01
**Priority:** High
**Category:** Workflow Static Tests / Contributor Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L01, TASK-545-02-L02
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Exclusive ownership

- new `tests/unit/workflows/workflowStaticContract.test.ts`
- static-scan fixtures under `tests/fixtures/workflows/static/` if required

Do not edit workflow scripts, helper/unit-test source, product source, task files, indexes,
or `.gitignore` in this leaf. The landed `auditRounds.test.ts` and `postAudit.test.ts`
files are read-only gates; this leaf reruns but never edits/rebaselines them.

## Grounded baseline

- `rg -l -F 'filter(Boolean)' _docs/_workflows -g '*.mjs'` currently returns 61
  active files; 58 contain the audit's unsafe result-filter class.
- Short author loops: `task-517-author.mjs:168`, `task-524-author.mjs:79`,
  `task-525-author.mjs:70`, `task-531-534-author.mjs:113`.
- One reconcile outside the loop: `task-531-534-author.mjs:103-138`.
- Two/three-lens post-audits: `task-523-full` through `task-535-remediation`,
  including `task-533-impl.mjs:73-109`.
- Commit prompts remain in 20 scripts from `task-512-impl` through
  `task-535-remediation`; dynamic allocation and deferred-smoke strings remain
  across author/implement/full scripts.

## Implementation Pseudocode

```ts
const ACTIVE_WORKFLOW_DIR = "_docs/_workflows";

function activeWorkflowFiles(): string[] {
  return recursiveMjsFiles(ACTIVE_WORKFLOW_DIR)
    .filter((path) => !path.includes("/_smoke/"));
}

// Role-specific round/lens checks exclude pure lib modules, but the exact
// `.filter(Boolean)` and forbidden-prompt scans cover every active .mjs,
// including lib helpers.

test("all workflows use the all-results guard", () => {
  for (const file of workflowsReturningParallelResults()) {
    const source = readFileSync(file, "utf8");
    expect(source).not.toContain(".filter(Boolean)");
    expect(source).toContain("requireAllResults(");
    assertTrustedIdentityEnvelopes(source, file); // stable caller-owned IDs + expected order
  }
});

test("canonical author/audit workflows have >=5 rounds and one reconcile/round", () => {
  for (const file of authorAuditFiles()) {
    const source = readFileSync(file, "utf8");
    assertCanonicalAuditDriver(source, file, {
      minimumRounds: 5,
      reconcilePerRound: 1,
      requireAllResults: true,
      requireExactOrderedIdentities: true,
      requireRevisionFingerprint: true,
      actionableExecutionWeakeningLow: true,
    });
  }
});

test("implementation workflows have >=5 independent post lenses", () => {
  for (const file of implementationWorkflowFiles()) {
    const source = readFileSync(file, "utf8");
    assertCanonicalPostAuditDriver(source, file, {
      minimumIndependentLenses: 5,
      requireAllResults: true,
      requireExactOrderedIdentities: true,
      fingerprintBeforeAndAfterPass: true,
      fingerprintFixAndValidation: true,
    });
  }
});

test("UI closure pauses for owner evidence staging", () => {
  for (const file of uiClosureWorkflowFiles()) {
    const source = readFileSync(file, "utf8");
    assertPromptRequiresImmediateEvidenceValidation(source, file);
    assertPromptReturnsOwnerActionRequiredBeforeTrackedAudit(source, file);
    assertPromptUsesCanonicalResumeCheckpoint(source, file);
    assertPromptReturnsExactOwningWorkflowResumeArgv(source, file);
    assertResumeEntryMatchesExecutingWorkflow(source, file);
    assertPromptResumesWithRequireTracked(source, file);
    assertPromptValidatesMetadataOnlyClosureDelta(source, file);
    assertResumeCannotDispatchImplementationStages(source, file);
    assertPromptNeverStagesAsAgent(source, file);
  }
});

test("owning workflow entries are tracked, clean, and task-bound", async () => {
  for (const owner of owningWorkflowRegistrations()) {
    const entry = deriveOnlyFromExecutingImportMetaUrl(owner.importMetaUrl);
    if (isExactTask545BuiltinEntry(entry)) {
      assertExactBuiltinTaskAndRoleBinding(entry, owner.taskId);
    } else {
      assertCanonicalFutureEntry(entry, owner.taskId, {
        pattern:
          /^_docs\/_workflows\/task-(?:[0-9]{3}|9999)-(author-audit|implement|fix)\.mjs$/,
        requireTaskIdAndSuffixBinding: true,
      });
    }
    assertTrackedRegularFileNoSymlink(entry);
    assertBytesEqualGitShowHead(entry);
    assertCanonicalTask545StaticContractsAndImports(entry, owner.role);
    assertNoCallerWorkflowEntryOverride(owner);
  }
});

test("active prompts do not commit, allocate dynamically, or defer smoke", () => {
  for (const file of activeWorkflowFiles()) {
    const source = readFileSync(file, "utf8");
    assertNoForbiddenPatterns(source, file, [
      /git\s+commit/i, /commit on the worktree/i,
      /next[- ]free/i, /highest\s*\+\s*1/i,
      /smokeDeferred/i, /smoke.{0,80}deferred/i,
    ]);
  }
});
```

Avoid a broad word ban that flags prose unrelated to an action. Match executable
commands/prompt directives and test explicit negative fixtures. Conversely,
`.filter(Boolean)` is an exact active-script ban, including incidental helpers.

Static round checks should require imports/calls to the canonical drivers added
by TASK-545-02 rather than infer safety from a comment or numeric literal. A
live-tree fixture must demonstrate that a script missing the canonical guard/driver call is
rejected and cannot satisfy the structural policy by comment or numeric literal. Dynamic
null/identity/fingerprint/fixer behavior belongs exclusively to the already-landed
`auditRounds.test.ts` and `postAudit.test.ts`; owner-stage/resume runtime behavior belongs
to TASK-545-03-L01. This leaf adds only whole-inventory static enforcement and negative
source fixtures, with no behavioral rebaseline.

The existing TASK-545 24+44 built-in entry inventory remains an exact closed
compatibility set, but it is not the universe of future owners. A non-built-in
entry is accepted only through the canonical task-bound pattern above; three-digit
TASK IDs and the sole `TASK-9999` sentinel follow repository naming rules. Its
suffix must match its registered author-audit/implement/fix role and task ID.
Resolution starts only from the currently executing module's `import.meta.url`;
CLI/API path overrides are forbidden. Before phase 1, require `git ls-files`, a
regular non-symlink path, byte equality with `git show HEAD:<path>`, and the same
TASK-545 static contract/canonical-import gates used by the inventory scan.

## Error/compatibility flow

- Static test output names exact file and violated invariant.
- New workflows automatically join the scan; no manually maintained filename
  allowlist can hide them.
- Unknown built-ins, caller overrides, wrong task/suffix, noncanonical four-digit
  IDs, untracked/dirty files, symlinks, and static/import-gate failures reject.
- A genuinely historical/non-executable workflow must be moved by an explicit
  future migration, not silently excluded here.

## Validation

```bash
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts
for file in _docs/_workflows/*.mjs _docs/_workflows/lib/*.mjs; do node --check "$file"; done
git diff --check
```

Rerun a named failing test once. This leaf lands only after TASK-545-02-L02; do not
weaken a pattern to baseline a residual violation. Any residual active-script failure
returns ownership to its explicitly assigned TASK-545-02 leaf before this gate reruns.
Fixtures cover every allowed future suffix, TASK-9999, wrong task/suffix/four-digit
ID, caller override, untracked/dirty/HEAD-mismatched entry, regular-file failure,
symlink, missing TASK-545 imports, and a comment-only static-contract fake.
