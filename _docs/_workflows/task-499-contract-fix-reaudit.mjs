export const meta = {
  name: "task-499-contract-fix-reaudit",
  description:
    "Fix the 1 HIGH + 4 MED pre-implementation findings in the TASK-499 (Menu) subtask contracts (one file per lane, no write conflicts), then rerun a fresh read-only drift pass to confirm 0 HIGH/MED before implementation.",
  phases: [{ title: "Fix" }, { title: "Re-audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => ROOT + "/_docs/_TASKS/" + n;
const PROTO = ROOT + "/_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx";

const COMMON_FIX =
  "You are fixing a TASK-499 (Menu) subtask CONTRACT (a _docs/_TASKS/*.md file) to resolve pre-implementation drift findings — CONTRACT WORDING ONLY, no source/test code. Keep the AGENTS.md task format intact (H1 = task ID, FileName header matches, Parent Task, canonical Status, execution-ready pseudocode, Security Contract). Make SURGICAL edits to the relevant section(s) only — do NOT rewrite the whole file, and do NOT touch any other task file (the owner may run concurrent drift agents; stay in your lane). Read the file first, verify each finding against the real source it cites (menus / menuRoutes / menuSchemas / PageEditor + the prototype at " +
  PROTO +
  "), then edit. Return the exact sections/lines you changed.";

phase("Fix");

const fixes = [
  {
    label: "fix:499-01",
    file: "TASK-499-01-Menu-Items-Editor-Restyle.md",
    prompt:
      'MED (row-fidelity vs prototype): line ~81 (and anywhere the row restyle is specified) instructs to UPDATE the pure-visual MenuItemRow assertions — grip-box dims, a letter-avatar, and the text "Sub-item of X" nesting hint. But the design prototype (MenuEditorPreview.tsx:47-64) has NEITHER a letter-avatar NOR a "Sub-item of X" text hint — nesting there is a bare GripVertical (size-4) + CornerDownRight + pl-8, url-only subline. FIX: reword so those pure-visual assertions are REMOVED (not updated), and the compacted row is specified prototype-faithfully (size-4 grip, CornerDownRight + pl-8 nesting, NO letter-avatar, NO "Sub-item of X" text). Keep the split explicit: DnD / keyboard / drop-line BEHAVIOR + a11y assertions stay byte-stable (must-stay-green); only the pure-VISUAL assertions are removed to match the lighter prototype. Also confirm section 1 IMPORTS the shared core/admin/ui/shared/EditorRail.tsx (does not redefine EditorRailGroup/EditorRailItem) and that its EditorRail extension (button branch when disabled OR title present; disabled: className variants) is prescribed as an edit to that ONE shared file.',
  },
  {
    label: "fix:499-02",
    file: "TASK-499-02-MenuDocumentV2-Contract-And-Persistence.md",
    prompt:
      'TWO MED findings: (1) Route error mapping / file list: the Error-handling paragraph requires the route to map MenuDocumentError (menu_document_invalid + path) to a 4xx like menu_appearance_invalid, but the file that owns that mapping — core/server/routes/menuRoutes.ts (mapMenuError) — is NOT in the 499-02 Owning-modules list (which lists only core/server/validation/menuSchemas.ts). mapMenuError today only handles appearance/navExtras via a field-keyed shape (menuRoutes.ts:40-50), and MenuDocumentError carries a path (not a field), so a thrown MenuDocumentError falls through to a generic 500. FIX: add core/server/routes/menuRoutes.ts (mapMenuError) to the 499-02 file-change/owning list with an explicit isMenuDocumentError branch emitting a path-keyed shape from error.path, and add a route-level "PATCH invalid document -> 400 menu_document_invalid" assertion (mirroring the existing menu_appearance_invalid test) to the integration route test the contract names. (2) Reject-unknown strictness (section 2, line ~165): validating menu-bar / nav-items block props by running the FULL normalizeMenuAppearance then pick(...) silently ACCEPTS cross-subset keys (e.g. a nav-items-only field like linkColor on a menu-bar layout, or a menu-bar-only field like sticky on nav-items) and drops them via pick — contradicting the Security Contract reject-unknown guarantee. FIX: require asserting the raw input contains NO keys outside the intended subset (throw MenuDocumentError with a path of the form block-path.offendingKey on the first extra key) BEFORE pick — do not rely on pick to enforce the per-block prop allowlist. Update the section 2 pseudocode + the Security Contract wording accordingly.',
  },
  {
    label: "fix:499-03",
    file: "TASK-499-03-Menu-Design-Tab-Shared-Shell-Editor.md",
    prompt:
      'MED (section 5 blast radius under-scoped): section 5 tells the implementer to remove the mode==="menu" legacy chrome citing only "(:963-965, :3499-3543)", but useLegacyChrome / panelTone / useBuilderChrome are referenced at ~17 sites in core/admin/ui/pages/PageEditor.tsx well outside those two ranges (:963-967, :2661, :2686, :2692, :2798, :2811, :2821, :2999, :3012, :3016, :3070, :3181, :3323 EditorControlToneContext provider, :3341 useBuilderChrome return, :3506, :3510-3511, :3517, :3528, :3543). Deleting the useLegacyChrome const at :963 undefs all downstream refs and fails lint:types. FIX: reframe section 5 as "AUDIT FIRST (grep -an all editorHost.mode / useLegacyChrome / panelTone / useBuilderChrome — PageEditor.tsx reads as binary to rg), then delete ALL useLegacyChrome / panelTone / panelTokens branches + BOTH EditorControlToneContext dark-tone providers (the topbar/canvas branches 2661-2821, the control-tone arms 2999-3181 + :3323, and 3506-3543), collapsing useBuilderChrome to always-true", and drop the misleadingly narrow "(:963-965, :3499-3543)" citation. Keep the no-route/RBAC-change scope note.',
  },
  {
    label: "fix:499-05",
    file: "TASK-499-05-Menu-Tests-Docs-Closure.md",
    prompt:
      'HIGH + MED findings: (1) HIGH — regression matrix completeness: the existing 30KB suite tests/vitest/ui/menu-design-editor-flow.test.tsx (TASK-458-03 / 495-02) is OMITTED from the 499-05 closure/regression matrix, yet it is the canonical test of exactly what 499-03 retires — it mounts MenuDesignEditorPage + a bare mode:"menu" PageEditorHost (:768) and asserts the legacy dark chrome (:727). Once 499-03 drops "menu" from the mode union, :768 fails lint:types and the MenuDesignEditorPage assertions contradict the shared-shell rewrite. FIX: add menu-design-editor-flow.test.tsx to section 1 explicitly as MUST-RETIRE/REWRITE (retirement owned by 499-03, SUPERSEDED by the new menu-design-editor.test.tsx named in section 65), and list it under section 4 residuals/closure so the closing agent does not inherit an untracked breaking suite. (2) MED — row-fidelity guidance (section 49/88, echoing parent 499-01 line 81): says to UPDATE the row letter-avatar / "Sub-item of X" (:68) pure-visual assertions, but the design prototype (MenuEditorPreview.tsx:47-64) has NEITHER. FIX: reword to REMOVE (not update) those non-prototype pure-visual assertions so the compaction is prototype-faithful (bare GripVertical + CornerDownRight + pl-8), keeping only the behavior/a11y assertions byte-stable.',
  },
];

const fixResults = await parallel(
  fixes.map(
    (f) => () =>
      agent(
        COMMON_FIX + "\n\nFILE YOU OWN (edit ONLY this one): " + T(f.file) + "\n\n" + f.prompt,
        { label: f.label, phase: "Fix" }
      )
  )
);
log("Fix: " + fixResults.filter(Boolean).length + "/" + fixes.length + " contract fixes applied");

phase("Re-audit");

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

const subs = [
  {
    key: "499-01",
    file: "TASK-499-01-Menu-Items-Editor-Restyle.md",
    prior:
      "row-fidelity: REMOVE (not update) letter-avatar + Sub-item-of-X; import shared EditorRail (not redefine) + its disabled/title extension",
  },
  {
    key: "499-02",
    file: "TASK-499-02-MenuDocumentV2-Contract-And-Persistence.md",
    prior:
      "menuRoutes.ts mapMenuError in owning list + isMenuDocumentError path branch + route test; section 2 assert-no-extra-keys-before-pick",
  },
  {
    key: "499-03",
    file: "TASK-499-03-Menu-Design-Tab-Shared-Shell-Editor.md",
    prior:
      'section 5 mode==="menu" retirement covers ALL ~17 useLegacyChrome/panelTone/useBuilderChrome sites, not the 2 narrow ranges',
  },
  {
    key: "499-04",
    file: "TASK-499-04-Menu-Front-Renderer-And-Default-Fallback.md",
    prior: "(was clean) — re-verify no new cross-subtask contradiction after siblings changed",
  },
  {
    key: "499-05",
    file: "TASK-499-05-Menu-Tests-Docs-Closure.md",
    prior:
      "menu-design-editor-flow.test.tsx listed MUST-RETIRE/REWRITE + closure; row assertions REMOVED not updated",
  },
];

const reaudit = await parallel(
  subs.map(
    (s) => () =>
      agent(
        "FRESH read-only re-audit of TASK-499 subtask " +
          s.key +
          " AFTER a contract fix. Repo " +
          ROOT +
          ", read-only (no edits). Read " +
          T(s.file) +
          " in full + the parent TASK-499_Menu_Items_Restyle_And_Design_Tab_MenuDocumentV2.md + the real source/tests it cites (menus / menuRoutes / menuSchemas / PageEditor / siteShell + the prototype " +
          PROTO +
          ").\n1) CONFIRM the prior finding is now RESOLVED in the contract wording: " +
          s.prior +
          '.\n2) Re-check for any NEW or remaining drift (schema-first + reject-unknown, non-destructive legacy + byte-identity buildSiteShellCss(null) invariant, owning modules complete incl. route mapError, mode==="menu" retirement complete, prototype-faithful compacted row with NO invented keep-old chrome, sequential land-order coherence A->B->D->C->E).\nReturn findings[] (empty if clean) + clean (true iff 0 HIGH/MED remain for this subtask).',
        { label: "reaudit:" + s.key, phase: "Re-audit", schema: DRIFT_SCHEMA }
      )
  )
);

const remaining = reaudit
  .filter(Boolean)
  .flatMap((r, i) => (r.findings || []).map((f) => ({ ...f, subtask: subs[i].key })));
const remHighMed = remaining.filter((f) => f.severity === "high" || f.severity === "medium");
const allClean =
  reaudit.filter(Boolean).every((r) => r.clean) && reaudit.filter(Boolean).length === subs.length;

return {
  fixesApplied: fixResults.filter(Boolean).length,
  reauditClean: allClean,
  remainingHighMed: remHighMed.length,
  remaining,
};
