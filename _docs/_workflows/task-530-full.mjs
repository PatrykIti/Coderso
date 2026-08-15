export const meta = {
  name: "task-530-full",
  description:
    "TASK-530 All page-editor numeric sliders step by 1 (not the coarse 2/4/10 derived from range). One-place fix in resolveSliderStep + drop the explicit parallaxIntensity step:2; fractional ranges (line-height/letter-spacing 0.05) stay fine-grained. Affects page editor, page templates, block+section option panels, and the shared menu design editor (same UI model).",
  phases: [
    {
      title: "Ground",
      detail:
        "confirm resolveSliderStep + parallaxIntensity step + affected tests + shared consumers",
    },
    {
      title: "Implement",
      detail: "resolveSliderStep→1 for max>1; drop parallaxIntensity step:2; update tests",
    },
    {
      title: "Post-audit",
      detail:
        "regression (fractional stays, no slider breaks) + fidelity (every integer slider steps by 1) → fix",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-530";
const TASKS = `${WT}/_docs/_TASKS`;

const GROUNDING = `
OWNER REQUEST: every numeric SLIDER in the page editor (options that have one) must increment by 1, not the coarse steps (owner said "4/15/8" — actual derived defaults are 2/4/10). Fine control. He wants it changed in ONE place so it applies to the page editor, page templates, block+section option panels (all share the control UI model).
ROOT: core/services/pages/pageEditorControlUiModel.ts \`resolveSliderStep(clamp)\` (~line 268):
  if (clamp.max <= 1) return 0.05;   // fractional ranges (line-height 0..2, letter-spacing) — KEEP fine-grained
  const span = clamp.max - clamp.min;
  if (span <= 64) return 1;
  if (span <= 160) return 2;   // ← coarse
  if (span <= 400) return 4;   // ← coarse
  return 10;                    // ← coarse
Used at line ~304: \`step: control.step ?? resolveSliderStep(clamp)\` — so registry-explicit steps win; only the DERIVED default produces the coarse 2/4/10.
FIX (one place): resolveSliderStep returns 1 for every numeric (max > 1) range; keep the \`max <= 1 → 0.05\` branch (line-height/letter-spacing can't step by 1). i.e.:
  const resolveSliderStep = (clamp) => (clamp.max <= 1 ? 0.05 : 1);
ALSO: the ONE explicit integer step in the registry — core/services/pages/pageEditorControlRegistry.ts \`block.style.parallaxIntensity\` has \`step: 2\` (px integer slider). DROP that \`step: 2\` line so it falls through to the (now 1) default → parallax intensity also steps by 1. Do NOT touch the fractional registry steps (line-height step:0.05, letter-spacing step:0.5) — those are intentional fine-grained and must stay.
SHARED CONSUMERS (same UI model → all get step 1 automatically): page editor + page templates (PageAuthoringCanvas), block/section control panels, and core/admin/ui/menus/MenuDesignEditor.tsx (menu design sliders). This is the desired one-place behavior; note the menu side-effect in the changelog.
TESTS to update (owned): tests/vitest/pages/page-editor-control-ui-model.test.ts (asserts resolveSliderStep-derived steps 2/4/10 for wide ranges — rebaseline to 1) + tests/vitest/ui/page-editor-v2-flow.test.tsx (any slider step assertion). ADD an assertion that a wide-range integer slider (e.g. maxWidth 320..1920) now models step:1 and that a fractional range (max<=1) stays 0.05.
INVARIANTS: sliderStepper vs slider kind split (PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD) unchanged — wide ranges still pair with steppers, now ±1; clamping unchanged; no model/schema/migration/dep change. Changelog greps next-free (1242).
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
  required: ["done", "gatesGreen", "summary"],
  properties: {
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `Read-only on worktree ${WT}. Confirm resolveSliderStep (pageEditorControlUiModel.ts ~268) + its use at ~304, the parallaxIntensity step:2 (pageEditorControlRegistry.ts), the fractional registry steps to PRESERVE (line-height/letter-spacing), every test asserting slider step values, and the shared consumers (page templates, MenuDesignEditor). Use this grounding:\n${GROUNDING}\nReturn the exact edits + affected tests + confirmation the model is the single source for page editor + templates + panels.`,
  { label: "ground:530", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 250)}`);

phase("Implement");
const impl = await agent(
  `Implement TASK-530 on ${WT} per this grounding:\n${GROUNDING}\nGround: ${ground.slice(0, 500)}\nChange resolveSliderStep to \`clamp.max <= 1 ? 0.05 : 1\` (keep the fractional branch). Drop \`step: 2\` from block.style.parallaxIntensity in the registry. Do NOT change the fractional registry steps (0.05/0.5). Update the owned tests (rebaseline coarse 2/4/10 assertions to 1; add a wide-range=1 + fractional=0.05 assertion). Run gates: bun --cwd core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  { label: "impl:530", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${impl?.done} gates=${impl?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "regression",
    p: "REGRESSION lens: do fractional sliders (line-height/letter-spacing) STILL use their fine steps (0.05/0.5, not 1)? Does the slider-vs-sliderStepper kind split + clamping stay intact? Are all owned test rebaselines correct + no other slider/step test silently broken? Run the relevant vitest on ${WT}.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does EVERY integer/pixel slider in the page editor (block+section panels, incl. parallaxIntensity, maxWidth, paddings, radius, etc.) now step by 1 — the owner's exact ask — while fractional ranges stay fine-grained? Confirm resolveSliderStep returns 1 for all max>1 ranges and no coarse 2/4/10 remains. Flag any slider still coarse.",
  },
];
let residual = [];
let pr = 0;
while (pr < 3) {
  pr++;
  const audits = await parallel(
    POST.map(
      (l) => () =>
        agent(`${l.p}\nWorktree ${WT}. Structured audit (lens="${l.key}").`, {
          label: `postaudit:${l.key}#${pr}`,
          phase: "Post-audit",
          schema: AUDIT_SCHEMA,
        })
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blk = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`post-audit ${pr}: ${all.length} findings, ${blk.length} blocking`);
  if (!blk.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these BLOCKING post-audit findings in the code on ${WT}, re-run gates. Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${pr}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-530 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed files + broad run, gates:coderso). Note the MenuDesignEditor step side-effect in the changelog. Changelog: grep next-free in ${WT}/_docs/_CHANGELOG + create it + README pointer/row. Board: add TASK-530 to _docs/_TASKS/README.md Done, Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual.`,
  { label: "closure:530", phase: "Closure" }
);

return { task: "TASK-530", ground: ground.slice(0, 200), impl, postResidualLow: residual, closure };
