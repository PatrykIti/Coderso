export const meta = {
  name: "task-519-520-fix",
  description:
    "Close residual drift on the authored TASK-519 + TASK-520 contracts: per task, a fresh reconcile+readiness audit surfaces real findings, a fixer applies every HIGH/MEDIUM directly in the .md files, then a re-verify confirms clean. Docs-only.",
  phases: [{ title: "Reconcile" }, { title: "Fix" }, { title: "Verify" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ["TASK-519", "TASK-520"];

const GROUNDING = `GROUNDED FACTS (verify vs live code; large .tsx read as binary to rg — use grep -an/Read): ColorSwatchControl.tsx (3/6-hex only, HEX_COLOR_PATTERN:33, toSafeHexColor:38-46 rejects alpha, transparent swatch:99-117). SharedColorControl.tsx + ClearableFields.tsx (hex + rgb/rgba; isPickerRepresentableColorValue:36-45 false when rgba has alpha:44; 'transparent':219-227). Schema layer normalizeMenuColorValue (normalizeMenuAppearance.ts:152-165) already accepts #rrggbbaa/rgba/hsla/var/transparent. menuDocumentV2.ts MENU_BAR_LAYOUT_KEYS:114-123 (no scrolled variants, shadow enum none/sm/md, no bar radius; NavLevelStyle.radius:186 submenu only). BrandProps:298-312 mode text|image (no icon, no combo). Render siteShell.tsx MenuBrandRender:498-536. Changelog pins 519=1232 / 520=1233 (verify next-free at closure). No DB migration (jsonb).`;

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
        required: ["severity", "file", "problem", "fix", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
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

phase("Reconcile");
const audits = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `Fresh read-only DRIFT + READINESS audit of the authored contract ${t} in ${ROOT}/_docs/_TASKS/ (read the parent + ALL its NN + NN-LNN files). Check ALL lenses at once and report every REAL finding: (1) GROUNDING — cited file:line exists + says what is claimed (grep -an/Read for large tsx); no invented API/symbol; (2) GRANULARITY/EXECUTION-READINESS — every executable leaf has implementation pseudocode (function/helper shape, data flow, error handling) + a regression-test shape + lane; no oversized subtask that should be leaves; (3) COMPLETENESS — delivers the full owner ask (519: alpha color params #rrggbbaa/rgba across ALL editors incl. round-trip; 520: menu scrolled-state colors, menu-bar card radius, custom box-shadow, brand icon + graphic-with-text incl. FRONT render); back-compat + no-forced-migration; (4) SINGLE-WRITER + LAND ORDER + NAMING — one owner per production file (or documented additive seam), dependency-ordered land order, file naming/H1/FileName/parent-field/Status/changelog-pin consistent across all files; (5) SECURITY — color-value validation whitelists formats (no CSS injection), brand icon name is an allowlist, render sanitized, Security Contract present where a route/validated-key is touched. ${GROUNDING}\nReturn every finding with a concrete fix; isReal true only if defensible.`,
        { label: `reconcile:${t}`, phase: "Reconcile", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, task: a?.task || t }))
  )
);
const byTask = {};
for (const t of TASKS) byTask[t] = [];
for (const a of audits.filter(Boolean))
  (byTask[a.task] || (byTask[a.task] = [])).push(...(a.findings || []).filter((f) => f.isReal));
for (const t of TASKS) {
  const r = byTask[t] || [];
  log(
    `Reconcile ${t}: real HIGH=${r.filter((f) => f.severity === "HIGH").length} MED=${r.filter((f) => f.severity === "MEDIUM").length} LOW=${r.filter((f) => f.severity === "LOW").length}`
  );
}

phase("Fix");
await parallel(
  TASKS.map((t) => () => {
    const real = (byTask[t] || []).filter(
      (f) => f.severity === "HIGH" || f.severity === "MEDIUM" || f.severity === "LOW"
    );
    if (real.length === 0)
      return Promise.resolve({ task: t, applied: [], residual: ["nothing to fix"] });
    const list = real
      .map((f, i) => `${i + 1}. [${f.severity}] ${f.file}: ${f.problem} → FIX: ${f.fix}`)
      .join("\n");
    return agent(
      `You are fixing the authored contract ${t} (edit .md files under ${ROOT}/_docs/_TASKS/ — DOCUMENTATION ONLY, no code). Apply every finding below: correct grounding citations, add missing leaf pseudocode/test-shapes, close completeness/single-writer/security gaps, keep changelog pin + file naming/H1/FileName/parent/Status consistent. If a finding is genuinely wrong, justify it in residual instead of applying. Keep the granular parent+NN+NN-LNN structure. ${GROUNDING}\nFINDINGS:\n${list}\n\nReturn applied vs residual.`,
      { label: `fix:${t}`, phase: "Fix", schema: FIX_SCHEMA }
    );
  })
);

phase("Verify");
const verify = await parallel(
  TASKS.map(
    (t) => () =>
      agent(
        `FINAL fresh read-only reconcile of ${t} (parent + all NN + NN-LNN files under ${ROOT}/_docs/_TASKS/) after fixes. Confirm 0 HIGH/MEDIUM drift remains across grounding/granularity/completeness/single-writer/security; every executable leaf has pseudocode + test shape; land order + changelog pin consistent. ${GROUNDING}\nReturn remaining findings (isReal) — empty + verdict 'clean' = implementation-ready.`,
        { label: `verify:${t}`, phase: "Verify", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, task: a?.task || t }))
  )
);

return {
  reconcile: TASKS.map((t) => ({ task: t, real: (byTask[t] || []).length })),
  verify: verify.filter(Boolean).map((v) => ({
    task: v.task,
    verdict: v.verdict,
    remainingHM: (v.findings || []).filter(
      (f) => f.isReal && (f.severity === "HIGH" || f.severity === "MEDIUM")
    ).length,
    remainingLow: (v.findings || []).filter((f) => f.isReal && f.severity === "LOW").length,
    findings: (v.findings || [])
      .filter((f) => f.isReal)
      .map((f) => `[${f.severity}] ${f.file}: ${f.problem}`),
  })),
};
