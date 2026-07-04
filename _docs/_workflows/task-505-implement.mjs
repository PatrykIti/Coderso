export const meta = {
  name: "task-505-implement",
  description:
    "Implement TASK-505 (Screens section column layout + binding-integrity GC on save) STRICTLY SEQUENTIALLY 505-01->02->03->04, targeted gates per subtask, post-audit, scope-driven >=5-scenario playwright smoke. NO full-gates phase (combined run later). Collision-guarded against the parallel TASK-504 (menus/site/MenuDesignEditor forbidden; changelog pinned 1214; README = 505 rows only).",
  phases: [
    { title: "505-01" },
    { title: "505-02" },
    { title: "505-03" },
    { title: "505-04" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-505_Screens_Section_Columns_And_Binding_Integrity.md");

const COMMON = [
  "You implement a TASK-505 (Screens Section Columns & Binding Integrity) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode, verified anchors) + the parent " +
    PARENT +
    ".",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Do NOT regress TASK-498/500/503: presentation-override surface, Bun-free boundary (custom-screens/** must NOT import @/ui/pages), ScreenDocumentV1 schemaVersion 1 + definition v4, stored-V4 byte-stability, PaletteChip dead-code guard, section-CRUD + insertion-targeting from 500, the 503 block style channel.",
  '- Schema-first: section.style = a NEW ScreenSectionStyleV1 channel (do NOT reuse the dead section.layout WidgetLayout field — retyping it throws on legacy docs); reject-unknown KEYS, coerce-not-throw values, sparse + prune -> ABSENT style is BYTE-IDENTICAL to today (space-y-4 vertical stack); NO schemaVersion bump. Add "style" to the section allow-list + Ajv screenSectionV1Schema + ScreenSectionPatch.',
  "- Section grid: default (unset columns) keeps the exact current DOM (space-y-4); a gridded section gives the interleaved renderInsertGap gaps grid-column:1/-1 so they never steal a cell; TASK-503 per-block width stays a WITHIN-CELL fraction (no double meaning); builder drop-zones + insertion-targeting still work in a gridded section.",
  "- Binding-GC (item B) must be NON-destructive to VALID bindings + deterministic: prune ONLY bindings whose blockId matches no live block (orphaned); the un-saveable dead-end must become RECOVERABLE (prefer prune-orphaned + a clear per-field message over an opaque 400); surface the offending field name(s) in the error. Runs in the EXISTING definition normalize/save path — no new route/RBAC/migration.",
  "- No setState-in-effect; large files read as binary to rg (customScreenSchemas.ts, ScreenRuntimeRenderer.tsx, CustomScreenEntryEditor.tsx) — Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-504 Menu stream runs in this tree): do NOT touch core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/**, or any TASK-504 file. Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 505-04 owns docs). 505-04 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-505 rows + 505 Statistics deltas.",
  "- Touch ONLY the files your subtask owns (single-writer per the parent). Keep the targeted gate GREEN: re-point/add exactly the tests your change requires (per the 505-04 matrix); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures (ScreenSectionStyleV1, preset->template map, pruneOrphanedScreenBindings, error shape), tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "505-01",
    phase: "505-01",
    file: "TASK-505-01-Section-Style-Model-And-Binding-GC.md",
    owns: "core/services/customScreens/customScreenSchemas.ts + core/services/customScreens/screenDocumentOps.ts (+ the definition normalize/validate module if separate — verify)",
    brief:
      'MODEL keystone (both items): ScreenSectionStyleV1 { columns?: preset-enum, columnGap?: clamp } + normalizeScreenSectionStyle (mirror normalizeScreenBlockStyle: coerce-not-throw, reject-unknown keys, prune-empty -> byte-stable); wire into normalizeScreenSection allowlist + Ajv screenSectionV1Schema (additionalProperties:false) + ScreenSectionPatch "style"; EXPORT the preset->grid-template map for the renderer. BINDING-GC: pruneOrphanedScreenBindings(document, bindings) that drops bindings whose blockId matches NO live block (walk all sections/blocks/slots) — run on block/section delete AND as a normalize-time safety net; make the un-saveable screen RECOVERABLE (prune orphans; for a missing-content-type-field binding, prefer prune+flag over opaque 400); surface offending field name(s) in the custom_screen_definition_invalid error. Tests: section-style round-trip + reject-unknown + byte-stable absence; pruneOrphanedScreenBindings non-destructive to valid bindings + prunes orphans; the descriptive error.',
    gate: "custom-screen customScreens screen-document editor-surface-dead-code",
  },
  {
    key: "505-02",
    phase: "505-02",
    file: "TASK-505-02-Section-Grid-Renderer.md",
    owns: "core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx (SOLE WRITER; SEQUENTIAL after 505-01)",
    brief:
      "RENDERER: the section block-list container div (the space-y-4 one) becomes display:grid with gridTemplateColumns from the 505-01 preset map + gap from columnGap WHEN section.style.columns is set; absent = space-y-4 byte-identical (single builder/preview/entry path). Auto-flow (each block = one cell, DOM order). The interleaved renderInsertGap thin gaps get grid-column:1/-1 (full-row) when the section is gridded so they never consume a column cell. TASK-503 block width stays a within-cell fraction (no double meaning). Builder drop-zones (card midpoint + section-end dropzone) + insertion-targeting keep working. Tests: grid class/style emission for several presets (computed grid-template), gap col-span, absent-style DOM identity.",
    gate: "custom-screen customScreens screen-editor editor-surface-dead-code",
  },
  {
    key: "505-03",
    phase: "505-03",
    file: "TASK-505-03-Section-Inspector-And-Binding-Recovery-UI.md",
    owns: "core/admin/ui/custom-screens/{ScreenBlockInspector,ScreenAuthoringCanvas,CustomScreenEditorPage}.tsx (SOLE WRITER; SEQUENTIAL after 505-02)",
    brief:
      'EDITOR (both items): a SECTION inspector shown when a section is selected (selectedSectionId && !selectedBlockId) — a "Section layout" group with a Columns EnumRow (screenSectionColumnPresets) + a columnGap number input; enable the Inspect category for sections (today block-gated); handlePatchSection host wiring via updateScreenSection (ScreenSectionPatch now carries style). BINDING RECOVERY affordance: surface orphaned/missing-field bindings with a clear message + a way to remove them so the previously un-saveable screen is recoverable (uses the 505-01 pruneOrphanedScreenBindings). Tests: section inspector writes style + reachable on section select; binding-recovery flow removes orphans and the screen saves.',
    gate: "custom-screen customScreens editor-surface-dead-code",
  },
];

const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};
const vitestCmd = (globs) =>
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts " +
  globs +
  " 2>&1 | tail -60";
const targetedGate = (globs) =>
  "cd " + ROOT + " && bun --cwd core lint:types && bun --cwd core lint && " + vitestCmd(globs);
const ROOT_TSC =
  "cd " + ROOT + " && ./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 | tail -30";

async function runGate(cmd, label, ph) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      cmd +
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and the test run reports 0 failed. Known flake: under load vitest can throw spurious "Test timed out in 10000ms" — re-run the NAMED failing file once in isolation before reporting a real failure. List each distinct real error/failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-505 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 505-04 matrix (never weaken a behavior assertion, never regress 498/500/503, keep stored-V4 byte-stability + reject-unknown + non-destructive binding-GC). COLLISION GUARD: do NOT touch core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/**, _docs/**. " +
        fixContext +
        "\nFailures:\n" +
        g.errors.map((e) => "- " + e).join("\n"),
      { label: "fix:" + ph + ":" + r, phase: ph }
    );
    r += 1;
    g = await runGate(cmd, "gate:" + ph + ":" + r, ph);
  }
  return g && g.pass;
}

for (const st of SUBTASKS) {
  phase(st.phase);
  await agent(
    COMMON +
      "\n\nYOUR SUBTASK = " +
      st.key +
      ". Contract file: " +
      T(st.file) +
      ". Files you own: " +
      st.owns +
      ".\n" +
      st.brief +
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed — read the current state of the spine files (customScreenSchemas.ts, screenDocumentOps.ts, ScreenRuntimeRenderer.tsx, ScreenBlockInspector.tsx) before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    targetedGate(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

phase("505-04");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 505-04 (Tests, Docs, Closure). Contract: " +
    T("TASK-505-04-Screens-Columns-Tests-Docs-Closure.md") +
    " (read its matrix + smoke-scenario definitions IN FULL).\n505-01..03 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL matrix is green (section-style round-trip + reject-unknown + byte-stable absence; grid emission + gap col-span + absent-style DOM identity; binding-GC prunes orphans non-destructively + descriptive error + the un-saveable-recovery flow; section inspector reachable; no 498/500/503 regression; the bun custom-screen route/integration suite for the save/error path).\n- Docs: extend _docs/CONTENT_TYPES_SPEC.md (section style contract + binding-GC); changelog PINNED as _docs/_CHANGELOG/1214-...task-505-...md (do NOT take another number; 1213 belongs to the parallel TASK-504) + update _docs/_CHANGELOG/README.md. Board: _docs/_TASKS/README.md — Read FRESH immediately before editing (TASK-504 edits other rows concurrently): move ONLY TASK-505 + 505-01..04 rows to Done, adjust Statistics by exactly the 505 deltas. Update **Status:**/**Completed:** in all five TASK-505* files.\nOnly touch tests + docs + the five TASK-505 files; do NOT re-open source contracts; COLLISION GUARD as above.",
  { label: "impl:505-04", phase: "505-04" }
);
const gate04 = await gateLoop(
  "505-04",
  targetedGate("custom-screen customScreens screen- editor-surface-dead-code"),
  "Closure: tests + docs only."
);
const tcRoot = await runGate(ROOT_TSC, "gate:505-04:root-tsc", "505-04");
const bunG = await runGate(
  ENV +
    "bun test tests/integration/routes/customScreensRoutes.test.ts tests/vitest/customScreens 2>&1 | tail -25",
  "gate:505-04:bun",
  "505-04"
);
log(
  "505-04: targeted gate " +
    (gate04 ? "GREEN" : "RED") +
    "; root tsc " +
    (tcRoot && tcRoot.pass ? "GREEN" : "RED") +
    "; bun " +
    (bunG && bunG.pass ? "GREEN" : "RED")
);

phase("Post-audit");
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const lenses = [
  "SCOPE-FIDELITY (primary): section columns actually work — presets map to the right grid-template (3-1 => 3fr 1fr), auto-flow places blocks, the Bathrooms:2 composition is buildable, gap works; absent style = today's vertical stack; insertion/drop-zones still work in a gridded section. Binding-GC: a screen bound to a since-deleted content field is now SAVEABLE (orphan pruned) with a clear per-field message, NOT an opaque 400; valid bindings untouched. Flag anything stubbed/partial/wrong.",
  "MODEL / SCHEMA: new section.style channel (NOT reusing dead layout); reject-unknown keys + coerce-not-throw; byte-stable absent style; ScreenSectionPatch/Ajv extended; pruneOrphanedScreenBindings deterministic + non-destructive; NO schemaVersion bump; no new route.",
  "BYTE-STABILITY + 503-INTERACTION: absent-style section DOM byte-identical; renderInsertGap col-span only when gridded; TASK-503 block width preserved as within-cell (no double meaning); stored-V4 screens read identically; presentation-override + Bun-free boundary intact.",
  "COLLISION: git diff shows NOTHING under core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/**; changelog is 1214; README edits touched only TASK-505 rows + correct Statistics deltas.",
  "TEST INTEGRITY: new suites assert VISIBLE-EFFECT (computed grid-template, orphan-prune-then-save, section-inspector reachability) not presence; the binding-GC test proves the previously-un-saveable screen now saves; no weakened/deleted assertion; no false-green; the 505-04 smoke section defines >=5 distinct real-flow scenarios.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-505 (implemented on disk). Read the five TASK-505 contracts + the real implemented source under core/services/customScreens/** + core/admin/ui/custom-screens/** + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["scope", "model", "byteid", "collision", "tests"][i],
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        }
      )
  )
);
const findings = auditResults.filter(Boolean).flatMap((r) => r.findings || []);
const hm = findings.filter((f) => f.severity === "high" || f.severity === "medium");
if (hm.length > 0) {
  log("Post-audit: " + hm.length + " HIGH/MED -> fixing");
  await agent(
    "Post-impl audit of TASK-505 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never regress 498/500/503, keep byte-stability + reject-unknown + non-destructive binding-GC; COLLISION GUARD: no menus/site/pages/shared/theme files, no _docs/_TASKS contract reopening).\n" +
      hm
        .map(
          (f) =>
            "- [" +
            f.severity +
            "] " +
            f.area +
            ": " +
            f.finding +
            "\n  evidence: " +
            f.evidence +
            "\n  fix: " +
            f.recommendation
        )
        .join("\n"),
    { label: "audit-fix", phase: "Post-audit" }
  );
  const g2 = await runGate(
    targetedGate("custom-screen customScreens screen- editor-surface-dead-code"),
    "gate:post-audit",
    "Post-audit"
  );
  const t2 = await runGate(ROOT_TSC, "gate:post-audit:root-tsc", "Post-audit");
  log(
    "Post-audit re-gate: vitest " +
      (g2 && g2.pass ? "GREEN" : "RED") +
      "; root tsc " +
      (t2 && t2.pass ? "GREEN" : "RED")
  );
}

phase("Smoke");
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "scenarios", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    scenarios: { type: "array", items: { type: "string" } },
    consoleErrors: { type: "number" },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};
