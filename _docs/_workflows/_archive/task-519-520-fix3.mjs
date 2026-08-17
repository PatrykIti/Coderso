export const meta = {
  name: "task-519-520-fix3",
  description:
    "Final residual close on TASK-519 (widget-path leading-dot alpha canonicalization in SharedColorControl + stale 519-02 verbatim test-shape line) and TASK-520 (test-lane mislabel + stale citations), then re-verify both clean. Docs-only.",
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
1. [HIGH] TASK-519-03-L02-SharedColorControl.md omits the free-text CANONICALIZATION step for the widget path. The value <Input> onChange currently passes raw text (SharedColorControl.tsx:206 onChange(event.target.value)); widget colors render via resolveClearableCssColorValue whose cssRgbColorPattern REJECTS bare leading-dot '.84' and there is NO server-side leading-dot canonicalization on the widget path (unlike menu). FIX: spec that 519-03-L02 imports normalizeAdminColorValue (from 519-01's shared helper) and canonicalizes the free-text value ON COMMIT (blur/Enter) — rewrite leading-dot alpha '.84'->'0.84' before onChange emits — exactly mirroring the ColorSwatchControl.commitDraft menu path. Ensure 519-01 EXPORTS normalizeAdminColorValue for the widget path to import, and that 519-03-L03 test 'type rgba (canonicalized)' + parent smoke scenario 2 (Footer) assert the emitted value is canonical 'rgba(8,17,31,0.84)'. Do NOT loosen resolveClearableCssColorValue.
2. [MEDIUM] TASK-519-02-ColorSwatchControl-Alpha-Upgrade.md 'Test shape' (~line 103-104) says typing rgba(8,17,31,.84)+blur -> onChange("rgba(8,17,31,.84)") "(accepted verbatim by the normalizer)". This is STALE/incorrect and contradicts its own leaf 519-02-L02 (which correctly expects onChange("rgba(8,17,31,0.84)")). FIX: change the parent test-shape expectation to the canonical onChange("rgba(8,17,31,0.84)") and remove the "accepted verbatim" phrasing.`,
  "TASK-520": `Apply to the TASK-520 contract files under ${ROOT}/_docs/_TASKS/ (DOCS ONLY; verify vs live code):
1. [LOW] TASK-520-02-Menu-Bar-CSS-Scrolled-Radius-Custom-Shadow.md (+ 520-04-L02, 520-05): render/CSS regression tests routed to tests/unit/site/menu-document-render.test.tsx are labeled the Vitest (Bun-free) lane, but that file uses bun:test + renderToString → it is the BUN lane (tests/unit/* is Bun; tests/vitest/* is Vitest). FIX: relabel those tests as the Bun lane (or move new render assertions to a tests/vitest/* file if they are Bun-free) consistently with _docs/TESTING_STRATEGY.md.
2. [LOW] TASK-520-01-Menu-Bar-And-Brand-Model.md (+ parent): stale citations — menuDocumentV2.ts is 2528 lines (not 2479); normalizeMenuColorValue is exported at normalizeMenuAppearance.ts:182 (the color pattern is :152-165). FIX: correct the line counts/anchors.`,
};

phase("Fix");
await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `You are fixing the authored contract ${t} (edit .md files under ${ROOT}/_docs/_TASKS/ — DOCS ONLY, no code). Keep the granular parent+NN+NN-LNN structure. Verify each finding vs live code (grep -an/Read for large tsx). If a finding is genuinely wrong, justify in residual.\n\n${FIXES[t]}\n\nReturn applied vs residual.`,
        { label: `fix3:${t}`, phase: "Fix", schema: FIX_SCHEMA }
      )
  )
);

phase("Verify");
const verify = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `FINAL fresh read-only reconcile of ${t} (parent + ALL NN + NN-LNN files under ${ROOT}/_docs/_TASKS/) after fixes. Verify vs live code. Confirm 0 HIGH/MEDIUM drift across grounding/granularity/completeness/single-writer/security. Specifically re-check: (519) the WIDGET path (SharedColorControl free-text) canonicalizes leading-dot alpha to 'rgba(...,0.84)' via normalizeAdminColorValue so resolveClearableCssColorValue accepts the owner token, and the 519-02 test-shape expects the canonical form; (520) render/CSS tests are labeled the correct lane and citations are accurate. Return remaining REAL findings — empty + verdict 'clean' = implementation-ready.`,
        { label: `verify3:${t}`, phase: "Verify", schema: AUDIT_SCHEMA }
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
