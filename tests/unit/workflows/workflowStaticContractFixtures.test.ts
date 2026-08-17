// TASK-545-01-L02 / TASK-576: negative fixtures and the live-tree temp-repo
// corpus (Bun lane).
//
// Split out of workflowStaticContract.test.ts (TASK-576) by cohesive
// responsibility: this suite owns the negative source fixtures (synthetic
// non-canonical / unguarded-consumer / forbidden-directive modules must fail
// exactly at the contract) and the temp-repo proof that ignored local files
// can never alter the tracked inventory. Helpers come from
// workflowStaticContractCore.ts and workflowStaticContractDrivers.ts.

import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  CANONICAL_FUTURE_PATH_PATTERN,
  FULL_UNGUARDED_CONSUMER_OPTIONS,
  ROOT,
  WorkflowRole,
  assertCanonicalDriverImportAndCall,
  assertNoUnguardedAgentResultConsumer,
  assertTrackedRegularFileNoSymlink,
  assertBytesEqualGitShowHead,
  classifyTrackedEntryOrThrow,
  parseModuleSource,
  trackedWorkflowEntries,
  trackedWorkflowFiles,
} from "./workflowStaticContractCore.js";
import type { ParsedModule } from "./workflowStaticContractCore.js";
import {
  FORBIDDEN_ACTION_PATTERNS,
  FULL_AUDIT_DRIVER_OPTIONS,
  FULL_POST_AUDIT_DRIVER_OPTIONS,
  OwningWorkflowRegistration,
  assertCanonicalAuditDriver,
  assertCanonicalFutureEntry,
  assertCanonicalPostAuditDriver,
  assertCanonicalTask545StaticContractsAndImports,
  assertNoCallerWorkflowEntryOverride,
  assertNoForbiddenPatterns,
  createTrackedWorkflowRepo,
  deriveOnlyFromExecutingImportMetaUrl,
} from "./workflowStaticContractDrivers.js";

