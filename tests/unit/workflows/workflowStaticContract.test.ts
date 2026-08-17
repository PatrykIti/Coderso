// TASK-545-01-L02: statically enforce the tracked workflow inventory contract.
//
// Whole-inventory static gate over `_docs/_workflows/` (globally ignored,
// force-tracked through owner handoffs). It enumerates tracked entries via
// `git ls-files` (never a recursive filesystem scan), classifies each entry,
// requires canonical TASK-545 driver imports/calls (workflow-contracts /
// audit-rounds / post-audit symbols), rejects unguarded agent-result
// consumption while permitting unrelated domain collection filtering, and
// proves ignored local files cannot alter a clean-checkout inventory.
//
// Parser: `typescript` is a declared devDependency; the suite uses its real
// AST (ts.createSourceFile), so comments and numeric literals can never
// satisfy a structural contract. Dynamic null/identity/fingerprint/fixer
// behavior stays in the landed auditRounds.test.ts and postAudit.test.ts
// suites; owner-stage/resume runtime behavior belongs to TASK-545-03-L01.
//
// TASK-576 split: this file owns the inventory classification and canonical
// driver contracts. Forbidden action directives + UI-closure prompts live in
// workflowForbiddenDirectives.test.ts; negative fixtures + the live-tree temp
// repo live in workflowStaticContractFixtures.test.ts. All three share the
// helper modules workflowStaticContractCore.ts and
// workflowStaticContractDrivers.ts.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CANONICAL_FUTURE_PATH_PATTERN,
  FULL_UNGUARDED_CONSUMER_OPTIONS,
  ROOT,
  WorkflowRole,
  assertCanonicalDriverImportAndCall,
  assertNoUnguardedAgentResultConsumer,
  assertTask554CloseoutGuardContract,
  assertTrackedRegularFileNoSymlink,
  assertBytesEqualGitShowHead,
  expectTrackedInitialEntriesOrCanonicalExtensions,
  parseModuleFile,
  trackedWorkflowEntries,
  trackedWorkflowEntriesByRole,
} from "./workflowStaticContractCore.js";
import {
  FULL_AUDIT_DRIVER_OPTIONS,
  FULL_POST_AUDIT_DRIVER_OPTIONS,
  assertCanonicalAuditDriver,
  assertCanonicalFutureEntry,
  assertCanonicalPostAuditDriver,
  assertCanonicalTask545StaticContractsAndImports,
  assertExactBuiltinTaskAndRoleBinding,
  assertNoCallerWorkflowEntryOverride,
  deriveOnlyFromExecutingImportMetaUrl,
  isExactTask545BuiltinEntry,
  trackedOwningWorkflowRegistrations,
} from "./workflowStaticContractDrivers.js";

const REQUIRED_TASK_545_DRIVER_SUPPORT = Object.freeze([
  "_docs/_workflows/lib/workflow-contracts.mjs",
  "_docs/_workflows/lib/workflow-contracts.d.mts",
  "_docs/_workflows/lib/audit-rounds.mjs",
  "_docs/_workflows/lib/audit-rounds.d.mts",
  "_docs/_workflows/lib/post-audit.mjs",
  "_docs/_workflows/lib/post-audit.d.mts",
] as const);
const INITIAL_MIGRATION_SET: ReadonlyArray<readonly [string, WorkflowRole]> = Object.freeze([
  ["task-522-author.mjs", "author-audit"],
  ["task-543-implement.mjs", "implement"],
  ["task-554-author-audit.mjs", "author-audit"],
  ["task-554-closeout.mjs", "closeout"],
  ["task-554-implement.mjs", "implement"],
  ["task-554-fix.mjs", "fix"],
]);

describe("TASK-545-01-L02 static workflow contract", () => {
  test("canonical driver runtime and declarations are tracked HEAD bytes", () => {
    for (const relativePath of REQUIRED_TASK_545_DRIVER_SUPPORT) {
      assertTrackedRegularFileNoSymlink(relativePath);
      assertBytesEqualGitShowHead(relativePath);
    }
  });

  test("initial migration entries and all future owners are tracked", () => {
    expectTrackedInitialEntriesOrCanonicalExtensions(
      trackedWorkflowEntries(),
      INITIAL_MIGRATION_SET
    );
  });

  test("agent-result collections use the all-results guard", () => {
    for (const entry of trackedWorkflowEntries()) {
      const parsed = parseModuleFile(entry.path);
      if (entry.role === "closeout") {
        assertTask554CloseoutGuardContract(parsed, entry.path);
        continue;
      }
      assertCanonicalDriverImportAndCall(parsed, entry.role, entry.path);
      assertNoUnguardedAgentResultConsumer(parsed, entry.path, FULL_UNGUARDED_CONSUMER_OPTIONS);
    }
  });

  test("canonical author/audit workflows run one complete pass and affected reruns", () => {
    for (const file of trackedWorkflowEntriesByRole("author-audit")) {
      assertCanonicalAuditDriver(
        readFileSync(path.join(ROOT, file), "utf8"),
        file,
        FULL_AUDIT_DRIVER_OPTIONS
      );
    }
  });

  test("implementation workflows declare and complete their independent post lenses", () => {
    for (const file of trackedWorkflowEntriesByRole("implement", "fix")) {
      assertCanonicalPostAuditDriver(
        readFileSync(path.join(ROOT, file), "utf8"),
        file,
        FULL_POST_AUDIT_DRIVER_OPTIONS
      );
    }
  });

  test("owning workflow entries are tracked, clean, and task-bound", () => {
    for (const owner of trackedOwningWorkflowRegistrations()) {
      const entry = deriveOnlyFromExecutingImportMetaUrl(owner.importMetaUrl);
      if (isExactTask545BuiltinEntry(entry)) {
        assertExactBuiltinTaskAndRoleBinding(entry, owner.taskId);
      } else {
        assertCanonicalFutureEntry(entry, owner.taskId, {
          pattern: CANONICAL_FUTURE_PATH_PATTERN,
          requireTaskIdAndSuffixBinding: true,
          role: owner.role,
        });
      }
      assertTrackedRegularFileNoSymlink(entry);
      assertBytesEqualGitShowHead(entry);
      assertCanonicalTask545StaticContractsAndImports(entry, owner.role);
      assertNoCallerWorkflowEntryOverride(owner, entry);
    }
  });
});
