// TASK-545-01-L02 / TASK-576: forbidden action directives and UI closure
// prompt contracts over the tracked workflow inventory (Bun lane).
//
// Split out of workflowStaticContract.test.ts (TASK-576) by cohesive
// responsibility: this suite owns the forbidden-directive gate (zero `git
// commit`, zero dynamic changelog allocation, zero deferred smoke) and the
// UI-closure owner-evidence-staging/resume prompt contracts. It uses the
// aggregated whole-inventory checks from workflowStaticContractDrivers.ts so a
// failure reports EVERY offender instead of the first one.

import { describe, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ROOT,
  trackedUiClosureWorkflowFiles,
  trackedWorkflowFiles,
} from "./workflowStaticContractCore.js";
import {
  FORBIDDEN_ACTION_PATTERNS,
  assertNoForbiddenPatternsInFiles,
  assertPromptNeverStagesAsAgent,
  assertPromptRequiresImmediateEvidenceValidation,
  assertPromptResumesWithRequireTracked,
  assertPromptReturnsExactOwningWorkflowResumeArgv,
  assertPromptReturnsOwnerActionRequiredBeforeTrackedAudit,
  assertPromptUsesCanonicalResumeCheckpoint,
  assertPromptValidatesMetadataOnlyClosureDelta,
  assertResumeCannotDispatchImplementationStages,
  assertResumeEntryMatchesExecutingWorkflow,
} from "./workflowStaticContractDrivers.js";

describe("TASK-545-01-L02 static workflow contract", () => {
  test("UI closure pauses for owner evidence staging", () => {
    for (const file of trackedUiClosureWorkflowFiles()) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
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

  test("tracked prompts do not commit, allocate dynamically, or defer smoke", () => {
    assertNoForbiddenPatternsInFiles(trackedWorkflowFiles(), FORBIDDEN_ACTION_PATTERNS);
  });
});
