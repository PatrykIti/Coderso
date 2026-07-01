export const meta = {
  name: "task-500-author-audit",
  description:
    "Author TASK-500 (Screen builder: sections first-class, insertion targeting/interactivity, palette unification, panel-toggle dedupe, static/image binding) per AGENTS.md, then >=5 SEQUENTIAL drift-audit rounds to 0 HIGH/MED. No implementation.",
  phases: [{ title: "Author-parent" }, { title: "Author-subtasks" }, { title: "Audit" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;
const PROTO = `${ROOT}/_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx`;

// Verified model facts (from a read-only source investigation) — hand these to authors so they don't re-derive wrong.
const FACTS = `
VERIFIED CURRENT-STATE FACTS (from source, do not contradict without re-checking):
- Model: ScreenDocumentV1 = { schemaVersion:1, sections: ScreenSectionV1[] } (customScreenSchemas.ts). Sections are FLAT/top-level (type "section", CANNOT nest), each holds blocks: ScreenBlockV1[]. Blocks CAN nest via children?[] + slots?{}. Container kinds: field-group (slot "content"), columns ("left"/"right"), tabs (per-tab slots "tab-1"/"tab-2"...). Arbitrary depth (field-group → columns → columns …).
- Insertion TODAY (the core gap): CustomScreenEditorPage.handleAddBlock → resolveSelectedSlotTarget(document) → addScreenBlock(document, block, target). With NO target it appends to the END of the FIRST section (sections[0]); with a selected CONTAINER it appends to the END of that container's first/derived slot. There is a selectedSectionId concept but it does NOT steer insertion. moveScreenBlock is up/down reorder only. So: NO author-chosen insertion index, NO chosen target section, NO chosen slot for arbitrary depth, NO drag-to-position. Everything lands in one place.
- "Add section" button (ScreenAuthoringCanvas ~:508, data-screen-add-section) does NOT create a section — it opens the COMMAND PALETTE (setCommandOpen) titled "Search and insert screen blocks or fields" with a BLOCKS group (record-header/field-group/columns/rich-text) + a FIELDS group (one command per content field). This is a SECOND, different insert surface from the 9-chip ScreenBlockLibrary (Heading/Text/Field/Stat/Divider/Image/Related-list/Tabs/Button) which lives under the Insert panel category. Two overlapping block vocabularies + a redundant field list; the button is mislabeled.
- Panel toggles: host panelOpen state (CustomScreenEditorPage useState). THREE affordances drive it: (1) top-toolbar Hide/Show toggle (screenPanelToggle, toggles both ways), (2) in-canvas right-edge PanelRight "Hide panel" button (ScreenAuthoringCanvas ~:357, only closes), (3) reopen "Show panel" chip when hidden. The shared shell is core/admin/ui/shared/CanvasEditor.tsx. The Pages editor (PageEditor.tsx via CanvasEditor) has the IDENTICAL 3-affordance pattern — so a dedupe must be done in the shared shell and cover BOTH Pages + Screens.
- Front render: ScreenRuntimeRenderer mode "builder"|"preview"|"entry". Unbound heading/text/divider/rich-text/button DO render their authored static content on entry/preview (published per-entry). Exception: image needs a bound field (or media override) for src — otherwise it renders only a labeled placeholder (image data allow-list has no static src). So static blocks are legitimate; only image is inconsistent.
- Relevant files: core/admin/ui/custom-screens/{ScreenAuthoringCanvas,CustomScreenEditorPage,ScreenBlockLibrary,ScreenBlockInspector,ScreenRuntimeRenderer}.tsx; core/services/customScreens/{screenDocumentOps,customScreenSchemas}.ts; core/admin/ui/shared/CanvasEditor.tsx + core/admin/ui/pages/PageEditor.tsx (toggle dedupe); tests under tests/vitest/**custom-screen** + tests/vitest/customScreens/**.
`;

const SCOPE = `
TASK-500 SCOPE (owner-approved), a FUNCTIONAL builder upgrade on top of the shipped TASK-498 look-parity (do NOT regress 498; presentation-override + Bun-free boundary + no-schemaVersion-bump rules still apply):
1. Sections first-class + palette unification: "Add section" CREATES a real empty, named section (top-level). Section management: select (steers insertion), label/rename, reorder, delete. Remove the FIELDS group from the command palette (a field is added via the 'Field' chip and bound in the inspector). Collapse to ONE block vocabulary — the 9-chip palette is canonical; if a searchable command palette stays, it mirrors the SAME kinds + "Add section", not a different set.
2. Insertion targeting + interactivity (THE core): new blocks insert into the SELECTED section (not always sections[0]); an insertion-POINT picker (before/after a given block, and INTO a chosen slot of any nested container — field-group/columns/tabs — at arbitrary depth); drag-to-position/reorder across sections+slots. The owner: "kontenery zagnieżdżają się dowolnie ale wszystko idzie w jedno miejsce — nie mogę wybrać miejsca — brak interaktywności — powinno być lepiej".
3. Panel-toggle dedupe in the shared CanvasEditor: keep ONE control surface (top toggle + reopen chip); remove the redundant in-canvas PanelRight close. Apply in the shared shell so Pages + Screens stay consistent (verify PageEditor unaffected otherwise).
4. Static/image binding clarity: unbound heading/text/divider/button render on the front (keep); fix the image inconsistency — either allow a static image src (schema-first, reject-unknown, non-destructive) OR clearly mark image as "requires a bound field" in the builder. Pick one and justify.
5. Tests/docs/closure: regression matrix (section CRUD, insertion targeting incl. index/slot/target-section, drag reorder, palette unification, toggle dedupe in Pages+Screens, static/image render), docs, changelog, README/board closure.
`;

const AGENTS_RULES = `
AGENTS.md task-authoring rules you MUST follow: board file TASK-500_...md with underscores; child files TASK-500-NN-...md with hyphens; H1 = task ID; "# FileName:" = actual filename; child files carry **Parent Task:** TASK-500; canonical **Status:** ⏳ To Do; execution-ready pseudocode (helper/function shape, data flow, error handling, regression-test shape) so an implementer executes without rediscovering the fix; a Security Contract subsection ONLY if the subtask touches API routes (this is admin-UI + client-state + a schema-first model tweak — state "UI/client-state + schema-first model; no route/RBAC/endpoint change" where true); a Testing Requirements section per _docs/TESTING_STRATEGY.md lanes (Vitest for Bun-free UI/domain). Model any schema change schema-first (reject-unknown, normalize* in the service module, NO ScreenDocumentV1 schemaVersion bump, non-destructive legacy). Use shared canonical admin helpers. Prefer deterministic contracts (stable ids, clamped limits, explicit defaults).
`;

const FILES = {
  parent: "TASK-500_Screen_Builder_Sections_Insertion_And_Editor_UX.md",
  subs: [
    {
      key: "500-01",
      file: "TASK-500-01-Sections-First-Class-And-Palette-Unification.md",
      scope:
        'Scope item 1: "Add section" creates a real section; section management (select/rename/reorder/delete); remove FIELDS group + unify to one block vocabulary.',
    },
    {
      key: "500-02",
      file: "TASK-500-02-Insertion-Targeting-And-Interactivity.md",
      scope:
        "Scope item 2 (CORE): insert into selected section; insertion-point picker (before/after/into-slot at arbitrary container depth); drag-to-position across sections+slots. Extend screenDocumentOps addScreenBlock to accept an explicit {sectionId, parentId?, slotId?, index} target; keep it non-destructive + deterministic.",
    },
    {
      key: "500-03",
      file: "TASK-500-03-Panel-Toggle-Dedupe-Shared-Shell.md",
      scope:
        "Scope item 3: dedupe the panel toggle in shared/CanvasEditor.tsx (one control + reopen chip; drop the in-canvas PanelRight close), applied to BOTH Pages (PageEditor) + Screens; keep every a11y/data-* hook.",
    },
    {
      key: "500-04",
      file: "TASK-500-04-Static-Block-And-Image-Binding.md",
      scope:
        'Scope item 4: confirm/annotate static-block front rendering; fix the image inconsistency (static src schema-first OR "requires field" marker).',
    },
    {
      key: "500-05",
      file: "TASK-500-05-Screen-Builder-Tests-Docs-Closure.md",
      scope: "Scope item 5: regression matrix + docs + changelog + README/board closure.",
    },
  ],
};

// ---- Phase 1: parent ----
phase("Author-parent");
await agent(
  `Author the PARENT board task file ${TASKS}/${FILES.parent} for TASK-500 (Screen Builder — Sections, Insertion Targeting & Editor UX). ${AGENTS_RULES}\n${FACTS}\n${SCOPE}\nThe parent must contain: Overview (the functional gap + the 5-point scope, framed as a follow-up to the shipped TASK-498 look-parity), a subtask breakdown listing exactly these children with a one-line each: ${FILES.subs.map((s) => s.key + " (" + s.file + ")").join("; ")}, an Acceptance criteria list (measured against the prototype ${PROTO} for look + live interactivity), and a note that it is UI/client-state + a schema-first model extension (no route/RBAC change). ALSO add the TASK-500 parent + the 5 child rows to the To Do table in ${TASKS}/README.md and bump the To Do count in the Statistics block by 6 (do NOT touch other rows). Write real, execution-ready content — no placeholders. Return the parent file path + the subtask list you committed to.`,
  { label: "author:parent", phase: "Author-parent" }
);

// ---- Phase 2: subtasks (parallel — distinct files) ----
phase("Author-subtasks");
await parallel(
  FILES.subs.map(
    (s) => () =>
      agent(
        `Author the child task file ${TASKS}/${s.file} for ${s.key} under TASK-500. ${AGENTS_RULES}\n${FACTS}\n${SCOPE}\nYOUR SUBTASK FOCUS: ${s.scope}\nRead the parent ${TASKS}/${FILES.parent} first for consistency, and read the REAL source files this subtask will change (verify every anchor). Write execution-ready pseudocode (the exact helpers/props/schema changes, data flow, error handling, regression-test shape) + a Testing Requirements section (Vitest Bun-free lane) + a "Security Contract"/scope note. Match the prototype ${PROTO} for any look. Do NOT edit README (the parent author owns the board rows) or any other task file. Return the file path + a 3-line summary of the contract.`,
        { label: `author:${s.key}`, phase: "Author-subtasks" }
      )
  )
);

// ---- Phase 3: >=5 sequential drift-audit rounds ----
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
const auditTargets = [{ key: "parent", file: FILES.parent }, ...FILES.subs];

const MIN_ROUNDS = 5;
const history = [];
let lastClean = false;
for (let round = 1; round <= 8; round++) {
  const audits = await parallel(
    auditTargets.map(
      (t) => () =>
        agent(
          `Read-only drift audit (round ${round}) of TASK-500 ${t.key} — file ${TASKS}/${t.file}. Verify the contract against: the REAL current source it cites (every anchor must exist), AGENTS.md task rules, the prototype ${PROTO}, the owner scope (${SCOPE}), and the verified facts (${FACTS}). Flag: stale/invented anchors; missing execution-ready detail; schema changes not schema-first / a schemaVersion bump / destructive legacy; the panel-toggle dedupe not covering Pages+Screens; insertion-targeting not truly interactive (still one-place); "Add section" not creating a real section; FIELDS not removed; cross-subtask contradictions; any "keep the old approach" deviation; anything a workflow-driven implementer would get wrong. Return findings[] + clean (true iff 0 HIGH/MED for this file).`,
          { label: `audit:r${round}:${t.key}`, phase: "Audit", schema: DRIFT_SCHEMA }
        )
    )
  );
  const done = audits.filter(Boolean);
  const findings = done.flatMap((a, i) =>
    (a.findings || []).map((f) => ({ ...f, target: auditTargets[i].key }))
  );
  const highMed = findings.filter((f) => f.severity === "high" || f.severity === "medium");
  // false-clean guard: if any audit agent failed to return, do not treat the round as clean
  const roundClean = highMed.length === 0 && done.length === auditTargets.length;
  history.push({ round, audits: done.length, highMed: highMed.length });
  log(
    `Audit round ${round}: ${highMed.length} HIGH/MED (${done.length}/${auditTargets.length} audits)`
  );
  if (roundClean && round >= MIN_ROUNDS) {
    lastClean = true;
    break;
  }
  if (roundClean) {
    lastClean = true;
    continue;
  } // clean early but keep going to MIN_ROUNDS
  lastClean = false;
  // fix HIGH/MED (group by target file → one fixer per affected file, parallel)
  const byFile = {};
  for (const f of highMed) {
    (byFile[f.target] ||= []).push(f);
  }
  await parallel(
    Object.entries(byFile).map(([key, fs]) => () => {
      const tf = auditTargets.find((t) => t.key === key);
      return agent(
        `Fix these HIGH/MEDIUM drift findings in the TASK-500 contract file ${TASKS}/${tf.file} (CONTRACT WORDING ONLY, surgical edits, keep AGENTS.md format, do NOT touch other task files or README). Verify each against real source before editing.\n${fs.map((f) => `- [${f.severity}] ${f.area}: ${f.finding}\n  fix: ${f.recommendation}`).join("\n")}`,
        { label: `audit-fix:r${round}:${key}`, phase: "Audit" }
      );
    })
  );
}

return { rounds: history.length, lastClean, history };
