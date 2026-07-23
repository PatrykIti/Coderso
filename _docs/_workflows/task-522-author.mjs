import { buildTask522FixPrompt } from "./lib/task-522-findings-prompt.mjs";

export const meta = {
  name: "task-522-author",
  description:
    "Author TASK-522 (Rich hero/section composition: sanitized custom-SVG block + floating-drift decoration + tilt-on-any-block + layered hero/section canvas + glass/glow presets) as a GRANULAR execution-ready contract (parent + NN + NN-LNN leaves w/ pseudocode), grounded in the reference wow-site + the live code + TASK-521 outputs, then a drift-audit LOOP (up to 5 rounds) until 0 HIGH/MEDIUM. Docs-only.",
  phases: [{ title: "Author" }, { title: "DriftAudit" }, { title: "FinalReconcile" }],
};

const ROOT = "/home/coder/project/Coderso";
const TASK = "TASK-522";

const GROUNDING = `GROUNDED FACTS (verify each vs live code at ${ROOT}; large .tsx read as binary to rg — use grep -an/Read: PageEditor.tsx, pageRendererV2.tsx, pageDocumentV2.ts, pageEditorControlRegistry.ts, hero.tsx):

REFERENCE WOW-SITE (owner's target; pure HTML/CSS/JS at ${ROOT}/_docs/projekty-domow-wow-site — READ assets/app.js + assets/styles.css + index.html hero):
- HERO composition (index.html:38-80): a .blueprint-card.tilt-card[data-tilt] containing an inline <svg class="house-line"> (line-drawing) + 3 .floating-chip badges ("+ duże przeszklenia"/"A++ ready"/"VR/3D") + .hero-bg-orb ambient orbs + mini-dashboard. This is the exact composition the owner wants to BUILD in the CMS.
- app.js effects (108 lines, dependency-free): scrolled header (scrollY>20) [DONE=TASK-520]; [data-reveal] IntersectionObserver reveal [DONE-ish=TASK-521-02]; .cursor-glow pointermove follow [DONE-ish=TASK-521-05 spotlight]; [data-tilt] pointermove -> transform rotateX(-y*7 deg) rotateY(x*7 deg) translateY(-2px) where x,y are the pointer offset within the card normalized to -0.5..0.5, reset on pointerleave, gated to matchMedia('(pointer:fine)') [TASK-521-03 = HERO ONLY; owner applies it to CARDS -> generalize in 522].
- styles.css effect patterns: .tilt-card{transform-style:preserve-3d;transition:transform .18s ease} + parent .hero-showcase{perspective:1200px}; @keyframes floatChip{50%{transform:translateY(-12px)}} on .floating-chip (staggered animation-delay, absolute-positioned z-index:3); @keyframes floatOrb{translate3d+scale} on .hero-bg-orb; @keyframes draw{to{stroke-dashoffset:0}} on .draw-line (SVG stroke-dashoffset draw-in); glass cards (linear-gradient rgba + border rgba + backdrop-filter:blur + box-shadow + inset); radial-glow ::after on hover; @media(prefers-reduced-motion:reduce){animation:none!important;.cursor-glow{display:none}}.

CURRENT CMS CODE:
- Block/section model: core/services/pages/pageDocumentV2.ts (PageBlockV2 :460-468, PageBlockStyleV2 :412-448, PageSectionV2 :477-488, PageSectionStyleV2 :380-387); present-only normalize/reject-unknown pattern in-file. Front render core/services/pages/pageRendererV2.tsx (renderPageBlockContent, PageSectionRender, PageDocumentRender). Block palette core/admin/ui/pages/editor/pageEditorOptions.ts; block controls pageEditorControlRegistry.ts. Runtime-script injection core/widgets/runtimeScripts.tsx (registerScript -> emitted before </body>).
- HERO: core/widgets/core/hero.tsx.
- TASK-521 (implementing NOW; 522 DEPENDS ON IT — verify its landed outputs at implement time): NEW core/services/pages/pageEffectsRuntime.ts (dependency-free runtime-effects module + reduced-motion guard); section scroll/parallax/reveal (521-02); hero mouse-tilt (521-03 — the tilt primitive 522 generalizes); NEW core/services/pages/animatedIconGlyphs.tsx curated inline-SVG set (521-04 — 522's custom-SVG block is the arbitrary-SVG complement); per-page effects + compact page-settings panel (521-05).

SECURITY: a custom/pasted SVG is an XSS vector. The SVG block MUST sanitize server-side + at render: strip script elements, on* event attributes, javascript:/data: script URLs, foreignObject elements, external entity/href refs to scripts, remote use-element hrefs, and style values with expression()/behavior. Prefer an allowlist of SVG tags/attributes (shape/path/g/defs/linearGradient/etc + geometry/presentation attrs) over a denylist. Icon/glyph names stay allowlisted (hasOwnProperty/Set, never bare bracket lookup on a prototype-carrying map).`;

