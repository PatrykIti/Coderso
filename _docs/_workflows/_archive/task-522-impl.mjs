export const meta = {
  name: "task-522-impl",
  description:
    "Implement TASK-522 (Composable Hero Toolkit & Premium Effects: sanitized custom-SVG block + floating-drift decoration + tilt-on-any-block + layered canvas + glass/glow + hover + ticker) on its worktree: 5 strictly-sequential subtasks + closure, each gated green, then parallel adversarial audits (SVG-sanitizer security + fidelity/UX + regression), fix real findings, closure.",
  phases: [{ title: "Implement" }, { title: "Audit" }, { title: "Fix" }, { title: "Closure" }],
};

const WT =
  (typeof args === "string" ? JSON.parse(args) : args)?.wt ||
  "/home/coder/project/Coderso-task-522";
const BASE = (typeof args === "string" ? JSON.parse(args) : args)?.base || "feature/tasks-fixes";
const ENV = `cd ${WT} && set -a && { [ -f .env ] || cp /home/coder/project/Coderso/.env .env 2>/dev/null; }; . ./.env 2>/dev/null; set +a`;

const IMPL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subtask", "done", "filesEdited", "gates", "notes"],
  properties: {
    subtask: { type: "string" },
    done: { type: "boolean" },
    filesEdited: { type: "array", items: { type: "string" } },
    gates: { type: "string" },
    notes: { type: "string" },
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
        required: ["severity", "file", "title", "detail", "isReal"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          file: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          isReal: { type: "boolean" },
        },
      },
    },
    verdict: { type: "string", enum: ["clean", "issues"] },
  },
};
const CLOSURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "done",
    "changelogFile",
    "docsUpdated",
    "boardUpdated",
    "gates",
    "committed",
    "commitSha",
    "notes",
  ],
  properties: {
    done: { type: "boolean" },
    changelogFile: { type: "string" },
    docsUpdated: { type: "boolean" },
    boardUpdated: { type: "boolean" },
    gates: { type: "string" },
    committed: { type: "boolean" },
    commitSha: { type: "string" },
    notes: { type: "string" },
  },
};

