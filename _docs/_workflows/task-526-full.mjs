export const meta = {
  name: "task-526-full",
  description:
    "TASK-526 Page-editor panels scroll/overflow — full standard pipeline. Fix: the Layers panel (and any sibling page-editor panel with a tall list) has no scroll container, so blocks below the fold are unreachable (can't browse/click all layers). Add proper min-h-0 + overflow-y-auto scroll regions without breaking sticky headers/toolbars.",
  phases: [
    {
      title: "Ground",
      detail: "audit every page-editor panel for missing scroll/overflow on tall content",
    },
    { title: "Author", detail: "TASK-526 contract: parent + leaves per affected panel" },
    { title: "Pre-audit", detail: "grounding + layout-regression lens → fix" },
    {
      title: "Implement",
      detail: "add scroll containers (min-h-0 + overflow-y-auto), keep sticky chrome",
    },
    {
      title: "Post-audit",
      detail: "regression (no layout break) + fidelity (all layers reachable) → fix",
    },
    { title: "Closure", detail: "tests, docs, changelog, board, commit" },
  ],
};

const WT = "/home/coder/project/Coderso-task-526";
const TASKS = `${WT}/_docs/_TASKS`;
const DIR = "core/admin/ui/pages";

const GROUNDING = `
GROUNDED: The page editor panels live in ${DIR}/editor/ and ${DIR}/builder/. Candidates that render a tall/unbounded list and likely lack a vertical scroll container: editor/PageEditorLayers.tsx (the LAYERS tree — the owner's report: "okienka layers nie można przewijać... nie widzę wszystkich warstw"), builder/LibraryPanel.tsx, builder/VisualPanel.tsx, builder/LayoutPanel.tsx, builder/AdvancedPanel.tsx, builder/WizardPanel.tsx. Only editor/PageEditorCommandPalette.tsx currently uses overflow-auto.
ROOT CAUSE PATTERN: a flex-column panel whose list child grows past the viewport needs the LIST region to be \`min-h-0 flex-1 overflow-y-auto\` while the panel header/toolbar stays \`shrink-0\` (sticky). Without \`min-h-0\` a flex child will NOT shrink to allow overflow, so the list overflows the panel instead of scrolling. Verify each panel's flex structure before editing.
FIX SHAPE: for each affected panel, wrap the scrollable list in a \`min-h-0 flex-1 overflow-y-auto\` region (and ensure an ancestor gives the panel a bounded height — h-full within a flex-col with a bounded parent). Do NOT add overflow to a panel that is already correctly scrollable or short. Keep sticky headers/toolbars/footers outside the scroll region.
INVARIANTS: pure CSS/className/structure change; no behavior/logic change; no model/API change; NO migration. Match the existing Tailwind idiom in these files.
TESTS: the page-editor UI test lane (tests/vitest/ui/*). Assert the Layers panel list region carries the overflow/min-h-0 classes (structural) — a render + class assertion, since jsdom has no layout. Do NOT rely on computed scrollHeight.
`;

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "verdict", "findings"],
  properties: {
    lens: { type: "string" },
    verdict: { type: "string", enum: ["clean", "issues"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "title", "detail", "fix"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
  },
};
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["done", "gatesGreen", "panelsFixed", "summary"],
  properties: {
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    panelsFixed: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `Audit (read-only) EVERY page-editor panel under ${WT}/${DIR}/editor and ${WT}/${DIR}/builder for a missing vertical scroll container on tall content. For each panel: read its JSX, describe its flex structure, and decide whether a tall list can overflow unreachably (the Layers panel is the confirmed report). Return a precise list: file → does it need a scroll fix → the exact element to wrap in \`min-h-0 flex-1 overflow-y-auto\` and whether an ancestor bounds its height. Use this grounding:\n${GROUNDING}\nReturn a concise structured plain-text audit.`,
  { label: "ground:526", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 400)}`);

phase("Author");
const author = await agent(
  `Author the TASK-526 contract under ${TASKS} (match existing TASK-52x leaf format — read one first). Parent TASK-526_Page_Editor_Panels_Scroll.md + one subtask 526-01 with a leaf PER affected panel (from the ground audit). Each leaf: the exact file, the current flex structure, the precise className change (min-h-0 flex-1 overflow-y-auto on the list region; shrink-0 on sticky header/toolbar), and a structural class-assertion test. Pin: pure UI change, no migration, changelog greps next-free at closure, worktree feature/task-526. Ground audit:\n${ground}\nSet Status ⏳ To Do. Return files created.`,
  { label: "author:526", phase: "Author" }
);
log(`author: ${author.slice(0, 200)}`);

phase("Pre-audit");
let pre = 0;
while (pre < 2) {
  pre++;
  const audits = await parallel(
    [
      {
        key: "grounding",
        p: "GROUNDING lens: verify every panel/file the contract cites exists and the flex-structure claim is accurate (min-h-0 actually needed; the wrapped element is the right one). Flag wrong targets ≥MEDIUM.",
      },
      {
        key: "layout-regression",
        p: "LAYOUT-REGRESSION lens: would adding overflow-y-auto + min-h-0 break a sticky header/toolbar, a drag-and-drop layer reorder, a popover/portal that must escape the panel, or a panel that is intentionally short? Flag risks ≥MEDIUM.",
      },
    ].map(
      (l) => () =>
        agent(
          `${l.p}\nRead TASK-526 contract under ${TASKS} + ground at ${WT}. Structured audit (lens="${l.key}").`,
          { label: `preaudit:${l.key}#${pre}`, phase: "Pre-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const blk = audits
    .filter(Boolean)
    .flatMap((a) => a.findings || [])
    .filter((f) => f.severity !== "LOW");
  log(`pre-audit ${pre}: ${blk.length} blocking`);
  if (!blk.length) break;
  await agent(
    `Fix these blocking pre-audit findings in the TASK-526 contract docs under ${TASKS}. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary.`,
    { label: `preaudit-fix#${pre}`, phase: "Pre-audit" }
  );
}

