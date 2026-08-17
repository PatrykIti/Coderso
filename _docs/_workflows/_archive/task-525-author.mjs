export const meta = {
  name: "task-525-author",
  description:
    "Author + pre-audit TASK-525 (Full-bleed section background WITH width-constrained centered content + per-block staggered reveal). Ground vs real renderer, decompose into leaves, drift-audit until clean.",
  phases: [
    { title: "Ground", detail: "map section width/bleed rendering + reveal model" },
    { title: "Decompose", detail: "parent + 2 subtasks + executable leaves" },
    { title: "Drift-audit", detail: "grounding + regression + reference-fidelity → fix, loop" },
    { title: "Finalize", detail: "verdict + residual" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;

const GROUNDING = `
GROUNDED (verified on feature/tasks-fixes):
- FULL-WIDTH BUG (owner: "full width dla tła się udał ale wszystko jest teraz rozsunięte a chcę aby było dla pewnej szerokości" — the prototype has a FULL-BLEED background but the CONTENT stays in a centered max-width container). core/services/pages/pageRendererV2.tsx toPageSectionStyle (~line 404) sets \`maxWidth: template.variant === "full-width" ? "none" : \`\${section.layout.maxWidth}px\`\` — so the full-width variant drops the content max-width entirely and the CONTENT spreads edge-to-edge. A prior fix (commit 3eac13f9 "bleed full-width section backgrounds") made the BACKGROUND full-bleed. TARGET: DECOUPLE the two — a full-width section paints its background/section box full-bleed to the viewport (100vw) BUT wraps its CONTENT in a centered container capped at section.layout.maxWidth (like the reference \`.container{width:min(var(--container),calc(100% - 40px));margin:0 auto}\` INSIDE a full-width section). So the author should be able to have full-bleed bg + contained content. Verify the exact section DOM structure (is the background on the same element as the content grid, or is there a separate bg layer?) — the fix likely needs an inner content wrapper with maxWidth+margin:auto that is INDEPENDENT of the full-bleed background element. Check toPageSectionRenderProps / PageSectionContent / PageSectionRender for where the content grid + its maxWidth is applied, and where the section background bleeds.
  * Consider whether "full-width" being a section VARIANT (template) is the right control, or whether a separate present-only per-section toggle (e.g. style.fullBleed?: boolean) is cleaner so ANY section can bleed its bg while keeping contained content. Ground the real control exposure (does the editor let a user pick the full-width variant / set maxWidth?). Recommend the minimal model change (prefer reusing section.layout.maxWidth for the content cap + a bleed flag).
- PER-BLOCK STAGGERED REVEAL (owner gap vs reference [data-reveal][data-delay] → --delay). Today reveal is SECTION-level only: PageSectionStyleV2.scrollEffect (reveal-fade|reveal-up|parallax) via the runtime (pageEffectsRuntime.ts) toggling data-revealed on the section. The reference staggers CHILD elements with per-element --delay so items cascade in. TARGET: a per-block reveal delay so a revealing section's children animate in sequence. Options: (a) a present-only PageBlockStyleV2 \`revealDelay?: number\` (ms, clamped) that emits --reveal-delay consumed by the reveal CSS transition-delay; or (b) an auto-stagger on the section (each direct child gets an incremental --delay). Ground PAGE_REVEAL_MOTION_CSS + how the section reveal transition is written before choosing. Prefer the explicit per-block revealDelay (composes with existing controls; present-only byte-identity) + optionally an auto-stagger convenience. Reject-unknown + JSON schema + normalize (readNumber clamp).
- INVARIANTS: present-only byte-identity, reject-unknown allowlist + additionalProperties:false, reduced-motion gates unchanged (reveal already JS-gated), NO migration, NO schemaVersion bump, NO dep. Update any existing section-width / reveal test that asserts the old behavior as an OWNED change.
- DEPENDENCY: this edits the SAME pageRendererV2 section-render region as TASK-523's root/spotlight change, so 525 impl must branch from the POST-523-merge HEAD. State this in the parent.
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
  `Read-only: confirm the TASK-525 grounding below against real code at ${ROOT}. CRITICAL: find the exact section DOM structure — where the full-bleed BACKGROUND is applied vs where the CONTENT grid + its max-width live (toPageSectionStyle ~pageRendererV2.tsx:404, toPageSectionRenderProps, PageSectionContent, PageSectionRender). Determine the minimal change to get FULL-BLEED BG + CENTERED CONTENT capped at section.layout.maxWidth. Also ground PAGE_REVEAL_MOTION_CSS + the section reveal transition to decide how a per-block --reveal-delay would compose. List every existing test asserting the old full-width/reveal behavior. Return a concise confirmation + the exact structural approach + affected tests + any drift.\n${GROUNDING}`,
  { label: "ground:525", phase: "Ground" }
);
log(`ground: ${ground.slice(0, 400)}`);

phase("Decompose");
const decompose = await agent(
  `Author the TASK-525 contract under ${TASKS} per AGENTS.md, matching existing TASK-52x leaf format (read one first). Parent TASK-525_Fullbleed_Background_Contained_Content_And_Staggered_Reveal.md + subtasks:
- 525-01 Full-bleed background + width-constrained centered content: make a full-width section paint its background edge-to-edge (100vw bleed) while wrapping content in a centered container capped at section.layout.maxWidth. Prefer reusing section.layout.maxWidth for the content cap + a minimal bleed mechanism; if a model field is needed prefer a present-only \`style.fullBleed?: boolean\` (reject-unknown + schema + normalize) so ANY section can bleed its bg with contained content. Leaves: L01 render (decouple bg bleed from content max-width), L02 model+schema+control if a flag is added, L03 tests (full-bleed bg + content stays at maxWidth centered; byte-identity when off) + update owned old full-width tests.
- 525-02 Per-block staggered reveal: present-only \`PageBlockStyleV2.revealDelay?: number\` (ms, readNumber-clamped) emitting --reveal-delay consumed by the reveal transition-delay, so children of a revealing section cascade; + a page-settings/section auto-stagger convenience if cheap. Leaves: L01 model+schema+normalize, L02 render/CSS wiring (--reveal-delay in PAGE_REVEAL_MOTION_CSS transition-delay), L03 control in pageUniversalBlockControls, L04 tests (round-trip/reject-unknown/present-only + reveal delay applied).
Land order 525-01 → 525-02. Each leaf: execution-ready pseudocode citing the grounded file:symbol, Security note, Vitest test lane, regression/owned-breaking-test note. Pins: NO migration/schemaVersion/dep; changelog greps next-free at closure; worktree feature/task-525 off feature/tasks-fixes HEAD AFTER TASK-523 merges (same renderer region) — state this in the parent. Use grounding verbatim + ground confirmation:\n${GROUNDING}\nGround: ${ground.slice(0, 600)}\nSet Status ⏳ To Do. Return files created.`,
  { label: "decompose:525", phase: "Decompose" }
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
        p: "GROUNDING lens: verify every file:symbol the TASK-525 contract cites exists and the described structural change (bg bleed vs content max-width decouple; --reveal-delay wiring) is coherent with real code. Flag ungrounded/incorrect ≥MEDIUM.",
      },
      {
        key: "regression",
        p: "REGRESSION lens: list existing full-width / reveal tests that break, confirm the contract owns them; confirm present-only byte-identity + reduced-motion gates preserved; confirm non-full-width sections + spotlight (523) are untouched. Flag unowned breakage ≥MEDIUM.",
      },
      {
        key: "fidelity",
        p: "REFERENCE-FIDELITY lens: does the contract deliver full-bleed BG + centered content at a chosen width (the owner's exact ask, matching _docs/projekty-domow-wow-site .container inside full-width sections) AND per-block cascade reveal? Flag if it misses the decouple or the stagger ≥MEDIUM.",
      },
    ].map(
      (l) => () =>
        agent(
          `${l.p}\nRead TASK-525 contract under ${TASKS} + ground at ${ROOT}. Structured audit (lens="${l.key}").`,
          { label: `audit:${l.key}#${round}`, phase: "Drift-audit", schema: AUDIT_SCHEMA }
        )
    )
  );
  const all = audits.filter(Boolean).flatMap((a) => a.findings || []);
  const blk = all.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(`round ${round}: ${all.length} findings, ${blk.length} blocking`);
  if (!blk.length) {
    residual = all;
    break;
  }
  await agent(
    `Fix these blocking findings in the TASK-525 contract docs under ${TASKS} (edit .md only). Keep pins (post-523 HEAD dep, no migration). Findings:\n${JSON.stringify(blk, null, 2)}\nReturn summary.`,
    { label: `fix#${round}`, phase: "Drift-audit" }
  );
  residual = all.filter((f) => f.severity === "LOW");
}

phase("Finalize");
return {
  task: "TASK-525",
  rounds: round,
  finalVerdict: residual.every((f) => f.severity === "LOW") ? "clean" : "residual-blocking",
  residualLow: residual,
  decomposeSummary: decompose.slice(0, 600),
};
