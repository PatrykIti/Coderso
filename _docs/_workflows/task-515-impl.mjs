export const meta = {
  name: "task-515-impl",
  description:
    "Implement TASK-515 (custom-screen sidebar visibility fix) on its worktree: apply the root-cause client-filter fix + regression tests, adversarially audit for contract-fidelity/correctness/regression, fix real findings, then closure docs/changelog/board — all gates green.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-515";

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["done", "filesEdited", "testsAdded", "gates", "notes"],
  properties: {
    done: { type: "boolean" },
    filesEdited: { type: "array", items: { type: "string" } },
    testsAdded: { type: "array", items: { type: "string" } },
    gates: {
      type: "object",
      additionalProperties: false,
      required: ["coreLint", "coreLintTypes", "rootTsc", "vitestAffected"],
      properties: {
        coreLint: { type: "string" },
        coreLintTypes: { type: "string" },
        rootTsc: { type: "string" },
        vitestAffected: { type: "string" },
      },
    },
    notes: { type: "string" },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "findings", "verdict"],
  properties: {
    lens: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};

const CLOSURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "done",
    "changelogFile",
    "docsUpdated",
    "boardUpdated",
    "gates",
    "committed",
    "commitSha",
    "notes",
  ],
  properties: {
    done: { type: "boolean" },
    changelogFile: { type: "string" },
    docsUpdated: { type: "boolean" },
    boardUpdated: { type: "boolean" },
    gates: {
      type: "object",
      additionalProperties: false,
      required: ["coreLint", "coreLintTypes", "rootTsc", "testBun", "vitestFull", "gatesCoderso"],
      properties: {
        coreLint: { type: "string" },
        coreLintTypes: { type: "string" },
        rootTsc: { type: "string" },
        testBun: { type: "string" },
        vitestFull: { type: "string" },
        gatesCoderso: { type: "string" },
      },
    },
    committed: { type: "boolean" },
    commitSha: { type: "string" },
    notes: { type: "string" },
  },
};

const ENV = `cd ${WT} && set -a && [ -f .env ] && . ./.env; set +a`;

phase("Implement");
const impl = await agent(
  `You are implementing TASK-515-01 (custom-screen sidebar visibility root-cause fix) in an ISOLATED git worktree at ${WT} (branch feature/task-515). Work ONLY in that worktree.

READ FIRST (in ${WT}):
- _docs/_TASKS/TASK-515-01-Sidebar-Visibility-Root-Cause-Fix.md — the execution-ready contract with EXACT before/after code. Follow it PRECISELY.
- _docs/_TASKS/TASK-515_Screens_Admin_Menu_Visibility_Fix.md — parent (Hard Invariants, Security Contract).

EXACT CHANGES (single-writer of these files):
1. core/admin/ui/navigation/sidebarConfig.ts — in buildCustomScreenShortcutNavItems remove the third predicate supportsDedicatedCustomScreenEditor(screen) so the filter becomes exactly \`screen.status === "active" && screen.showInSidebar === true\`. Then DELETE the now-unused helper supportsDedicatedCustomScreenEditor and any import that becomes unused because of it. Keep the CustomScreenShortcutRecord type import (still used). Do NOT touch capabilities/blocks/bindings on the record type. Add the explanatory comment from the contract.
2. core/admin/ui/custom-screens/customScreenListModel.ts — collapse resolveCustomScreenSidebarShortcutState to: if(!showInSidebar) return "hidden"; if(status==="active") return "visible"; return "configured_after_activation". Remove the now-dead local \`const capabilities = ...\` inside THIS function only. Prune "requires_editor_setup" from CustomScreenSidebarShortcutStateV3 (make it an alias === CustomScreenSidebarShortcutState). KEEP resolveCustomScreenCapabilities import (resolveCustomScreenModeLabel still needs it) and KEEP resolveCustomScreenModeLabel untouched.

TESTS (add, do not weaken existing):
3. tests/vitest/admin/advanced-modules.test.ts — add a NEW test \`buildCustomScreenShortcutNavItems includes pinned Active screens of every mode\` beside the existing builder test. Fixtures as CustomScreenShortcutRecord[]: (a) Active+showInSidebar+dashboard (supportsDedicatedEditor:false, read-only bindings) -> emitted with href /admin/advanced/custom-screens/<id>/entries; (b) Active+showInSidebar+collection-only (no blocks/bindings) -> emitted; (c) Active+showInSidebar+editor -> emitted; (d) Active+showInSidebar:false -> dropped; (e) draft+showInSidebar:true -> dropped. Assert labels honor sidebarLabel?.trim()||name and sorted. Match the existing fixture shape in that file — inspect the existing builder test at ~line 155 for the exact CustomScreenShortcutRecord fields.
4. tests/vitest/ui/custom-screens-list-wave.test.tsx (or a new focused tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts) — add a case: Active+showInSidebar+read-only-binding(dashboard) CustomScreenRecord -> resolveCustomScreenSidebarShortcutState==="visible" (was "requires_editor_setup"); showInSidebar:false -> "hidden"; draft+pinned -> "configured_after_activation". Inspect the existing fixture shape in the file first.

GATES (run in ${WT}, capture PASS/FAIL + first error line for each):
- ${ENV} && bun --cwd core lint
- ${ENV} && bun --cwd core lint:types
- ${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit   (root tsc — covers tests/ tree; MANDATORY per the typecheck-scope gotcha since this is a union-type prune)
- ${ENV} && bun run test:vitest tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx   (affected files — adjust the new test file path if you created a focused file)

If a gate fails, FIX and re-run until green. Do NOT edit any file outside the four owned files. Do NOT commit (closure phase commits). Return the structured result.`,
  { label: "impl:515-01", phase: "Implement", schema: IMPL_SCHEMA }
);