const smoke = await agent(
  [
    "FULL runtime SMOKE of the implemented TASK-505 — at least 5 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + the 505-04 smoke section (read both). Use playwright-cli, session -s=wf505smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles / DOM), not control presence. Test DB — Save/Publish allowed.",
    'SERVER RESTART FIRST (Bun server code does NOT hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify http://coderso-a.localhost:5173/admin/ = 200 (else pass:false serverUp:false). Log in ($ADMIN_EMAIL/$ADMIN_PASSWORD); CLICK THROUGH the config wizard if it appears. Open the screen builder (id from /admin/advanced/custom-screens).',
    "SCENARIO 1 (2-column section): select a section, open the Section-layout inspector, set Columns=2 -> assert the section block-list computed gridTemplateColumns is two equal tracks and blocks flow left-to-right (auto-flow); set a columnGap -> assert computed gap.",
    'SCENARIO 2 (3/4 : 1/4 + the Bathrooms:2 composition): set Columns="3-1" -> assert computed gridTemplateColumns ~ 3fr 1fr; put a Text block "Bathrooms" in cell 1 and a bound field value block in cell 2 -> assert label-left / value-right on the canvas AND the published entry view.',
    "SCENARIO 3 (absent-style unchanged + insertion in grid): a section with NO columns still renders the vertical stack (space-y-4, no grid); in a gridded section, the before/after insertion affordances + section-end dropzone still target correctly (insert a block and verify placement).",
    "SCENARIO 4 (binding-GC recovery — the HIGH bug): create a screen bound to a content-type field; delete that field on the content type (Advanced -> Entries/content types); reopen the screen -> confirm it is STILL SAVEABLE (Save succeeds, orphan binding pruned) with a CLEAR per-field message, NOT an opaque 400 dead-end. Also verify a valid binding is untouched.",
    "SCENARIO 5 (no 498/500/503 regression): 9-chip PaletteChip grid intact; {{ }} tokens; presentation-override panel functional; the 503 block-style Layout group still works (set width=half inside a gridded cell -> half the cell); section CRUD (add/rename/reorder/delete) from 500 still works; dark mode no bg-white break; 0 console errors.",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] (one line per scenario with the actual result incl. measured grid-template + the save-recovery outcome), consoleErrors, screenshots[], failures[]}. Be truthful.",
  ].join("\n"),
  { label: "smoke:505", phase: "Smoke", schema: SMOKE_SCHEMA }
);
log(
  "Smoke: " +
    (smoke && smoke.pass ? "PASS" : "needs review") +
    " (consoleErrors=" +
    (smoke && smoke.consoleErrors) +
    ")"
);

return {
  targetedGate04: gate04,
  rootTsc: tcRoot && tcRoot.pass,
  bunGate: bunG && bunG.pass,
  auditHighMed: hm.length,
  auditFindings: findings,
  smoke: smoke,
  note: "Full mandatory gates run once combined after BOTH the 504 and 505 streams land.",
};
