export const meta = {
  name: "task-524-author",
  description:
    "Author + pre-audit TASK-524 (Composable effects on one node: surface/glass floats WITH its transform-decoration/tilt; decouple glass tint from block.background; independent per-effect settability) — ground vs real split, decompose into leaves, drift-audit until clean.",
  phases: [
    {
      title: "Ground",
      detail:
        "map splitBlockComposition + resolveBlockCompositionAttrs + the anchor-transform clash",
    },
    { title: "Decompose", detail: "parent + subtasks + executable leaves with pseudocode" },
    {
      title: "Drift-audit",
      detail: "grounding + regression-risk + reference-fidelity lenses → fix, loop",
    },
    { title: "Finalize", detail: "verdict + residual" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;

const GROUNDING = `
GROUNDED (verified on feature/tasks-fixes):
- ROOT CAUSE of "only the text floats, not the glass": core/services/pages/pageRendererV2.tsx \`splitBlockComposition\` (~line 774) deliberately routes transform-writing effects (float/drift/pulse/orbit decorations, lift/scale hovers, tilt) onto an INNER wrapper, while data-surface (glass/glass-grid/radial-glow/ambient-orbs), data-layer, data-layer-anchor, data-composition, data-marquee stay on the FRAME [data-block-id]. Reason: the layer-anchor CSS ([data-layer-anchor="…"]) writes \`transform: translate(-50% …)\` on the frame, and effects also write \`transform\`; on ONE node they clash, so the frame keeps the anchor translate and the inner wrapper animates. CONSEQUENCE: a block with BOTH surface(glass, frame) AND a transform-decoration(float, inner) shows the glass STATIC while only the inner content floats. Same for glass + tilt.
- SECONDARY "each chip a different glass tint / one green one none": core/services/pages/pageCompositionEffects.tsx \`resolveBlockCompositionAttrs\` seeds --surface-glow / --deco-ring / --orb-color from the block's PLAIN-color \`style.background\` (\`glow = bg && !isGradientOrUrl(bg) ? bg : undefined\`) whenever needsGlow. So chips whose background differs (#8ee8ff vs #adffd8 vs none) get inconsistent glass tints, and there is NO way to set the glass tint independently of the block background.
- THE ANCHOR CSS: core/services/pages/pageCompositionEffects.tsx PAGE_COMPOSITION_EFFECTS_CSS maps [data-layer-anchor="top-left"|…|"bottom-right"] to \`transform: translate(…)\`. If this used the independent CSS \`translate:\` PROPERTY instead of \`transform: translate()\`, the anchor self-offset would COMPOSE with a \`transform\`-based effect on the SAME node (translate property and transform are separate composited properties). That frees the frame to carry surface + one transform-effect together.
- MODEL: PageBlockStyleV2 (pageDocumentV2.ts) already has surfacePreset; a new present-only surface-tint field (e.g. \`surfaceTint?: string\` via sanitizeAuthoringCssColor, alpha-capable TASK-519) would let authors set the glass glow independently instead of deriving from background. Reject-unknown allowlist + JSON schema + normalize present-only. NO migration, NO schemaVersion bump.
- CONTROLS: block universal composition controls live in core/services/pages/pageEditorControlRegistry.ts (pageUniversalBlockControls). Add the surface-tint control there (mirror an existing color control). Ground the real symbol.
- REFERENCE: _docs/projekty-domow-wow-site/ .floating-chip = position:absolute + left/top (NOT transform for the corner) + @keyframes floatChip animating transform:translateY — i.e. anchor via position, float via transform, ON ONE ELEMENT. That is the target behavior.
- INVARIANTS: present-only byte-identity, reject-unknown, colors only via sanitizeAuthoringCssColor/Background, reduced-motion gates unchanged, tilt still needs a perspective parent (keep the perspective on an ancestor). The fix must NOT regress the existing 522 tests that assert data-deco/data-surface placement — those assertions may need updating to the new (correct) placement; call that out as an OWNED breaking-test change, not drift.
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

phase("Ground");
const ground = await agent(
  `Read-only: confirm the TASK-524 root-cause grounding below against real code at ${ROOT}. Verify splitBlockComposition, resolveBlockCompositionAttrs's background-derived --surface-glow, the [data-layer-anchor] transform CSS, and whether switching the anchor to the CSS \`translate:\` property (composing with \`transform:\`) is viable to let surface + a transform-decoration co-locate on ONE node. Also identify EVERY existing test that asserts frame-vs-inner placement of data-deco/data-surface/data-hover (these will need owned updates). Return a concise confirmation + the exact test files/asserts affected + any drift.\n${GROUNDING}`,
  { label: "ground:524", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Decompose");
const decompose = await agent(
  `Author the TASK-524 contract under ${TASKS} per AGENTS.md Multi-Agent Workflow Process, matching the format of existing TASK-52x leaf files (read one first). Create parent TASK-524_Composable_Effects_Single_Node_And_Independent_Surface_Tint.md + subtasks:
- 524-01 Co-locate surface with its transform effect (the "glass floats with content" fix): switch [data-layer-anchor] from \`transform: translate()\` to the CSS \`translate:\` PROPERTY in PAGE_COMPOSITION_EFFECTS_CSS; rework splitBlockComposition so a transform-DECORATION (float/drift/pulse/orbit) and transform-HOVER (lift/scale) and data-surface stay on the SAME node (the frame), with the anchor self-offset now on the free \`translate:\` property; keep TILT on an inner node (perspective parent) OR document that tilt+decoration on one block remains an edge combo; UPDATE the 522 placement tests to the new correct placement (owned breaking change). Leaves: L01 anchor→translate-property CSS, L02 splitBlockComposition co-location, L03 update placement tests + new "glass+float move together" render test asserting the surface data-attr is on the SAME node as data-deco.
- 524-02 Independent surface tint (decouple glass color from block.background): add present-only PageBlockStyleV2 \`surfaceTint?: string\` (sanitizeAuthoringCssColor, alpha-capable) that seeds --surface-glow/--deco-ring/--orb-color in resolveBlockCompositionAttrs INSTEAD OF the background-derived value (background stays a FALLBACK only when no surfaceTint); reject-unknown allowlist + JSON schema + normalize; add a "Surface tint" control to pageUniversalBlockControls mirroring an existing alpha color control. Leaves: L01 model+schema+normalize, L02 resolver uses surfaceTint (background fallback), L03 control, L04 tests (round-trip/reject-unknown/present-only/resolver precedence).
Land order 524-01 → 524-02. Each leaf: execution-ready pseudocode citing the grounded file:symbol, Security note (colors only via sanitizeAuthoringCssColor write+render; present-only), Vitest test lane, regression/breaking-test ownership. Pins: NO migration, NO schemaVersion bump, NO dep; changelog greps next-free at closure; worktree feature/task-524 off feature/tasks-fixes HEAD AFTER TASK-523 merges (this task edits the SAME pageRendererV2/pageCompositionEffects regions as 523's spotlight fix, so it must branch from the post-523 HEAD — state this dependency in the parent). Use this grounding verbatim + the ground-phase confirmation:\n${GROUNDING}\nGround confirmation: ${ground.slice(0, 600)}\nSet all Status ⏳ To Do. Return a concise summary of files created.`,
  { label: "decompose:524", phase: "Decompose" }
);
log(`decompose: ${decompose.slice(0, 200)}`);

phase("Drift-audit");
let round = 0;
let residual = [];
while (round < 3) {
  round++;
  const audits = await parallel(
    [
      {
        key: "grounding",
        p: "GROUNDING lens: verify every file:symbol the TASK-524 contract cites exists and the described change (translate-property anchor, splitBlockComposition co-location, surfaceTint resolver precedence, the control registry) is coherent with real code. Confirm the CSS \`translate:\` property approach actually composes with transform (note any browser-support caveat to document). Flag ungrounded/incorrect ≥MEDIUM.",
      },
      {
        key: "regression",
        p: "REGRESSION lens: list every existing test that will break from moving data-surface/data-deco placement + the anchor CSS change, and confirm the contract OWNS those updates (not silent). Confirm present-only byte-identity + reduced-motion gates are preserved + tilt still gets its perspective parent. Flag unowned breakage ≥MEDIUM.",
      },
      {
        key: "fidelity",
        p: "REFERENCE-FIDELITY lens: does the contract actually deliver the owner's asks — (a) glass/surface floats/tilts TOGETHER with the block (not just inner text), (b) glass tint independently settable (not derived from background), (c) effects combinable independently? Compare to _docs/projekty-domow-wow-site/.floating-chip. Flag if a fix is cosmetic or misses the node-split cause ≥MEDIUM.",
      },
    ].map(
      (l) => () =>
        agent(
          `${l.p}\nRead the TASK-524 contract under ${TASKS} + ground against ${ROOT}. Return structured audit (lens="${l.key}").`,
          { label: `audit:${l.key}#${round}`, phase: "Drift-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blocking = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`round ${round}: ${all.length} findings, ${blocking.length} blocking`);
  if (!blocking.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these BLOCKING findings in the TASK-524 contract docs under ${TASKS} (edit .md only). Keep pins consistent (post-523 HEAD dependency, no migration, changelog greps next-free). Findings:\n${JSON.stringify(blocking, null, 2)}\nReturn a summary.`,
    { label: `fix#${round}`, phase: "Drift-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Finalize");
return {
  task: "TASK-524",
  rounds: round,
  finalVerdict: residual.every((f) => f.severity === "LOW") ? "clean" : "residual-blocking",
  residualLow: residual,
  decomposeSummary: decompose.slice(0, 600),
};
