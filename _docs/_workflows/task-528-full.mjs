export const meta = {
  name: "task-528-full",
  description:
    "TASK-528 Whole-card tilt: the tilt transform must ride the SAME node as the surface/glass (the frame) so the ENTIRE card tilts, not just its inner content; move the perspective to an ANCESTOR wrapper. Fixes owner report: tilt applied to a group only tilts the inside, not the whole glass card.",
  phases: [
    { title: "Ground", detail: "confirm splitBlockComposition tilt→inner + perspective→frame" },
    {
      title: "Implement",
      detail: "tilt→frame (co-locate w/ surface), perspective→ancestor wrapper, tests",
    },
    {
      title: "Post-audit",
      detail: "regression + fidelity (whole card tilts, glass moves with it) → fix",
    },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-528";
const TASKS = `${WT}/_docs/_TASKS`;

const GROUNDING = `
OWNER BUG (confirmed on live DOM): a group/block with \`tilt\` + \`surfacePreset:"glass"\` — the frame [data-block-id] carries data-surface (glass) but NOT data-block-tilt; the tilt sits on an INNER child, so on hover ONLY the inner content tilts and the glass CARD stays flat ("odchyla się tylko to co w środku, nie cała karta").
ROOT: core/services/pages/pageRendererV2.tsx splitBlockComposition — line ~893 \`if (comp.perspectiveParent) effectToInner.add("data-block-tilt")\` forces tilt onto the INNER wrapper, and line ~907 \`frameAttrs["data-tilt-parent"] = ""\` puts the PERSPECTIVE on the FRAME. So the inner node tilts WITHIN the frame's perspective while the frame (glass) is static.
FIX (match reference .tilt-card): the tilt transform must be on the SAME node as the surface — i.e. data-block-tilt goes on the FRAME (co-located with data-surface / border-radius / anchor translate-property). The CSS \`perspective\` (data-tilt-parent) must move to an ANCESTOR of the frame (perspective must be on a PARENT, not the transformed node itself). Concretely:
- splitBlockComposition: STOP adding data-block-tilt to effectToInner; add it to frameAttrs instead. STOP stamping data-tilt-parent on the frame.
- renderPageBlockWithFrame (~line 2212): when the block has tilt (perspectiveParent), WRAP the rendered frame in a \`<div data-tilt-parent style={{perspective:"1200px"}}>\` (or apply data-tilt-parent to the existing immediate wrapper / cx-layered-slot) so the frame tilts within an ancestor's perspective.
- PAGE_COMPOSITION_EFFECTS_CSS: [data-tilt-parent]{perspective:1200px} stays; [data-block-tilt]{transform-style:preserve-3d;position:relative} now applies to the FRAME (fine with data-surface overflow:hidden + anchor translate). The .cx-glare child stays inside the frame.
- The tilt RUNTIME (pageEffectsRuntime.ts) binds [data-block-tilt] pointermove and writes inline transform — now on the FRAME → the whole glass card (rotateX/Y) tilts. Anchor uses the CSS \`translate:\` property (TASK-524-01) so it composes with the tilt \`transform\`. EDGE: a block with BOTH tilt AND a transform-decoration (float/drift) would contend on \`transform\` on the frame — document as a known rare combo (the reference never combines them; chips float, card tilts).
- TESTS (owned rebaseline): the 522/524 tilt tests assert data-block-tilt on an inner node + data-tilt-parent on the frame — FLIP them to assert data-block-tilt on the frame (same node as data-surface) + data-tilt-parent on an ancestor wrapper. ADD a "whole card tilts" test: for a block with tilt+glass, data-block-tilt and data-surface are the SAME node.
- INVARIANTS: present-only byte-identity when no tilt; reduced-motion gate unchanged; NO migration/schemaVersion/dep. Changelog greps next-free (1240).
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
  `Read-only on worktree ${WT}. Confirm splitBlockComposition (tilt→inner at ~893, perspective→frame at ~907) + renderPageBlockWithFrame structure (~2212) + the tilt runtime binding + PAGE_COMPOSITION_EFFECTS_CSS [data-tilt-parent]/[data-block-tilt] rules + every existing test asserting tilt frame-vs-inner placement. Determine the cleanest way to put data-block-tilt on the FRAME and perspective on an ANCESTOR wrapper. Use this grounding:\n${GROUNDING}\nReturn a symbol→location map + the exact wrapper approach + the affected tests.`,
  { label: "ground:528", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Implement");
const impl = await agent(
  `Implement TASK-528 (whole-card tilt) on ${WT} per this grounding:\n${GROUNDING}\nGround confirmation: ${ground.slice(0, 800)}\nMove data-block-tilt onto the FRAME (co-located with data-surface), wrap the frame in a data-tilt-parent perspective ancestor in renderPageBlockWithFrame, keep the glare child inside the frame, keep preserve-3d on the (now frame) tilt node. Update the owned tilt placement tests to assert data-block-tilt is the SAME node as data-surface + data-tilt-parent is an ancestor, and ADD a "whole card (glass+tilt) is one node" test. Keep present-only byte-identity + reduced-motion gate. Run gates: bun --cwd core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  { label: "impl:528", phase: "Implement", schema: GATE_SCHEMA }
);
log(`impl: done=${impl?.done} gates=${impl?.gatesGreen}`);

phase("Post-audit");
const POST = [
  {
    key: "regression",
    p: "REGRESSION lens: are the owned tilt placement tests correctly flipped + no other test silently broken? Does the tilt runtime still bind (now the frame)? Is present-only byte-identity intact when no tilt? Does anchor (translate property) still compose with tilt (transform) on the frame? Reduced-motion gate intact? Run the relevant vitest on ${WT}.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does the WHOLE glass card now tilt (data-block-tilt === the data-surface node; perspective on an ancestor)? Confirm a group with tilt+glass tilts the entire card frame (with its glass/border-radius/children) on hover, not just inner content — the owner's exact ask. Flag if tilt is still on a non-surface node.",
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
  `Close TASK-528 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed pages files + broad pages run, gates:coderso). Update PAGE_MODEL.md (tilt now on the surface node, perspective on ancestor). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG (likely 1240) + create it + README pointer/row. Board: add TASK-528 to _docs/_TASKS/README.md Done, Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual.`,
  { label: "closure:528", phase: "Closure" }
);

return { task: "TASK-528", ground: ground.slice(0, 200), impl, postResidualLow: residual, closure };