describe("TASK-545-01-L02 static workflow contract", () => {
  test("negative source fixtures fail exactly where the static contract rejects them", () => {
    const fixtures = path.join(ROOT, "tests/fixtures/workflows/static");
    const parseFixture = (filename: string, syntheticPath: string): ParsedModule =>
      parseModuleSource(readFileSync(path.join(fixtures, filename), "utf8"), syntheticPath);
    const allowed: ReadonlyArray<readonly [string, string, WorkflowRole]> = Object.freeze([
      ["future-author-audit.mjs", "_docs/_workflows/task-777-author-audit.mjs", "author-audit"],
      ["future-implement.mjs", "_docs/_workflows/task-777-implement.mjs", "implement"],
      ["future-fix.mjs", "_docs/_workflows/task-777-fix.mjs", "fix"],
      ["future-task-9999-implement.mjs", "_docs/_workflows/task-9999-implement.mjs", "implement"],
    ]);
    for (const [filename, syntheticPath, role] of allowed) {
      expect(classifyTrackedEntryOrThrow(syntheticPath).role).toBe(role);
      const parsed = parseFixture(filename, syntheticPath);
      assertCanonicalDriverImportAndCall(parsed, role, syntheticPath);
      assertNoUnguardedAgentResultConsumer(parsed, syntheticPath, FULL_UNGUARDED_CONSUMER_OPTIONS);
      if (role === "author-audit")
        assertCanonicalAuditDriver(parsed.source, syntheticPath, FULL_AUDIT_DRIVER_OPTIONS);
      else
        assertCanonicalPostAuditDriver(
          parsed.source,
          syntheticPath,
          FULL_POST_AUDIT_DRIVER_OPTIONS
        );
    }
    const domainParsed = parseFixture(
      "legal-domain-filter-boolean.mjs",
      "_docs/_workflows/task-777-implement.mjs"
    );
    expect(() =>
      assertNoUnguardedAgentResultConsumer(domainParsed, domainParsed.displayPath, {
        rejectFilterBooleanBeforeValidation: true,
        rejectFlattenCountOrCleanBeforeValidation: true,
        requireTrustedOrderedIdentityEnvelopes: true,
        allowUnrelatedDomainCollectionFiltering: true,
      })
    ).not.toThrow();
    expect(() =>
      assertNoUnguardedAgentResultConsumer(
        parseFixture(
          "unguarded-result-filter-false-clean.mjs",
          "_docs/_workflows/task-777-implement.mjs"
        ),
        "unguarded-result-filter-false-clean.mjs",
        FULL_UNGUARDED_CONSUMER_OPTIONS
      )
    ).toThrow(/filter\(Boolean\)/);
    expect(() =>
      assertNoUnguardedAgentResultConsumer(
        parseFixture(
          "flatten-count-clean-before-validation.mjs",
          "_docs/_workflows/task-777-implement.mjs"
        ),
        "flatten-count-clean-before-validation.mjs",
        FULL_UNGUARDED_CONSUMER_OPTIONS
      )
    ).toThrow(/flatMap|counts a filtered/);
    expect(() =>
      assertCanonicalDriverImportAndCall(
        parseFixture(
          "comment-only-static-contract-fake.mjs",
          "_docs/_workflows/task-777-author-audit.mjs"
        ),
        "author-audit",
        "comment-only-static-contract-fake.mjs"
      )
    ).toThrow(/missing canonical driver/);
    expect(() =>
      assertCanonicalDriverImportAndCall(
        parseFixture("missing-task545-imports.mjs", "_docs/_workflows/task-777-implement.mjs"),
        "implement",
        "missing-task545-imports.mjs"
      )
    ).toThrow(/no exact-identity result guard/);
    expect(() =>
      assertNoForbiddenPatterns(
        readFileSync(path.join(fixtures, "forbidden-prompt-actions.mjs"), "utf8"),
        "forbidden-prompt-actions.mjs",
        FORBIDDEN_ACTION_PATTERNS
      )
    ).toThrow(/forbidden action directive/);
    expect(() =>
      assertCanonicalFutureEntry("_docs/_workflows/task-556-implement.mjs", "555", {
        pattern: CANONICAL_FUTURE_PATH_PATTERN,
        requireTaskIdAndSuffixBinding: true,
        role: "implement",
      })
    ).toThrow(/task binding mismatch/);
    expect(() =>
      assertCanonicalFutureEntry("_docs/_workflows/task-555-fix.mjs", "555", {
        pattern: CANONICAL_FUTURE_PATH_PATTERN,
        requireTaskIdAndSuffixBinding: true,
        role: "implement",
      })
    ).toThrow(/suffix\/role binding mismatch/);
    expect(() => classifyTrackedEntryOrThrow("_docs/_workflows/task-1234-implement.mjs")).toThrow(
      /neither an initial TASK-545 entry nor a canonical future entry/
    );
    expect(() => classifyTrackedEntryOrThrow("_docs/_workflows/task-555-migrate.mjs")).toThrow(
      /neither an initial TASK-545 entry nor a canonical future entry/
    );
    const overrideOwner: OwningWorkflowRegistration = {
      importMetaUrl: pathToFileURL(path.join(ROOT, "_docs/_workflows/task-543-implement.mjs")).href,
      taskId: "543",
      role: "implement",
      path: "_docs/_workflows/task-554-implement.mjs",
    };
    expect(() =>
      assertNoCallerWorkflowEntryOverride(
        overrideOwner,
        deriveOnlyFromExecutingImportMetaUrl(overrideOwner.importMetaUrl)
      )
    ).toThrow(/caller workflow entry override/);
  });

  test("ignored local files cannot alter the tracked inventory and a missing canonical driver call is rejected", () => {
    const tempRoot = createTrackedWorkflowRepo();
    const fixturePath = path.join(ROOT, "tests/fixtures/workflows/static");
    try {
      expect(trackedWorkflowFiles(tempRoot)).toEqual(trackedWorkflowFiles(ROOT));
      expect(trackedWorkflowEntries(tempRoot).map((entry) => entry.path)).toEqual(
        trackedWorkflowEntries().map((entry) => entry.path)
      );
      writeFileSync(
        path.join(tempRoot, "_docs/_workflows/task-999-local-only.mjs"),
        "export const x = 1;\n"
      );
      writeFileSync(
        path.join(tempRoot, "_docs/_workflows/lib/ignored-local-helper.mjs"),
        "export const x = 1;\n"
      );
      expect(trackedWorkflowFiles(tempRoot)).toEqual(trackedWorkflowFiles(ROOT));
      expect(() =>
        assertTrackedRegularFileNoSymlink("_docs/_workflows/lib/ignored-local-helper.mjs", tempRoot)
      ).toThrow(/not tracked by git ls-files/);
      const authorPath = path.join(tempRoot, "_docs/_workflows/task-522-author.mjs");
      writeFileSync(authorPath, `${readFileSync(authorPath, "utf8")}\n// dirty\n`);
      expect(() =>
        assertBytesEqualGitShowHead("_docs/_workflows/task-522-author.mjs", tempRoot)
      ).toThrow(/bytes differ|unstaged changes/);
      execFileSync("git", ["checkout", "--", "_docs/_workflows/task-522-author.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      rmSync(path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs"));
      symlinkSync(
        "task-554-fix.mjs",
        path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs")
      );
      execFileSync("git", ["add", "-f", "_docs/_workflows/task-554-closeout.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      execFileSync("git", ["commit", "-qm", "symlink closeout"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      expect(() =>
        assertTrackedRegularFileNoSymlink("_docs/_workflows/task-554-closeout.mjs", tempRoot)
      ).toThrow(/not a regular non-symlink file/);
      rmSync(path.join(tempRoot, "_docs/_workflows/task-554-closeout.mjs"));
      execFileSync("git", ["checkout", "HEAD^", "--", "_docs/_workflows/task-554-closeout.mjs"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const missingDriver = readFileSync(
        path.join(fixturePath, "missing-task545-imports.mjs"),
        "utf8"
      );
      const futurePath = "_docs/_workflows/task-777-implement.mjs";
      writeFileSync(path.join(tempRoot, futurePath), missingDriver);
      execFileSync("git", ["add", "-f", futurePath], { cwd: tempRoot, stdio: "ignore" });
      execFileSync("git", ["commit", "-qm", "add missing-driver future entry"], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const future = trackedWorkflowEntries(tempRoot).find((entry) => entry.path === futurePath);
      expect(future).toBeDefined();
      expect(() =>
        assertCanonicalTask545StaticContractsAndImports(future!.path, future!.role, tempRoot)
      ).toThrow(/no exact-identity result guard/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
