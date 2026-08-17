export const meta = {
  name: "task-524-impl",
  description:
    "Implement TASK-524 (glass floats WITH its transform effect via translate-property anchor + independent surfaceTint + radius-clip on hover) from the drift-clean contract: ground-confirm → gated sequential implement → post-audit → closure.",
  phases: [
    { title: "Ground", detail: "re-grep the post-523 seams (line numbers drifted)" },
    {
      title: "Implement",
      detail: "524-01 co-locate, 524-02 surfaceTint, 524-03 radius-clip — sequential, gated",
    },
    { title: "Post-audit", detail: "security + regression + fidelity → fix real" },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-524";
const TASKS = `${WT}/_docs/_TASKS`;

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
  required: ["subtask", "done", "gatesGreen", "summary"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    gatesGreen: { type: "boolean" },
    summary: { type: "string" },
  },
};

phase("Ground");
const ground = await agent(
  `Read-only on worktree ${WT} (branched from the POST-523 HEAD — line numbers drifted from the contract, TRUST THE SYMBOL not the number). Confirm the real current location of: splitBlockComposition, resolveBlockCompositionAttrs (--surface-glow background-derivation), PAGE_COMPOSITION_EFFECTS_CSS [data-layer-anchor] transform rules, PageBlockStyleV2 + pageBlockStyleKeys + block-style JSON schema + normalizeBlockStyle, pageUniversalBlockControls, and the tilt inner node + glass surface node in renderPageBlockWithFrame. Also identify the exact node that carries border-radius vs the node that transforms (for the radius-clip fix). Read the TASK-524 contract under ${TASKS}. Return a concise symbol→location map + confirmation the contract approach still holds post-523.`,
  { label: "ground:524", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Implement");
const SUBTASKS = [
  {
    id: "524-01",
    prompt: `Implement TASK-524-01 (co-locate surface with its transform effect — "glass floats with content") on ${WT} per the contract under ${TASKS}. Switch [data-layer-anchor] rules in PAGE_COMPOSITION_EFFECTS_CSS from \`transform: translate()\` to the CSS \`translate:\` PROPERTY (composes with transform). Rework splitBlockComposition so transform-DECORATIONS (float/drift/pulse/orbit), transform-HOVERS (lift/scale) and data-surface stay on the SAME node (the frame) with the anchor self-offset on the free \`translate:\` property; keep TILT on its inner perspective node. Update the OWNED 522 placement tests to the new correct placement (the contract enumerates them: page-renderer-v2.test.tsx flip tests + page-composition-effects.test.ts anchor assertions) and ADD a "glass + float move together" render test asserting data-surface is on the SAME node as data-deco. Run gates: core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  },
  {
    id: "524-02",
    prompt: `Implement TASK-524-02 (independent surfaceTint) on ${WT}. Add present-only PageBlockStyleV2 \`surfaceTint?: string\` (sanitizeAuthoringCssColor, alpha-capable; note the sanitizer only accepts hex/hex8/rgba/hsl/transparent/allowlisted var(--color-*)), add to pageBlockStyleKeys allowlist + block-style JSON schema + normalizeBlockStyle (present-only). In resolveBlockCompositionAttrs seed --surface-glow/--deco-ring/--orb-color from surfaceTint when present, with the block background as FALLBACK only. Add a "Surface tint" control to pageUniversalBlockControls mirroring an existing alpha color control. Tests: round-trip/reject-unknown/present-only/resolver precedence (surfaceTint wins over background). Run gates. Return result.`,
  },
  {
    id: "524-03",
    prompt: `Implement TASK-524-03 (radius-clip on hover — owner: a block with border-radius + glass shows SHARP edges on hover/tilt movement). Root: the transforming glass node does not clip its border-radius during transform (backdrop-filter/child layers escape the rounded box). On ${WT}, ensure the node that carries the surface preset + border-radius also clips its rounded box during transform — add \`overflow: hidden\` (or \`isolation: isolate\` + clip as appropriate) to the glass/surface node in PAGE_COMPOSITION_EFFECTS_CSS or renderPageBlockWithFrame so the rounded corners stay clipped while the node tilts/floats/glows; do NOT clip content that must overflow (e.g. floating chips anchored outside — verify the chips are NOT children of the clipped card, or scope the clip to the surface layer). Add a Vitest assertion that the surface node carries the radius-clip. Ground the exact node first (border-radius comes from block style.radius / section radius). Run gates. Return result.`,
  },
];
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(st.prompt, {
    label: `impl:${st.id}`,
    phase: "Implement",
    schema: GATE_SCHEMA,
  });
  implResults.push(r);
  log(`impl ${st.id}: done=${r?.done} gates=${r?.gatesGreen}`);
}

phase("Post-audit");
const POST = [
  {
    key: "security",
    p: "SECURITY lens: can any injection reach the DOM via surfaceTint (semicolon CSS injection, url(javascript:), expression) past sanitizeAuthoringCssColor at write+render? Is present-only byte-identity real (no --surface-glow/surfaceTint emitted when unauthored)? Read the diff on the worktree.",
  },
  {
    key: "regression",
    p: "REGRESSION lens: are ALL owned placement-test rebaselines correct and no OTHER test silently broken? Does tilt still get its perspective parent? Present-only byte-identity for unstyled blocks intact? Does the translate-property anchor still position all 9 anchors correctly (computed translate)? Run the relevant vitest on the worktree.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does this ACTUALLY deliver — (a) glass/surface floats+tilts TOGETHER with content (data-surface co-located with data-deco/data-hover on one node, anchor via translate property), (b) surfaceTint sets the glass independently of background, (c) radius-clip removes sharp edges on hover? Flag if any is cosmetic-only or misses the node-split/clip cause.",
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
    `Fix these BLOCKING post-audit findings in the code on ${WT}, re-run gates (core lint, lint:types, root tsc, changed vitest). Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary + gates.`,
    { label: `postaudit-fix#${pr}`, phase: "Post-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Closure");
const closure = await agent(
  `Close TASK-524 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or the changed pages files + broad pages run, gates:coderso). Update docs (PAGE_MODEL.md surfaceTint + co-location note; DESIGN_TOKENS.md --surface-glow precedence; SECURITY_SPEC.md if a color note fits). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG (note 1236 is TAKEN by 526 on the integration branch — but this worktree may not see it; use the next-free THIS worktree sees and I will renumber at merge if it collides) and create it; bump README pointer + row. Board: add TASK-524 + children to Done, set Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual follow-ups.`,
  { label: "closure:524", phase: "Closure" }
);

return {
  task: "TASK-524",
  ground: ground.slice(0, 200),
  implResults,
  postResidualLow: residual,
  closure,
};
