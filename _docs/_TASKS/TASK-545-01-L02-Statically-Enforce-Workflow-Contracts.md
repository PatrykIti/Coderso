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

## Overview

Add the tracked-inventory static gate after the helper and workflow migrations
have landed, so future canonical workflow drift fails in a clean checkout.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `tests/unit/workflows/workflowStaticContract.test.ts`
- static-scan fixtures under `tests/fixtures/workflows/static/` if required

Do not edit workflow scripts, helper/unit-test source, product source, task files, indexes,
or `.gitignore` in this leaf. The landed `auditRounds.test.ts` and `postAudit.test.ts`
files are read-only gates; this leaf reruns but never edits/rebaselines them.

## Grounded baseline

- Commit `5facaf32` removed and globally ignored the former local workflow
  corpus; a recursive filesystem scan is therefore non-reproducible.
- Current HEAD tracks six executable entries: TASK-522 author, TASK-543
  implement, and the four TASK-554 entries, plus the TASK-522 helper/type
  declaration (`task-522-findings-prompt.mjs`).
- `task-522-author.mjs:169` is the only current tracked unsafe agent-result
  filter. TASK-543's three literal `.filter(Boolean)` calls process URL/port
  data and must remain legal.
- TASK-522 and TASK-543 use local audit/result machinery that must import the
  canonical drivers before this leaf lands.

## Implementation Pseudocode

