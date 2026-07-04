export const meta = {
  name: "task-505-author-audit",
  description:
    "Author TASK-505 (Screens: section COLUMN layout [side-panel column presets 3/4..1/4, auto-flow] + binding-integrity GC on save [prune orphaned/missing-field bindings + descriptive error]) per AGENTS.md from the confirmed recon + bug-hunt, then >=5 SEQUENTIAL audit rounds with a cross-subtask reconcile pass, to 0 HIGH/MED. Returns findings. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const RECON =
  "/tmp/claude-1000/-home-coder-project-Coderso/018e2bcd-50fd-4602-9a5a-52f5df82b204/tasks/a626d58cdee2ead0a.output";

const SCOPE = [
  "TASK-505 SCOPE — Custom-Screens: section column layout + binding-integrity GC. TWO items:",
  'ITEM A — SECTION COLUMN LAYOUT (owner ask: "sections have no side-panel options; I want N columns to split the view 3/4..1/4, e.g. a Bathrooms: 2 label-left/value-right composition"). The FULL grounded design (types, selectors, normalizer/renderer/editor touch-points, byte-identity) is in the recon report ' +
    RECON +
    ' (read the final assistant message via Bash grep/tail). Design: a NEW section.style?: ScreenSectionStyleV1 = { columns?: preset-enum, columnGap?: clamp } (do NOT reuse the dead section.layout WidgetLayout field — retyping it throws on legacy docs; add a NEW style channel like TASK-503 did for blocks). Presets ["1","2","3","4","1-1","1-2","2-1","1-3","3-1","2-3","3-2","1-1-1","1-1-1-1"] mapped to grid-template-columns fr ratios (3/4:1/4 = "3-1" -> 3fr 1fr). normalizeScreenSectionStyle mirrors normalizeScreenBlockStyle (coerce-not-throw, reject-unknown KEYS, prune-empty -> byte-stable); add "style" to normalizeScreenSection allowlist + the Ajv screenSectionV1Schema + ScreenSectionPatch. Renderer: the section block-list container div (space-y-4) becomes display:grid with the template + gap when columns is set; absent = today\'s vertical stack byte-identical (single builder/preview/entry code path). Block ASSIGNMENT = auto-flow (each block = one cell, DOM order); the interleaved renderInsertGap thin gaps get grid-column:1/-1 (full-row) so they never steal a cell. TASK-503 per-block width stays a WITHIN-CELL fraction (no double-meaning; per-block columnSpan is DEFERRED). Editor: a SECTION inspector (today a selected section has NO inspector) with a Columns EnumRow + a columnGap number input, enabled when selectedSectionId && !selectedBlockId; handlePatchSection host wiring via updateScreenSection. The "Bathrooms: 2" composition = section "3-1" + a Text block + the bound field value (needs nothing beyond columns + shipped 503 block-style + 503 clearable-labels).',
  "ITEM B — BINDING-INTEGRITY GC ON SAVE (bug-hunt HIGH: a screen whose bindings reference DELETED content-type fields becomes permanently un-saveable — Save returns opaque 400 custom_screen_definition_invalid, deleting the referencing blocks does NOT prune the bindings [removeScreenBindingsForBlockTree, screenDocumentOps.ts:996, only drops bindings whose blockId is in the removed subtree], and there is no UI to remove orphaned bindings). Fix: (1) a reconcile/GC pass that prunes bindings whose blockId matches NO live block in the document (orphaned) — run it on block/section delete AND as a normalize-time safety net; (2) surface the offending field name(s) in the custom_screen_definition_invalid error (the definition validator/route error) instead of the generic string, so the user can diagnose; (3) decide (recommend) whether a missing-CONTENT-TYPE-FIELD binding should hard-fail save or be pruned/flagged with a recoverable UI affordance — the owner needs a recovery path from the dead-end, so prefer prune-orphaned + a clear per-field warning over an opaque 400. VERIFY the exact save/normalize/error path (custom-screen definition PATCH route + normalizeCustomScreenDefinition + the binding validator) with Read + grep -an before designing. This is schema/service + a small editor affordance; verify it needs no new route (extend the existing one).",
  "HARD INVARIANTS: do NOT regress TASK-498/500/503 (presentation-override surface, Bun-free boundary [no @/ui/pages import in custom-screens UI], ScreenDocumentV1 schemaVersion 1 + definition v4, stored-V4 byte-stability, PaletteChip dead-code guard, insertion-targeting/section-CRUD from 500, the 503 block style channel). Absent section.style = byte-identical DOM. Schema-first + reject-unknown; the binding-GC must be NON-destructive to valid bindings + deterministic. No new route/RBAC/migration; no schemaVersion bump.",
].join("\n");

const AGENTS_RULES =
  'AGENTS.md task-authoring rules: board file TASK-505_...md (underscores); children TASK-505-NN-...md (hyphens); H1 = task ID; "# FileName:" matches; **Parent Task:** TASK-505; canonical **Status:** ⏳ To Do; execution-ready pseudocode (exact type shapes, preset->template map, normalizer + GC-pass shapes, grid CSS, editor control wiring, error-message shape, data flow, regression-test shape); Security Contract note = "UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration" (verify + cite); Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free custom-screens suites + the bun custom-screen route/integration suite for the save/error path) AND a SMOKE section per the owner mandate: >=5 DISTINCT real-flow scenarios (build a 2-col + a 3-1 section with visible-effect computed grid-template + the Bathrooms:2 composition; auto-flow ordering; insertion/drop-zones still work in a gridded section; binding-GC: create a screen bound to a field, delete that field on the content type, confirm the screen is STILL saveable [orphan pruned] with a clear message; absent-style byte-stability spot-check) — assert VISIBLE EFFECT. Schema-first, reject-unknown, byte-stability guards named.';

const FILES = {
  parent: "TASK-505_Screens_Section_Columns_And_Binding_Integrity.md",
  subs: [
    {
      key: "505-01",
      file: "TASK-505-01-Section-Style-Model-And-Binding-GC.md",
      scope:
        'MODEL keystone (both items, service side): ScreenSectionStyleV1 {columns preset enum, columnGap clamp} + normalizeScreenSectionStyle + wire into normalizeScreenSection allowlist + Ajv screenSectionV1Schema + ScreenSectionPatch "style"; the preset->grid-template map exported for the renderer. Binding-GC: a pruneOrphanedScreenBindings(document, bindings) helper (drops bindings whose blockId matches no live block) run on delete + normalize; the definition validator/error surfaces offending field name(s); decide missing-content-field policy (prune+warn over opaque 400). Owns core/services/customScreens/customScreenSchemas.ts + core/services/customScreens/screenDocumentOps.ts (+ the definition normalize/validate module if separate — verify).',
    },
    {
      key: "505-02",
      file: "TASK-505-02-Section-Grid-Renderer.md",
      scope:
        "RENDERER (item A): the section block-list container becomes display:grid (template from the preset map, gap from columnGap) when section.style.columns is set; absent = space-y-4 byte-identical; renderInsertGap gaps get grid-column:1/-1 when gridded; TASK-503 block width stays within-cell; builder drop-zones/insertion-targeting still work. Owns core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx (SOLE WRITER; after 505-01).",
    },
    {
      key: "505-03",
      file: "TASK-505-03-Section-Inspector-And-Binding-Recovery-UI.md",
      scope:
        "EDITOR (both items, UI side): a SECTION inspector shown when a section is selected (Columns EnumRow + columnGap input) — enable the Inspect category for sections; handlePatchSection host wiring via updateScreenSection. Binding recovery affordance: surface orphaned/missing-field bindings with a clear message + a way to remove them (so the un-saveable dead-end is recoverable). Owns core/admin/ui/custom-screens/{ScreenBlockInspector,ScreenAuthoringCanvas,CustomScreenEditorPage}.tsx (SOLE WRITER; after 505-02).",
    },
    {
      key: "505-04",
      file: "TASK-505-04-Screens-Columns-Tests-Docs-Closure.md",
      scope:
        "Full regression matrix (section-style round-trip + reject-unknown + byte-stable absence; grid emission + gap col-span + absent-style DOM identity; binding-GC prunes orphans non-destructively + the descriptive error + the un-saveable-recovery flow; section inspector; no 500/503 regression) + the MANDATED >=5-scenario smoke definition + docs (CONTENT_TYPES_SPEC section-style + binding-GC) + changelog (next free; verify) + README/board/Statistics closure.",
    },
  ],
};

phase("Author-parent");
await agent(
  [
    "Author the PARENT board task file " +
      TASKS +
      "/" +
      FILES.parent +
      " for TASK-505 (Screens Section Columns & Binding Integrity).",
    AGENTS_RULES,
    SCOPE,
    "FIRST read the recon report (" +
      RECON +
      ", final assistant message) for ITEM A + verify the ITEM B save/error path yourself with Read + grep -an (screenDocumentOps.ts:996 removeScreenBindingsForBlockTree + the definition validator + the custom_screen_definition_invalid error).",
    "The parent must contain: Overview (item A section-columns gap + item B the un-saveable binding dead-end), subtask breakdown for: " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with land order (505-01 model+GC -> 505-02 renderer -> 505-03 editor -> 505-04 closure; single-writer: schemas/ops=01, ScreenRuntimeRenderer=02, inspector/canvas/editor-page=03), Acceptance criteria (measured live: build a 3-1 column section + the Bathrooms:2 composition; delete a bound content-field then confirm the screen is still saveable with a clear message), the >=5-scenario smoke mandate, Security note. ALSO add TASK-505 parent + 4 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump To Do Statistics by 5 (Read README FRESH first; touch ONLY your rows — a parallel TASK-504 stream edits other rows). Return the file path + subtask list.",
  ].join("\n\n"),
  { label: "author:parent", phase: "Author-parent" }
);

phase("Author-subtasks");
await parallel(
  FILES.subs.map(
    (s) => () =>
      agent(
        [
          "Author the child task file " +
            TASKS +
            "/" +
            s.file +
            " for " +
            s.key +
            " under TASK-505.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          "FIRST read the recon report (" +
            RECON +
            ", final assistant message) for the columns design AND the parent " +
            TASKS +
            "/" +
            FILES.parent +
            ". Then READ THE REAL SOURCE files your subtask changes and verify every anchor (Read + grep -an; the big custom-screens files read as binary to rg). Write execution-ready pseudocode + Testing Requirements (+ the smoke scenarios if 505-04). Do NOT edit README or any other task file. Return the file path + a 3-line contract summary.",
        ].join("\n\n"),
        { label: "author:" + s.key, phase: "Author-subtasks" }
      )
  )
);

phase("Audit");
const DRIFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "clean"],
  properties: {
    clean: { type: "boolean" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};
const targets = [{ key: "parent", file: FILES.parent }, ...FILES.subs];
const MIN_ROUNDS = 5;
const history = [];
const residual = [];
let lastClean = false;

for (let round = 1; round <= 8; round++) {
  const audits = await parallel(
    targets.map(
      (t) => () =>
        agent(
          "Read-only drift audit (round " +
            round +
            ") of TASK-505 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against: the REAL source it cites (every anchor; Read + grep -an), the recon (" +
            RECON +
            "), AGENTS.md, and the scope below. Flag: stale/invented anchors; reusing the dead section.layout instead of a new style channel (byte-safety); missing execution-ready detail; reject-unknown / byte-stability (absent style = identical DOM); the grid col-span fix for insert-gaps missing; block-503-width double-meaning; binding-GC that is destructive to VALID bindings or does not actually make the un-saveable screen recoverable, or invents a new route; the error message still generic; section inspector not actually reachable (Inspect category still block-gated); smoke missing the >=5 visible-effect scenarios (esp. the delete-bound-field-then-save recovery + a real grid computed template); anything an implementer would get wrong.\n\n" +
            SCOPE +
            "\n\nReturn findings[] + clean (true iff 0 HIGH/MED for this file).",
          { label: "audit:r" + round + ":" + t.key, phase: "Audit", schema: DRIFT_SCHEMA }
        )
    )
  );
  const done = audits.filter(Boolean);
  const perFile = done.flatMap((a, i) =>
    (a.findings || []).map((f) => ({ ...f, target: targets[i].key }))
  );
  const recon = await agent(
    "Cross-subtask RECONCILE audit (round " +
      round +
      ") of the WHOLE TASK-505 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      '. Find ONLY cross-file contradictions on shared values: single-writer ownership (schemas/ops=01, ScreenRuntimeRenderer=02, inspector/canvas/editor-page=03); the ScreenSectionStyleV1 preset list + preset->template map IDENTICAL in 01 vs 02; the pruneOrphanedScreenBindings signature 03 uses = the one 01 defines; the binding-GC policy (prune orphans + error shape) consistent across 01/03/04; ScreenSectionPatch "style" extension consistent; test-file names in 04 match 01-03 promises; land order coherent. Return findings[] (naming BOTH files + the value to unify) + clean.',
    { label: "reconcile:r" + round, phase: "Audit", schema: DRIFT_SCHEMA }
  );
  const cross = (recon && recon.findings ? recon.findings : []).map((f) => ({
    ...f,
    target: "cross",
  }));
  const findings = [...perFile, ...cross];
  const highMed = findings.filter((f) => f.severity === "high" || f.severity === "medium");
  const roundOk = done.length === targets.length && !!recon;
  const roundClean = highMed.length === 0 && roundOk;
  history.push({
    round,
    audits: done.length,
    highMed: highMed.length,
    reconcileFindings: cross.length,
  });
  log(
    "Audit round " +
      round +
      ": " +
      highMed.length +
      " HIGH/MED (" +
      cross.length +
      " reconcile; " +
      done.length +
      "/" +
      targets.length +
      " audits)"
  );
  if (roundClean && round >= MIN_ROUNDS) {
    lastClean = true;
    break;
  }
  if (roundClean) {
    lastClean = true;
    continue;
  }
  lastClean = false;
  residual.length = 0;
  residual.push(...highMed);
  const crossHM = highMed.filter((f) => f.target === "cross");
  if (crossHM.length > 0) {
    await agent(
      "Fix these CROSS-SUBTASK contradictions in the TASK-505 family (edit ANY of the five task files, surgically; unify per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
        crossHM
          .map(
            (f) =>
              "- [" + f.severity + "] " + f.area + ": " + f.finding + "\n  fix: " + f.recommendation
          )
          .join("\n"),
      { label: "fix-cross:r" + round, phase: "Audit" }
    );
  }
  const byFile = {};
  for (const f of highMed.filter((x) => x.target !== "cross")) {
    (byFile[f.target] ||= []).push(f);
  }
  await parallel(
    Object.entries(byFile).map(([key, fs]) => () => {
      const tf = targets.find((t) => t.key === key);
      return agent(
        "Fix these HIGH/MEDIUM drift findings in the TASK-505 contract file " +
          TASKS +
          "/" +
          tf.file +
          " (CONTRACT WORDING ONLY, surgical; verify against real source + the recon first; keep AGENTS.md format; do NOT touch other files).\n" +
          fs
            .map(
              (f) =>
                "- [" +
                f.severity +
                "] " +
                f.area +
                ": " +
                f.finding +
                "\n  fix: " +
                f.recommendation
            )
            .join("\n"),
        { label: "fix:r" + round + ":" + key, phase: "Audit" }
      );
    })
  );
}

return { rounds: history.length, lastClean, history, residualHighMed: lastClean ? [] : residual };