const COMMON = `You work ONLY in the isolated git worktree at ${WT} (branch feature/task-522, off ${BASE} which INCLUDES TASK-519 alpha color + TASK-520 menu + TASK-521 page motion effects). This is TASK-522 (Composable Hero Toolkit & Premium Effects — the toolkit to build a rich hero like the reference wow-site).
ALWAYS read first: ${WT}/_docs/_TASKS/TASK-522_Composable_Hero_Toolkit_And_Premium_Effects.md (parent) AND your subtask's file(s) INCLUDING its NN-LNN leaves (execution-ready pseudocode + test shapes). Also skim the reference ${WT}/_docs/projekty-domow-wow-site/assets/{app.js,styles.css} (owner's target). GREP TRAP: pageRendererV2.tsx, pageDocumentV2.ts, pageEditorControlRegistry.ts, pageEditorOptions.ts read as binary to rg — use grep -an or Read.
DOCUMENTED ADDITIVE SEAMS (edit DISJOINT regions/NEW cases ONLY; 522 lands AFTER 521 so 521's regions already exist — build on them, never clobber): pageDocumentV2.ts = 522-01 only (disjoint symbol regions). pageRendererV2.tsx: 522-02 block-content case "customSvg"; 522-03 toPageBlockRenderProps composition-attr merge + renderPageBlockWithFrame wrapper/child-span; 522-05 PageSectionRender surface/canvas + layout-block canvas + group-block marquee. pageEditorControlRegistry.ts: 522-01 customSvg:[] stub; 522-02 pageBlockControlRegistry.customSvg; 522-03 pageUniversalBlockControls decoration; 522-04 pageUniversalBlockControls tilt; 522-05 section surface + block glass/hover/layer + container/columns/group composition+marquee. pageEditorOptions.ts: 522-01 blockOptionCopy.customSvg (icon-less stub); 522-02 customSvg copy. Read the CURRENT on-disk state of every shared file before editing.
ATOMIC customSvg INTRODUCTION (522-01-L01): pageBlockTypes feeds EXHAUSTIVE Record<PageBlockType,…> in FOUR files — 522-01-L01 is the SOLE introducer and in ONE atomic landing adds the minimal stub to EVERY exhaustive record (pageBlockPropKeys + pageBlockDefaultProps {svg:'',drawIn:false,label:''} + pageBlockRenderDefaults + realRuntimeBlockTypes + editorInsertableBlockTypes + the registry customSvg:[] + blockOptionCopy) so typecheck stays green from 522-01 onward.
GOAL (the composable toolkit for the reference hero): (A) sanitized custom-SVG block (paste SVG + optional draw-in stroke animation). (B) floating-drift DECORATION (none/float/drift/pulse/radiate/orbit) on any block, layered. (C) tilt-on-ANY-block (generalize 521-03 via the block-frame resolver + a shared tilt runtime). (D) layered hero/section CANVAS (absolute-positioned layered children + z, per-device) + glass/glow section presets + block HOVER effects + ticker/marquee.
SECURITY (CRITICAL — 522-01-L02 svgSanitizer.ts): the custom-SVG sanitizer is an ALLOWLIST of SVG tags + attributes; it STRIPS <script>, on* event attrs, javascript:/data:(script) URLs, <foreignObject>, external/remote href/xlink:href, <use> to remote, style with expression()/behavior/url(javascript:). A crafted SVG must NOT inject script/HTML/CSS. Spell out + test the XSS vectors. Effect/decoration/tilt/hover/marquee config values are reject-unknown allowlisted + clamped (no CSS/JS injection). Glyph/icon names stay allowlisted via hasOwnProperty/Set.
HARD INVARIANTS: NO npm dependency. NO DB migration (all present-only jsonb on block/section style + the NEW customSvg block type). All new keys PRESENT-ONLY + reject-unknown + round-trip test; legacy docs byte-identical (no seeded default, zero emitted bytes when unauthored). ALL effects respect prefers-reduced-motion (CSS motion-safe + runtime early-return). Reuse TASK-521 pageEffectsRuntime (APPEND the block-tilt+glare runtime, do not duplicate) + the curated inline-SVG+CSS precedent. Runtime = dependency-free idempotent IIFEs, rAF/throttle, no eval / no innerHTML of user data.
Do NOT commit (the Closure phase owns the commit). If a gate fails, FIX and re-run until green before returning.`;

