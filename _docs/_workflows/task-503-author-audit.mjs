export const meta = {
  name: "task-503-author-audit",
  description:
    "Author TASK-503 (Screens polish v2: block-level styling channel, clearable labels, clean entry canvas + metadata toggle, container drag handle, image residuals) per AGENTS.md from the confirmed recon, then >=5 SEQUENTIAL audit rounds with a cross-subtask reconcile pass, to 0 HIGH/MED. Returns findings. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const RECON =
  "/tmp/claude-1000/-home-coder-project-Coderso/018e2bcd-50fd-4602-9a5a-52f5df82b204/tasks/ad588b4b6d477fe2b.output";

const SCOPE = [
  "TASK-503 SCOPE — Custom-Screens polish v2 (owner-reported 2026-07-02 + TASK-500 residuals). FULL recon findings (rootCause file:line + repro + fixSketch + affectedFiles) are in " +
    RECON +
    " (the final assistant message in that JSONL transcript — Bash: tail + jq or grep the report; it is the authoritative evidence). Verify anchors against source; keep fixes schema-first/minimal:",
  'A. BLOCK-LEVEL STYLING CHANNEL: ScreenBlockV1 has NO style channel (customScreenSchemas.ts:112-124) and block.variant (the inspector "Background" row) is a DEAD prop the renderer never reads. Add style?: ScreenBlockStyleV1 — validated subset: width enum preset (auto|full|half|third|two-thirds), minHeight clamped int px, margin/padding per-side clamped ints (reuse the exported page clamp constants), align enum (start|center|end|stretch). Screen-local ~30-line validator reusing exported enum/clamp constants (coerce-not-throw, matching the screen module style; services may import page SERVICES — the boundary bans only @/ui/pages). Emit in wrap() (inline style + width/align class map) identically in builder/preview/entry. Inspector "Layout" group (width/align enums + margin/padding inputs). RESOLVE the dead block.variant "Background" row: either wire it to a real background emission in wrap() or REMOVE the row (owner hates dead controls) — pick one and justify. Absent style key round-trips byte-stable; NO schemaVersion bump; reject-unknown intact.',
  'B. CLEARABLE LABELS (renderer-only): readText + || fallback makes an explicitly CLEARED label ("") indistinguishable from never-set, so the field name always renders (ScreenRuntimeRenderer.tsx:779-782, label <p> :793-795; same bug on stat :960/:976-978; divider :1006-1008 is the CORRECT model; heading/record-header unaffected). Fix: typeof rawLabel === "string" ? rawLabel.trim() : <default chain>; render the label <p> only when non-empty; builder {{ token }} keeps a field-name stand-in inside the token so the binding stays visible. Absent key = today\'s default (stored screens render identically). Regression: "text left + value right, no label" composition.',
  'C. CLEAN ENTRY CANVAS + METADATA TOGGLE: three sources of noise on the published-screen record view — (1) type/binding badges ("Editable"/"Read"/"Unbound" :838-846 + uppercase field-type "NUMBER" :851-855) render whenever mode!=="builder", leaking into the management entry view; (2) backgrounds mix at 3 alpha levels over bg-dotted (entry canvas bg-dotted CustomScreenEntryEditor.tsx:1302, sections bg-background/60 :1417, blocks bg-background/90 :547-553); (3) the "RECORD OVERVIEW"/"Preview the primary content fields in one place." strings are STORED legacy widget-default data, not code defaults — already editable/clearable via the inspector (record-header eyebrow/subtitle), so: document it + optionally a one-time read-path repair dropping the known legacy default strings when unbound (decide + justify; non-destructive). Fix: (i) showFieldMetadata boolean prop threaded into ScreenRuntimeRenderer gating the badges in entry mode ONLY (builder keeps chrome), DEFAULT OFF; persisted per-user via a new useScreenEntryPreferences hook (localStorage key coderso.screens.entry.preferences.v1, the usePostEditorPreferences pattern) with a toggle in the entry editor header/Presentation panel; (ii) entry-mode surface flatten: drop bg-dotted for entry, section bg-transparent, block wrapper a single consistent opaque bg-card rounded-xl (entry-mode-only class changes; builder/preview byte-identical).',
  "D. CONTAINER DRAG HANDLE (TASK-500 residual, verdict: real UX footgun): the whole builder card is the drag source (draggable+onDragStart on the wrapper div, ScreenRuntimeRenderer.tsx:584-601 inside wrap() :570-661), so nested draggable children shadow their container almost everywhere. Fix: move draggable + onDragStart/onDragEnd onto the corner type Badge (:648-653) or a dedicated grip beside renderBuilderActions (:654-656); all drop wiring stays on the card; keyboard/a11y unaffected; update the insertion-targeting tests that simulate dragstart on the card.",
  "E. IMAGE RESIDUALS: (1) ratio dead prop — allow-listed (:405) + inspector row writes it (ScreenBlockInspector.tsx:600-606) but the renderer image branch (:1020-1062) reads only label/fit/src; either wire ratio to aspect-ratio on the img wrapper or DROP the inspector row (keep the allow-list key for backward compat) — owner hates dead controls, prefer wiring it; (2) builder transient unsafe src — inspector onChange writes the raw string (ScreenBlockInspector.tsx:584-590) and the builder previews it immediately (:1033) while normalizeScreenImageSrc (:427-434) runs only on save; run the same prefix filter in the inspector onChange.",
  "CROSS-CUTTING: do NOT regress TASK-498/500 (presentation-override surface, Bun-free boundary [no @/ui/pages imports in custom-screens UI], schemaVersion:1 / definition v4, stored-V4 byte-stability, palette/insertion behavior, PaletteChip dead-code guard). No route/RBAC/endpoint/migration. Changelog number: next free at closure (1211 is expected for TASK-502 — take the next AFTER whatever exists; verify live).",
].join("\n");

const AGENTS_RULES =
  'AGENTS.md task-authoring rules: board file TASK-503_...md (underscores); children TASK-503-NN-...md (hyphens); H1 = task ID; "# FileName:" matches; **Parent Task:** TASK-503; canonical **Status:** ⏳ To Do; execution-ready pseudocode (exact helper/validator shapes, class maps, data flow, error handling, regression-test shape); Security Contract note = "UI/client-state + schema-first document contract extension; no new route/RBAC/endpoint/migration" (verify; the one input surface = the style validator clamps + the src prefix filter); Testing Requirements per _docs/TESTING_STRATEGY.md (Vitest Bun-free custom-screens suites) AND a SMOKE section per the owner mandate: >=5 DISTINCT real-flow scenarios for the screens area (style a block end-to-end incl. width/margin visible-effect computed-style asserts; clear a label -> clean composition; entry-view metadata toggle on/off + clean surface check; container drag BY THE HANDLE incl. nested-child non-shadowing; image ratio/src flows) — assert VISIBLE EFFECT, not control presence. Schema-first, reject-unknown, non-destructive, byte-stability guards named.';

const FILES = {
  parent: "TASK-503_Screens_Polish_V2_Block_Style_Labels_Entry_View.md",
  subs: [
    {
      key: "503-01",
      file: "TASK-503-01-Screen-Block-Style-Contract.md",
      scope:
        "Scope A (model side): ScreenBlockStyleV1 subset + validator (coerce-not-throw, exported page constants reuse), block-level allow-list extension, byte-stable round-trip, block.variant resolution decision (wire-or-remove) at the SCHEMA level. Owns core/services/customScreens/customScreenSchemas.ts (+ pageDocumentV2.ts ONLY if exporting leaf constants).",
    },
    {
      key: "503-02",
      file: "TASK-503-02-Screen-Renderer-Style-Labels-Entry-Chrome.md",
      scope:
        "Scopes A (emission) + B + C(i gating + ii surface) + D + E(ratio wiring): wrap() style emission + width/align class map; clearable-label semantics (field+stat, divider model); showFieldMetadata gating in entry mode; entry-mode surface flatten; drag handle move to the badge/grip; ratio -> aspect-ratio. Owns core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx (sole writer).",
    },
    {
      key: "503-03",
      file: "TASK-503-03-Screen-Inspector-And-Entry-Preferences.md",
      scope:
        "Scopes A (Layout inspector group) + C(i preference + toggle UI) + E(src onChange filter, ratio row per the 503-01 decision, Background row per the variant decision): ScreenBlockInspector Layout group; NEW useScreenEntryPreferences hook (localStorage, usePostEditorPreferences pattern); toggle in CustomScreenEntryEditor header/Presentation panel + prop threading through CustomScreenEntryCanvas/CustomScreenPreview. Owns core/admin/ui/custom-screens/{ScreenBlockInspector,CustomScreenEntryEditor,CustomScreenEntryCanvas,CustomScreenPreview}.tsx + the new hook file.",
    },
    {
      key: "503-04",
      file: "TASK-503-04-Screens-Polish-Tests-Docs-Closure.md",
      scope:
        "Full regression matrix (style round-trips + emission; label semantics incl. builder token stand-in; metadata gating + entry surface; drag-handle tests re-pointed; ratio/src) + the MANDATED >=5-scenario smoke definition + docs + changelog (next free; verify) + README/board/Statistics closure.",
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
      " for TASK-503 (Screens Polish V2).",
    AGENTS_RULES,
    SCOPE,
    "FIRST read the recon report (the final long report in " +
      RECON +
      " — it is a JSONL transcript; extract the last assistant message, e.g. via grep/jq/tail). Verify the load-bearing anchors against source before committing them.",
    "The parent must contain: Overview (5 scope items A-E with one-line root causes), subtask breakdown for: " +
      FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ") +
      " with land order (503-01 model -> 503-02 renderer -> 503-03 inspector/prefs -> 503-04 closure; single-writer files: schemas=01, ScreenRuntimeRenderer=02, inspector/entry-editor/canvas/preview+hook=03), Acceptance criteria (per scope item, measured live incl. computed-style visible-effect checks), the >=5-scenario smoke mandate, Security note. ALSO add TASK-503 parent + 4 child rows to the To Do table in " +
      TASKS +
      "/README.md and bump the To Do Statistics count by 5 (Read the README FRESH first; touch ONLY your rows). Return the file path + subtask list.",
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
            " under TASK-503.",
          AGENTS_RULES,
          SCOPE,
          "YOUR SUBTASK FOCUS: " + s.scope,
          "FIRST read the recon report (" +
            RECON +
            ", final assistant message) for your scope items AND the parent " +
            TASKS +
            "/" +
            FILES.parent +
            ". Then READ THE REAL SOURCE files your subtask changes and verify every anchor (Read + grep -an; the big custom-screens files read as binary to rg). Write execution-ready pseudocode + Testing Requirements (+ the smoke scenarios if 503-04). Do NOT edit README or any other task file. Return the file path + a 3-line contract summary.",
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
            ") of TASK-503 " +
            t.key +
            " — file " +
            TASKS +
            "/" +
            t.file +
            ". Verify against: the REAL source it cites (every anchor; Read + grep -an), the recon evidence (" +
            RECON +
            "), AGENTS.md rules, and the scope below. Flag: stale/invented anchors; fixes contradicting the recon root cause; missing execution-ready detail; schema traps (allow-list extension missed => reject-unknown breaks stored screens; byte-stability of absent style key); the variant/ratio wire-or-remove decisions left unresolved or contradictory across files; entry-mode-only changes leaking into builder/preview (498 byte-parity); drag-handle change breaking the insertion-targeting tests without re-pointing; smoke section missing the >=5 visible-effect scenarios; anything an implementer would get wrong.\n\n" +
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
      ") of the WHOLE TASK-503 family: " +
      targets.map((t) => TASKS + "/" + t.file).join(", ") +
      ". Find ONLY cross-file contradictions on shared values: single-writer ownership (customScreenSchemas=503-01, ScreenRuntimeRenderer=503-02, inspector/entry files+hook=503-03); the ScreenBlockStyleV1 shape + enum/clamp values IDENTICAL everywhere; the variant (Background row) decision consistent in 01/02/03; the ratio decision consistent in 02/03; showFieldMetadata prop name + preference key identical in 02/03/04; test-file names in 04 match 01-03 promises; land order coherent. Return findings[] (naming BOTH files + the value to unify) + clean.",
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
      "Fix these CROSS-SUBTASK contradictions in the TASK-503 family (edit ANY of the five task files, surgically; unify per recommendation; keep AGENTS.md format; do NOT touch other task families or README stats):\n" +
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
        "Fix these HIGH/MEDIUM drift findings in the TASK-503 contract file " +
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