phase("Implement");
const impl = await agent(
  `Implement TASK-526 on the worktree ${WT} per the authored contract under ${TASKS}. For each affected page-editor panel, add the scroll region (min-h-0 flex-1 overflow-y-auto on the list; keep header/toolbar shrink-0), matching the file's Tailwind idiom. Add the structural class-assertion tests in the UI vitest lane. Then run gates: \`bun --cwd core lint\`, \`bun --cwd core lint:types\`, root \`tsc -p tsconfig.json --noEmit\`, and the changed vitest UI files. Do NOT change any logic/behavior. Return the gate result + the list of panels fixed.`,
  { label: "impl:526", phase: "Implement", schema: GATE_SCHEMA }
);
log(
  `impl: done=${impl?.done} gates=${impl?.gatesGreen} panels=${JSON.stringify(impl?.panelsFixed)}`
);

phase("Post-audit");
let post = 0;
let residual = [];
while (post < 2) {
  post++;
  const audits = await parallel(
    [
      {
        key: "regression",
        p: "REGRESSION lens: read the diff on the worktree. Does any change break a sticky header, drag-reorder, portal/popover, or an existing UI test? Run the changed vitest UI files. Flag ≥MEDIUM.",
      },
      {
        key: "fidelity",
        p: "FIDELITY lens: does this ACTUALLY make ALL layers/blocks reachable by scrolling in the Layers panel (and other tall panels)? Confirm the scroll region is bounded (an ancestor gives height) so overflow-y-auto actually engages — a min-h-0 without a bounded parent still won't scroll. Flag if the fix won't scroll in practice ≥HIGH.",
      },
    ].map(
      (l) => () =>
        agent(`${l.p}\nWorktree ${WT}. Structured audit (lens="${l.key}").`, {
          label: `postaudit:${l.key}#${post}`,
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        })
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blk = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`post-audit ${post}: ${all.length} findings, ${blk.length} blocking`);
  if (!blk.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these blocking post-audit findings in the code on ${WT}, re-run gates. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${post}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-526 on ${WT}. Ensure gates green (core lint, lint:types, root tsc, test:bun, test:vitest or the changed UI files + a broad ui run, gates:coderso). Update docs if any UI note fits. Changelog: grep next-free in ${WT}/_docs/_CHANGELOG and create it; bump README pointer + row. Board: add TASK-526 + children to _docs/_TASKS/README.md Done, set Status ✅ Done, bump the Done stat. Commit on the worktree. Return the changelog path, commit sha, final gates verbatim, residual follow-ups.`,
  { label: "closure:526", phase: "Closure" }
);

return { task: "TASK-526", ground: ground.slice(0, 300), impl, postResidualLow: residual, closure };