log(
  `Implement: done=${impl?.done} gates core-lint=${impl?.gates?.coreLint} lint:types=${impl?.gates?.coreLintTypes} root-tsc=${impl?.gates?.rootTsc} vitest=${impl?.gates?.vitestAffected}`
);

phase("Audit");
const LENSES = [
  {
    key: "fidelity",
    prompt: `Adversarial CONTRACT-FIDELITY + CORRECTNESS audit of the TASK-515-01 implementation in worktree ${WT}. Read _docs/_TASKS/TASK-515-01-Sidebar-Visibility-Root-Cause-Fix.md then \`cd ${WT} && git diff feature/tasks...feature/task-515\` (or git diff of the two owned files + tests).
Verify: (1) buildCustomScreenShortcutNavItems filter is EXACTLY status==="active" && showInSidebar===true — no leftover editor gate, no NEW over/under-filter; (2) supportsDedicatedCustomScreenEditor helper fully DELETED, no dangling import/reference; (3) resolveCustomScreenSidebarShortcutState collapsed correctly (hidden/visible/configured_after_activation), dead capabilities local removed, resolveCustomScreenCapabilities import KEPT (modeLabel needs it), resolveCustomScreenModeLabel untouched; (4) "requires_editor_setup" pruned from the union AND produced nowhere; (5) the NEW builder test actually covers the non-editor Active+pinned case (dashboard AND collection-only) — the gap that let the bug through — and asserts href/label/sort; (6) NO file outside the four owned files was edited. Flag anything that deviates from the contract or is incorrect. For each finding set isReal true only if you can defend it against a skeptic.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + DRIFT audit of TASK-515-01 in worktree ${WT}. Read the parent Hard Invariants in _docs/_TASKS/TASK-515_Screens_Admin_Menu_Visibility_Fix.md.
Verify the union-member prune ("requires_editor_setup" removed) does NOT break any consumer: \`cd ${WT} && grep -rn "requires_editor_setup" core/ tests/\` must show ZERO remaining references (in code or tests) except possibly a comment; check CustomScreenTable.tsx and CustomScreenEntriesPage.tsx compile (they use === "visible" equality — confirm no exhaustive switch breaks). Confirm existing tests stay green: run \`${ENV} && bun run test:vitest tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui-integration/custom-screen-list-restyle.test.tsx tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx\` and report the exact pass/fail counts. Confirm Hard Invariant #6 (entries-page header badge flip) is a genuine free flow-through (CustomScreenEntriesPage.tsx:213 derives isSidebarPublished from the same corrected state — no source edit needed) and NOT accidentally broken. Also run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` and report. Set isReal per finding.`,
  },
];

const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(l.prompt, { label: `audit:${l.key}`, phase: "Audit", schema: AUDIT_SCHEMA }).then(
        (a) => ({ ...a, key: l.key })
      )
  )
);

const realFindings = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key })));
const realHighMed = realFindings.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
log(
  `Audit: ${audits
    .filter(Boolean)
    .map((a) => `${a.key}=${a.verdict}`)
    .join(
      " "
    )} | real HIGH/MED=${realHighMed.length} real LOW=${realFindings.length - realHighMed.length}`
);

phase("Fix");
if (realHighMed.length > 0) {
  const fixList = realHighMed
    .map((f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file} — ${f.title}: ${f.detail}`)
    .join("\n");
  const fix = await agent(
    `Fix these REAL audit findings on the TASK-515-01 implementation in worktree ${WT}. Stay within the four owned files (sidebarConfig.ts, customScreenListModel.ts, advanced-modules.test.ts, the list-model test). Do NOT weaken tests to pass. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected vitest files. Findings:\n${fixList}\n\nReport what you changed and the re-run gate results.`,
    { label: "fix:515", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(
    `Fix: done=${fix?.done} gates lint:types=${fix?.gates?.coreLintTypes} root-tsc=${fix?.gates?.rootTsc} vitest=${fix?.gates?.vitestAffected}`
  );
} else {
  log("Fix: no real HIGH/MEDIUM findings — skipping fix agent.");
}

phase("Closure");
const closure = await agent(
  `You are closing TASK-515 (TASK-515-02) in worktree ${WT}. The code fix (515-01) is already applied + audited in this worktree. Do the docs/changelog/board closure + final gates + commit. Do NOT edit sidebarConfig.ts or customScreenListModel.ts (production code is 515-01's; already done).

READ: _docs/_TASKS/TASK-515-02-Screens-Sidebar-Tests-Docs-Closure.md.

1) DOCS — _docs/ADMIN_NAVIGATION.md: lines ~10-14 already document the correct contract (status==="active" && showInSidebar===true, target /entries, label sidebarLabel??name, NO editor-capability requirement). Confirm they are correct, then ADD two nuances: (a) draft+pinned is a valid "will publish on activation" state (hidden while Draft, appears on activation with no manual reload via the customScreensList cache-event invalidation); (b) note that the previously-implied "requires_editor_setup" editor-capability gate was REMOVED as an intentional simplification — the code had over-filtered against this already-documented contract. Do NOT create _docs/CUSTOM_SCREENS.md.

2) CHANGELOG — the contract pins 1223 but 1223 is TAKEN (480). Determine the NEXT-FREE number: \`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\` and use highest+1 (expected 1224). Create _docs/_CHANGELOG/<N>-2026-07-06-task-515-screens-admin-menu-visibility-fix.md listing TASK-515 + both leaves (515-01/02), the root cause (editor-capability gate over-filtering the showInSidebar intent in sidebarConfig.ts + customScreenListModel.ts, contradicting the documented ADMIN_NAVIGATION.md:10-14 contract), file:line evidence, the minimal fix, and NOTE: no schema/route/RBAC/migration change. Also update _docs/_CHANGELOG/README.md's "next changelog" pointer to <N>+1 if it references a number.

3) BOARD — _docs/_TASKS/README.md: ensure parent TASK-515 + 515-01 + 515-02 rows exist (do NOT duplicate; they may already be present) and flip all three to Done with completion date 2026-07-06; bump the Statistics counts (To Do down 3, Done up 3) consistently.

4) TASK FILES — set Status to ✅ Done in TASK-515_Screens_Admin_Menu_Visibility_Fix.md, TASK-515-01-*.md, TASK-515-02-*.md. Fix the stale 1223 changelog references in those files to the actual <N> used.

5) FINAL GATES (run in ${WT}, capture PASS/FAIL + first error each):
- ${ENV} && bun --cwd core lint
- ${ENV} && bun --cwd core lint:types
- ${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit
- ${ENV} && bun run test:bun    (if a single named integration test times out under load, re-run THAT file in isolation once; a confirmed isolated pass = flake, not a real fail — report which)
- ${ENV} && bun run test:vitest
- ${ENV} && bun run gates:coderso

NOTE on live playwright smoke: the running dev host serves the MAIN tree (feature/tasks), not this worktree, so the ≥5-scenario LIVE smoke will be run by the orchestrator AFTER merge (do NOT restart the dev host from here). Your job is the unit/type/lint/gates + docs/changelog/board + commit.

6) COMMIT — \`cd ${WT} && git add -A && git commit\` with a clear message: "fix(custom-screens): show pinned Active screens in sidebar regardless of editor capability (TASK-515)" + body summarizing root cause + the two owned-file edits + tests + docs + changelog <N>. End the commit body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nThe precommit hook runs lint+typecheck — if it blocks, fix and re-commit. Return the structured result incl. the actual changelog file name, commit sha, and gate results.`,
  { label: "closure:515-02", phase: "Closure", schema: CLOSURE_SCHEMA }
);

log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(
  `Closure gates: lint=${closure?.gates?.coreLint} lint:types=${closure?.gates?.coreLintTypes} root-tsc=${closure?.gates?.rootTsc} test:bun=${closure?.gates?.testBun} vitest=${closure?.gates?.vitestFull} gates:coderso=${closure?.gates?.gatesCoderso}`
);

return {
  task: "TASK-515",
  worktree: WT,
  implement: impl,
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