const SUBTASKS = [
  {
    id: "522-01",
    file: "TASK-522-01-Composition-Model-Sanitizer-CSS-Runtime.md",
    owns: "core/services/pages/pageDocumentV2.ts (all 522 model: customSvg block type + PageBlockStyleV2 decoration/tilt/layer/hover/surface + PageSectionStyleV2 surface/canvas + marquee; shared vocab + normalizers reject-unknown; atomic customSvg into the 4 exhaustive records) + NEW core/services/pages/svgSanitizer.ts (allowlist XSS-safe) + NEW core/services/pages/pageCompositionEffects.tsx (composition CSS + resolvers) + core/services/pages/pageEffectsRuntime.ts [APPEND block-tilt+glare runtime] + the atomic customSvg stubs in pageEditorOptions.ts/pageEditorControlRegistry.ts/pageBlockRenderDefaults.ts",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit (MANDATORY — the exhaustive-record atomic intro must keep typecheck green); bun run test:bun + test:vitest for the model+sanitizer+CSS+runtime tests (present-only round-trip, reject-unknown, sanitizer XSS vectors, legacy byte-identical)",
  },
  {
    id: "522-02",
    file: "TASK-522-02-Custom-SVG-Block-Render-And-Editor.md",
    owns: 'pageRendererV2.tsx [block-content case "customSvg" region — seam] (sanitized render + optional draw-in) + pageEditorControlRegistry.ts [pageBlockControlRegistry.customSvg region — seam] + pageEditorOptions.ts [blockOptionCopy.customSvg copy — seam]',
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the custom-SVG block tests (sanitized render, draw-in, editor controls, XSS vectors dropped)",
  },
  {
    id: "522-03",
    file: "TASK-522-03-Floating-Drift-Decoration.md",
    owns: "pageRendererV2.tsx [toPageBlockRenderProps composition-attr merge region (~:748) + renderPageBlockWithFrame outer-wrapper/child-span region (~:2009) — seams] + pageEditorControlRegistry.ts [pageUniversalBlockControls decoration region — seam]",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the decoration tests (float/drift/pulse/radiate/orbit applied via block frame; reduced-motion off; legacy byte-identical)",
  },
  {
    id: "522-04",
    file: "TASK-522-04-Tilt-On-Any-Block.md",
    owns: "pageEditorControlRegistry.ts [pageUniversalBlockControls tilt region — seam] (render via 522-03 frame resolver; runtime via 522-01-L05 block-tilt)",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the tilt-on-block tests (tilt+glare on any block, pointermove behavior via the appended runtime, reduced-motion off)",
  },
  {
    id: "522-05",
    file: "TASK-522-05-Layered-Canvas-Glass-Glow-Hover-Ticker.md",
    owns: "pageRendererV2.tsx [PageSectionRender surface/canvas + layout-block canvas + group-block marquee regions — seams] + pageEditorControlRegistry.ts [section surface + block glass/hover/layer + container/columns/group composition+marquee regions — seams] + core/services/pages/pageResponsiveCss.ts [per-device --layer-x/y/z delta seam]",
    gates:
      "bun --cwd core lint; bun --cwd core lint:types; ./node_modules/.bin/tsc -p tsconfig.json --noEmit; bun run test:bun + test:vitest for the canvas/glass/glow/hover/ticker tests (layered absolute children + per-device layer vars; glass/glow presets; hover reveal+lift; marquee ticker; reduced-motion off)",
  },
];

phase("Implement");
let prevNote = "";
const implResults = [];
for (const st of SUBTASKS) {
  const r = await agent(
    `${COMMON}

YOUR SUBTASK: ${st.id} — read ${WT}/_docs/_TASKS/${st.file} + ALL its NN-LNN leaf files for the execution-ready pseudocode + test shapes. Follow them PRECISELY. Edit ONLY this subtask's owned files/REGIONS (respect the documented seams — read current on-disk state first; 521's regions already exist, build beside them).
OWNED FILES/REGIONS: ${st.owns}.
${prevNote ? `PRIOR SUBTASK CONTEXT: ${prevNote}` : "This is the foundation subtask (model + sanitizer + CSS + runtime the consumers use). The atomic customSvg intro must keep the FOUR exhaustive records + typecheck green."}

GATES (run in ${WT} with .env sourced — prefix each with: ${ENV} && ...): ${st.gates}. Capture PASS/FAIL + first error line each.

Return the structured result. In notes, include what the NEXT subtask needs (new model keys/types, sanitizer export, composition resolver + CSS var names, block-tilt runtime registration, decoration/tilt/hover/marquee control ids, seam region boundaries you touched).`,
    { label: `impl:${st.id}`, phase: "Implement", schema: IMPL_SCHEMA }
  );
  implResults.push(r);
  log(`Implement ${st.id}: done=${r?.done} gates=${(r?.gates || "").slice(0, 120)}`);
  if (!r?.done) {
    log(`STOP: ${st.id} not green — halting (resume via resumeFromRunId).`);
    return { task: "TASK-522", halted: st.id, implResults };
  }
  prevNote = `${st.id} done. ${(r?.notes || "").slice(0, 900)}`;
}

