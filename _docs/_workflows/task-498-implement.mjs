export const meta = {
  name: "task-498-implement",
  description:
    "Implement TASK-498 (Screens data-oriented builder + look parity) STRICTLY SEQUENTIALLY 498-01→02→03→04 (shared file spine forbids parallel), each subtask gated green, then post-impl drift audit + full gate. In-place on feature/visual; no README stats until 498-04.",
  phases: [
    { title: "498-01" },
    { title: "498-02" },
    { title: "498-03" },
    { title: "498-04" },
    { title: "Post-audit" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => `${ROOT}/_docs/_TASKS/${n}`;
const PROTO = `${ROOT}/_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`;

const COMMON = `
You implement a TASK-498 (Custom Screen data-oriented builder + look parity) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode) + the parent ${T("TASK-498_Custom_Screen_Data_Oriented_Builder_And_Look_Parity.md")}.
Design source of truth = the PROTOTYPE SOURCE ${PROTO} (classes/tokens/structure), NOT screenshots.
HARD RULES (AGENTS.md + what the owner established):
- Reproduce the prototype faithfully; do NOT keep the OLD approach (no old per-field Fields list — 9-chip PaletteChip palette only; no List/Editor toggle; the TASK-496-02 presentation-override editing surface — textSize/textEmphasis/tone/mediaAssetId/image per screenEntryPresentationOverrideContract.ts — is PRESERVED, never replaced by the decorative toolbar).
- Schema-first: own schemas/enums/defaults/normalize* in the service contract module (core/services/customScreens/*), reject-unknown for the NEW block kinds, permissive legacy fall-through, NO ScreenDocumentV1 schemaVersion bump, non-destructive legacy adapters. Routes/admin import the owner, never duplicate contract logic.
- Bun-free boundary: files under core/admin/ui/custom-screens/** must NOT import @/ui/pages or the Pages WidgetRenderer; keep tests/vitest/ui/custom-screen-authoring-boundary.test.ts green.
- No setState-in-effect loops / no mount-force refetch loops. Related-list host precompute MUST memoize the effect value source + diff-guard setState.
- The ported chip component MUST be named PaletteChip (NOT BlockChip) — tests/vitest/ui/editor-surface-dead-code.test.ts guards the literal symbol.
- Large files (customScreenSchemas.ts 2130 lines, CustomScreenEntryEditor.tsx, ScreenRuntimeRenderer.tsx) read as binary to rg — use Read + grep -an, NEVER rg.
- Touch ONLY the files your subtask owns (listed below). Do NOT edit _docs/_TASKS/* (except 498-04 which owns README/changelog). Preserve every data-* / aria-* hook and the presentation-override surface.
- Keep the custom-screen gate GREEN after your change: re-point/add exactly the tests your change requires (per TASK-498-04's test plan for the suites you touch); never weaken a functional assertion.
Return a concise summary: files edited, new/changed public contract signatures (ScreenBlockKind members, normalize allow-lists, new props), which tests you re-pointed/added, and any deviation from the contract with the reason.
`;

const SUBTASKS = [
  {
    key: "498-01",
    file: "TASK-498-01-Screen-Editor-Look-Parity-And-List-View-Removal.md",
    owns: "core/admin/ui/custom-screens/{ScreenBlockLibrary,ScreenBlockInspector,ScreenAuthoringCanvas,CustomScreenEditorPage,ScreenPanelToggleRail}.tsx",
    brief: `Ships the LOOK + the List/Editor removal (foundation for later wiring):
- Port the prototype 9-chip PaletteChip grid (3-col) into the Insert palette (ScreenBlockLibrary). Name the chip component PaletteChip. 8 of 9 chips ship in a visible DISABLED state (no dead-click) — their ScreenBlockKind members do not exist until 498-02; only the currently-existing kind is enabled.
- Flatten ScreenBlockInspector to the prototype's flat InspectorRow stack AROUND THE EXISTING REAL CONTROLS only: Bound field (FieldBindingControls) + the per-kind content controls + variant→Background swatch. DROP the decorative Layout/Spacing/Visible rows (no backing field in ScreenBlockV1; no no-op rows) per the A4 fix.
- Right panel = Pages shared-shell rail parity: in-panel head row with a hide-panel PanelRight button, target label + selection chip + scope pill; panelPosition='right'. Match the Pages CanvasEditor shell.
- Remove the List/Editor toggle + the list-view editor branch from CustomScreenEditorPage (NON-DESTRUCTIVE: keep the ListView* component FILES + model/runtime/row-template untouched — only the editor entry point is removed).
- Fix the selectTarget activePanel coalescing (current ?? "content"/"insert") so selecting a block forces 'inspect' over the seeded 'insert'.
Tests to keep green (re-point per 498-04 plan): custom-screen-editor-restyle.test.tsx (drop List/Editor toggle + Editor-View-tab assertions; assert entry-view-only builder), custom-screen-list-view-canvas.test.tsx (re-point the :195 page-level assertion to the no-toggle state; PRESERVE the :89 direct-component ListViewCanvas coverage), editor-surface-dead-code.test.ts (PaletteChip named, no BlockChip symbol), and custom-screen-record-interactions.test.tsx / custom-screen-entry-editor-restyle.test.tsx (presentation-override + de-fabrication stay asserted).`,
  },
  {
    key: "498-02",
    file: "TASK-498-02-Screen-Data-Block-Kinds-And-Model.md",
    owns: "core/services/customScreens/{screenDocumentOps,customScreenSchemas}.ts, core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx (+ fold chip-wiring into ScreenBlockLibrary, per-kind inspector into ScreenBlockInspector, handleAddBlock into CustomScreenEditorPage — the SAME files 498-01 already landed; you run AFTER it)",
    brief: `FOUNDATION MODEL lane (makes the 8 disabled chips real):
- Add the new ScreenBlockKind members heading/text/stat/divider/image/related-list/tabs/button + screenBlockLabels + createScreenBlock branches (screenDocumentOps.ts) + the per-kind reject-unknown normalizeScreenBlockData (customScreenSchemas.ts). Apply the label fix: heading + tabs allow-lists INCLUDE "label" (matching every sibling + the base factory) so a create→normalize→read round-trip never throws; every branch re-specifies data including label.
- Wire the 9 palette chips → onAddBlock in ScreenBlockLibrary (enable the previously-disabled chips) and add the per-kind inspector controls in ScreenBlockInspector; thread handleAddBlock (incl. relationTarget) in CustomScreenEditorPage.
- Add the new per-kind render branches in ScreenRuntimeRenderer (you OWN this file for branch work). Preserve withTextPresentation on the new text-bearing kinds (heading/text/stat) so presentation-override className survives, or document the scope.
Tests: custom-screen-schemas.test.ts (each new kind validates with allow-listed data; reject-unknown throws custom_screen_definition_invalid; heading/tabs data.label round-trip; byte-stable read), and CREATE tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx (renders every new kind; presentation-override className preserved on text-bearing kinds). Update the palette test to reflect enabled chips.`,
  },
  {
    key: "498-03",
    file: "TASK-498-03-Related-List-Runtime-And-Entry-Rendering.md",
    owns: "core/services/customScreens/relatedEntryResolver.ts (NEW), core/admin/ui/custom-screens/{CustomScreenEntryCanvas,CustomScreenEntryEditor,CustomScreenPreview,CustomScreenWorkspacePreviewDialog}.tsx (+ the related-list branch + relatedEntries prop in ScreenRuntimeRenderer — 498-02 owns that file for branch work; you add ONLY the related-list branch + prop, after 498-02 merged)",
    brief: `Related-list runtime + entry rendering:
- NEW relatedEntryResolver.ts: resolve target content-type slug + stored ID[] → entry summaries via plain listEntriesCached(t) (NO force:true — rely on module cache/dedupe/batch by target); empty/absent fields fall back to data.target.
- Add the related-list render branch + a relatedEntries prop to ScreenRuntimeRenderer (pure renderer — host-precomputed data in).
- Host precompute in the 4 entry/preview files (all EXCLUSIVE to this lane). CRITICAL: memoize the merged payload fed as the effect value source and diff-guard setRelatedEntries (only setState when the computed map actually changed) — otherwise an unbounded setState-in-effect loop. In the dialog/preview hosts guard the target lookup as (fields ?? []).find(...) (fields is optional there).
- Add core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx to the boundary-test guarded array (tests/vitest/ui/custom-screen-authoring-boundary.test.ts).
Tests: CREATE tests/vitest/customScreens/relatedEntryResolver.test.ts (target-slug + ID[] resolution, dedupe/batch, no force:true, empty/absent fields fallback); custom-screen-editor-binding-flow.test.tsx (related-list → propPath 'items' + data.target sync); custom-screen-runtime-renderer.test.tsx (related-list renders resolved entries, no infinite re-render).`,
  },
];

// ---- gate helpers ----
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
const SCREENS_VITEST = `set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts custom-screen customScreens relatedEntry screenDocument editor-surface-dead-code 2>&1 | tail -80`;
const SCREENS_GATE = `cd ${ROOT} && bun --cwd core lint:types && bun --cwd core lint && ${SCREENS_VITEST}`;

async function runGate(cmd, label, ph) {
  return await agent(
    `Run from ${ROOT} and report — do NOT edit anything:\n${cmd}\nReturn {pass, summary, errors}. pass=true ONLY if lint:types + lint exit 0 AND the vitest run reports 0 failed. List each distinct error/failure with file:line in errors[] (cap ~40).`,
    { label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, fixContext) {
  let g = await runGate(SCREENS_GATE, `gate:${ph}:1`, ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(`${ph} gate round ${r}: ${g.errors.length} issues → fixing`);
    await agent(
      `TASK-498 ${ph}: the custom-screen gate (bun --cwd core lint:types && lint && vitest custom-screen...) FAILS after implementation. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per TASK-498-04's plan (never weaken a functional assertion, never drop a data-*/aria- hook or the presentation-override surface, keep the Bun-free boundary). ${fixContext}\nFailures:\n${g.errors.map((e) => "- " + e).join("\n")}`,
      { label: `fix:${ph}:${r}`, phase: ph }
    );
    r += 1;
    g = await runGate(SCREENS_GATE, `gate:${ph}:${r}`, ph);
  }
  return g && g.pass;
}

// ---- Phases 1-3: sequential source subtasks ----
for (const st of SUBTASKS) {
  phase(st.key);
  await agent(
    `${COMMON}\nYOUR SUBTASK = ${st.key}. Contract file: ${T(st.file)}. Files you own: ${st.owns}.\n${st.brief}\n\nThis runs SEQUENTIALLY after the prior subtask already landed on disk — read the current state of the shared spine files (ScreenBlockLibrary/ScreenBlockInspector/CustomScreenEditorPage/ScreenRuntimeRenderer) before editing so you build on, not clobber, prior work.`,
    { label: `impl:${st.key}`, phase: st.key }
  );
  const ok = await gateLoop(st.key, `Subtask ${st.key} owns: ${st.owns}.`);
  log(`${st.key}: gate ${ok ? "GREEN" : "still failing after fix rounds"}`);
}

// ---- Phase 4: tests / docs / read-path repair / closure ----
phase("498-04");
await agent(
  `${COMMON}\nYOUR SUBTASK = 498-04 (Tests, Docs, Closure). Contract: ${T("TASK-498-04-Screens-Tests-Docs-Closure.md")}.
498-01/02/03 source has landed and their coupled tests are green. Now finish closure:
- Ensure the FULL vitest matrix from the 498-04 plan exists and is green: schemas/ops/renderer/resolver/look-parity/list-view-removal, custom-screen-binding-panel (re-point panel='binding'/'Interaction' → panel='all'; add display-kind bind → mode==='read'), custom-screen-editor-binding-flow (drop panel='style' + [data-screen-style-dialog] modal; add related-list → propPath 'items' + data.target sync), custom-screen-record-interactions (MUST-STAY-GREEN presentation-override guard — textSize/textEmphasis/tone/mediaAssetId/image still render+persist, NOT replaced by the decorative toolbar), custom-screen-authoring-boundary (CustomScreenWorkspacePreviewDialog in the guarded array).
- Optional actions→button read-path repair in customScreenSchemas.ts (...ForRead only), keeping the byte-stability fixture DISJOINT from the legacy-widget repair fixture.
- Docs: update _docs/CONTENT_TYPES_SPEC.md for the new block kinds if the contract requires; add a _docs/_CHANGELOG/ entry (next free number) linking TASK-498 + 498-01..04 (state: 9-chip PaletteChip palette, new data-oriented block kinds + reject-unknown normalize w/o schemaVersion bump, related-list resolver + pure-renderer prop, Pages-shell right-rail parity, NON-destructive List/Editor-editor removal, presentation-override preserved) and update _docs/_CHANGELOG/README.md.
- Update _docs/_TASKS/README.md board rows for TASK-498 + 498-01..04 to their closure status AND the Statistics block (this subtask OWNS the README stats change).
Only touch tests + docs + the read-path repair; do NOT re-open source contracts.`,
  { label: "impl:498-04", phase: "498-04" }
);
const gate04 = await gateLoop("498-04", "Final closure: tests + docs + read-path repair only.");
// root tsc (includes tests) — the core lint:types scope gotcha
const tcRoot = await runGate(
  `cd ${ROOT} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 | tail -30`,
  "gate:498-04:root-tsc",
  "498-04"
);
log(
  `498-04: screens gate ${gate04 ? "GREEN" : "RED"}; root tsc (incl tests) ${tcRoot && tcRoot.pass ? "GREEN" : "RED"}`
);

// ---- Phase 5: post-implementation drift audit ----
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
  `PROTOTYPE-FIDELITY / NO-INVENTED-DEVIATIONS (primary): compare the IMPLEMENTED screen editor vs the prototype ${PROTO}. 9-chip PaletteChip palette (no old Fields list)? flat inspector around REAL controls (no no-op Layout/Spacing/Visible)? Pages-shell right-rail parity? List/Editor toggle GONE (non-destructive)? {{ }} tokens in builder? Flag any kept-old-approach or undocumented deviation.`,
  `PRESERVED SURFACES / HOOKS: the TASK-496-02 presentation-override editing surface (textSize/textEmphasis/tone/mediaAssetId/image) still renders + persists and is NOT replaced by the decorative toolbar; ListView* component files + model/runtime/row-template untouched (removal was non-destructive); all data-* hooks survive. Grep to confirm; flag any silent drop.`,
  `SCHEMA-FIRST / MODEL CORRECTNESS: new ScreenBlockKind members own schema+normalize in the service module with reject-unknown for new kinds, NO schemaVersion bump, non-destructive legacy fall-through; heading/tabs data.label round-trips without throw; related-list propPath pinned to 'items' + data.target sync. Flag any contract-logic duplication or reject-unknown footgun.`,
  `RUNTIME SAFETY: related-list host precompute memoizes its effect value source + diff-guards setState (no infinite setState-in-effect loop / no mount-force refetch); resolver uses plain listEntriesCached (no force:true); (fields ?? []).find guards. Flag any loop/refetch risk.`,
  `BOUNDARY / DEAD-CODE / TEST-INTEGRITY: Bun-free boundary holds (no @/ui/pages or Pages WidgetRenderer import in custom-screens/**; WorkspacePreviewDialog now guarded); chip named PaletteChip (editor-surface-dead-code green, no BlockChip); no orphaned exports/files from the removal; re-baselined tests re-pointed only changed assertions (no weakening, no false-green, presentation-override guard intact).`,
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        `Post-implementation audit of TASK-498 (implemented on disk). Read the four TASK-498 subtask contracts + the real implemented source under core/admin/ui/custom-screens/** + core/services/customScreens/** + the re-baselined tests. LENS:\n${lens}\nReturn findings[] (real, evidence-backed; empty if clean).`,
        {
          label: `audit:${["proto", "preserved", "schema", "runtime", "boundary"][i]}`,
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        }
      )
  )
);
const findings = auditResults.filter(Boolean).flatMap((r) => r.findings || []);
const hm = findings.filter((f) => f.severity === "high" || f.severity === "medium");
if (hm.length > 0) {
  log(`Post-audit: ${hm.length} HIGH/MED → fixing`);
  await agent(
    `Post-impl audit of TASK-498 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never drop the presentation-override surface / data-* hooks / the Bun-free boundary; no dead code). Do NOT touch _docs/_TASKS contracts.\n${hm.map((f) => `- [${f.severity}] ${f.area}: ${f.finding}\n  evidence: ${f.evidence}\n  fix: ${f.recommendation}`).join("\n")}`,
    { label: "audit-fix", phase: "Post-audit" }
  );
  const g2 = await runGate(SCREENS_GATE, "gate:post-audit", "Post-audit");
  const t2 = await runGate(
    `cd ${ROOT} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit 2>&1 | tail -30`,
    "gate:post-audit:root-tsc",
    "Post-audit"
  );
  log(
    `Post-audit gate: screens ${g2 && g2.pass ? "GREEN" : "RED"}; root tsc ${t2 && t2.pass ? "GREEN" : "RED"}`
  );
}

return {
  screensGate: gate04,
  rootTsc: tcRoot && tcRoot.pass,
  auditHighMed: hm.length,
  auditFindings: findings,
};