const DECISIONS = `OWNER INTENT (baked in): the owner wants to BUILD a rich hero like the reference — insert a custom SVG + floating/drifting badges + cards nested in the hero, with the card tilting toward the mouse corner on hover, on a premium glass/glow dark canvas. Deliver the COMPOSABLE TOOLKIT for that (not a one-off hero):
1. Custom-SVG block: paste/upload sanitized SVG (+ optional stroke-draw-in animation like .draw-line).
2. Floating-drift decoration: a decoration/badge/orb element with a MOTION VARIANT — float, drift, PULSE (like sun-ring/map-pulse @keyframes pulseRing/mapPulse), or orbit — staggered, layered (absolute + z-index), reduced-motion off. One decoration primitive, several animation variants.
3. Tilt-on-ANY-block: generalize TASK-521-03's hero tilt into a present-only block-level "tilt" effect usable on any card/block (parent perspective + preserve-3d + the pointermove runtime already built in 521; add an optional glare/sheen for depth).
4. Layered hero/section CANVAS: a composition container allowing absolute-positioned layered children (SVG + badges + cards + orbs) with z-index + per-device — so a hero can be composed like the reference.
5. Glass/glow presets + HOVER effects: reusable section/card background presets (glass gradient, faint grid, radial glow, ambient orbs) AND block HOVER-effect presets (hover radial-glow reveal like .service-card:hover:after, hover-lift/translateY + hover-scale like .project-card:hover / .project-art:after) so the premium look + interactivity is one click.
6. TICKER / marquee strip: a horizontal auto-scrolling text/logo strip (like @keyframes ticker on .ticker) as a block/effect, reduced-motion off. (These extra effects — pulse, hover-glow/lift, ticker — appear across the reference's OTHER sections, not just the hero; the shared assets/styles.css enumerates them all.)
NO new npm dependency (all inline-SVG + CSS + the existing runtime). NO DB migration (everything present-only jsonb on block/section style + a new SVG block type). All effects respect prefers-reduced-motion. Reuse TASK-521's pageEffectsRuntime + tilt primitive rather than duplicating.`;

const GRANULARITY = `GRANULARITY + FILE RULES (AGENTS.md — MANDATORY):
- board parent ${TASK}_Short_Title.md (Overview; grounded gap analysis w/ file:line; Schema-extension plan; Subtask breakdown table w/ SINGLE-WRITER ownership + strict land order; Coordination guards incl. the pageRendererV2/pageEditorControlRegistry additive seams shared with TASK-521 [522 must edit DISJOINT regions/NEW block cases, and land AFTER 521]; Security Contract [SVG sanitization allowlist, icon allowlist, no CSS/JS injection via effect config]; Hard Invariants [present-only, reduced-motion, no-dep, no-migration, reuse-521-runtime]; Acceptance Criteria measured LIVE vs the reference; changelog pin) -> technical subtasks ${TASK}-NN -> EXECUTABLE LEAVES ${TASK}-NN-LNN with implementation PSEUDOCODE (helper/function shape, data flow, error handling) + regression-TEST shape + correct lane (Bun tests/unit/*, Vitest tests/vitest/*).
- File naming: parent underscores; children hyphens (${TASK}-NN-Title.md, ${TASK}-NN-LNN-Title.md); H1==physical ID; a '# FileName:' line==filename; child parent field; Status ⏳ To Do; zero-padded NN from 01 / LNN from L01.
- SINGLE-WRITER: one owner per production file/region (or a documented additive seam). Strict land order: model/runtime FIRST, then the block/effect consumers, then the canvas+presets, then closure. DEPENDS ON TASK-521 (state it; 522 implements AFTER 521 merges).
- Do NOT edit _docs/_TASKS/README.md or _docs/_CHANGELOG/* (orchestrator owns those); PIN the changelog as the next-free-at-closure (as of authoring next-free is 1229; 519=1232/520=1233 on disk, 521 pending -> 522 resolves at its closure; do NOT hardcode a colliding number).

SUGGESTED DECOMPOSITION (author may refine, keep granular):
- 522-01 Composition + decoration MODEL + runtime extensions (custom-SVG block model + sanitizer; floating-drift decoration model; block-level tilt flag; layered-canvas container model; glass/glow preset tokens; extend 521's pageEffectsRuntime with drift + tilt-on-block binding). Foundation — leaves per model region + sanitizer + runtime + tests.
- 522-02 Custom-SVG block (sanitized render + optional draw-in animation) — schema/normalize/render/editor. Leaves + tests (incl. XSS sanitization test vectors).
- 522-03 Floating-drift decoration effect (float/drift/pulse) — descriptor + CSS/runtime + editor. Leaves + tests.
- 522-04 Tilt-on-any-block (generalize 521-03) — block tilt effect + parent perspective + optional glare. Leaves + tests.
- 522-05 Layered hero/section canvas + glass/glow presets — composition container + preset backgrounds. Leaves + tests.
- 522-06 Tests/docs/closure.`;

const AUTHOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "task",
    "parentFile",
    "subtaskFiles",
    "leafFiles",
    "changelogPin",
    "migrationNeeded",
    "newDependency",
    "dependsOn",
    "singleWriterOk",
    "summary",
  ],
  properties: {
    task: { type: "string" },
    parentFile: { type: "string" },
    subtaskFiles: { type: "array", items: { type: "string" } },
    leafFiles: { type: "array", items: { type: "string" } },
    changelogPin: { type: "string" },
    migrationNeeded: { type: "boolean" },
    newDependency: { type: "boolean" },
    dependsOn: { type: "string" },
    singleWriterOk: { type: "boolean" },
    summary: { type: "string" },
  },
};
const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lens", "findings", "verdict"],
  properties: {
    lens: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "file", "problem", "fix", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          problem: { type: "string" },
          fix: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const FIX_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["applied", "residual"],
  properties: {
    applied: { type: "array", items: { type: "string" } },
    residual: { type: "array", items: { type: "string" } },
  },
};

const COMMON = `You are AUTHORING the ${TASK} task contract (DOCUMENTATION ONLY — write .md files under ${ROOT}/_docs/_TASKS/, no production code). Read existing granular contracts for style (e.g. ${ROOT}/_docs/_TASKS/TASK-521_*.md + its leaves). READ the reference wow-site (${ROOT}/_docs/projekty-domow-wow-site/assets/app.js + styles.css + index.html) — it is the owner's target.
${GRANULARITY}
${DECISIONS}
${GROUNDING}`;

phase("Author");
const authored = await agent(
  `${COMMON}\n\nAUTHOR the full ${TASK} family now (parent + all NN subtasks + all NN-LNN executable leaves) per the suggested decomposition (refine but keep granular + execution-ready). Ground every file:line vs live code + the reference. State the TASK-521 dependency explicitly. Return the structured result listing every file written.`,
  { label: "author:522", phase: "Author", schema: AUTHOR_SCHEMA }
);
log(
  `Authored ${TASK}: ${authored?.subtaskFiles?.length || 0} subtasks + ${authored?.leafFiles?.length || 0} leaves, changelog ${authored?.changelogPin}, migration=${authored?.migrationNeeded}, newDep=${authored?.newDependency}, dependsOn=${authored?.dependsOn}`
);

const LENSES = [
  {
    key: "grounding",
    ask: "GROUNDING: open every cited file:line (grep -an/Read for big files) — exists + says what is claimed; the reference app.js/styles.css patterns are cited accurately; the 521 outputs 522 depends on are referenced as VERIFY-at-implement (not assumed present now).",
  },
  {
    key: "granularity",
    ask: "GRANULARITY/EXECUTION-READINESS: parent + NN + NN-LNN; every executable leaf has implementation pseudocode + regression-test shape + correct lane; no oversized subtask.",
  },
  {
    key: "completeness",
    ask: "COMPLETENESS: delivers the composable toolkit for the reference — (1) sanitized custom-SVG block (+ optional draw-in), (2) floating-drift decoration WITH motion variants (float/drift/PULSE/orbit), (3) tilt-on-ANY-block (generalizing 521-03), (4) layered hero/section canvas, (5) glass/glow presets + HOVER effects (hover-glow reveal + hover-lift/scale), (6) TICKER/marquee strip. Covers the effects across the reference's OTHER sections (pulse rings, hover-glow cards, ticker), not just the hero. FRONT render + runtime + reduced-motion covered; present-only + no-migration + no-dependency + reuse-521-runtime stated; the TASK-521 dependency + land-after-521 explicit.",
  },
  {
    key: "single-writer",
    ask: "SINGLE-WRITER + LAND ORDER + SEAMS + NAMING: one owner per file/region; the pageRendererV2 / pageEditorControlRegistry seams shared with 521 are DISJOINT (522 edits different regions / adds a NEW block case) and 522 lands after 521; file naming/H1/FileName/parent/Status/changelog-pin consistent.",
  },
  {
    key: "security",
    ask: "SECURITY: the custom-SVG sanitizer is an ALLOWLIST (tags+attrs) that strips script elements/on*/javascript:/foreignObject/external-script-refs/expression() — spell out the test vectors; icon/glyph names allowlisted via hasOwnProperty/Set; effect config (drift/tilt/canvas params) reject-unknown + clamped, no CSS/JS injection into style/attrs/style elements; the runtime scripts are dependency-free, no eval/innerHTML-of-user-data. A Security Contract subsection exists (SVG block is effectively a new render surface).",
  },
];