phase("Audit");
const LENSES = [
  {
    key: "svg-security",
    prompt: `HARD SECURITY audit of TASK-522 in worktree ${WT}, focused on the custom-SVG sanitizer (522-01-L02 core/services/pages/svgSanitizer.ts) + the render (522-02). Review the diff \`cd ${WT} && git diff ${BASE}...feature/task-522\` (grep -an/Read for big files). PROVE the sanitizer is an ALLOWLIST that REJECTS: <script>, on* event handlers (onclick/onload/etc), javascript:/data:(script) URLs in href/xlink:href/src, <foreignObject>, <use href> to remote/external, external entity refs, <style> with expression()/behavior/url(javascript:)/@import remote, and any tag/attr not on the allowlist. Test the concrete XSS vectors: a pasted SVG with <script>alert(1)</script>, <svg onload=alert(1)>, <a href="javascript:alert(1)">, <image href="x" onerror=alert(1)>, <use href="//evil/x.svg#a">, <foreignObject><iframe>. Confirm the sanitized output injected via dangerouslySetInnerHTML (if used) cannot execute JS. Also confirm decoration/tilt/hover/marquee config values are reject-unknown + clamped (no CSS injection). Flag any bypass. isReal only if defensible with file:line + the vector.`,
  },
  {
    key: "fidelity-ux",
    prompt: `Adversarial FIDELITY/UX audit of TASK-522 in worktree ${WT}. Read the reference ${WT}/_docs/projekty-domow-wow-site (app.js/styles.css/index.html hero) and the diff. Verify the toolkit DELIVERS the composable reference hero: (A) a custom-SVG block you can insert + it renders your SVG (with optional draw-in); (B) floating-drift decoration (float/drift/pulse) on badges/cards, layered; (C) tilt on ANY card/block (tilts toward the mouse corner), not just hero; (D) a layered hero/section canvas (absolute-positioned SVG + badges + cards) + glass/glow section presets + hover-glow/lift on cards + ticker/marquee. Flag anything under-delivered, admin-only (not on front), or an old-approach leftover. isReal only if defensible with file:line vs the reference.`,
  },
  {
    key: "regression",
    prompt: `Adversarial REGRESSION + SEAM audit of TASK-522 in worktree ${WT}. Verify: (1) the atomic customSvg intro kept all FOUR exhaustive Record<PageBlockType,…> + typecheck green; (2) all new keys PRESENT-ONLY, NO seeded default — a legacy page/block/section renders byte-identical (no data-attrs, no runtime, no CSS); (3) NO migration, NO new npm dependency (package.json diff empty); (4) the documented seams held — every 521-shared file (pageRendererV2.tsx / pageEditorControlRegistry.ts / pageEditorOptions.ts / pageEffectsRuntime.ts) was edited only in a DISJOINT region / NEW case, 521's regions untouched, 522's own leaves disjoint; (5) the block-tilt runtime was APPENDED to pageEffectsRuntime (not duplicated) and reuses the 521 pattern; (6) reduced-motion honored. Run \`${ENV} && ./node_modules/.bin/tsc -p tsconfig.json --noEmit\` + \`${ENV} && bun run test:bun\` (page model/render/sanitizer) + \`${ENV} && bun run test:vitest\` (page editor) and report exact pass/fail. Flag real regressions. isReal only if defensible.`,
  },
];
const audits = await parallel(
  LENSES.map(
    (l) => () =>
      agent(l.prompt, { label: `audit:${l.key}`, phase: "Audit", schema: AUDIT_SCHEMA }).then(
        (a) => ({ ...a, key: l.key })
      )
  )
);
const realFindings = audits
  .filter(Boolean)
  .flatMap((a) => (a.findings || []).filter((f) => f.isReal).map((f) => ({ ...f, lens: a.key })));
const realHighMed = realFindings.filter((f) => f.severity === "HIGH" || f.severity === "MEDIUM");
log(
  `Audit: ${audits
    .filter(Boolean)
    .map((a) => `${a.key}=${a.verdict}`)
    .join(
      " "
    )} | real HIGH/MED=${realHighMed.length} LOW=${realFindings.length - realHighMed.length}`
);

