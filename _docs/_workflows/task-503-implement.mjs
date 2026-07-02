export const meta = {
  name: "task-503-implement",
  description:
    "Implement TASK-503 (Screens polish v2: block-level style channel, clearable labels, clean entry canvas + metadata toggle, container drag handle, image ratio/src) STRICTLY SEQUENTIALLY 503-01->02->03->04, targeted gates per subtask, post-audit, scope-driven >=5-scenario playwright smoke. NO full-gates phase (combined run after 502+503). Collision-guarded against the parallel TASK-502 (menus/site/PageEditor/shared/tokenCss/pageDocumentV2 forbidden; changelog pinned 1212; README = 503 rows only).",
  phases: [
    { title: "503-01" },
    { title: "503-02" },
    { title: "503-03" },
    { title: "503-04" },
    { title: "Post-audit" },
    { title: "Smoke" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";
const PARENT = T("TASK-503_Screens_Polish_V2_Block_Style_Labels_Entry_View.md");

const COMMON = [
  "You implement a TASK-503 (Screens Polish V2) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode, verified anchors) + the parent " +
    PARENT +
    ".",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Do NOT regress TASK-498/500: the presentation-override editing surface, the Bun-free boundary (custom-screens/** must NOT import @/ui/pages or the Pages WidgetRenderer; custom-screen-authoring-boundary.test.ts green), ScreenDocumentV1 schemaVersion stays 1 + definition v4, stored-V4 byte-stability, PaletteChip dead-code guard, palette/insertion behavior.",
  '- Schema-first: the new style channel = a screen-local ScreenBlockStyleV1 validator (unknown keys REJECT; values coerce/clamp via the existing coerceScreenEnum/clampScreenInt + the EXPORTED page constant PAGE_BLOCK_BOX_SPACING_CLAMP read-only); "style" added to the block allow-list + screenBlockV1Schema with spread-emit-only-when-present so an absent style key round-trips BYTE-STABLE; NO schemaVersion bump. block.variant stays ACCEPTED in the schema (the dead "Background" inspector ROW is removed in 503-03, not the schema key).',
  '- Entry-mode-only changes MUST NOT alter builder/preview output (498 byte-parity): the metadata badges gate + the entry surface flatten + bg-dotted drop apply ONLY when mode==="entry"; builder keeps its chrome.',
  '- Clearable labels are a RENDERER semantics fix: an explicitly-cleared "" renders NO label; an ABSENT key keeps today\'s default (stored screens render identically); the builder {{ token }} keeps a field-name stand-in so the binding stays visible.',
  "- The container drag handle move (badge/grip) keeps ALL drop wiring on the card + keyboard/a11y unaffected; re-point the insertion-targeting tests that dispatch dragstart on the card.",
  "- No setState-in-effect; the entry-preferences hook is localStorage-backed (the usePostEditorPreferences pattern), default OFF.",
  "- Large files read as binary to rg (customScreenSchemas.ts ~2.2k, ScreenRuntimeRenderer.tsx, CustomScreenEntryEditor.tsx) — use Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-502 Menu stream runs in this tree): do NOT touch core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/tokenCss.ts, or any TASK-502 file. Do NOT edit core/services/pages/pageDocumentV2.ts (IMPORT the already-exported PAGE_BLOCK_BOX_SPACING_CLAMP read-only; if a needed constant is not exported, define a screen-local copy — never add exports to pageDocumentV2). Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 503-04 owns docs). 503-04 README rule: Read _docs/_TASKS/README.md FRESH immediately before editing and change ONLY the TASK-503 rows + 503 Statistics deltas.",
  "- Touch ONLY the files your subtask owns (single-writer per the parent). Keep the targeted gate GREEN: re-point/add exactly the tests your change requires (per the 503-04 matrix); never weaken a functional/behavior assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures (ScreenBlockStyleV1 shape, exported helpers, props, allow-lists), tests re-pointed/added, deviations with reasons.",
].join("\n");

const SUBTASKS = [
  {
    key: "503-01",
    phase: "503-01",
    file: "TASK-503-01-Screen-Block-Style-Contract.md",
    owns: "core/services/customScreens/customScreenSchemas.ts (ONLY; do NOT edit pageDocumentV2.ts — import PAGE_BLOCK_BOX_SPACING_CLAMP read-only)",
    brief:
      'MODEL KEYSTONE: add ScreenBlockStyleV1 (width enum preset auto|full|half|third|two-thirds; minHeight clamped int px; margin/padding per-side clamped ints via PAGE_BLOCK_BOX_SPACING_CLAMP; align enum start|center|end|stretch) + a ~30-line screen-local validator (unknown keys reject, values coerce/clamp, sparse, prune empty); add "style" to the block-level allow-list + screenBlockV1Schema.properties with spread-emit-only-when-present (absent key byte-stable). Add the missing ratio COERCION case (screenImageRatios const, coerceScreenEnum). EXPORT normalizeScreenImageSrc for the inspector filter. Keep block.variant accepting (no schema change — the inspector row is removed later). Extend the schema vitest tests (style round-trip + reject-unknown + byte-stable absence; ratio coercion; variant still accepted).',
    gate: "custom-screen customScreens screen-document editor-surface-dead-code",
  },
  {
    key: "503-02",
    phase: "503-02",
    file: "TASK-503-02-Screen-Renderer-Style-Labels-Entry-Chrome.md",
    owns: "core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx (SOLE WRITER; SEQUENTIAL after 503-01)",
    brief:
      'RENDERER: (a) block STYLE emission in wrap() — inline style {margin/padding px, minHeight} + a width/align class map on the wrapper, applied IDENTICALLY in builder/preview/entry; (b) CLEARABLE labels — typeof rawLabel==="string" ? rawLabel.trim() : <default chain>; render the label <p> only when non-empty (field :793-795 + stat :976-978; divider is the correct model); builder {{ token }} keeps a field-name stand-in; (c) ENTRY chrome — a showFieldMetadata prop gates the "Editable"/"Read"/"Unbound" + uppercase type badges in mode==="entry" ONLY (builder keeps chrome), DEFAULT off; flatten the entry surface (mode==="entry": section bg-transparent, block wrapper a single consistent opaque bg-card rounded-xl, drop bg-dotted for entry) — builder/preview byte-identical; (d) container DRAG HANDLE — move draggable + onDragStart/onDragEnd from the wrapper div (:584-601) onto the corner type Badge (:648-653) / a dedicated grip (all drop wiring stays on the card); (e) ratio -> aspect-ratio on the img wrapper. Update the vitest suites: label-clear composition, metadata-off default + toggle, style emission computed, drag-handle re-point, ratio.',
    gate: "custom-screen customScreens screen-editor editor-surface-dead-code",
  },
  {
    key: "503-03",
    phase: "503-03",
    file: "TASK-503-03-Screen-Inspector-And-Entry-Preferences.md",
    owns: "core/admin/ui/custom-screens/{ScreenBlockInspector,CustomScreenEntryEditor,CustomScreenEntryCanvas}.tsx (+ CustomScreenPreview.tsx if the contract touches it) + NEW core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts (SEQUENTIAL after 503-02)",
    brief:
      'INSPECTOR + PREFS: (a) ScreenBlockInspector — new "Layout" group (width + align EnumRows + per-side margin/padding number Inputs committing onPatchBlock(id,{style})); REMOVE the dead free-text "Background"/variant row (parent decision — variant must never feed a background); image ratio EnumRow; run the exported normalizeScreenImageSrc filter in the src onChange (no transient unsafe scheme in the builder). (b) NEW useScreenEntryPreferences hook (localStorage key coderso.screens.entry.preferences.v1, usePostEditorPreferences pattern, default showFieldMetadata:false). (c) CustomScreenEntryEditor — a "Field metadata" toggle in the header/Presentation panel wired to the hook + drop the bg-dotted from the entry canvas; thread showFieldMetadata down. (d) CustomScreenEntryCanvas (+ CustomScreenPreview if applicable) — pass showFieldMetadata through to ScreenRuntimeRenderer. Tests: inspector Layout group writes style; Background row gone; src filter; entry metadata toggle persists + gates the badges.',
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
      "TASK-503 " +
        ph +
        ": the targeted gate FAILS. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the 503-04 matrix (never weaken a behavior assertion, never regress 498/500 invariants, keep the Bun-free boundary + stored-V4 byte-stability + reject-unknown). COLLISION GUARD: do NOT touch core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/tokenCss.ts, core/services/pages/pageDocumentV2.ts, _docs/**. " +
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
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed — read the current state of the spine files (customScreenSchemas.ts, ScreenRuntimeRenderer.tsx, ScreenBlockInspector.tsx, CustomScreenEntryEditor.tsx) before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    targetedGate(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

phase("503-04");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 503-04 (Tests, Docs, Closure). Contract: " +
    T("TASK-503-04-Screens-Polish-Tests-Docs-Closure.md") +
    " (read its matrix + smoke-scenario definitions IN FULL).\n503-01..03 source landed and coupled tests are green. Finish closure:\n- Ensure the FULL matrix is green (style round-trips + emission computed; label-clear composition + builder token stand-in; entry metadata gating default-off + toggle persist; entry surface flatten builder-byte-identical; drag-handle re-point; ratio/src; presentation-override surface intact; boundary + dead-code guards green; stored-V4 byte-stability).\n- Docs: extend _docs/CONTENT_TYPES_SPEC.md with the block style contract + ratio; changelog PINNED as _docs/_CHANGELOG/1212-...task-503-...md (do NOT take another number; 1211 belongs to the parallel TASK-502) + update _docs/_CHANGELOG/README.md. Board: _docs/_TASKS/README.md — Read FRESH immediately before editing (TASK-502 edits other rows concurrently): move ONLY the TASK-503 + 503-01..04 rows to Done, adjust Statistics by exactly the 503 deltas. Update **Status:**/**Completed:** in all five TASK-503* files.\nOnly touch tests + docs + the five TASK-503 files; do NOT re-open source contracts; COLLISION GUARD as above.",
  { label: "impl:503-04", phase: "503-04" }
);
const gate04 = await gateLoop(
  "503-04",
  targetedGate("custom-screen customScreens screen- editor-surface-dead-code"),
  "Closure: tests + docs only."
);
const tcRoot = await runGate(ROOT_TSC, "gate:503-04:root-tsc", "503-04");
log(
  "503-04: targeted gate " +
    (gate04 ? "GREEN" : "RED") +
    "; root tsc (incl tests) " +
    (tcRoot && tcRoot.pass ? "GREEN" : "RED")
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
  "SCOPE-FIDELITY (primary): each parent Acceptance Criterion implemented — block style (width/minHeight/margin/padding/align) has VISIBLE effect in builder+preview+entry; a cleared label renders NO label (text-left/value-right composition possible); entry view is CLEAN (consistent surface, no leaked type badges by default) with a working metadata toggle (default off); container drags by its HANDLE (nested child no longer shadows it); ratio applies + unsafe src filtered in the builder; the dead Background/variant row is GONE. Flag anything stubbed/partial/wrong.",
  'MODEL / SCHEMA: ScreenBlockStyleV1 validator rejects unknown keys + coerces/clamps; "style" round-trips byte-stable when absent; stored-V4 screens read identically; NO schemaVersion bump; ratio coercion added; normalizeScreenImageSrc exported + used.',
  "ENTRY-MODE ISOLATION + 498: the metadata gate + surface flatten + bg-dotted drop apply ONLY in entry mode; builder/preview output byte-identical to pre-503; presentation-override surface fully intact; Bun-free boundary held (no @/ui/pages import); PaletteChip dead-code guard green.",
  "COLLISION: git diff shows NOTHING under core/services/menus/**, core/site/**, core/admin/ui/menus/**, core/admin/ui/pages/**, core/admin/ui/shared/**, core/ui/theme/tokenCss.ts, and NO edit to core/services/pages/pageDocumentV2.ts; changelog is 1212; README edits touched only TASK-503 rows + correct Statistics deltas.",
  "TEST INTEGRITY + DRAG: new suites assert VISIBLE-EFFECT (computed style, label absence, badge gating) not presence; the drag-handle re-point is correct (dragstart now on the handle, drop wiring intact); no weakened/deleted assertion; no false-green; the 503-04 smoke section defines >=5 distinct real-flow scenarios.",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-503 (implemented on disk). Read the five TASK-503 contracts + the real implemented source under core/services/customScreens/** + core/admin/ui/custom-screens/** + tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["scope", "model", "entry498", "collision", "tests"][i],
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
    "Post-impl audit of TASK-503 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never regress 498/500, keep byte-stability + reject-unknown + entry-mode isolation; COLLISION GUARD: no menus/site/pages/shared/tokenCss/pageDocumentV2 files, no _docs/_TASKS contract reopening).\n" +
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
    "FULL runtime SMOKE of the implemented TASK-503 screens polish — at least 5 DISTINCT real-flow scenarios (owner mandate), driven by the parent Acceptance Criteria + the 503-04 smoke section (read both). Use playwright-cli, session -s=wf503smoke on EVERY command; save screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/. Assert VISIBLE EFFECT (computed styles / DOM), not control presence. Client-state only unless a scenario needs the published entry view (test DB — Save is allowed there).",
    'SERVER RESTART FIRST (Bun server code does NOT hot-reload): ps aux | grep "bun --eval" | grep -v grep => kill the PID, coderso-dev-core-host >/dev/null 2>&1 &, wait ~15s, verify http://coderso-a.localhost:5173/admin/ = 200 (else pass:false serverUp:false). Log in ($ADMIN_EMAIL/$ADMIN_PASSWORD); CLICK THROUGH the first-run config wizard if it appears (a full test run reset it). Open the screen builder (id from /admin/advanced/custom-screens).',
    "SCENARIO 1 (block styling visible effect): select a block; in the inspector Layout group set width=half + a margin + a padding + align=end; assert getComputedStyle of the block wrapper reflects them (max-width/margin/padding/align) on the canvas — real measured values, not just control presence.",
    'SCENARIO 2 (clearable label composition): select a field block (e.g. Bathrooms); CLEAR its Label; assert the canvas no longer renders the field name/title (the label <p> is gone), so a "text left + value right" composition is possible; re-verify a block whose label was never set still shows its default.',
    'SCENARIO 3 (entry view clean + metadata toggle): open a PUBLISHED screen record editor (sidebar PUBLISHED SCREENS -> a screen -> a record -> Edit). Assert the type/binding badges (e.g. "NUMBER"/"Editable") are ABSENT by default and the field surfaces are visually CONSISTENT (no bg-dotted, uniform card bg). Toggle "Field metadata" ON -> assert the badges appear; reload -> assert the preference persisted (localStorage).',
    "SCENARIO 4 (container drag by the handle): build a Tabs container with a nested Text block in tab-1, plus a Heading sibling. Assert the drag SOURCE is a dedicated handle/badge (not the whole card): dragging the tabs container BY ITS HANDLE moves the CONTAINER (its nested text stays inside it), and grabbing the tabs card BODY over the nested child does NOT eject the child. Report honestly if playwright drag is flaky, but verify the handle element exists + is the draggable one via DOM.",
    'SCENARIO 5 (image ratio + src safety): add an Image block; set a ratio in the inspector -> assert the img wrapper computed aspect-ratio matches; type a static src (/admin/vite.svg) -> assert it renders; type "javascript:alert(1)" -> assert the builder preview does NOT place that scheme in <img src> (filtered).',
    "SCENARIO 6 (no 498 regression): the 9-chip PaletteChip grid intact; {{ }} tokens render for bound blocks; the entry editor presentation-override panel (TEXT SIZE/EMPHASIS/TONE + Save/Reload/Clear) still present + functional; dark mode has no bg-white break inside the editor. 0 console errors across all steps.",
    "Close the session. Return {pass (true iff serverUp AND all scenarios held AND consoleErrors===0), serverUp, scenarios[] (one line per scenario with the actual result incl. measured values), consoleErrors, screenshots[], failures[]}. Be truthful.",
  ].join("\n"),
  { label: "smoke:503", phase: "Smoke", schema: SMOKE_SCHEMA }
);
log(
  "Smoke: " +
    (smoke && smoke.pass ? "PASS" : "needs review") +
    " (consoleErrors=" +
    (smoke && smoke.consoleErrors) +
    ", failures=" +
    (smoke && smoke.failures ? smoke.failures.length : "n/a") +
    ")"
);

return {
  targetedGate04: gate04,
  rootTsc: tcRoot && tcRoot.pass,
  auditHighMed: hm.length,
  auditFindings: findings,
  smoke: smoke,
  note: "Full mandatory gates (bun run test + precommit + gates:coderso + gates:coderso:security + scan:security) intentionally NOT run here — combined final run after BOTH the 502 and 503 streams land.",
};