phase("DriftAudit");
let round = 0,
  clean = false;
while (round < 5 && !clean) {
  round += 1;
  const audits = await parallel([
    ...LENSES.map(
      (l) => () =>
        agent(
          `Round ${round} adversarial DRIFT-AUDIT of ${TASK} (read parent + ALL NN + NN-LNN files under ${ROOT}/_docs/_TASKS/). LENS: ${l.ask}\n${GROUNDING}\n${DECISIONS}\nFindings with concrete fixes; isReal only if defensible.`,
          { label: `audit-r${round}:${l.key}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
        ).then((a) => ({ ...a, key: l.key }))
    ),
    () =>
      agent(
        `Round ${round} cross-file RECONCILE of ${TASK} (read ALL files). Check ONLY cross-file contradictions: single-writer ownership + the 521-shared seams disjoint, identical shared enum/type/clamp/CSS-var/keyframe-name shapes across files, helper/effect/glyph names consumers reference == names the owning subtask defines, per-device consistency, promised test-file names vs delivered, land order (after 521), changelog pin. ${GROUNDING}\nFindings (isReal + fix).`,
        { label: `reconcile-r${round}`, phase: "DriftAudit", schema: AUDIT_SCHEMA }
      ).then((a) => ({ ...a, key: "reconcile" })),
  ]);
  const returned = audits.filter(Boolean);
  const expected = LENSES.length + 1;
  const real = returned.flatMap((a) =>
    (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key }))
  );
  const hm = real.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
  log(
    `Round ${round}: audits ${returned.length}/${expected} | real HIGH/MED=${hm.length} LOW=${real.length - hm.length}`
  );
  if (returned.length === expected && hm.length === 0) {
    clean = true;
    log(`Round ${round}: CLEAN.`);
    break;
  }
  if (hm.length > 0)
    await agent(buildTask522FixPrompt({ common: COMMON, round, task: TASK, findings: hm }), {
      label: `fix-r${round}`,
      phase: "DriftAudit",
      schema: FIX_SCHEMA,
    });
}

phase("FinalReconcile");
const final = await agent(
  `FINAL fresh read-only reconcile + readiness check of ${TASK} (parent + all NN + NN-LNN files). Confirm 0 HIGH/MEDIUM drift across grounding/granularity/completeness/single-writer/security; every executable leaf has pseudocode + test shape + lane; land order (after 521) + changelog pin consistent; SVG sanitizer allowlist + test vectors present; no-dependency + no-migration + present-only + reduced-motion + reuse-521-runtime invariants hold. ${GROUNDING}\n${DECISIONS}\nReturn remaining REAL findings — empty + verdict 'clean' = implementation-ready.`,
  { label: "final-reconcile:522", phase: "FinalReconcile", schema: AUDIT_SCHEMA }
);

return {
  authored: {
    subtasks: authored?.subtaskFiles?.length,
    leaves: authored?.leafFiles?.length,
    changelog: authored?.changelogPin,
    migration: authored?.migrationNeeded,
    newDependency: authored?.newDependency,
    dependsOn: authored?.dependsOn,
  },
  driftRounds: round,
  convergedClean: clean,
  finalVerdict: final?.verdict,
  finalResidual: (final?.findings || [])
    .filter((f) => f.isReal)
    .map((f) => `[${f.severity}] ${f.file}: ${f.problem}`),
};
