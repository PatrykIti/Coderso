export const meta = {
  name: "task-480-fix",
  description:
    "Complete the STAGED TASK-480 dashboard implementation to its contracted architecture (owner-approved): renderer-registry refactor, schema-driven config form (covers all 6 configurable widgets), pointer drag-and-drop arrange/resize, the 3 missing test suites, and doc reconciliation. Sequential single-writer steps with per-step gates, then post-audit + prototype smoke.",
  phases: [
    { title: "Registry" },
    { title: "ConfigForm" },
    { title: "DnD" },
    { title: "Tests" },
    { title: "DocsClosure" },
    { title: "Post-audit" },
  ],
};

const WT = "/home/coder/project/Coderso";

const COMMON = `
You are a fresh-context IMPLEMENTER completing TASK-480 (Dashboard Widgets) inside ${WT} (branch feature/tasks). The backend + 9 data sources + 9 renderers are ALREADY DONE and runtime-verified; the dashboard routes work (auth-gated). Your job is to finish the CONTRACTED FRONTEND ARCHITECTURE that the limit-interrupted agent skipped. Build on the STAGED code — read current on-disk state before editing; do not clobber working pieces.
Owner-approved decisions (deliver ALL THREE): (1) refactor to the typed EXHAUSTIVE renderer registry; (2) refactor config to a schema-driven configFields/WidgetConfigForm; (3) add pointer drag-and-drop arrange/resize. Everything must be done PROPERLY, matching the prototype dashboard (http://localhost:5180/#/ — hash-router home/dashboard) — read prototype source under ${WT}/_docs/_PROTOTYPE/src/ and the TASK-480 contracts (_docs/_TASKS/TASK-480* + _docs/DASHBOARD_WIDGETS_SPEC.md).
Key files (verify real paths with grep -an/Read; rg misdetects large TSX): core/admin/ui/dashboard/DashboardBuilder.tsx (~815 lines, ConfigPanel + grid), DashboardWidgetHost.tsx, DashboardPage.tsx, core/services/dashboard/dashboardWidgetContract.ts (config schemas per kind), widget registry/catalog location (04-L01 contracts DASHBOARD_WIDGET_RENDERERS Record<DashboardWidgetType, Renderer> + DASHBOARD_WIDGET_CATALOG — currently a runtime switch), dashboardDataSources.ts.
AGENTS.md rules: schema-first reject-unknown + normalize*; no react-hooks/set-state-in-effect; admin cache contract preserved (dirty-state, no mount-force refetch loops); every code change ships tests in the right lane (Vitest for admin/UI, Bun for route/DB); prefer fixing SOURCE, never weaken assertions.
After your step, GATE it: run \`bun --cwd core lint:types\` + \`bun --cwd core lint\` + the targeted Vitest globs for your files; fix failures (≤3 rounds), prefer source. Report what you changed + gate result.
`;

const STEP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["step", "filesWritten", "gatesPassed", "gateSummary", "notes", "blockers"],
  properties: {
    step: { type: "string" },
    filesWritten: { type: "array", items: { type: "string" } },
    gatesPassed: { type: "boolean" },
    gateSummary: { type: "string" },
    notes: { type: "string" },
    blockers: { type: "array", items: { type: "string" } },
  },
};

const POSTAUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "summary", "findings"],
  properties: {
    lens: { type: "string" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

async function step(label, phaseName, prompt) {
  let r = null;
  for (let i = 0; i < 3 && !r; i++)
    r = await agent(prompt, { label, phase: phaseName, schema: STEP_SCHEMA });
  if (r && !r.gatesPassed && (r.blockers || []).length) {
    const fixed = await agent(
      `${COMMON}\nStep ${label} did not fully pass its gate. Blockers: ${JSON.stringify(r.blockers)}. Read current on-disk state + fix at the SOURCE, re-run the gate, report.`,
      { label: label + ":fix", phase: phaseName, schema: STEP_SCHEMA }
    );
    if (fixed) r = fixed;
  }
  return (
    r || {
      step: label,
      filesWritten: [],
      gatesPassed: false,
      gateSummary: "null",
      notes: "",
      blockers: ["agent returned null"],
    }
  );
}

const results = {};

phase("Registry");
results.registry = await step(
  "registry",
  "Registry",
  `${COMMON}
STEP 1 — RENDERER REGISTRY (TASK-480-04-L01). Create the typed EXHAUSTIVE registry: DASHBOARD_WIDGET_RENDERERS as Record<DashboardWidgetType, WidgetRenderer> (compile-time exhaustive — omitting any widget type is a type error) + DASHBOARD_WIDGET_CATALOG (catalog entries: type, label, icon, defaultConfig, defaultLayout). Refactor DashboardWidgetHost (and the builder) to resolve renderers/catalog from the registry instead of a runtime switch on widget.config.kind. Preserve current rendering behavior for all 9 widgets. Add/adjust the registry to be the single source the catalog + host + builder consume. Gate.`
);

phase("ConfigForm");
results.configForm = await step(
  "config-form",
  "ConfigForm",
  `${COMMON}
STEP 2 — SCHEMA-DRIVEN CONFIG FORM (TASK-480-05-L02). Give each catalog entry a configFields: WidgetConfigField[] descriptor (field key, control type select|multiselect|checkbox|number|text|slider, label, options, min/max, default) derived from the per-kind config schema in dashboardWidgetContract.ts. Build a generic <WidgetConfigForm> that renders controls from configFields and writes back into widget.config (schema-first, reject-unknown preserved). REPLACE the hand-written per-kind ConfigPanel branches in DashboardBuilder.tsx with WidgetConfigForm so ALL 6 configurable widgets are covered — including the two currently missing: content-type-counts (display bars|list|donut, limit, contentTypeIds) and quick-actions (actions[] add/remove/label/target/icon). Also surface the previously-missing controls: totals-counters format/accent/rangeDays, content-over-time bucket day|week. Add a LIVE preview using DashboardWidgetHost inside the configure sheet. Build on Step 1's registry. Gate.`
);

phase("DnD");
results.dnd = await step(
  "dnd",
  "DnD",
  `${COMMON}
STEP 3 — POINTER DRAG-AND-DROP (TASK-480-05-L01). Add pointer drag-and-drop arrange (reorder) + resize to the widget grid, matching the prototype's dashboard grid interaction, with a KEYBOARD-operable fallback (keep the existing nudge buttons as the a11y fallback or provide arrow-key handling). Use a maintained approach consistent with the codebase (check if @dnd-kit or similar is already a dependency; if not, a minimal pointer-event drag handler is acceptable — do NOT add a heavy new dep without checking package.json). Mutations update the draft layout + dirty-state (no save until the user saves). Preserve cache/dirty semantics. Gate.`
);

phase("Tests");
results.tests = await step(
  "tests",
  "Tests",
  `${COMMON}
STEP 4 — THE 3 MISSING TEST SUITES (TASK-480-04-L03 + 05-L03). Author: (a) tests/vitest/admin/dashboardWidgetRegistry.test.ts — registry exhaustiveness (every DashboardWidgetType has a renderer + catalog entry) + catalog contract; (b) tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx — DashboardWidgetHost loading/empty/error/kind-mismatch/ready states + each renderer's normal + empty + degenerate-edge render (null storage limit → no bar, empty series, unknown quick-action target, content-query cell as text); (c) tests/vitest/ui-integration/dashboard-builder.test.tsx — Edit toggle, add/remove/arrange/resize mutating the draft, configure via WidgetConfigForm (incl. the two newly-covered widgets), dirty-state, save, reset. Assert VISIBLE EFFECT (DOM/computed), not mere presence. Run them; they must pass. Gate.`
);

phase("DocsClosure");
results.docs = await step(
  "docs-closure",
  "DocsClosure",
  `${COMMON}
STEP 5 — DOCS RECONCILIATION + CLOSURE INTEGRITY. Reconcile the TASK-480 docs to the DELIVERED architecture: TASK-480-04-L01 (registry), 05-L01 (DnD), 05-L02 (schema-driven config form) + _docs/DASHBOARD_WIDGETS_SPEC.md must describe what now actually ships. Verify the changelog entry _docs/_CHANGELOG/1223-*.md + board rows + all 25 TASK-480 leaf statuses are ACCURATE (a leaf may only stay ✅ Done if its contracted code now genuinely exists). Do NOT re-open source contracts. This is the closure step (docs/board/changelog only). Report any remaining Done-marked-but-absent deliverable. Gate: lint:types + lint.`
);

phase("Post-audit");
const LENSES = [
  "scope-fidelity (all 3 refactors + 2 config panels delivered, matches prototype)",
  "registry-exhaustiveness + config-form correctness (schema-first, reject-unknown)",
  "dnd + a11y fallback + dirty/cache semantics",
  "test integrity (real visible-effect assertions, not weakened; 3 suites pass)",
];
const audits = await parallel(
  LENSES.map(
    (l, i) => () =>
      agent(
        `${COMMON}\nREAD-ONLY POST-AUDIT lens = "${l}". Do NOT edit. Verify the completed TASK-480 dashboard against this lens; report evidence-backed findings (file:line).`,
        { label: "postaudit:" + i, phase: "Post-audit", schema: POSTAUDIT_SCHEMA }
      )
  )
);
const hm = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.severity !== "LOW"));
let postFix = null;
if (hm.length)
  postFix = await step(
    "postfix",
    "Post-audit",
    `${COMMON}\nPost-audit found HIGH/MEDIUM issues; fix at the SOURCE + re-gate. Findings: ${JSON.stringify(hm)}.`
  );

return {
  task: "480-fix",
  steps: Object.fromEntries(
    Object.entries(results).map(([k, v]) => [
      k,
      { gatesPassed: v.gatesPassed, files: v.filesWritten, blockers: v.blockers },
    ])
  ),
  postAudit: { highMed: hm.length, findings: hm, fixed: postFix ? postFix.gatesPassed : null },
  smokeDeferred:
    "runtime smoke vs prototype :5180 (dashboard builder: add/DnD-arrange/resize/configure-all-6/save/reset) + dark mode — run after this workflow, dev server restart required (Bun no hot-reload)",
};
