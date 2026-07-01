export const meta = {
  name: "task-499-preaudit-map",
  description:
    "AGENTS.md fresh pre-implementation drift audit of TASK-499 (Menu items restyle + Design tab, menuDocumentV2 Option B) vs the current worktree + a non-conflicting implementation lane/sequencing map, test list, and runtime smoke checklist. Read-only.",
  phases: [{ title: "Pre-audit" }, { title: "Synthesis" }],
};

const ROOT = "/home/coder/project/Coderso";
const T = (n) => `${ROOT}/_docs/_TASKS/${n}`;
const PROTO = `${ROOT}/_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx`;

const AUDIT_RULES = `
Repo path: ${ROOT}. This is the AGENTS.md-mandated FRESH read-only pre-implementation audit for TASK-499 (Menu items restyle + Design tab, menuDocumentV2 Option B). The working tree is on branch feature/visual; TASK-497 (Posts) and TASK-498 (Screens) are already committed/landed — the shared core/admin/ui/shared/EditorRail.tsx now exists (shipped by 497) and core/admin/ui/shared/CanvasEditor.tsx is the shared editor shell (used by Pages/Screens). You may run git status/diff. You may NOT edit any file — read-only.
Compare, with concrete file:line references, ordered by severity:
- the TASK-499 contract (parent + your assigned subtask) vs the CURRENT implementation, tests, and validation lanes on disk,
- parent/child status coherence,
- product & architecture constraints that own this surface: the menus domain (core/admin/ui/menus/**, core/services/**menu**, the menu document model), _docs/ARCHITECTURE.md, AGENTS.md Implementation/Testing rules (schema-first + reject-unknown, non-destructive legacy adapters, owning schemas/normalize* in the service module, Bun-free boundary, no setState-in-effect loops, shared canonical admin helpers),
- the DESIGN prototype SOURCE ${PROTO} (the three-pane menu ITEMS editor) — and note the owner's established rules: PART 1 = the three-pane items editor faithful to the prototype (the MenuItemRow must be COMPACTED toward the prototype — the prior audit flagged a HIGH where the OLD heavy row was frozen via 'zero test assertion edits'; behavior/a11y stays, pure-visual assertions are updateable); PART 2 = the Design tab that reuses the Pages editor shell (CanvasEditor) like Pages; menuDocumentV2 is Option B (NEW contract + non-destructive default fallback for legacy menus). EditorFrame should IMPORT the existing shared/EditorRail.tsx (497), not redefine it.
- known drift risks from the prior 5-round audit: heavy-MenuItemRow 'keep the old approach' pattern; EditorFrame re-declaring EditorRail; buildMenuDocumentCss missing a device arg; the 'Pages-identical chrome' claim vs missing undo/redo/layers/history.
Return findings[] (only real, evidence-backed, severity high/medium/low + file:line + recommendation) and contractValidPostMerge (false only if the committed 497/498 work actually invalidated a TASK-499 assumption — explain).`;

phase("Pre-audit");

const DRIFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings", "contractValidPostMerge"],
  properties: {
    contractValidPostMerge: { type: "boolean" },
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

const subtasks = [
  {
    key: "499-01",
    file: "TASK-499-01-Menu-Items-Editor-Restyle.md",
    focus:
      "PART 1 three-pane items editor faithful to the prototype; MenuItemRow compacted (grip size / nesting hint) while keeping DnD/keyboard/a11y behavior; import shared EditorRail (497), not redefine.",
  },
  {
    key: "499-02",
    file: "TASK-499-02-MenuDocumentV2-Contract-And-Persistence.md",
    focus:
      "menuDocumentV2 (Option B) schema-first contract + persistence; reject-unknown; non-destructive legacy adapter; owning normalize* in the service module; no schemaVersion foot-guns.",
  },
  {
    key: "499-03",
    file: "TASK-499-03-Menu-Design-Tab-Shared-Shell-Editor.md",
    focus:
      "PART 2 Design tab reusing the Pages CanvasEditor shell; buildMenuDocumentCss device arg; the Pages-identical-chrome claim vs history/undo/redo/layers scope.",
  },
  {
    key: "499-04",
    file: "TASK-499-04-Menu-Front-Renderer-And-Default-Fallback.md",
    focus:
      "front renderer for menuDocumentV2 + default fallback for legacy menus (byte-stable default-shell CSS); non-destructive.",
  },
  {
    key: "499-05",
    file: "TASK-499-05-Menu-Tests-Docs-Closure.md",
    focus:
      "regression matrix (default-shell CSS test + DnD/nesting suites), gates, runtime smoke, docs + changelog + README/board closure.",
  },
];

const drift = await parallel(
  subtasks.map(
    (s) => () =>
      agent(
        `${AUDIT_RULES}\n\nYOUR ASSIGNED SUBTASK: ${s.key} — read ${T(s.file)} IN FULL (and the parent ${T("TASK-499_Menu_Items_Restyle_And_Design_Tab_MenuDocumentV2.md")}). FOCUS: ${s.focus}\nAudit its execution-ready contract against the current source/tests on disk (read the actual menus source + tests it names). Return findings[] + contractValidPostMerge.`,
        { label: `preaudit:${s.key}`, phase: "Pre-audit", schema: DRIFT_SCHEMA }
      )
  )
);

const allFindings = drift
  .filter(Boolean)
  .flatMap((d, i) => (d.findings || []).map((f) => ({ ...f, subtask: subtasks[i].key })));
const highMed = allFindings.filter((f) => f.severity === "high" || f.severity === "medium");
const contractInvalid = drift.filter(Boolean).some((d) => d.contractValidPostMerge === false);
log(
  `Pre-audit: ${allFindings.length} findings (${highMed.length} HIGH/MED); contractValidPostMerge=${!contractInvalid}`
);

phase("Synthesis");

const MAP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "readyToImplement",
    "highMedCount",
    "sequential",
    "lanes",
    "testSuites",
    "smokeChecks",
    "notes",
  ],
  properties: {
    readyToImplement: { type: "boolean" },
    highMedCount: { type: "number" },
    sequential: { type: "boolean" },
    blockingFindings: { type: "array", items: { type: "string" } },
    lanes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["lane", "ownedFiles", "dependsOn", "summary"],
        properties: {
          lane: { type: "string" },
          ownedFiles: { type: "array", items: { type: "string" } },
          dependsOn: { type: "array", items: { type: "string" } },
          summary: { type: "string" },
        },
      },
    },
    testSuites: { type: "array", items: { type: "string" } },
    smokeChecks: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

const synthesis = await agent(
  `You are the synthesis lead for the TASK-499 (Menu) pre-implementation audit. Per-subtask drift findings from a fresh read-only pass on the current worktree:\n${JSON.stringify(allFindings, null, 2)}\ncontractValidPostMerge (all-true means 497/498 did not stale 499): ${!contractInvalid}\n\nRead the five TASK-499 subtasks' owning-file declarations + the current source under core/admin/ui/menus/** + the menu service/model + shared/CanvasEditor.tsx to determine which FILES each subtask edits, then produce:\n- readyToImplement (true only if 0 HIGH/MED blocking findings AND contract valid post-merge),\n- highMedCount + blockingFindings[] (short strings — the HIGH/MED that must be fixed in the CONTRACT first),\n- sequential (true if the subtasks share a heavy file spine that forbids parallel — like TASK-498 did — else false),\n- lanes[] (lane, ownedFiles[], dependsOn[], summary) — a non-conflicting fan-out (no two lanes write the same file; if shared, assign to one owner + note dependency + ordering),\n- testSuites[] (the vitest/bun suites to re-baseline/add),\n- smokeChecks[] (runtime playwright acceptance: three-pane items editor matches prototype, compact MenuItemRow, DnD/nesting works, Design tab = Pages-shell editor, front renderer + legacy default fallback, light+dark),\n- notes (dependency ordering + any contract fix needed first).`,
  { label: "synthesis", phase: "Synthesis", schema: MAP_SCHEMA }
);

return { highMed, contractValidPostMerge: !contractInvalid, synthesis };