phase("Fix");
if (realHighMed.length > 0) {
  const fixList = realHighMed
    .map((f, i) => `${i + 1}. [${f.severity}] (${f.lens}) ${f.file} — ${f.title}: ${f.detail}`)
    .join("\n");
  const fix = await agent(
    `${COMMON}\n\nFix these REAL audit findings on the TASK-522 implementation in worktree ${WT}. Respect single-writer + the documented seams; do NOT weaken tests. SECURITY findings (SVG sanitizer bypass) MUST be fully closed with a test for the vector. Fidelity findings fixed by adapting to the reference. After fixing, re-run: ${ENV} && bun --cwd core lint && bun --cwd core lint:types && ./node_modules/.bin/tsc -p tsconfig.json --noEmit and the affected bun/vitest tests. Findings:\n${fixList}\n\nReport changes + re-run gates.`,
    { label: "fix:522", phase: "Fix", schema: IMPL_SCHEMA }
  );
  log(`Fix: done=${fix?.done} gates=${(fix?.gates || "").slice(0, 140)}`);
} else log("Fix: no real HIGH/MEDIUM — skipping.");

phase("Closure");
const closure = await agent(
  `${COMMON.replace("Do NOT commit (the Closure phase owns the commit).", "You OWN the commit for this task.")}

YOUR SUBTASK: 522-06 (Tests, Docs, Closure) — read ${WT}/_docs/_TASKS/TASK-522-06-Tests-Docs-Closure.md. The 5 implementation subtasks are applied + audited; do NOT edit their owned production files. Your job:
1) TESTS — complete closure-specified tests (Bun tests/unit/* for model/render/sanitizer; Vitest tests/vitest/* for editor). Ensure gates green.
2) DOCS — update PAGE_MODEL.md / WIDGETS / DESIGN_TOKENS / SECURITY_SPEC (the SVG sanitizer is a security surface) the contract names; widget-pack matrix if a new block.
3) CHANGELOG — determine NEXT-FREE (\`cd ${WT} && ls _docs/_CHANGELOG/ | grep -oE '^[0-9]+' | sort -n | tail -1\`; 1234=521 → expected 1235) and use the actual next-free; create _docs/_CHANGELOG/<N>-2026-07-08-task-522-composable-hero-toolkit.md; bump README next-pointer; fix stale pins in 522 files.
4) BOARD — _docs/_TASKS/README.md: add parent TASK-522 + all children rows to Done; bump Statistics.
5) TASK FILES — Status ✅ Done in parent + all subtask + leaf files.
6) FINAL GATES (run in ${WT}, capture each): ${ENV} && bun --cwd core lint ; bun --cwd core lint:types ; ./node_modules/.bin/tsc -p tsconfig.json --noEmit ; bun run test:bun (re-run named under-load timeouts isolated) ; bun run test:vitest ; bun run gates:coderso.
NOTE: LIVE playwright smoke (build a partial reference hero on the front + verify each effect really applies via interaction) is run by the ORCHESTRATOR post-merge — do NOT restart the dev host.
7) COMMIT — cd ${WT} && git add -A && git commit -m "feat(pages): TASK-522 composable hero toolkit — custom-SVG block, floating-drift decoration, tilt-on-any-block, layered canvas + glass/glow + hover + ticker" with a body + changelog <N>. End the body with:\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>\nPrecommit hook runs lint+typecheck — fix + re-commit if it blocks. Return the structured result with the actual changelog file, commit sha, and gate results.`,
  { label: "closure:522-06", phase: "Closure", schema: CLOSURE_SCHEMA }
);
log(
  `Closure: done=${closure?.done} changelog=${closure?.changelogFile} committed=${closure?.committed} sha=${closure?.commitSha}`
);
log(`Closure gates: ${(closure?.gates || "").slice(0, 200)}`);

return {
  task: "TASK-522",
  worktree: WT,
  implResults: implResults.map((r) => ({ subtask: r?.subtask, done: r?.done })),
  auditVerdicts: audits.filter(Boolean).map((a) => ({ lens: a.key, verdict: a.verdict })),
  realFindings,
  closure,
};