```ts
const WORKFLOW_GLOBS = [
  "_docs/_workflows/*.mjs",
  "_docs/_workflows/lib/*.mjs",
] as const;

function trackedWorkflowFiles(): string[] {
  return gitLsFilesNul(WORKFLOW_GLOBS).sort();
}

function trackedWorkflowEntries(): WorkflowEntry[] {
  return trackedWorkflowFiles()
    .filter((path) => !path.includes("/lib/"))
    .map(classifyTrackedEntryOrThrow);
}

const REQUIRED_TASK_545_DRIVER_SUPPORT = [
  "_docs/_workflows/lib/workflow-contracts.mjs",
  "_docs/_workflows/lib/workflow-contracts.d.mts",
  "_docs/_workflows/lib/audit-rounds.mjs",
  "_docs/_workflows/lib/audit-rounds.d.mts",
  "_docs/_workflows/lib/post-audit.mjs",
  "_docs/_workflows/lib/post-audit.d.mts",
] as const;

test("canonical driver runtime and declarations are tracked HEAD bytes", () => {
  for (const path of REQUIRED_TASK_545_DRIVER_SUPPORT) {
    assertTrackedRegularFileNoSymlink(path);
    assertBytesEqualGitShowHead(path);
  }
});

test("initial migration entries and all future owners are tracked", () => {
  expectTrackedInitialEntriesOrCanonicalExtensions(trackedWorkflowEntries(), [
    ["task-522-author.mjs", "author-audit"],
    ["task-543-implement.mjs", "implement"],
    ["task-554-author-audit.mjs", "author-audit"],
    ["task-554-closeout.mjs", "closeout"],
    ["task-554-implement.mjs", "implement"],
    ["task-554-fix.mjs", "fix"],
  ]);
});

test("agent-result collections use the all-results guard", () => {
  for (const entry of trackedWorkflowEntries()) {
    const ast = parseModule(entry.path);
    if (entry.role === "closeout") {
      assertTask554CloseoutGuardContract(ast, entry.path);
      continue;
    }
    assertCanonicalDriverImportAndCall(ast, entry.role);
    assertNoUnguardedAgentResultConsumer(ast, entry.path, {
      rejectFilterBooleanBeforeValidation: true,
      rejectFlattenCountOrCleanBeforeValidation: true,
      requireTrustedOrderedIdentityEnvelopes: true,
      allowUnrelatedDomainCollectionFiltering: true,
    });
  }
});

test("canonical author/audit workflows run one complete pass and affected reruns", () => {
  for (const file of trackedWorkflowEntriesByRole("author-audit")) {
    const source = readFileSync(file, "utf8");
    assertCanonicalAuditDriver(source, file, {
      requireInitialCompletePass: true,
      reconcilePerPass: 1,
      affectedScopesOnlyAfterVerifiedFix: true,
      deriveActualChangedScopesFromPerScopeFingerprints: true,
      requireDeclaredActualIdentitySetEquality: true,
      invalidateAllReceiptsOnUnmappableChange: true,
      requireAllResults: true,
      requireExactOrderedIdentities: true,
      requireRevisionFingerprint: true,
    });
  }
});

test("implementation workflows declare and complete their independent post lenses", () => {
  for (const file of trackedWorkflowEntriesByRole("implement", "fix")) {
    const source = readFileSync(file, "utf8");
    assertCanonicalPostAuditDriver(source, file, {
      requireDeclaredIndependentLensIds: true,
      requireAllResults: true,
      requireExactOrderedIdentities: true,
      fingerprintBeforeAndAfterPass: true,
      fingerprintFixAndValidation: true,
      deriveActualChangedLensesFromInputFingerprints: true,
      requireDeclaredActualIdentitySetEquality: true,
      invalidateAllReceiptsOnUnmappableChange: true,
    });
  }
});

test("UI closure pauses for owner evidence staging", () => {
  for (const file of trackedUiClosureWorkflowFiles()) {
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
  for (const owner of trackedOwningWorkflowRegistrations()) {
    const entry = deriveOnlyFromExecutingImportMetaUrl(owner.importMetaUrl);
    if (isExactTask545BuiltinEntry(entry)) {
      assertExactBuiltinTaskAndRoleBinding(entry, owner.taskId);
    } else {
      assertCanonicalFutureEntry(entry, owner.taskId, {
        pattern:
          /^(?:_docs\/_workflows\/task-554-closeout\.mjs|_docs\/_workflows\/task-(?:[0-9]{3}|9999)-(author-audit|implement|fix)\.mjs)$/,
        requireTaskIdAndSuffixBinding: true,
      });
    }
    assertTrackedRegularFileNoSymlink(entry);
    assertBytesEqualGitShowHead(entry);
    assertCanonicalTask545StaticContractsAndImports(entry, owner.role);
    assertNoCallerWorkflowEntryOverride(owner);
  }
});

test("tracked prompts do not commit, allocate dynamically, or defer smoke", () => {
  for (const file of trackedWorkflowEntries().map(({ path }) => path)) {
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
commands/prompt directives and test explicit negative fixtures. The AST rule is
equally scoped: it rejects unguarded agent-result consumers but permits ordinary
domain/browser/process filtering, including TASK-543's URL and port parsers.

Static round checks should require imports/calls to the canonical drivers added
by TASK-545-02 rather than infer safety from a comment or numeric literal. A
live-tree fixture must demonstrate that a script missing the canonical guard/driver call is
rejected and cannot satisfy the structural policy by comment or numeric literal. Dynamic
null/identity/fingerprint/fixer behavior belongs exclusively to the already-landed
`auditRounds.test.ts` and `postAudit.test.ts`; owner-stage/resume runtime behavior belongs
to TASK-545-03-L01. This leaf adds only whole-inventory static enforcement and negative
source fixtures, with no behavioral rebaseline.

The six post-TASK-554 migration entries are the initial compatibility set, not
the universe of future owners. A later entry is accepted only through the
canonical task-bound pattern above; three-digit TASK IDs and the sole
`TASK-9999` sentinel follow repository naming rules. Its suffix must match its
registered author-audit/implement/fix role and task ID, except that the exact
TASK-554 closeout guard has the dedicated `closeout` role and is validated by
`assertTask554CloseoutGuardContract` rather than an agent-driver import.
Resolution starts only
from the currently executing module's `import.meta.url`; CLI/API path overrides
are forbidden. Before phase 1, require `git ls-files`, a regular non-symlink
path, byte equality with `git show HEAD:<path>`, and the same TASK-545 static
contract/canonical-import gates used by the inventory scan.

## Error/compatibility flow

- Static test output names exact file and violated invariant.
- New tracked workflows automatically join the scan; ignored local artifacts do
  not affect clean-checkout closure, and no filename allowlist can hide a
  tracked entry.
- Unknown built-ins, caller overrides, wrong task/suffix, noncanonical four-digit
  IDs, untracked/dirty files, symlinks, and static/import-gate failures reject.
- A tracked workflow becomes historical/non-executable only through an explicit
  migration. Files already deleted by `5facaf32` remain Git-history evidence,
  not live inventory.

## Testing Requirements

```bash
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts
git ls-files -z -- '_docs/_workflows/*.mjs' '_docs/_workflows/lib/*.mjs' |
  xargs -0 -r -n1 node --check
git diff --check
```

Rerun a named failing test once. This leaf lands only after TASK-545-02-L02; do not
weaken a pattern to baseline a residual violation. Any residual tracked-script failure
returns ownership to its explicitly assigned TASK-545-02 leaf before this gate reruns.
Fixtures cover every allowed future suffix, TASK-9999, wrong task/suffix/four-digit
ID, caller override, untracked/dirty/HEAD-mismatched entry, regular-file failure,
symlink, missing TASK-545 imports, an unguarded result-filter false-clean, a
comment-only static-contract fake, and a legal unrelated domain
`.filter(Boolean)` call. The suite also proves ignored local files cannot alter
the tracked inventory.

## Documentation Updates Required

- No shared documentation edit in this leaf.
- Report the zero-violation tracked inventory to the parent; TASK-545-04-L03 owns final
  board and changelog 1257 updates.
