export const meta = {
  name: "task-525-impl",
  description:
    "Implement TASK-525 (full-bleed section background WITH width-constrained centered content + per-block staggered reveal) from the drift-clean contract: ground-confirm → gated sequential implement → post-audit → closure.",
  phases: [
    { title: "Ground", detail: "re-grep the post-523 section-render + reveal seams" },
    {
      title: "Implement",
      detail: "525-01 full-bleed+contained, 525-02 reveal stagger — sequential, gated",
    },
    { title: "Post-audit", detail: "regression + fidelity → fix real" },
    { title: "Closure", detail: "gates, docs, changelog, board, commit" },
  ],
};

const WT = args?.wt || "/home/coder/project/Coderso-task-525";
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
  `Read-only on worktree ${WT} (branched from POST-523 HEAD — line numbers drifted; TRUST THE SYMBOL). Confirm the real location of: toPageSectionStyle (the full-width maxWidth:"none" coupling of bg + content cap), toPageSectionRenderProps (revealClass), PAGE_REVEAL_MOTION_CSS (section hide-state), toPageBlockRenderProps frameVars merge, PageBlockStyleV2 + pageBlockStyleKeys + block-style JSON schema + normalizeBlockStyle, section style + schema, pageUniversalBlockControls. CRITICAL: determine the exact structural change for FULL-BLEED background + content centered at section.layout.maxWidth (like reference .container{width:min(maxWidth,calc(100% - 40px));margin:0 auto}), and how a per-block --reveal-delay must reach each direct-child [data-block-id] frame so the reveal transition actually CASCADES (a section-only transition-delay re-times the section as one unit — the stagger needs the transition + hide-state to apply per child frame). Read the TASK-525 contract under ${TASKS}. Return a symbol→location map + the confirmed structural approach for both subtasks.`,
  { label: "ground:525", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 300)}`);

phase("Implement");
const SUBTASKS = [
  {
    id: "525-01",
    prompt: `Implement TASK-525-01 (full-bleed background + width-constrained centered content) on ${WT} per the contract under ${TASKS}. DECOUPLE the background bleed from the content max-width: a full-width (bleed) section paints its background box edge-to-edge (100vw) while its CONTENT sits in a centered container capped at section.layout.maxWidth with margin:0 auto and a side gutter (width:min(maxWidth, calc(100% - 2*20px))), faithfully mirroring the reference .container. Today toPageSectionStyle sets maxWidth:"none" for the full-width variant on the SAME node carrying the background — split so bg bleeds but content stays capped. If the contract's grounding concluded a present-only \`style.fullBleed?: boolean\` is needed so ANY section (not just the full-width variant) can bleed, add it (model + pageBlock..NO section-style keys allowlist + schema + normalize + control). UPDATE the OWNED old full-width tests (page-renderer-v2.test.tsx :256 + :794 assert maxWidth:"none") to the new behavior, PRESERVING the w-full sibling assertions. Run gates: core lint, lint:types, root tsc, changed vitest. Return the gate result.`,
  },
  {
    id: "525-02",
    prompt: `Implement TASK-525-02 (per-block staggered reveal) on ${WT}. Add present-only PageBlockStyleV2 \`revealDelay?: number\` (ms, readNumber-clamped) → allowlist + block-style JSON schema + normalizeBlockStyle (present-only, omit when unset). Emit --reveal-delay on the block frame (frameVars) and WIRE it so children of a revealing section actually CASCADE: ensure the reveal transition (transition-[opacity,transform] + duration) AND the hide-state reach each direct-child [data-block-id] frame with transition-delay:var(--reveal-delay,0ms) — a section-only delay will NOT stagger (the contract flags this trap). Keep everything inside the existing motion-safe / [data-reveal-armed] reduced-motion gate; keep present-only byte-identity (no --reveal-delay when unauthored). Add a "Reveal delay" control to pageUniversalBlockControls. Tests: round-trip/reject-unknown/present-only + the child cascade wiring + the existing 521 reveal tests stay green. Run gates. Return result.`,
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
    key: "regression",
    p: "REGRESSION lens: are the owned full-width maxWidth tests (:256/:794) correctly rebaselined with w-full siblings preserved? Do the 521 reveal tests (reveal-up/reveal-fade/PAGE_REVEAL_MOTION_CSS) + present-only byte-identity (unstyled block toEqual) + reduced-motion gate + spotlight(523) tests all stay green? Is revealDelay present-only (no frameVar when unauthored)? Run the relevant vitest on the worktree.",
  },
  {
    key: "fidelity",
    p: "FIDELITY lens: does this ACTUALLY deliver — (a) a full-width section paints bg edge-to-edge (100vw) BUT content stays centered at section.layout.maxWidth (the owner's 'full-width centered' ask), (b) per-block revealDelay produces a real CASCADE (the transition-delay reaches child frames, not just the section as one unit)? Flag if content still spreads OR the stagger is inert (section-level only).",
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
  `Close TASK-525 on ${WT}. Ensure ALL gates green (core lint, lint:types, root tsc, test:bun, test:vitest or changed pages files + broad pages run, gates:coderso). Update docs (PAGE_MODEL.md full-bleed + revealDelay; DESIGN_TOKENS.md --reveal-delay). Changelog: grep next-free in ${WT}/_docs/_CHANGELOG (1236 is TAKEN by 526 on integration — use next-free this worktree sees; I renumber at merge if it collides) and create it; bump README pointer + row. Board: add TASK-525 + children to Done, Status ✅ Done, bump stat. Commit on the worktree. Return: changelog path, commit sha, final gates verbatim, residual follow-ups.`,
  { label: "closure:525", phase: "Closure" }
);

return {
  task: "TASK-525",
  ground: ground.slice(0, 200),
  implResults,
  postResidualLow: residual,
  closure,
};
