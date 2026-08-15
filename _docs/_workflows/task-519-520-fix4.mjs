export const meta = {
  name: "task-519-520-fix4",
  description:
    "Close the final TASK-519 residual (assign ownership to re-baseline the 4 existing alpha-behavior tests the 519-03 upgrade intentionally changes) + a TASK-520 LOW cross-ref reword, then re-verify both clean. Docs-only.",
  phases: [{ title: "Fix" }, { title: "Verify" }],
};
const ROOT = "/home/coder/project/Coderso";
const TASKS = ["TASK-519", "TASK-520"];
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "findings", "verdict"],
  properties: {
    task: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "problem", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          problem: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["task", "applied", "residual"],
  properties: {
    task: { type: "string" },
    applied: { type: "array", items: { type: "string" } },
    residual: { type: "array", items: { type: "string" } },
  },
};

const FIXES = {
  "TASK-519": `Apply to the TASK-519 contract files under ${ROOT}/_docs/_TASKS/ (DOCS ONLY; verify vs live code with grep -an/Read):
[MEDIUM] Breaking-test ownership gap (TASK-519-06-Tests-Docs-Closure.md + TASK-519-03-L03). When 519-03 makes rgba-with-alpha picker-representable + canonicalized, FOUR existing assertions in TWO unowned test files fail against the NEW intended behavior:
  - tests/vitest/ui/clearable-fields.test.tsx:102 — resolveColorPickerValue('rgba(17,34,51,0.4)','#ffffff') currently expects the '#ffffff' fallback; new behavior extracts the base color '#112233'.
  - tests/vitest/ui/clearable-fields.test.tsx:109 — isPickerRepresentableColorValue('rgba(17,34,51,0.4)') currently expects false; new behavior is true.
  - tests/vitest/ui/shared-color-control.test.tsx:239-241 — describeSharedColorControlState(rgba) currently expects 'saved_custom'; new behavior 'selected_swatch'.
  - tests/vitest/ui/shared-color-control.test.tsx:309-326 (esp. :314) — 'rgba text keeps fallback swatch preview' currently expects swatch '#102030' fallback; new behavior is the extracted base '#0a141e'.
The contract currently says do NOT edit these + only 'name it here for its owner to reconcile', but assigns NO owner — so the full-vitest gate would stay RED with no authorized writer, contradicting the parent Acceptance ('full vitest green') + 519-06 Definition of Done ('all gates green'). FIX: EXPLICITLY ASSIGN ownership of RE-BASELINING these two existing test files (exactly these 4 assertions, to the NEW intended alpha behavior) to a single leaf — extend TASK-519-03-L03's owned-files list to include tests/vitest/ui/clearable-fields.test.tsx + tests/vitest/ui/shared-color-control.test.tsx (alpha-behavior assertions ONLY), with the new expected values spelled out, and note this is an INTENDED contract change (AGENTS.md permits re-baselining a test for an intended contract change — NOT weakening). Update 519-06 to reference that leaf as the owner (remove the 'do not edit / unowned' phrasing). Keep single-writer coherent (no other leaf touches those two files).`,
  "TASK-520": `Apply to the TASK-520 contract files under ${ROOT}/_docs/_TASKS/ (DOCS ONLY):
[LOW] Inaccurate cross-reference to TASK-519 (TASK-520-01-L02-Custom-Box-Shadow-Value-Validator.md lines ~98-99 and ~132-135). It claims TASK-519 'never rewrites .24->0.24', but 519 DOES canonicalize leading-dot alpha (519-01 normalizeAdminColorValue rewrites '.84'->'0.84'). The 520 box-shadow logic is CORRECT (the custom box-shadow is emitted verbatim into a <style> block by 520-02 as raw CSS, which browsers accept with leading-dot, and never passes through the stricter JS resolveClearableCssColorValue regex) — only the PROSE/citation about 519 is wrong. FIX: reword to explain the two paths DIFFER: 519 canonicalizes because its render boundary regex (resolveClearableCssColorValue) rejects '.24'; 520's box-shadow needs NO canonicalization because it is emitted as raw CSS in a <style> block, not through that regex.`,
};

phase("Fix");
await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `You are fixing the authored contract ${t} (edit .md files under ${ROOT}/_docs/_TASKS/ — DOCS ONLY, no code). Keep the granular parent+NN+NN-LNN structure + single-writer coherence. Verify vs live code (grep -an/Read). If a finding is genuinely wrong, justify in residual.\n\n${FIXES[t]}\n\nReturn applied vs residual.`,
        { label: `fix4:${t}`, phase: "Fix", schema: FIX_SCHEMA }
      )
  )
);

phase("Verify");
const verify = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `FINAL fresh read-only reconcile of ${t} (parent + ALL NN + NN-LNN files under ${ROOT}/_docs/_TASKS/) after fixes, verified vs live code. Confirm 0 HIGH/MEDIUM drift across grounding/granularity/completeness/single-writer/security. Specifically: (519) the 4 breaking existing-test assertions (clearable-fields.test.tsx:102/109, shared-color-control.test.tsx:239-241/309-326) now have a NAMED owning leaf that re-baselines them to the new alpha behavior, so 'all gates green' is satisfiable; (520) the box-shadow 519 cross-reference is accurate. Return remaining REAL findings — empty + verdict 'clean' = implementation-ready.`,
        { label: `verify4:${t}`, phase: "Verify", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, task: a?.task || t }))
  )
);

return {
  verify: verify.filter(Boolean).map((v) => ({
    task: v.task,
    verdict: v.verdict,
    remainingHM: (v.findings || []).filter(
      (f) => f.isReal && (f.severity === "HIGH" || f.severity === "MEDIUM")
    ).length,
    findings: (v.findings || [])
      .filter((f) => f.isReal)
      .map((f) => `[${f.severity}] ${f.file}: ${f.problem}`),
  })),
};
