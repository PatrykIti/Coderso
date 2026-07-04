export const meta = {
  name: "task-500-implement",
  description:
    "Implement TASK-500 (Screen builder: sections first-class, insertion targeting, palette unification, panel-toggle dedupe, image static src) STRICTLY SEQUENTIALLY 500-01->02->03->04->05 (shared file spine), targeted gates per subtask, post-audit, scope-driven playwright smoke, then the FULL mandatory gate set (bun+vitest, precommit, gates:coderso + security). Collision-guarded against the parallel TASK-501 stream (menus territory forbidden; changelog pinned 1209; README edits = 500 rows only).",
  phases: [
    { title: "500-01" },
    { title: "500-02" },
    { title: "500-03" },
    { title: "500-04" },
    { title: "500-05" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "Full-gates" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const PROTO = ROOT + "/_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx";
const ENV = "set -a && { [ ! -f .env ] || . ./.env; } && set +a && ";

const COMMON = [
  "You implement a TASK-500 (Screen Builder — Sections, Insertion Targeting & Editor UX) subtask on branch feature/visual, IN-PLACE (no worktree). Read your subtask contract file IN FULL first (execution-ready pseudocode with verified anchors) + the parent " +
    T("TASK-500_Screen_Builder_Sections_Insertion_And_Editor_UX.md") +
    ".",
  "Prototype source of truth for any LOOK: " +
    PROTO +
    " (classes/tokens/structure), not screenshots.",
  "HARD RULES (AGENTS.md + owner-established):",
  "- Do NOT regress TASK-498: look parity, the presentation-override editing surface, the Bun-free boundary (custom-screens/** must NOT import @/ui/pages or the Pages WidgetRenderer; keep tests/vitest/ui/custom-screen-authoring-boundary.test.ts green), ScreenDocumentV1 schemaVersion stays 1, definition v4, stored-V4 byte-stability, no route/RBAC/endpoint change.",
  "- Editor-path ops FAIL-SOFT (never throw — unknown ids no-op or fall back per contract); the strict reject-unknown normalizers on SAVE stay the hard gate.",
  "- No setState-in-effect loops; device/DnD handlers are event handlers. React hooks compiler rules are contract (no weakening the preset).",
  "- Large files (customScreenSchemas.ts ~2.2k, ScreenRuntimeRenderer.tsx, CustomScreenEntryEditor.tsx, PageEditor.tsx 5.3k) read as binary to rg — use Read + grep -an, NEVER rg.",
  "- COLLISION GUARD (a parallel TASK-501 Menu stream runs in this tree): do NOT touch core/services/menus/**, core/site/menuDocumentCss.ts, core/site/siteShell.tsx, core/admin/ui/menus/**, or any TASK-501 task file. Do NOT edit _docs/_TASKS/* or _docs/_CHANGELOG/* (only 500-05 owns docs). If you must edit _docs/_TASKS/README.md (500-05 ONLY): Read it FRESH immediately before editing and change ONLY the TASK-500 rows + Statistics deltas for 500 (another stream may have edited other rows meanwhile).",
  "- Touch ONLY the files your subtask owns (listed below). Keep the targeted gate GREEN after your change: re-point/add exactly the tests your change requires (per the TASK-500-05 matrix for the suites you touch); never weaken a functional assertion.",
  "Return a concise summary: files edited, new/changed public contract signatures (ops functions, exported constants, props, allow-lists), which tests you re-pointed/added, and any deviation from the contract with the reason.",
].join("\n");

const SUBTASKS = [
  {
    key: "500-01",
    phase: "500-01",
    file: "TASK-500-01-Sections-First-Class-And-Palette-Unification.md",
    owns: "core/services/customScreens/screenDocumentOps.ts, core/admin/ui/custom-screens/{CustomScreenEditorPage,ScreenAuthoringCanvas,ScreenBlockLibrary,ScreenRuntimeRenderer}.tsx",
    brief: [
      "Sections first-class + palette unification (foundation — gates 500-02):",
      '- Ops (screenDocumentOps.ts, pure/Bun-free): addScreenSection (reuses createScreenSection, atIndex clamp, returns {document, sectionId}), renameScreenSection (sets BOTH label and data.title; blank -> "Section"), moveScreenSection (boundary no-op), removeScreenSection (returns removed for binding pruning; LAST-SECTION RULE: with only one section left it NO-OPS, returned removed: null — the doc never reaches zero sections), appendScreenBlockToSection (fail-soft to first section; kills the sections[0]-only default).',
      "- ScreenBlockLibrary.tsx: export SCREEN_PALETTE_CHIPS (the EXACT 9 grid chips — grid stays 9, grid-cols-3, do NOT grow to 13), SCREEN_PALETTE_COMMANDS (field-group/columns/record-header/rich-text — command-palette-only kinds), SCREEN_CANONICAL_KINDS = composition. Local PALETTE_CHIPS = SCREEN_PALETTE_CHIPS.",
      '- ScreenAuthoringCanvas.tsx: rebuild commandGroups from SCREEN_CANONICAL_KINDS (full set) + a Structure group with "Add section" -> onAddSection(); DELETE ONLY the FIELDS group (fields stays a prop). The dashed data-screen-add-section button onClick changes setCommandOpen(true) -> onAddSection() (keep stopPropagation + the prototype dashed look).',
      "- ScreenRuntimeRenderer.tsx: builder-only section chrome when selected — inline rename input + MoveUp/MoveDown/Trash2 cluster (data-screen-section-rename/-move-up/-move-down/-delete + aria-labels per contract). CRITICAL REAL-INPUT BUG GUARD: the rename <input> MUST call event.stopPropagation() in its OWN onKeyDown (and onClick) — the parent <section> onKeyDown (:1026-1036) preventDefault()s Space and re-selects on Enter, which would swallow spaces and re-trigger select. Preview/entry paths byte-identical (props optional).",
      "- CustomScreenEditorPage.tsx: handleAddSection/Rename/Move/Delete (delete prunes bindings via removeScreenBindingsForBlockTree per removed block); handleAddBlock default becomes appendScreenBlockToSection(selectedSectionId ?? first) — a selected CONTAINER (resolveSelectedSlotTarget) still takes precedence; handleSelectSection clears setSelectedId(null) as defense-in-depth.",
      'Tests (targeted): NEW tests/vitest/customScreens/screen-document-sections.test.ts (CRUD + atIndex clamp + boundary no-op + last-section rule + binding pruning); update the palette/command-palette assertions per the 500-05 locked shapes (grid=9; command palette = FULL canonical set + "Add section"; NO FIELDS group; "Add section" creates a section not setCommandOpen).',
    ].join("\n"),
    gate: "custom-screen customScreens screen-document editor-surface-dead-code",
  },
  {
    key: "500-02",
    phase: "500-02",
    file: "TASK-500-02-Insertion-Targeting-And-Interactivity.md",
    owns: "core/services/customScreens/screenDocumentOps.ts, core/admin/ui/custom-screens/{CustomScreenEditorPage,ScreenAuthoringCanvas,ScreenRuntimeRenderer,ScreenBlockInspector}.tsx (SEQUENTIAL after 500-01 — build on its landed state)",
    brief: [
      "Insertion targeting + interactivity (THE core keystone):",
      "- Ops: ScreenInsertTarget union (section-end | section-index | slot-end | slot-index), addScreenBlockAt (resolve sibling list via the existing walker, clamp index, splice; unknown target FAIL-SOFT to section-end of first section), moveScreenBlockTo (removal-first capture -> CYCLE GUARD: collectScreenBlockIds(node) must not contain target.parentId => no-op -> re-insert with the SAME id — a MOVE not a clone, bindings stay valid; moveScreenBlockTo is the SOLE owner of the same-sibling-list index DECREMENT when the removed block sat before the target index — do NOT also pre-subtract on the canvas side), findScreenBlockLocation (deterministic pre-order). Legacy addScreenBlock/moveScreenBlock become NON-DESTRUCTIVE shims over the new functions (existing tests keep importing them) — per the contract §; if the leaf chose call-site migration instead, follow the contract exactly.",
      "- CustomScreenEditorPage.tsx: insertPoint state; resolveInsertTarget priority = explicit insertion point (before/after or slot drop zone) > selected container slot > section-end of selectedSectionId ?? first; handleAddBlock rewrite; handleDragMove; DROP resolveSelectedSlotTarget per contract.",
      '- ScreenRuntimeRenderer.tsx BUILDER PATH ONLY (mode==="builder"): before/after gap affordances in section.blocks.map (:988-1056) + the slot/tabs blocks.map (:208-231/:805-822), per-slot drop zones on the existing data-screen-runtime-slot placeholders, draggable wrap() cards (:313-360) + native DnD -> onSetInsertPoint/onDragMove. Preview/entry untouched.',
      '- ScreenBlockInspector.tsx: optional "Insert into" slot picker for the selected container (per contract).',
      "Tests (targeted): NEW tests/vitest/customScreens/screen-document-insertion.test.ts (all four target kinds + clamp + fail-soft + cycle guard + same-id move + same-list decrement) and NEW tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx (insert into SELECTED section, before/after index, slot at depth, drag across sections; selection + selectedSectionId FOLLOW the inserted/moved block).",
    ].join("\n"),
    gate: "custom-screen customScreens screen-document screen-editor editor-surface-dead-code",
  },
  {
    key: "500-03",
    phase: "500-03",
    file: "TASK-500-03-Panel-Toggle-Dedupe-Shared-Shell.md",
    owns: "core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx (remove the in-canvas PanelRight close :357-365) + core/admin/ui/pages/PageEditor.tsx (remove the equivalent host close :3024-3029). CanvasEditor.tsx = VERIFY ONLY, NO code change.",
    brief: [
      "Panel-toggle dedupe across the two HOST canvases (Pages + Screens stay consistent):",
      "- Remove the redundant close-only in-canvas PanelRight button from BOTH hosts. The shared CanvasEditor is CONTROLLED read-only (docstring :16-23) — do NOT add any hide affordance there.",
      "- ScreenAuthoringCanvas: after removing the button, the PanelRight import becomes orphaned and MUST be dropped (no-unused-vars).",
      "- PageEditor.tsx (binary to rg — grep -an): remove ONLY the :3024-3029 close; the OTHER PanelRight usages (top toolbar toggle at :2606/:3473 etc.) are DIFFERENT affordances and MUST stay untouched. Re-anchor by structure, not stale line numbers.",
      "- Update the ONE existing assertion that references the removed closer (per contract ~:247 note) WITHOUT weakening the rest; existing page-editor suites stay green.",
      "Tests (targeted): NEW tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx (Pages + Screens: exactly ONE hide affordance = top toggle, reopen chip when hidden, in-canvas close GONE in both).",
    ].join("\n"),
    gate: "custom-screen canvas-editor page-editor editor-surface-dead-code",
  },
  {
    key: "500-04",
    phase: "500-04",
    file: "TASK-500-04-Static-Block-And-Image-Binding.md",
    owns: "core/services/customScreens/customScreenSchemas.ts, core/admin/ui/custom-screens/{ScreenBlockInspector,ScreenRuntimeRenderer}.tsx (SEQUENTIAL after 500-02/03 — build on landed state)",
    brief: [
      "Image static src (schema-first) + static-block clarity:",
      '- customScreenSchemas.ts: image allow-list gains OPTIONAL "src" (["label","fit","ratio","field","src"]); normalizeImageSrc = idempotent, trims, keeps only http(s)/relative /... or media ref, coerces javascript:/data:/vbscript: and blank to "" (NEVER throws); reject-unknown for other keys unchanged; NO schemaVersion bump; stored images without src normalize byte-stable.',
      "- ScreenRuntimeRenderer.tsx: image resolution order on entry/preview PRESERVES override-first precedence: media/presentation override -> bound field src -> NEW data.src static -> labeled placeholder. Do NOT invert readMediaPresentationValue ?? resolveMediaSrc(bound) (:724) — the presentation-override surface must not be demoted.",
      "- ScreenBlockInspector.tsx: image inspector gains the static-src control (Input) alongside the Bound-field control; keep the flat InspectorRow look from 498.",
      'Tests (targeted): custom-screen-schemas.test.ts (src validated + unsafe schemes coerced to "" + byte-stable without src), custom-screen-runtime-renderer.test.tsx (static src renders; neither src nor field => placeholder; override precedence intact), inspector test for the control.',
    ].join("\n"),
    gate: "custom-screen customScreens editor-surface-dead-code",
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
const vitestCmd = (globs) =>
  ENV +
  "NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts " +
  globs +
  " 2>&1 | tail -60";
const targetedGate = (globs) =>
  "cd " + ROOT + " && bun --cwd core lint:types && bun --cwd core lint && " + vitestCmd(globs);

async function runGate(cmd, label, ph) {
  return await agent(
    "Run from " +
      ROOT +
      " and report — do NOT edit anything:\n" +
      cmd +
      '\nReturn {pass, summary, errors}. pass=true ONLY if every command exits 0 and the test run reports 0 failed. Known flake: under load vitest can throw spurious "Test timed out in 10000ms" in heavy suites — re-run the NAMED failing file once in isolation before reporting it as a real failure. List each distinct real error/failure with file:line in errors[] (cap ~40).',
    { label: label, phase: ph, schema: GATE_SCHEMA }
  );
}
async function gateLoop(ph, cmd, fixContext) {
  let g = await runGate(cmd, "gate:" + ph + ":1", ph);
  let r = 1;
  while (g && !g.pass && r <= 3) {
    log(ph + " gate round " + r + ": " + g.errors.length + " issues -> fixing");
    await agent(
      "TASK-500 " +
        ph +
        ": the targeted gate FAILS after implementation. Fix CORRECTLY — prefer fixing the SOURCE when it diverged from the contract; re-baseline a TEST only for an intended contract update per the TASK-500-05 matrix (never weaken a functional assertion, never regress TASK-498 invariants, keep the Bun-free boundary + fail-soft/strict split). COLLISION GUARD: do NOT touch core/services/menus/**, core/site/menuDocument*, core/site/siteShell.tsx, core/admin/ui/menus/**, _docs/**. " +
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

// ---- Phases 1-4: sequential source subtasks ----
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
      "\n\nThis runs SEQUENTIALLY after the prior subtask landed on disk — read the current state of the shared spine files (screenDocumentOps.ts, CustomScreenEditorPage.tsx, ScreenAuthoringCanvas.tsx, ScreenRuntimeRenderer.tsx, ScreenBlockInspector.tsx) before editing so you build on, not clobber, prior work.",
    { label: "impl:" + st.key, phase: st.phase }
  );
  const ok = await gateLoop(
    st.phase,
    targetedGate(st.gate),
    "Subtask " + st.key + " owns: " + st.owns + "."
  );
  log(st.key + ": targeted gate " + (ok ? "GREEN" : "still failing after fix rounds"));
}

// ---- Phase 5: 500-05 tests / docs / closure ----
phase("500-05");
await agent(
  COMMON +
    "\n\nYOUR SUBTASK = 500-05 (Tests, Docs, Closure). Contract: " +
    T("TASK-500-05-Screen-Builder-Tests-Docs-Closure.md") +
    ' (read its §1 matrix + locked regression shapes IN FULL).\n500-01..04 source has landed and their coupled tests are green. Finish closure:\n- Ensure the FULL matrix from §1 exists and is green, including the LOCKED shapes: the command palette exposes the FULL canonical kind set (the 9 chips PLUS field-group/columns/record-header/rich-text) + "Add section" (NOT "exactly 9"); NO FIELDS group; "Add section" creates a section (does NOT call setCommandOpen); last-section invariant ("never collapses the doc to an unusable state"); stored-V4 byte-stability + reject-unknown; unbound heading/text/divider/button still render + image static-src render + placeholder fallback; presentation-override surface intact; boundary suite green; toggle-dedupe suite covers Pages + Screens.\n- Docs: extend _docs/CONTENT_TYPES_SPEC.md with the section-CRUD + insertion-target contract + the image static-src allow-list. Add the changelog entry as _docs/_CHANGELOG/1209-...task-500-...md (NUMBER PINNED to 1209 — do NOT take another number; 1210 is reserved for the parallel TASK-501) + update _docs/_CHANGELOG/README.md (surgical row add).\n- Board: _docs/_TASKS/README.md — Read it FRESH immediately before editing (a parallel TASK-501 stream edits other rows): move ONLY the TASK-500 + 500-01..05 rows to Done with a one-line closure summary each, and adjust Statistics by exactly the 500 deltas (To Do -6, Done +6). Update the **Status:**/**Completed:** fields in all six TASK-500* task files to ✅ Done + today.\nOnly touch tests + docs + the six TASK-500 task files; do NOT re-open source contracts; COLLISION GUARD as above.',
  { label: "impl:500-05", phase: "500-05" }
);
const gate05 = await gateLoop(
  "500-05",
  targetedGate(
    "custom-screen customScreens screen- canvas-editor page-editor editor-surface-dead-code"
  ),
  "Closure: tests + docs only."
);
log("500-05: targeted gate " + (gate05 ? "GREEN" : "RED"));

// ---- Phase 6: post-implementation drift audit ----
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
  'SCOPE-FIDELITY / NO-KEPT-OLD-APPROACH (primary): verify each of the parent\'s 7 acceptance criteria is IMPLEMENTED (sections first-class incl. last-section rule; author-directed insertion incl. selected section + before/after + slot-at-depth; drag with cycle guard + same-id move; ONE canonical vocabulary with grid=9 + palette=full set + no FIELDS group + "Add section" creates a section; single panel-toggle surface in BOTH hosts with CanvasEditor untouched; image static src with override-first precedence preserved; no 498 regression). Flag anything stubbed, partially wired, or silently downgraded.',
  "MODEL CORRECTNESS: ops are pure/Bun-free, fail-soft in editor path, strict normalizers unchanged on save; ScreenInsertTarget clamps; moveScreenBlockTo owns the same-list decrement SOLELY (no double-decrement on canvas side); cycle guard real; bindings survive moves (same id); removeScreenSection prunes bindings; NO schemaVersion bump; stored-V4 byte-stable.",
  "REAL-INPUT UX BUGS: the section rename input stops propagation in its own onKeyDown/onClick (Space reaches the field, Enter commits without re-selecting — the toolbar-preventDefault bug class); drag/drop handlers do not preventDefault away real clicks; insertion affordances render only in builder mode (preview/entry byte-identical).",
  "PAGES SAFETY + COLLISION: PageEditor change is ONLY the :3024-3029 close removal (other PanelRight affordances intact, no behavior drift — page-editor suites green); CanvasEditor.tsx has ZERO diff; NOTHING under core/services/menus/**, core/site/menuDocument*, core/site/siteShell.tsx, core/admin/ui/menus/** was touched (git diff check); changelog is 1209; README edits touched only TASK-500 rows + correct Statistics deltas.",
  "TEST INTEGRITY: new suites assert the locked shapes (palette FULL canonical set, last-section invariant, cycle guard, unsafe-src coercion); no weakened/deleted functional assertion; boundary + dead-code + presentation-override guards green; no false-green (assertions match implemented reality).",
];
const auditResults = await parallel(
  lenses.map(
    (lens, i) => () =>
      agent(
        "Post-implementation audit of TASK-500 (implemented on disk). Read the six TASK-500 contracts + the real implemented source under core/services/customScreens/** + core/admin/ui/custom-screens/** + core/admin/ui/pages/PageEditor.tsx + core/admin/ui/shared/CanvasEditor.tsx + the tests. You may run git diff/status. LENS:\n" +
          lens +
          "\nReturn findings[] (real, evidence-backed; empty if clean).",
        {
          label: "audit:" + ["scope", "model", "realinput", "pages", "tests"][i],
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
    "Post-impl audit of TASK-500 found these HIGH/MEDIUM issues. Fix each correctly (source or test per the contracts; never weaken tests, never regress 498, keep fail-soft/strict split; COLLISION GUARD: no menus/siteShell/menuDocument files, no _docs/_TASKS contract reopening).\n" +
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
    targetedGate(
      "custom-screen customScreens screen- canvas-editor page-editor editor-surface-dead-code"
    ),
    "gate:post-audit",
    "Post-audit"
  );
  log("Post-audit re-gate: " + (g2 && g2.pass ? "GREEN" : "RED"));
}

// ---- Phase 7: scope-driven runtime smoke (BEFORE the wizard-resetting full bun test) ----
phase("Smoke");
const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "serverUp", "observations", "consoleErrors", "screenshots", "failures"],
  properties: {
    pass: { type: "boolean" },
    serverUp: { type: "boolean" },
    observations: { type: "array", items: { type: "string" } },
    consoleErrors: { type: "number" },
    screenshots: { type: "array", items: { type: "string" } },
    failures: { type: "array", items: { type: "string" } },
  },
};
const smoke = await agent(
  [
    "Runtime SMOKE of the implemented TASK-500 screen builder, driven by the TASK ACCEPTANCE CRITERIA (read the parent " +
      T("TASK-500_Screen_Builder_Sections_Insertion_And_Editor_UX.md") +
      " §Acceptance criteria — verify THOSE, not your own inventions). Use playwright-cli with a NAMED session: prefix EVERY command with `playwright-cli -s=wf500smoke`. You only get text — assert DOM markers/computed state, and SAVE screenshots to " +
      ROOT +
      "/_docs/_workflows/_smoke/ for the human pass.",
    'SERVER RESTART FIRST (Bun does NOT hot-reload server code): find the old process (`ps aux | grep "bun --eval" | grep -v grep`), kill its PID, run `coderso-dev-core-host >/dev/null 2>&1 &`, wait ~15s, verify BOTH http://coderso-a.localhost:5173/admin/ and http://coderso-a.localhost:3000/ return 200 via curl. If :5173 is not 200 => pass:false serverUp:false.',
    "Login (creds via `set -a && . ./.env; set +a`: $ADMIN_EMAIL/$ADMIN_PASSWORD into input[type=email]/input[type=password] + the Sign in button) then open a screen editor: discover an id from the links on /admin/advanced/custom-screens and open /admin/advanced/custom-screens/<id>. Resize 1440x900.",
    "VERIFY (map to the 7 acceptance criteria; use eval + real clicks/keys — client-state only, do NOT click Save/Publish):",
    '1. Sections first-class: click [data-screen-add-section] => a NEW section appears on the canvas (section count +1) and NO command palette dialog opened. Select the new section; assert the chrome renders (data-screen-section-rename/-move-up/-move-down/-delete). Type into the rename input INCLUDING A SPACE (e.g. "My Section") via real key presses — assert the space landed (the real-input bug guard) and Enter commits without deselecting.',
    "2. Author-directed insertion: with the NEW (second) section selected, click a palette chip (e.g. Heading) => the block lands in the SELECTED section (not sections[0]) — assert via DOM position. Then use a before/after insertion affordance on an existing block and insert another block — assert index placement.",
    "3. Slot targeting: add a Tabs (or Field group) container, select it / its slot drop zone, insert a block INTO the slot — assert nesting in DOM. If a drag handle exists, try `playwright-cli -s=wf500smoke drag <from> <to>` for a reorder and report the result honestly (drag may be flaky — report, do not fake).",
    '4. Palette unification: open the command palette (its trigger/search) => it lists the container kinds (Record header/Field group/Two columns/Help text) AND the 9 chip kinds AND "Add section", and has NO per-field FIELDS group; the visible chip grid still shows exactly 9 chips.',
    "5. Toggle dedupe: assert there is NO in-canvas PanelRight close inside the canvas/panel head (only the TOP toolbar Hide/Show + reopen chip works — click Hide then the reopen chip). Then open a PAGES editor (/admin/pages, open a page) and assert the same: no in-canvas close, top toggle + reopen chip work.",
    "6. Image static src: add an Image block, set a static src in the inspector control (e.g. /favicon.ico), assert the builder/preview reflects it; assert an image with NO src and NO bound field shows the labeled placeholder.",
    "7. No 498 regression: 9-chip PaletteChip grid still renders; {{ }} tokens still render for bound blocks; presentation-override surface still present on the entry editor (spot-check); console errors === 0 across all steps.",
    "Dark-mode spot check: toggle dark mode, assert no [class*=bg-white] break inside the editor frame, screenshot light+dark.",
    "Close the session (`playwright-cli -s=wf500smoke close`). Return {pass (true iff serverUp AND all criteria held AND consoleErrors===0), serverUp, observations[] (one line per criterion with the actual result), consoleErrors, screenshots[], failures[]}. Be truthful — report what actually rendered/happened.",
  ].join("\n"),
  { label: "smoke:500", phase: "Smoke", schema: SMOKE_SCHEMA }
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

// ---- Phase 8: FULL mandatory gates (owner-required): bun+vitest full, precommit, gates:coderso + security ----
phase("Full-gates");
const fullTest = await runGate(
  "cd " + ROOT + " && " + ENV + "bun run test 2>&1 | tail -60",
  "full:test",
  "Full-gates"
);
const precommit = await runGate(
  "cd " + ROOT + " && " + ENV + "bun run precommit 2>&1 | tail -40",
  "full:precommit",
  "Full-gates"
);
const gates = await runGate(
  "cd " + ROOT + " && " + ENV + "bun run gates:coderso 2>&1 | tail -40",
  "full:gates",
  "Full-gates"
);
const gatesSec = await runGate(
  "cd " + ROOT + " && " + ENV + "bun run gates:coderso:security 2>&1 | tail -40",
  "full:gates-security",
  "Full-gates"
);
const scanSec = await agent(
  "Run from " +
    ROOT +
    ": `" +
    ENV +
    "bun run scan:security 2>&1 | tail -60`. Report {pass, summary, errors}. If a scanner binary (semgrep/trivy/gitleaks) is NOT installed locally, that is NOT a failure — set pass=true and note in summary exactly which scanners ran and which are CI-only (per AGENTS.md the fallback must be stated, not hidden). Real findings from scanners that DID run => pass=false with the findings in errors[]. Do NOT edit anything.",
  { label: "full:scan-security", phase: "Full-gates", schema: GATE_SCHEMA }
);
log(
  "Full gates: test " +
    (fullTest && fullTest.pass ? "GREEN" : "RED") +
    "; precommit " +
    (precommit && precommit.pass ? "GREEN" : "RED") +
    "; gates:coderso " +
    (gates && gates.pass ? "GREEN" : "RED") +
    "; gates:security " +
    (gatesSec && gatesSec.pass ? "GREEN" : "RED") +
    "; scan:security " +
    (scanSec && scanSec.pass ? "GREEN (or CI-only noted)" : "RED")
);

return {
  targetedGate05: gate05,
  auditHighMed: hm.length,
  auditFindings: findings,
  smoke: smoke,
  fullTest: fullTest && fullTest.pass,
  precommit: precommit && precommit.pass,
  gatesCoderso: gates && gates.pass,
  gatesSecurity: gatesSec && gatesSec.pass,
  scanSecurity: scanSec && scanSec.pass,
  scanSecuritySummary: scanSec && scanSec.summary,
};
